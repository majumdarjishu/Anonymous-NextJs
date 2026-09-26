"use client";

import { Eye, EyeOff, Check, X, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900">Privacy Model</h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Understand exactly what information is shared, and what remains mathematically private.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-8 border-t-4 border-t-red-500"
        >
          <div className="flex items-center mb-6">
            <EyeOff className="w-8 h-8 text-red-500 mr-3" />
            <h2 className="text-2xl font-bold text-slate-900">Observers CANNOT Learn</h2>
          </div>
          
          <ul className="space-y-4">
            {[
              "Your real identity, name, or email",
              "Your membership ID number",
              "Your private membership credential",
              "Your private secret or witness",
              "Organization-specific private metadata",
              "Your private wallet keys"
            ].map((item, i) => (
              <li key={i} className="flex items-start text-slate-600">
                <X className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-8 border-t-4 border-t-green-500"
        >
          <div className="flex items-center mb-6">
            <Eye className="w-8 h-8 text-green-500 mr-3" />
            <h2 className="text-2xl font-bold text-slate-900">Observers CAN Learn</h2>
          </div>
          
          <ul className="space-y-4">
            {[
              "That a verification event occurred",
              "The public commitment hash of a registered member",
              "The total global verification counter",
              "Non-sensitive organization metadata (e.g., name)",
              "The verification status (whether a specific nullifier was verified)",
              "If a membership was deliberately revoked by an admin"
            ].map((item, i) => (
              <li key={i} className="flex items-start text-slate-600">
                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
      
      <div className="bg-primary-50 rounded-2xl p-8 border border-primary-100 flex items-start mt-12">
        <Shield className="w-8 h-8 text-primary-500 mr-4 shrink-0" />
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">How it works</h3>
          <p className="text-slate-600 leading-relaxed">
            When you register, you create a public "Commitment" that acts as an anonymous placeholder for your identity. When you verify, you generate a local Zero-Knowledge Proof using your private secret. This proof cryptographically guarantees that you own the secret corresponding to a registered commitment, without ever revealing which one. The contract only uses <code className="bg-primary-100 px-1.5 py-0.5 rounded text-primary-800 text-sm">disclose()</code> for information that is intentionally meant to be public, such as the proof result and the verification counter.
          </p>
        </div>
      </div>
    </div>
  );
}
