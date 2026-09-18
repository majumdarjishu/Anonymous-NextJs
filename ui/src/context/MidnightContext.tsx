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
  preprod: {
    name: 'Midnight Preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    proofServer: 'http://localhost:6300',
    zkConfigPathUrl: '/contracts/managed/anonymous-membership-organisation',
  },
};

const CONTRACT_ADDRESS_STORAGE_KEY = 'midnight_contract_address';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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

  for (const key of Object.keys(w.midnight)) {
    const p = w.midnight[key];
    if (p && (typeof p.enable === 'function' || typeof p.connect === 'function')) {
      const name = (typeof p.name === 'string' && p.name.trim()) ? p.name.trim() : formatWalletKeyName(key);
      console.log(`[wallet] Detected via fallback key "${key}": ${name}`);
      return { provider: p, name, key };
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
    const knownKeys = ['address', 'shieldedAddress', 'bech32', 'value', 'addr', 'coinPublicKey'];
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

/** Resolve shielded address from wallet API — works with both function and property APIs */
async function resolveDisplayAddress(
  api: any,
  provider: any
): Promise<{ address: string; hasShielded: boolean }> {
  // Log all available keys for debugging
  const apiKeys = getAllKeys(api);
  const providerKeys = getAllKeys(provider);
  console.log('[wallet-connect] API keys:', apiKeys.join(', '));
  console.log('[wallet-connect] Provider keys:', providerKeys.join(', '));
  console.log('[wallet-connect] typeof api.state:', typeof api?.state);
  console.log('[wallet-connect] typeof api.getShieldedAddresses:', typeof api?.getShieldedAddresses);

  const methodsToTry = [
    'getShieldedAddresses',
    'getShieldedAddress',
    'shieldedAddresses',
    'getAddresses',
    'addresses',
  ];

  // Try on API object first, then on provider (some wallets keep methods on provider)
  for (const obj of [api, provider]) {
    for (const methodName of methodsToTry) {
      try {
        const raw = await callOrRead(obj, methodName);
        if (raw === undefined) continue;
        console.log(`[wallet-connect] ${methodName} on ${obj === api ? 'api' : 'provider'}:`,
          JSON.stringify(raw, (_k, v) => v instanceof Uint8Array ? `Uint8Array(${v.length})` : v));
        const addr = extractAddressString(raw);
        if (addr) return { address: addr, hasShielded: true };
      } catch (e) {
        // ignore
      }
    }
  }

  // Try state() or state property on both objects
  for (const [label, obj] of [['api', api], ['provider', provider]] as [string, any][]) {
    try {
      const state = await callOrRead(obj, 'state');
      if (state === undefined) continue;
      console.log(`[wallet-connect] state on ${label}:`,
        JSON.stringify(state, (_k, v) => v instanceof Uint8Array ? `Uint8Array(${v.length})` : v));
      if (state && typeof state === 'object') {
        // Look for mn-prefixed string (Midnight shielded address)
        for (const v of Object.values(state)) {
          if (typeof v === 'string' && v.startsWith('mn') && v.length > 10)
            return { address: v, hasShielded: true };
        }
        // ServiceUriConfig guard: skip if it has indexer (network config, not account)
        if (!state.indexer) {
          const addr = state.address || state.coinPublicKey;
          if (addr && typeof addr === 'string') return { address: addr, hasShielded: false };
        }
      }
    } catch (_) {}
  }

  return { address: 'no-shielded-account', hasShielded: false };
}

export function MidnightProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [coinPublicKey, setCoinPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string>('');
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [walletApi, setWalletApi] = useState<any | null>(null);
  const [hasShieldedAccount, setHasShieldedAccount] = useState(false);

  const [contractAddress, setContractAddress] = useState<string | null>(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
  );

  useEffect(() => {
    if (!contractAddress) {
      const saved = localStorage.getItem(CONTRACT_ADDRESS_STORAGE_KEY);
      if (saved) setContractAddress(saved);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setContractAddressManually = useCallback((address: string) => {
    const trimmed = address.trim();
    if (trimmed) {
      localStorage.setItem(CONTRACT_ADDRESS_STORAGE_KEY, trimmed);
      setContractAddress(trimmed);
    }
  }, []);

  const envNetwork = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK || 'local';
  const network = NETWORKS[envNetwork] || NETWORKS.preprod;

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

      const api = typeof detected.provider.connect === 'function'
        ? await detected.provider.connect()
        : await detected.provider.enable();

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

    const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts');
    const { createMidnightProviders, getCompiledContract, PRIVATE_STATE_ID } = await import('../lib/midnight');
    const { fromHex } = await import('@midnight-ntwrk/midnight-js-utils');

    const providers = await createMidnightProviders(walletApi, network);
    const compiledContract = await getCompiledContract(network.zkConfigPathUrl);

    const deployed = await deployContract(providers, {
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {
        credential: () => ({
          secret: new Uint8Array(32),
          membershipId: 0n
        })
      },
      compiledContract: compiledContract as any,
      args: [typeof providers.walletProvider.coinPublicKey === 'string' ? fromHex(providers.walletProvider.coinPublicKey as string) : providers.walletProvider.coinPublicKey],
    });

    const address = deployed.deployTxData.public.contractAddress;
    localStorage.setItem(CONTRACT_ADDRESS_STORAGE_KEY, address);
    setContractAddress(address);

    return address;
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
      deployContractAction,
      connectWallet,
      disconnectWallet,
      setContractAddressManually,
    }}>
      {children}
    </MidnightContext.Provider>
  );
}

export function useMidnight() {
  const ctx = useContext(MidnightContext);
  if (!ctx) throw new Error('useMidnight must be used within MidnightProvider');
  return ctx;
}
