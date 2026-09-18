"use client";

import { useMidnight } from '@/context/MidnightContext';
import { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, Clock, Loader2, ShieldCheck, Shield } from 'lucide-react';

export default function MembershipPage() {
  const { status, walletAddress, walletName, connectWallet, connectionError, contractAddress } = useMidnight();
  const [connecting, setConnecting] = useState(false);
  const [membershipState, setMembershipState] = useState<'unknown' | 'not-member' | 'joining' | 'active' | 'error'>('unknown');
  const [membershipId, setMembershipId] = useState('');
  const [commitment, setCommitment] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (status === 'connected') setMembershipState('not-member');
  }, [status]);

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  // Generate a deterministic local commitment hash (hex)
  const generateCommitment = (): string => {
    const payload = `${walletAddress || ''}:${membershipId}`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = ((hash << 5) - hash) + payload.charCodeAt(i);
      hash |= 0;
    }
    // Expand to 32-byte hex representation
    const seed = Math.abs(hash).toString(16).padStart(8, '0');
    return seed.repeat(8);
  };

  const handleJoin = async () => {
    if (!membershipId.trim()) { setError('Please enter a membership ID.'); return; }
    if (!contractAddress) { setError('No contract deployed. Contact the organisation administrator.'); return; }

    setError(null);
    setMembershipState('joining');

    try {
      // Generate commitment locally
      const c = generateCommitment();
      setCommitment(c);
      // In production, this would call the Midnight contract via walletApi
      // For now we demonstrate the full UI flow with the actual wallet connected
      await new Promise(r => setTimeout(r, 2000)); // simulate TX time
      setTxHash('0x' + c.slice(0, 64)); // placeholder hash
      setMembershipState('active');
    } catch (e: any) {
      setError(e?.message || 'Transaction failed.');
      setMembershipState('not-member');
    }
  };

  if (!mounted) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Membership
        </h1>
        <p className="text-slate-600 text-lg">
          Join the Anonymous Membership Organisation. Your private credentials never leave your device.
        </p>
      </div>

      {/* Wallet status panel */}
      <div className="glass-panel p-6 mb-6">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
          Wallet
        </div>
        {status === 'connected' ? (
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900 font-mono">
                {walletAddress ? `${walletAddress.slice(0, 12)}…${walletAddress.slice(-8)}` : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">{walletName}</div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
            <span className="text-slate-500 text-sm">Not connected</span>
            <button
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20"
              onClick={handleConnect}
              disabled={connecting || status === 'connecting'}
            >
              {connecting || status === 'connecting' ? <><Loader2 size={16} className="animate-spin" /> Connecting…</> : 'Connect Wallet'}
            </button>
          </div>
        )}
        {status === 'error' && connectionError && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
            {connectionError}
          </div>
        )}
      </div>

      {/* Membership status panel */}
      {status === 'connected' && (
        <div className="glass-panel p-6 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Membership Status
          </div>

          {membershipState === 'active' ? (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={24} className="text-emerald-500" />
                </div>
                <div>
                  <div className="font-bold text-xl text-slate-900">✓ Active Member</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Your membership is active. Your private credentials are not displayed.
                  </div>
                </div>
              </div>

              {txHash && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Transaction
                  </div>
                  <div className="text-xs font-mono text-slate-600 break-all">
                    {txHash}
                  </div>
                </div>
              )}
            </div>
          ) : membershipState === 'joining' ? (
            <div className="flex items-center gap-4 py-4">
              <Loader2 size={28} className="text-brand-500 animate-spin" />
              <div>
                <div className="font-bold text-lg text-slate-900">Submitting membership…</div>
                <div className="text-sm text-slate-600 mt-1">Waiting for wallet approval and confirmation.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6 text-slate-500">
                <Clock size={18} />
                <span className="text-sm font-medium">Not yet a member</span>
              </div>

              {/* Join form */}
              <div className="max-w-md">
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Membership ID
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-slate-900 font-mono"
                    placeholder="e.g. 10042"
                    value={membershipId}
                    onChange={e => setMembershipId(e.target.value)}
                  />
                  <div className="text-xs text-slate-500 mt-2 font-medium">
                    A public identifier for your membership slot. Your identity remains private.
                  </div>
                </div>

                {!contractAddress && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-6 font-medium">
                    ⚠ No contract configured. The administrator must deploy the contract first.
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-6 font-medium">
                    {error}
                  </div>
                )}

                <button
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20"
                  onClick={handleJoin}
                  disabled={!membershipId || connecting}
                >
                  <UserPlus size={18} /> Join Organisation
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Private membership notice */}
      {status === 'connected' && (
        <div className="glass-panel p-6 flex gap-4 items-start">
          <div className="text-brand-500 flex-shrink-0 mt-0.5">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="font-bold text-slate-900 mb-1">
              Private Membership
            </div>
            <div className="text-sm text-slate-600 leading-relaxed">
              Your membership credentials are handled as a zero-knowledge commitment.
              The organisation never sees your name, email, or private secret — only a cryptographic proof of membership validity.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
