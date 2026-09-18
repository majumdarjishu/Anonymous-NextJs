"use client";

import { useState } from 'react';
import { useMidnight } from '@/context/MidnightContext';
import { Shield, Key, Loader2, CheckCircle2, Copy, ArrowRight, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
  const { status } = useMidnight();
  const [secret, setSecret] = useState('');
  const [membershipId, setMembershipId] = useState('');
  const [commitment, setCommitment] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setCommitment(null);

    try {
      await new Promise(r => setTimeout(r, 1200)); // Simulate ZK hash generation
      const mockCommitment = Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setCommitment(mockCommitment);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (commitment) {
      try {
        await navigator.clipboard.writeText(commitment);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.warn('Failed to copy to clipboard:', err);
      }
    }
  };

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-12 max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-primary-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Authentication Required</h2>
          <p className="text-slate-500 mb-8">Connect your wallet to generate a secure membership commitment.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12">
      <div className="text-center mb-12">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <UserPlus className="w-8 h-8 text-primary-600" />
        </motion.div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Onboard Member</h1>
        <p className="text-lg text-slate-500 mt-3 max-w-2xl mx-auto">
          Generate a zero-knowledge commitment locally. Your secret never leaves this device.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-8 md:p-10">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-900 flex items-center justify-center font-bold text-sm mr-4">1</div>
            <h2 className="text-2xl font-bold text-slate-900">Private Credentials</h2>
          </div>
          
          <form onSubmit={generateCommitment} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Internal Membership ID</label>
              <input
                type="number"
                value={membershipId}
                onChange={(e) => setMembershipId(e.target.value)}
                placeholder="e.g. 10042"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Cryptographic Secret</label>
              <input
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter 64 hex characters"
                className="input-field font-mono text-sm tracking-widest"
                required
              />
              <p className="text-xs text-slate-500 mt-2 font-medium">⚠️ Store this safely. It is required for all future verifications.</p>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary w-full py-4 text-base mt-4 flex items-center justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Computing Hash...
                </>
              ) : (
                <>
                  Generate Commitment <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel p-8 md:p-10 bg-slate-50/50 border-slate-200/60">
          <div className="flex items-center mb-8">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm mr-4">2</div>
            <h2 className="text-2xl font-bold text-slate-900">Public Output</h2>
          </div>
          
          <AnimatePresence mode="wait">
            {!commitment ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50"
              >
                <Key className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">Awaiting generation...</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                  <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-widest">Your Commitment Hash</p>
                  <p className="font-mono text-sm text-slate-800 break-all leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {commitment}
                  </p>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-6 right-6 p-2 bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 rounded-lg transition-all shadow-sm flex items-center"
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span className="ml-2 text-xs font-semibold">{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="p-5 bg-green-50/80 rounded-2xl border border-green-200/60 flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-4 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-green-900 mb-1">Ready for Registration</h4>
                    <p className="text-sm text-green-800/80 leading-relaxed">
                      Provide this hash to your organization administrator. Once they add it to the Midnight smart contract, you can anonymously verify your membership.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
