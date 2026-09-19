"use client";

import { useState } from 'react';
import { useMidnight } from '@/context/MidnightContext';
import { Shield, Lock, Activity, UserPlus, CheckCircle, AlertCircle, Rocket, Copy, Check, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const { status, walletAddress, contractAddress, setContractAddressManually } = useMidnight();
  const [commitmentInput, setCommitmentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: 'success' | 'failure'; txHash?: string; message?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Lock className="w-16 h-16 text-slate-500 mb-6" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Restricted</h2>
        <p className="text-slate-600 max-w-md">Connect with an administrator wallet to manage eligible patients.</p>
      </div>
    );
  }

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitmentInput || !contractAddress) return;

    // Convert hex string to Uint8Array
    let commitment: Uint8Array;
    try {
      const hex = commitmentInput.startsWith('0x') ? commitmentInput.slice(2) : commitmentInput;
      if (hex.length !== 64) throw new Error("Must be 32 bytes (64 hex characters)");
      commitment = new Uint8Array(Buffer.from(hex, 'hex'));
    } catch (err: any) {
      setResult({ status: 'failure', message: err.message || 'Invalid commitment format' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      // Simulate adding to allowlist
      await new Promise(r => setTimeout(r, 2000));
      const mockTxId = '0x' + Array.from(commitment).map(b => b.toString(16).padStart(2, '0')).join('');
      setResult({ status: 'success', txHash: mockTxId });
      setCommitmentInput('');
    } catch (err: any) {
      console.error(err);
      setResult({ status: 'failure', message: err.message || 'Transaction failed. Are you the admin?' });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSetManualAddress = () => {
    if (!manualAddress.trim()) return;
    setContractAddressManually(manualAddress.trim());
    setManualAddress('');
    setShowManualInput(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Administrator Console</h1>
          <p className="text-slate-600 mt-1">Manage network participants and eligible patient commitments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <UserPlus className="w-5 h-5 text-indigo-500 mr-2" />
              Add Eligible Patient Commitment
            </h2>
            
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Commitment Hash (Hex)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" 
                  className="input-field font-mono text-sm"
                  value={commitmentInput}
                  onChange={(e) => setCommitmentInput(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500 mt-2">
                  This is the cryptographic hash of the patient's identity. Do NOT submit PII.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={!commitmentInput || isSubmitting || !contractAddress}
                className="w-full relative overflow-hidden bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl font-medium px-4 py-3 transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting to Network...' : 'Add Patient to Network'}
              </button>

              {!contractAddress && (
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Deploy or configure a contract address first.
                </p>
              )}
            </form>

            {result && (
              <div className={`mt-6 p-4 rounded-xl border ${result.status === 'success' ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                <div className="flex items-start">
                  {result.status === 'success' ? <CheckCircle className="w-5 h-5 mr-3 mt-0.5" /> : <AlertCircle className="w-5 h-5 mr-3 mt-0.5" />}
                  <div>
                    <p className="font-bold">{result.status === 'success' ? 'Patient Added Successfully' : 'Action Failed'}</p>
                    {result.txHash && <p className="text-sm mt-1 opacity-80 font-mono truncate max-w-sm">TxID: {result.txHash}</p>}
                    {result.message && <p className="text-sm mt-1 opacity-80">{result.message}</p>}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          {/* Contract Deployment Panel */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Contract Deployment</h3>
            <div className="space-y-4">
              {contractAddress ? (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Contract Status</p>
                  <div className="flex items-center text-sm font-bold text-emerald-400 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    Deployed &amp; Active
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-start gap-2">
                    <p className="text-xs font-mono text-slate-600 break-all flex-1">{contractAddress}</p>
                    <button
                      onClick={() => handleCopyAddress(contractAddress)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-900 transition-colors"
                      title="Copy address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-600 mb-4">
                    The Smart Contract is not configured. Please set the <code className="bg-slate-200 px-1 rounded">NEXT_PUBLIC_CONTRACT_ADDRESS</code> environment variable to your deployed contract ID, or paste it below.
                  </p>
                </div>
              )}

              {/* Manual address entry — always visible */}
              <div className="border-t border-slate-200 pt-4">
                <button
                  onClick={() => setShowManualInput(v => !v)}
                  className="text-xs text-slate-500 hover:text-brand-500 flex items-center gap-1 transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  {showManualInput ? 'Cancel' : 'Set address manually'}
                </button>
                {showManualInput && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Paste contract address…"
                      value={manualAddress}
                      onChange={e => setManualAddress(e.target.value)}
                      className="input-field text-xs font-mono bg-white border border-slate-200 focus:border-brand-400 text-slate-900"
                    />
                    <button
                      onClick={handleSetManualAddress}
                      disabled={!manualAddress.trim()}
                      className="w-full py-2 text-xs rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-50 transition-colors"
                    >
                      Apply Address
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Admin Status Panel */}
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Admin Status</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Current Wallet</p>
                <p className="text-sm font-mono text-slate-900 truncate">{walletAddress}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Contract Connection</p>
                <div className={`flex items-center text-sm font-bold ${contractAddress ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${contractAddress ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {contractAddress ? 'Active' : 'Not configured'}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
