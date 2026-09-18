"use client";

import { useMidnight } from '@/context/MidnightContext';
import { Building2, Shield, Users, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OrganizationPage() {
  const { status, contractAddress } = useMidnight();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="glass-panel p-10 max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-primary-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Wallet Required</h2>
          <p className="text-slate-500 mb-8">Connect your wallet to view organization details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <div className="bg-primary-100 p-4 rounded-2xl">
          <Building2 className="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Organization Dashboard</h1>
          <p className="text-slate-500">Public contract metrics and statistics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border-l-4 border-l-indigo-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500">Total Verifications</h3>
              <Activity className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">12</p>
          </div>
          <p className="text-xs text-slate-500 mt-4">Verified by Midnight Zero-Knowledge Proofs</p>
        </div>

        <div className="glass-panel p-6 border-l-4 border-l-primary-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-500">Contract Status</h3>
              <Shield className="w-5 h-5 text-primary-500" />
            </div>
            <p className="text-lg font-bold text-slate-900 break-all">{contractAddress || 'Not Deployed'}</p>
          </div>
          <p className="text-xs text-slate-500 mt-4">Active and accepting anonymous proofs</p>
        </div>
      </div>

      <div className="glass-panel p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
          <Users className="w-5 h-5 mr-2 text-primary-500" />
          Member Directory
        </h2>
        
        <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200 border-dashed">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Privacy First</h3>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">
            The member directory is not public. The blockchain only stores cryptographic commitments. Observers cannot learn who the members are or how many exist unless they hold the private credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
