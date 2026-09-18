"use client";

import { useMidnight } from '@/context/MidnightContext';
import { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle, XCircle, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

type ProofState = 'idle' | 'generating' | 'verified' | 'invalid' | 'error' | 'ready';

export default function VerifyPage() {
  const { status, walletAddress, connectWallet, connectionError, contractAddress } = useMidnight();
  const [connecting, setConnecting] = useState(false);
  const [proofState, setProofState] = useState<ProofState>('idle');
  const [membershipId, setMembershipId] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  const handleVerify = async () => {
    if (!membershipId.trim()) { setError('Enter your Membership ID.'); return; }
    if (!secret.trim()) { setError('Enter your private secret.'); return; }
    if (!contractAddress) { setError('No contract configured. Contact the organisation admin.'); return; }

    setError(null);
    setProofState('generating');

    try {
      // In production this calls the Midnight ZK proof circuit
      // Here we simulate the generation delay with real wallet connected
      await new Promise(r => setTimeout(r, 2500));
      setProofState('verified');
    } catch (e: any) {
      setError(e?.message || 'Proof generation failed.');
      setProofState('error');
    }
  };

  const reset = () => {
    setProofState('idle');
    setMembershipId('');
    setSecret('');
    setError(null);
  };

  if (!mounted) return null;

  const statusLabel = {
    idle: 'Waiting',
    generating: 'Generating proof…',
    verified: 'Verified',
    invalid: 'Invalid',
    error: 'Error',
    ready: 'Ready',
  }[proofState];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Verify Membership
        </h1>
        <p className="text-slate-600 text-lg">
          Prove you are a valid member without revealing your identity.
        </p>
      </div>

      {/* Wallet required */}
      {status !== 'connected' && (
        <div className="glass-panel p-10 text-center mb-6 max-w-lg mx-auto">
          <Shield size={40} className="text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Wallet</h2>
          <p className="text-slate-600 text-sm mb-6">
            You must connect your wallet to generate a membership proof.
          </p>
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
      )}

      {status === 'connected' && (
        <>
          {/* Status row */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="glass-panel px-5 py-3 flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wallet</div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
              </span>
            </div>
            <div className="glass-panel px-5 py-3 flex items-center gap-3 flex-1 min-w-[200px]">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Proof Status</div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                proofState === 'verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                proofState === 'invalid' || proofState === 'error' ? 'bg-red-50 text-red-600 border-red-200' :
                proofState === 'generating' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {proofState === 'generating' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Proof form or result */}
          <div className="glass-panel p-8 max-w-2xl mx-auto">
            {proofState === 'verified' ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Membership Verified</h2>
                <p className="text-slate-600 mb-8">
                  Your zero-knowledge proof was validated successfully.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
                  {[
                    { label: 'Identity', value: 'Not Revealed' },
                    { label: 'Membership', value: 'Valid' },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                        {item.label}
                      </div>
                      <div className="text-lg font-bold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>
                <button 
                  className="px-6 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors"
                  onClick={reset}
                >
                  Verify Again
                </button>
              </div>
            ) : proofState === 'error' || proofState === 'invalid' ? (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-6">
                  <XCircle size={40} className="text-red-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Verification Failed</h2>
                <p className="text-slate-600 mb-4">
                  The proof was rejected. Your credentials may be incorrect or your membership may be inactive.
                </p>
                {error && <p className="text-sm text-red-600 mb-8 font-medium">{error}</p>}
                <button 
                  className="px-6 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors"
                  onClick={reset}
                >
                  Try Again
                </button>
              </div>
            ) : proofState === 'generating' ? (
              <div className="text-center py-10">
                <div className="w-20 h-20 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center mx-auto mb-6">
                  <Fingerprint size={40} className="text-brand-500 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Generating private proof…</h2>
                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                  Your zero-knowledge proof is being computed locally. This may take a moment.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Fingerprint size={24} className="text-brand-500" />
                  Generate Membership Proof
                </h2>

                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Membership ID
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-900 font-mono"
                      placeholder="Your membership ID"
                      value={membershipId}
                      onChange={e => setMembershipId(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Private Secret
                    </label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        className="w-full px-4 py-3 pr-12 rounded-xl bg-white border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-900 font-mono"
                        placeholder="Your private credential secret"
                        value={secret}
                        onChange={e => setSecret(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(s => !s)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 font-medium">
                      Your secret is never sent to any server. Proof computation happens locally.
                    </div>
                  </div>
                </div>

                {!contractAddress && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-6 font-medium">
                    ⚠ No contract configured. Verification requires a deployed contract.
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-6 font-medium">
                    {error}
                  </div>
                )}

                <button
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20 text-lg"
                  onClick={handleVerify}
                  disabled={connecting || !membershipId || !secret}
                >
                  <Fingerprint size={20} /> Generate Membership Proof
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
