"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface NetworkConfig {
  name: string;
  indexer: string;
  indexerWS: string;
  proofServer: string;
  zkConfigPathUrl: string;
}

const NETWORKS: Record<string, NetworkConfig> = {
  local: {
    name: 'Local Devnet',
    indexer: 'http://localhost:8089/api/v1/graphql',
    indexerWS: 'ws://localhost:8089/api/v1/graphql/ws',
    proofServer: 'http://localhost:6300',
    zkConfigPathUrl: '/contracts/managed/anonymous-membership-organisation',
  },
  testnet: {
    name: 'Midnight Testnet',
    indexer: 'https://indexer.testnet.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.testnet.midnight.network/api/v4/graphql/ws',
    proofServer: 'http://localhost:6300',
    zkConfigPathUrl: '/contracts/managed/anonymous-membership-organisation',
  },

  preview: {
    name: 'Midnight Preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    proofServer: 'http://localhost:6300',
    zkConfigPathUrl: '/contracts/managed/anonymous-membership-organisation',
  },
};

const CONTRACT_ADDRESS_STORAGE_KEY = 'midnight_contract_address';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type TxStatus = 'idle' | 'submitting' | 'submitted' | 'confirming' | 'confirmed' | 'failed';

interface MidnightContextType {
  walletAddress: string | null;
  walletName: string;
  coinPublicKey: string | null;
  status: WalletStatus;
  connectionError: string | null;
  network: NetworkConfig;
  contractAddress: string | null;
  walletApi: any | null;
  hasShieldedAccount: boolean;
  txStatus: TxStatus;
  txError: string | null;
  deployContractAction: () => Promise<string>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  setContractAddressManually: (address: string) => void;
}

const MidnightContext = createContext<MidnightContextType | undefined>(undefined);

function formatWalletKeyName(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^1am$/i, '1AM Wallet')
    .replace(/^t1am$/i, '1AM Wallet')
    .replace(/^mnlace$/i, 'Lace Wallet')
    .replace(/^lace$/i, 'Lace Wallet')
    .replace(/^midnight$/i, 'Midnight Wallet');
}

function detectMidnightWallet(): { provider: any; name: string; key: string } | null {
  const w = window as any;
  if (!w.midnight) return null;

  const candidates = [
    { key: 'mnLace', label: 'Lace Wallet' },
    { key: 'midnight', label: 'Midnight Wallet' },
    { key: 't1am', label: '1AM Wallet' },
    { key: '1am', label: '1AM Wallet' },
    { key: 'lace', label: 'Lace Wallet' },
  ];

  for (const c of candidates) {
    const p = w.midnight[c.key];
    if (p && (typeof p.enable === 'function' || typeof p.connect === 'function')) {
      const name = (typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : c.label;
      console.log(`[wallet] Detected via key "${c.key}": ${name}`);
      return { provider: p, name, key: c.key };
    }
  }

  for (const key of getAllKeys(w.midnight)) {
    const p = w.midnight[key];
    if (p && (typeof p.enable === 'function' || typeof p.connect === 'function')) {
      const name = (typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : formatWalletKeyName(String(key));
      console.log(`[wallet] Detected via fallback key "${String(key)}": ${name}`);
      return { provider: p, name, key: String(key) };
    }
  }

  if (typeof w.midnight.enable === 'function' || typeof w.midnight.connect === 'function') {
    const name = (typeof w.midnight.name === 'string' && w.midnight.name.trim()) ? w.midnight.name.trim() : 'Midnight Wallet';
    return { provider: w.midnight, name, key: 'midnight' };
  }

  return null;
}

/** Get all accessible keys on an object including prototype chain */
function getAllKeys(obj: any): string[] {
  const keys = new Set<string>();
  try {
    for (const k of Object.keys(obj ?? {})) keys.add(k);
    for (const k of Object.getOwnPropertyNames(obj ?? {})) keys.add(k);
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) {
      for (const k of Object.getOwnPropertyNames(proto)) keys.add(k);
    }
  } catch (_) {}
  return [...keys].sort();
}

/** Call a method OR read it as a plain property — handles both API styles */
async function callOrRead(obj: any, methodName: string): Promise<any> {
  const val = obj?.[methodName];
  if (typeof val === 'function') return await val.call(obj);
  if (val !== undefined) return val; // plain property (some wallets do this)
  return undefined;
}

/** Extract a shielded address string from any possible return value */
function extractAddressString(raw: any): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (raw instanceof Uint8Array && raw.length > 0)
    return Array.from(raw as Uint8Array).map((b: number) => b.toString(16).padStart(2, '0')).join('');
  if (Array.isArray(raw)) {
    for (const item of raw) { const r = extractAddressString(item); if (r) return r; }
    return null;
  }
  if (typeof raw === 'object') {
    const knownKeys = ['address', 'unshieldedAddress', 'shieldedAddress', 'bech32', 'value', 'addr', 'coinPublicKey'];
    for (const k of knownKeys) {
      if (typeof raw[k] === 'string' && raw[k].length > 0) return raw[k];
    }
    // Scan all string values — prefer mn-prefixed (Midnight bech32m)
    for (const v of Object.values(raw)) {
      if (typeof v === 'string' && v.startsWith('mn') && v.length > 10) return v;
    }
    // Any long string that looks like an address
    for (const v of Object.values(raw)) {
      if (typeof v === 'string' && v.length > 20) return v;
    }
    // Recurse into nested objects one level
    for (const v of Object.values(raw)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const r = extractAddressString(v);
        if (r) return r;
      }
    }
  }
  return null;
}

