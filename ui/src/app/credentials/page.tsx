"use client";

import { useMidnight } from '@/context/MidnightContext';
import { Stethoscope, ShieldAlert } from 'lucide-react';

export default function CredentialsPage() {
  const { status } = useMidnight();

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-slate-500 mb-6" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Wallet Disconnected</h2>
        <p className="text-slate-600 max-w-md">Please connect your Lace wallet to view your credentials.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="bg-primary-500/10 p-3 rounded-xl text-primary-400">
          <Stethoscope className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Medical Credentials</h1>
          <p className="text-slate-600 mt-1">Manage your cryptographic patient identities</p>
        </div>
      </div>

      <div className="glass-panel p-12 text-center">
        <p className="text-slate-600">No medical credentials found on this device.</p>
      </div>
    </div>
  );
}
