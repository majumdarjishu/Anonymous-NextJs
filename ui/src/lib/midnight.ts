import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { MidnightBech32m, ShieldedAddress, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey } from '@midnight-ntwrk/wallet-sdk-address-format';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

export const PRIVATE_STATE_ID = 'anonymousMembershipPrivateState';

export const getCompiledContract = async (zkConfigPathUrl: string, witnesses?: any) => {
  const Contract_Module = await import('../contracts/index');
  
  // The 'credential' witness expects to return a tuple of: [PrivateState, { secret: Uint8Array, membershipId: bigint }]
  const activeWitnesses = witnesses || {
    credential: () => [{}, { secret: new Uint8Array(32), membershipId: BigInt(0) }]
  };

  return CompiledContract.make('anonymous-membership-organisation', Contract_Module.Contract).pipe(
    CompiledContract.withWitnesses(activeWitnesses),
    CompiledContract.withCompiledFileAssets(zkConfigPathUrl)
  );
};

/**
 * Tries to extract a shielded address string from any possible return value.
 * Handles: string, string[], object[], Uint8Array[], nested objects, etc.
 */
function extractAddressFromResult(raw: any): string | null {
  if (raw === null || raw === undefined) return null;

  // Plain string
  if (typeof raw === 'string' && raw.length > 0) return raw;

  // Uint8Array — coin public key, encode as hex
  if (raw instanceof Uint8Array && raw.length > 0) {
    return Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Array of any of the above
  if (Array.isArray(raw) && raw.length > 0) {
    for (const item of raw) {
      const extracted = extractAddressFromResult(item);
      if (extracted) return extracted;
    }
    return null;
  }

  // Object — try known key names first
  if (typeof raw === 'object') {
    const knownKeys = ['address', 'shieldedAddress', 'bech32', 'value', 'addr', 'coinPublicKey'];
    for (const k of knownKeys) {
      if (typeof raw[k] === 'string' && raw[k].length > 0) return raw[k];
    }
    for (const v of Object.values(raw)) {
      if (typeof v === 'string' && v.startsWith('mn') && v.length > 20) return v;
    }
    // Scan nested arrays/objects one level deep
    for (const v of Object.values(raw)) {
      if (typeof v !== 'string' && v !== null && typeof v === 'object') {
        const extracted = extractAddressFromResult(v);
        if (extracted) return extracted;
      }
    }
  }

  return null;
}

/**
 * Resolves shielded keys from the wallet API.
 * Uses hintUsage if available to prompt the user for permission.
 */
async function resolveShieldedKeys(walletApi: any): Promise<{ addressString: string; coinPublicKeyString: string; encryptionPublicKeyString: string }> {
  if (typeof walletApi.hintUsage === 'function') {
    try {
      console.log('[Midnight] Hinting usage of getShieldedAddresses...');
      await walletApi.hintUsage(['getShieldedAddresses']);
    } catch (e) {
      console.warn('[Midnight] hintUsage threw:', e);
    }
  }

  const methodsToTry = [
    'getShieldedAddresses',
    'getShieldedAddress',
    'shieldedAddresses',
    'getAddresses',
  ];

  let lastRaw: any = undefined;

  for (const methodName of methodsToTry) {
    if (typeof walletApi[methodName] !== 'function') continue;
    try {
      console.log(`[Midnight] Calling ${methodName}()...`);
      const raw = await walletApi[methodName]();
      lastRaw = raw;

      // Handle if the wallet returns an array of these objects
      const target = Array.isArray(raw) ? raw[0] : raw;
      
      if (target && typeof target === 'object') {
        const addr = target.shieldedAddress || target.address;
        const cPk = target.shieldedCoinPublicKey || target.coinPublicKey;
        const ePk = target.shieldedEncryptionPublicKey || target.encryptionPublicKey;
        
        if (typeof cPk === 'string' && typeof ePk === 'string') {
          console.log(`[Midnight] Resolved shielded keys natively via ${methodName}()`);
          return {
            addressString: addr || "",
            coinPublicKeyString: cPk,
            encryptionPublicKeyString: ePk
          };
        }
      }
    } catch (e) {
      console.warn(`[Midnight] ${methodName}() threw:`, e);
    }
  }

  try {
    const state = await walletApi.state();
    if (state && typeof state === 'object') {
      for (const [k, v] of Object.entries(state)) {
        if (typeof v === 'string' && v.startsWith('mn') && v.length > 10) {
          console.log(`[Midnight] Found shielded address in state.${k}`);
          return { addressString: v, coinPublicKey: new Uint8Array(32), encryptionPublicKey: new Uint8Array(32) };
        }
      }
    }
  } catch (e) {
    console.warn('[Midnight] state() threw:', e);
  }

  const debugRaw = lastRaw !== undefined
    ? `\n\n${methodsToTry[0]}() returned: ${JSON.stringify(lastRaw)}`
    : `\n\n${methodsToTry[0]}() returned nothing or is not a function.`;

  throw new Error(
    'No valid shielded keys found in your wallet.' +
    debugRaw +
    '\n\nIf you have an account set up:\n' +
    '• Grant permission if prompted\n' +
    '• Switch to Midnight Preview\n' +
    '• Enable the Shielded account in your wallet\n' +
    '• Reload the wallet extension and wait for it to sync\n' +
    '• Disconnect and reconnect the wallet'
  );
}

export const createMidnightProviders = async (
  walletApi: any,
  networkConfig: { indexer: string; indexerWS: string; proofServer: string; zkConfigPathUrl: string },
  requestTxHash?: () => Promise<string>
) => {
  if (typeof window === 'undefined') throw new Error('Cannot create providers on server');

  console.log('[Midnight] Fetching shielded keys required for deployment...');
  const keys = await resolveShieldedKeys(walletApi);
  const addressString = keys.addressString;

  const networkInfo = typeof walletApi.getConfiguration === 'function'
    ? await walletApi.getConfiguration()
    : (walletApi.getConfiguration ?? walletApi.configuration ?? walletApi.state ?? {});
  const networkId = (typeof networkInfo === 'function' ? await networkInfo() : networkInfo)?.networkId ?? 'Undeployed';

  setNetworkId(networkId);

  let coinPublicKey = new Uint8Array(32);
  let encryptionPublicKey = new Uint8Array(32);

  try {
    console.log(`[Midnight] Parsing shielded keys for network: ${networkId}. Format check...`);
    const cPkStr = keys.coinPublicKeyString;
    const ePkStr = keys.encryptionPublicKeyString;
    
    if (cPkStr.startsWith('mn')) {
      const parsedCpk = MidnightBech32m.parse(cPkStr);
      const parsedEpk = MidnightBech32m.parse(ePkStr);
      if (!parsedCpk || !parsedEpk) {
        throw new Error("Bech32m parse returned undefined. String might be invalid.");
      }
      
      // Use the static codec to decode since ShieldedCoinPublicKey doesn't expose [Bech32mSymbol]
      coinPublicKey = ShieldedCoinPublicKey.codec.decode(networkId, parsedCpk).data;
      encryptionPublicKey = ShieldedEncryptionPublicKey.codec.decode(networkId, parsedEpk).data;
    } else {
      coinPublicKey = fromHex(cPkStr);
      encryptionPublicKey = fromHex(ePkStr);
    }
  } catch (err: any) {
    console.warn('[Midnight] Failed to parse key:', err?.message);
    throw new Error(`Failed to decode keys from wallet. Make sure you are using a shielded account on ${networkId}. Error: ${err?.message}`);
  }
  
  if (coinPublicKey.every(b => b === 0)) {
    throw new Error("Coin public key is strictly zero. Cannot proceed with deployment as the transaction will fail validation on the network.");
  }
  
  console.log('[Midnight] Keys resolved successfully.');

  const walletProvider = {
    coinPublicKey,
    encryptionPublicKey,
    getCoinPublicKey: () => toHex(coinPublicKey),
    getEncryptionPublicKey: () => toHex(encryptionPublicKey),
    balanceTx: async (tx: any, _newCoins: any): Promise<any> => {
      console.log('[Midnight] Preparing transaction...');
      const txHex = toHex(tx.serialize());
      console.log('[1AM] Sending balanceUnsealedTransaction request...');
      const recipe = await walletApi.balanceUnsealedTransaction(txHex);
      console.log('[Midnight] Transaction balanced successfully. Proceeding to proof generation...');
      return fromHex(recipe.tx);
    },
    submitTx: async (tx: any): Promise<string> => {
      let txHex: string;
      if (typeof tx === 'object' && typeof tx.serialize === 'function') {
        txHex = toHex(tx.serialize());
      } else {
        txHex = toHex(tx);
      }
      
      console.log('[1AM] Submitting proved transaction request to wallet...');
      // submitTransaction returns Promise<void> in DApp Connector API!
      await walletApi.submitTransaction(txHex);
      console.log('[1AM] Wallet confirmed transaction submission!');
      
      // Since it returns void, we MUST extract the hash from the transaction object itself
      if (typeof tx === 'object' && typeof tx.transactionHash === 'function') {
        const hash = tx.transactionHash();
        console.log(`[Midnight] Extracted transaction hash: ${hash}`);
        return hash;
      }
      
      if (requestTxHash) {
        console.log('[Midnight] Transaction hash not returned by wallet API. Requesting from user...');
        try {
          const userHash = await requestTxHash();
          if (userHash && userHash.trim().length > 10) {
            console.log(`[Midnight] User provided hash: ${userHash.trim()}`);
            return userHash.trim();
          }
        } catch (e) {
          throw new Error("Transaction hash request cancelled by user.");
        }
      }
      
      throw new Error("Could not determine transaction hash from tx object.");
    },
  };

  // Ensure the URL is absolute to avoid "Invalid URL" TypeError in FetchZkConfigProvider
  const absoluteZkConfigUrl = networkConfig.zkConfigPathUrl.startsWith('/')
    ? window.location.origin + networkConfig.zkConfigPathUrl
    : networkConfig.zkConfigPathUrl;

  const zkConfigProvider = new FetchZkConfigProvider(
    absoluteZkConfigUrl,
    fetch.bind(window)
  );

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'anonymous-membership-organisation-state',
      accountId: addressString || 'unshielded-deployer',
      privateStoragePasswordProvider: () => 'Local-development-password-1!',
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
};

export { findDeployedContract };
