"use client";

import Link from 'next/link';
import { useMidnight } from '@/context/MidnightContext';
import { Lock, EyeOff, CheckCircle, ArrowRight, Zap, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { status, connectWallet, connectionError } = useMidnight();
  const [mounted, setMounted] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-24 pb-20">
      
      {/* Hero Section */}
      <motion.div 
        className="text-center max-w-3xl mx-auto mb-24"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-brand-400 text-sm font-semibold tracking-wide mb-8">
          <Zap size={14} />
          <span>Built on Midnight Network · Zero-Knowledge Privacy</span>
        </motion.div>
        
        <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6">
          Private Membership.<br />
          <span className="text-gradient">Public Trust.</span>
        </motion.h1>
        
        <motion.p variants={itemVariants} className="text-xl text-muted mb-10 leading-relaxed">
          Join an organisation and prove your membership without revealing your identity.
          Powered by Midnight Network's zero-knowledge proof technology.
        </motion.p>

        <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-4">
          {mounted && status === 'connected' ? (
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-1">
              Open Dashboard <ArrowRight size={20} />
            </Link>
          ) : (
            <button
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:-translate-y-1 disabled:opacity-50 disabled:pointer-events-none"
              onClick={handleConnect}
              disabled={connecting || status === 'connecting'}
            >
              {(connecting || status === 'connecting') ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connecting…</>
              ) : (
                <><Shield size={20} /> Connect Wallet</>
              )}
            </button>
          )}
          <Link href="/membership" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass-panel hover:bg-white/10 text-main font-bold transition-all hover:-translate-y-1">
            Explore Membership
          </Link>
        </motion.div>

        {status === 'error' && connectionError && (
          <motion.div variants={itemVariants} className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-left backdrop-blur-md">
            {connectionError}
          </motion.div>
        )}
      </motion.div>

      {/* Feature Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        {[
          {
            icon: <Lock size={28} className="text-orange-500" />,
            title: 'Private Identity',
            desc: 'Your sensitive membership information — name, ID, credentials — stays entirely private and never leaves your device.',
          },
          {
            icon: <EyeOff size={28} className="text-orange-400" />,
            title: 'Zero-Knowledge Proof',
            desc: 'Cryptographically prove what matters without revealing unnecessary information. Privacy by design, not as an afterthought.',
          },
          {
            icon: <CheckCircle size={28} className="text-amber-500" />,
            title: 'Public Verification',
            desc: 'The organisation can verify valid membership on-chain without ever seeing your private details. Trust without exposure.',
          },
        ].map((f, i) => (
          <motion.div key={i} variants={itemVariants} className="glass-panel p-8 cursor-pointer group">
            <div className="w-14 h-14 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              {f.icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-main">
              {f.title}
            </h3>
            <p className="text-muted leading-relaxed">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* How it works */}
      <motion.div 
        className="max-w-3xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4">How it works</h2>
          <p className="text-lg text-muted">
            Four simple steps from wallet to verified member.
          </p>
        </motion.div>

        <div className="relative border-l-2 border-brand-500/20 ml-6 md:ml-0 md:border-none space-y-12">
          {[
            { n: 1, label: 'Connect Wallet', desc: 'Connect your Lace or 1AM wallet to identify yourself to the application.' },
            { n: 2, label: 'Become a Member', desc: 'Submit your membership commitment to the Midnight smart contract.' },
            { n: 3, label: 'Generate Proof', desc: 'Your device generates a zero-knowledge proof of valid membership.' },
            { n: 4, label: 'Verify Privately', desc: 'Present your proof on-chain. Verified without revealing your identity.' },
          ].map((step, i) => (
            <motion.div key={i} variants={itemVariants} className="relative flex items-start gap-6 md:justify-between md:odd:flex-row-reverse group">
              {/* Timeline Dot (Mobile: on line, Desktop: center) */}
              <div className="absolute -left-[35px] md:static md:left-auto flex items-center justify-center w-16 h-16 rounded-full glass-panel text-xl font-bold text-brand-400 group-hover:bg-brand-500/20 group-hover:text-brand-300 transition-colors z-10">
                {step.n}
              </div>
              
              <div className="glass-panel p-6 w-full md:w-[calc(50%-3rem)] group-hover:-translate-y-1 transition-transform">
                <h4 className="text-xl font-bold mb-2 text-main">{step.label}</h4>
                <p className="text-muted leading-relaxed">{step.desc}</p>
              </div>
              
              {/* Desktop center line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-[-3rem] w-[2px] bg-brand-500/10 -translate-x-1/2 -z-10" />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="mt-32 pt-8 border-t border-black/10 flex flex-col md:flex-row justify-between items-center gap-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="text-sm text-muted">
          Anonymous Membership Organisation · Built on Midnight Network
        </div>
        <div className="flex gap-6 text-sm">
          <a
            href="https://github.com/majumdarjishu/Anonymous-organization-membership-NextJs"
            target="_blank" rel="noreferrer"
            className="text-muted hover:text-main transition-colors"
          >
            GitHub
          </a>
          <span className="text-brand-400">Midnight Preprod</span>
        </div>
      </motion.div>
    </div>
  );
}