/** Resolve unshielded address for UI display, and check if shielded account exists */
async function resolveDisplayAddress(
  api: any,
  provider: any
): Promise<{ address: string; hasShielded: boolean }> {
  let displayAddress = 'no-unshielded-account';
  let hasShielded = false;

  // 1. Check for shielded keys (for contract functionality)
  try {
    const shieldedRaw = await callOrRead(api, 'getShieldedAddresses');
    if (shieldedRaw) {
      const target = Array.isArray(shieldedRaw) ? shieldedRaw[0] : shieldedRaw;
      if (target && target.shieldedCoinPublicKey) {
        hasShielded = true;
      }
    }
  } catch (e) {
    console.warn('[wallet-connect] Failed to check getShieldedAddresses:', e);
  }

  // 2. Get unshielded address for UI display (for tDUST)
  const unshieldedMethods = ['getUnshieldedAddress', 'getUnshieldedAddresses', 'addresses'];
  for (const obj of [api, provider]) {
    for (const method of unshieldedMethods) {
      try {
        const raw = await callOrRead(obj, method);
        const addr = extractAddressString(raw);
        if (addr) {
          displayAddress = addr;
          break;
        }
      } catch (e) {}
    }
    if (displayAddress !== 'no-unshielded-account') break;
  }

  // Fallback to state() if unshielded methods failed
  if (displayAddress === 'no-unshielded-account') {
    try {
      const state = await callOrRead(api, 'state');
      if (state && typeof state === 'object' && !state.indexer) {
        const addr = state.unshieldedAddress || state.address;
        if (addr && typeof addr === 'string') {
          displayAddress = addr;
        }
      }
    } catch (e) {}
  }

  return { address: displayAddress, hasShielded };
}

