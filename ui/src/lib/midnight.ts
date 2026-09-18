import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { Transaction } from '@midnight-ntwrk/ledger-v8';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { toHex, fromHex } from '@midnight-ntwrk/midnight-js-utils';
import { MidnightBech32m, ShieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
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
    // Scan all string values for anything that looks like a Midnight address
    for (const v of Object.values(raw)) {
      if (typeof v === 'string' && (v.startsWith('mn') || v.length > 20)) return v;
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
 * Resolves a shielded address string from the wallet API using exhaustive fallbacks.
 * Tries multiple method names and return value formats.
 */
async function resolveShieldedAddress(walletApi: any): Promise<string> {
  const methodsToTry = [
    'getShieldedAddresses',
    'getShieldedAddress',
    'shieldedAddresses',
    'getAddresses',
  ];

  let lastRaw: any = undefined;

  // ── Attempt 1: known getter methods ────────────────────────────────────────
  for (const methodName of methodsToTry) {
    if (typeof walletApi[methodName] !== 'function') continue;
    try {
      const raw = await walletApi[methodName]();
      console.log(`[midnight] ${methodName}() raw:`, JSON.stringify(raw, (_k, v) =>
        v instanceof Uint8Array ? `Uint8Array(${v.length})` : v
      ));
      lastRaw = raw;
      const addr = extractAddressFromResult(raw);
      if (addr) {
        console.log(`[midnight] Resolved address via ${methodName}():`, addr.slice(0, 20) + '…');
        return addr;
      }
    } catch (e) {
      console.warn(`[midnight] ${methodName}() threw:`, e);
    }
  }

  // ── Attempt 2: state() — scan all values for shielded address pattern ──────
  try {
    const state = await walletApi.state();
    console.log('[midnight] state() raw:', JSON.stringify(state));
    if (state && typeof state === 'object') {
      // Look for any string starting with "mn" (Midnight bech32m prefix)
      for (const [k, v] of Object.entries(state)) {
        if (typeof v === 'string' && v.startsWith('mn') && v.length > 10) {
          console.log(`[midnight] Found shielded address in state.${k}`);
          return v;
        }
      }
    }
  } catch (e) {
    console.warn('[midnight] state() threw:', e);
  }

  // ── All methods exhausted ───────────────────────────────────────────────────
  const debugRaw = lastRaw !== undefined
    ? `\n\ngetShieldedAddresses() returned: ${JSON.stringify(lastRaw)}`
    : '\n\ngetShieldedAddresses() returned nothing or is not a function.';

  throw new Error(
    'No shielded addresses found in your wallet.' +
    debugRaw +
    '\n\nIf you have a shielded account set up:\n' +
    '• Reload the wallet extension and wait for it to sync\n' +
    '• Disconnect and reconnect the wallet\n' +
    '• Check the browser console for the raw value above'
  );
}

export const createMidnightProviders = async (
  walletApi: any,
  networkConfig: { indexer: string; indexerWS: string; proofServer: string; zkConfigPathUrl: string }
) => {
  if (typeof window === 'undefined') throw new Error('Cannot create providers on server');

  const addressString = await resolveShieldedAddress(walletApi);

  const networkInfo = typeof walletApi.getConfiguration === 'function'
    ? await walletApi.getConfiguration()
    : (walletApi.getConfiguration ?? walletApi.configuration ?? walletApi.state ?? {});
  const networkId = (typeof networkInfo === 'function' ? await networkInfo() : networkInfo)?.networkId ?? 'Undeployed';

  // Configure the global network ID required by the address parser
  setNetworkId(networkId);

  const parsedAddress = MidnightBech32m.parse(addressString).decode(ShieldedAddress, networkId);
  const coinPublicKey = parsedAddress.coinPublicKey.data;
  const encryptionPublicKey = parsedAddress.encryptionPublicKey.data;

  const walletProvider = {
    coinPublicKey,
    encryptionPublicKey,
    getCoinPublicKey: () => toHex(coinPublicKey),
    getEncryptionPublicKey: () => toHex(encryptionPublicKey),
    balanceTx: async (tx: any, _newCoins: any): Promise<any> => {
      const txHex = toHex(tx.serialize());
      const recipe = await walletApi.balanceUnsealedTransaction(txHex);
      return fromHex(recipe.tx);
    },
    submitTx: async (tx: any): Promise<string> => {
      let txHex: string;
      if (typeof tx === 'object' && typeof tx.serialize === 'function') {
        txHex = toHex(tx.serialize());
      } else {
        txHex = toHex(tx);
      }
      
      const res = await walletApi.submitTransaction(txHex);
      if (res && typeof res === 'string') {
        return res;
      }
      
      if (typeof tx === 'object' && typeof tx.transactionHash === 'function') {
        return tx.transactionHash();
      }
      
      // The wallet handles signing/sealing, which changes the final transaction hash.
      // Since older wallet APIs do not return the hash, and we cannot compute it here,
      // we will directly ask the user to paste the hash from their wallet history!
      try {
        if (typeof window !== 'undefined') {
          const userHash = window.prompt(
            "Wallet API did not return the transaction hash automatically.\n\n" +
            "Please open your Lace wallet, go to Activity, find the latest transaction, " +
            "copy its Transaction ID, and paste it here so the DApp can confirm the deployment:"
          );
          if (userHash && userHash.trim().length > 10) {
            return userHash.trim();
          }
        }
      } catch (e) {
        console.warn("Failed to prompt user for hash", e);
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
      accountId: addressString,
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
