"use client";

import { useMidnight } from '@/context/MidnightContext';
import { History, Shield, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function HistoryPage() {
  const { status } = useMidnight();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="glass-panel p-10 max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-primary-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Wallet Required</h2>
          <p className="text-slate-500 mb-8">Connect your wallet to view verification history.</p>
        </div>
      </div>
    );
  }

  // Mock history for UI demonstration. In production, this would be fetched from the indexer.
  const verifications = [
    { id: 1, date: '2026-08-22 10:45 AM', nullifier: '0x3a4b9c...', status: 'Verified' },
    { id: 2, date: '2026-08-21 03:12 PM', nullifier: '0x8f2e1d...', status: 'Verified' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="bg-slate-100 p-4 rounded-2xl">
          <History className="w-8 h-8 text-slate-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Verification History</h1>
          <p className="text-slate-500">Recent anonymous membership proofs on the network.</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Timestamp</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Event</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nullifier Hash</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {verifications.map((v, i) => (
                <motion.tr 
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-500">{v.date}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">Membership Proof</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{v.nullifier}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {v.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {verifications.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No verification history found.
          </div>
        )}
      </div>
    </div>
  );
}