export function MidnightProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string>('');
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [walletApi, setWalletApi] = useState<any | null>(null);
  const [hasShieldedAccount, setHasShieldedAccount] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [txHashRequest, setTxHashRequest] = useState<{ resolve: (hash: string) => void, reject: (err: Error) => void } | null>(null);

  const [contractAddress, setContractAddress] = useState<string | null>(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'f08cca551c180698e9e3a8b85ef6b192ac03f95350ec2bf38281b3219d193f1b'
  );

  useEffect(() => {
    if (!contractAddress) {
      const saved = localStorage.getItem(CONTRACT_ADDRESS_STORAGE_KEY);
      if (saved && saved !== 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef') {
        setContractAddress(saved);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setContractAddressManually = useCallback((address: string) => {
    const trimmed = address.trim();
    if (trimmed) {
      localStorage.setItem(CONTRACT_ADDRESS_STORAGE_KEY, trimmed);
      setContractAddress(trimmed);
    }
  }, []);

  const envNetwork = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK || 'preview';
  const network = NETWORKS[envNetwork] || NETWORKS.preview;

  const connectWallet = useCallback(async () => {
    setStatus('connecting');
    setConnectionError(null);

    try {
      if (typeof window === 'undefined') throw new Error('Browser environment required.');

      const detected = detectMidnightWallet();
      if (!detected) {
        const w = window as any;
        const midnightKeys = w.midnight ? Object.keys(w.midnight).join(', ') : 'none';
        throw new Error(
          `No Midnight wallet detected. Install the Lace or 1AM wallet extension.\n(window.midnight keys: [${midnightKeys}])`
        );
      }

      let api;
      if (typeof detected.provider.connect === 'function') {
        try {
          api = await detected.provider.connect(envNetwork);
        } catch (err: any) {
          console.warn(`[wallet] connect('${envNetwork}') failed, falling back to enable():`, err);
          if (typeof detected.provider.enable === 'function') {
            api = await detected.provider.enable();
          } else {
            throw err;
          }
        }
      } else if (typeof detected.provider.enable === 'function') {
        api = await detected.provider.enable();
      } else {
        throw new Error('Wallet provider does not support connect() or enable().');
      }

      if (!api) throw new Error('Wallet did not return an API. Authorization may have been rejected.');

      if (typeof api.getUtxos === 'function' && typeof api.state !== 'function' && typeof api.state !== 'object') {
        throw new Error('Detected a Cardano CIP-30 wallet instead of a Midnight wallet.');
      }

      const { address, hasShielded } = await resolveDisplayAddress(api, detected.provider);

      setWalletApi(api);
      setWalletAddress(address);
      setCoinPublicKey(null);
      setWalletName(detected.name);
      setHasShieldedAccount(hasShielded);
      setStatus('connected');
    } catch (err: any) {
      console.warn('[wallet] Connection error:', err);
      setStatus('error');
      const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Connection failed.';
      setConnectionError(msg);
    }
  }, []);

  const deployContractAction = useCallback(async () => {
    if (!walletApi) throw new Error('Wallet not fully connected');
    if (!hasShieldedAccount) {
      throw new Error('A shielded account is required to deploy contracts.');
    }
    
    setTxStatus('submitting');
    setTxError(null);

    try {
      const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');
      const { createMidnightProviders, getCompiledContract, PRIVATE_STATE_ID } = await import('../lib/midnight');
      const { fromHex } = await import('@midnight-ntwrk/midnight-js-utils');

      const providers = await createMidnightProviders(walletApi, network, () => {
        setTxStatus('submitted');
        return new Promise((resolve, reject) => {
          setTxHashRequest({ resolve, reject });
        });
      });
      const compiledContract = await getCompiledContract(network.zkConfigPathUrl);

      // We don't set to 'confirming' here because deployContract will do proving and submitting internally.
      // The txHashRequest will trigger 'submitted' right after submitTransaction resolves.
      
      let deployed: any;
      try {
        deployed = await deployContract(providers as any, {
          privateStateId: PRIVATE_STATE_ID,
          initialPrivateState: {},
          compiledContract: compiledContract as any,
          args: [typeof providers.walletProvider.coinPublicKey === 'string' ? fromHex(providers.walletProvider.coinPublicKey as string) : providers.walletProvider.coinPublicKey],
        });
      } catch (deployErr: any) {
        // If deployment or signature is cancelled, we MUST clear the TxStatus!
        setTxStatus('idle');
        throw deployErr;
      }
      
      console.log(`[Midnight] Deployment completed! Contract address: ${deployed.deployTxData.public.contractAddress}`);
      const address = deployed.deployTxData.public.contractAddress;
      localStorage.setItem(CONTRACT_ADDRESS_STORAGE_KEY, address);
      setContractAddress(address);
      
      setTxStatus('confirmed');
      setTimeout(() => setTxStatus('idle'), 5000);
      
      return address;
    } catch (e: any) {
      setTxStatus('failed');
      const errMsg = e?.message || String(e);
      setTxError(errMsg);
      
      if (errMsg.includes('A transaction is already pending')) {
        const robustErrorMsg = 'A transaction is already pending in your 1AM wallet. To clear it: Open the 1AM extension, switch to Mainnet, then back to Preview. Or disconnect and reconnect.';
        console.error(robustErrorMsg);
        throw new Error(robustErrorMsg);
      }
      
      throw e;
    }
  }, [walletApi, network]);

  const disconnectWallet = useCallback(() => {
    setWalletApi(null);
    setWalletAddress(null);
    setCoinPublicKey(null);
    setWalletName('');
    setHasShieldedAccount(false);
    setStatus('disconnected');
    setConnectionError(null);
  }, []);

  return (
    <MidnightContext.Provider value={{
      walletAddress,
      walletName,
      coinPublicKey,
      status,
      connectionError,
      network,
      contractAddress,
      walletApi,
      hasShieldedAccount,
      txStatus,
      txError,
      deployContractAction,
      connectWallet,
      disconnectWallet,
      setContractAddressManually,
    }}>
      {children}
      {txHashRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl mx-4 border border-brand-100">
            <h3 className="text-xl font-bold text-slate-900 mb-3">Transaction Submitted!</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Your wallet has submitted the transaction, but it didn't return the Transaction ID automatically. 
              To continue, please open your 1AM/Lace wallet, go to the <strong>Activity</strong> tab, copy the Transaction ID of the latest transaction, and paste it below:
            </p>
            <input 
              type="text" 
              id="tx-hash-input" 
              className="w-full p-3 border border-slate-300 rounded-xl mb-6 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" 
              placeholder="e.g. 8f4b...39a2" 
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { 
                  txHashRequest.reject(new Error('Transaction hash request cancelled by user')); 
                  setTxHashRequest(null); 
                }} 
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { 
                  const val = (document.getElementById('tx-hash-input') as HTMLInputElement).value;
                  if (val && val.trim().length > 10) { 
                    txHashRequest.resolve(val.trim()); 
                    setTxHashRequest(null); 
                    setTxStatus('confirming');
                  }
                }} 
                className="px-5 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-500/30 transition-all"
              >
                Confirm Deployment
              </button>
            </div>
          </div>
        </div>
      )}
    </MidnightContext.Provider>
  );
}

export function useMidnight() {
  const ctx = useContext(MidnightContext);
  if (!ctx) throw new Error('useMidnight must be used within MidnightProvider');
  return ctx;
}
