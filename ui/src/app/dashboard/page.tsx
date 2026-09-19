"use client";

import { useMidnight } from '@/context/MidnightContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wallet, Shield, Activity, Key, ArrowRight, Server, Loader2, Check } from 'lucide-react';

export default function DashboardPage() {
  const { status, walletAddress, walletName, coinPublicKey, network, contractAddress, connectWallet, connectionError, deployContractAction, hasShieldedAccount, txStatus, txError } = useMidnight();
  const [connecting, setConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(contractAddress);

  // Keep deployedAddress in sync with context (e.g. after localStorage hydration)
  useEffect(() => {
    if (contractAddress && !deployedAddress) setDeployedAddress(contractAddress);
  }, [contractAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setMounted(true), []);

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  if (!mounted) return null;

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
    : '—';

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="glass-panel p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-6">
            <Wallet size={28} className="text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h2>
          <p className="text-slate-600 mb-6">Connect your wallet to access your membership control panel.</p>
          <button
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20"
            onClick={handleConnect}
            disabled={connecting || status === 'connecting'}
          >
            {connecting || status === 'connecting' ? <><Loader2 size={18} className="animate-spin" /> Connecting…</> : 'Connect Wallet'}
          </button>
          {status === 'error' && connectionError && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {connectionError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Dashboard</h1>
          <p className="text-slate-600">Your membership control panel.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-sm font-semibold border border-emerald-200 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" /> Session Active
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Wallet */}
        <div className="glass-panel p-6 border-l-4 border-l-brand-500">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Wallet</div>
            <Wallet size={18} className="text-brand-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 font-mono break-all mb-1">{shortAddr}</div>
          <div className="text-xs text-slate-500">{walletName}</div>
        </div>

        {/* Network */}
        <div className="glass-panel p-6 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Network</div>
            <Activity size={18} className="text-blue-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 mb-1">{network.name}</div>
          <div className="text-xs text-slate-500">Midnight blockchain</div>
        </div>

        {/* Membership */}
        <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Membership</div>
            <Shield size={18} className="text-emerald-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 mb-1">
            {deployedAddress ? 'Active' : 'Pending'}
          </div>
          <div className="text-xs text-slate-500">
            {deployedAddress ? 'Contract deployed' : 'Contract not deployed'}
          </div>
        </div>

        {/* Contract */}
        <div className="glass-panel p-6 border-l-4 border-l-purple-500">
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Contract</div>
            <Key size={18} className="text-purple-500" />
          </div>
          <div className="text-xs font-bold font-mono break-all mb-1">
            {deployedAddress ? (
              <a 
                href={`https://preview.midnightexplorer.com/contracts/${deployedAddress}`} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg transition-colors border border-brand-200"
              >
                {deployedAddress.slice(0, 8)}…{deployedAddress.slice(-6)} ↗
              </a>
            ) : <span className="text-slate-400">Not configured</span>}
          </div>
          <div className="text-xs text-slate-500">Organisation registry</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/membership" className="glass-panel p-6 flex justify-between items-center group cursor-pointer transition-all hover:-translate-y-1">
          <div>
            <div className="font-bold text-lg text-slate-900 mb-1 group-hover:text-brand-500 transition-colors">Manage Membership</div>
            <div className="text-sm text-slate-600">Join or update your membership status</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-500 text-slate-400 transition-colors">
            <ArrowRight size={20} />
          </div>
        </Link>
        
        <Link href="/verify" className="glass-panel p-6 flex justify-between items-center group cursor-pointer transition-all hover:-translate-y-1">
          <div>
            <div className="font-bold text-lg text-slate-900 mb-1 group-hover:text-brand-500 transition-colors">Verify Membership</div>
            <div className="text-sm text-slate-600">Generate a zero-knowledge membership proof</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-500 text-slate-400 transition-colors">
            <ArrowRight size={20} />
          </div>
        </Link>
      </div>

      {/* Contract Status Panel */}
      <div className="glass-panel p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-50 rounded-lg">
            <Server size={20} className="text-brand-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">System Status</h2>
        </div>

        {/* Readiness checklist */}
        <div className="space-y-4 mb-6">
          {[
            { label: 'Wallet', ok: status === 'connected', value: status === 'connected' ? `Connected (${walletName})` : 'Not connected' },
            { label: 'Network', ok: true, value: network.name },
            { label: 'Contract', ok: true, value: 'Anonymous Membership (Compiled)' },
            { label: 'Contract Address', ok: !!deployedAddress, value: deployedAddress ? <span className="break-all text-[11px] leading-tight block mt-1">{deployedAddress}</span> : 'Not deployed' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.ok ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'}`} />
              <div className="w-36 text-sm font-semibold text-slate-500 flex-shrink-0">{item.label}</div>
              <div className={`text-sm text-slate-900 ${item.label === 'Contract Address' ? 'font-mono' : ''}`}>{item.value}</div>
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}
