"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMidnight } from '@/context/MidnightContext';
import { useState } from 'react';
import { Shield, Menu, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/membership', label: 'Membership' },
  { href: '/verify', label: 'Verify' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function Navbar() {
  const pathname = usePathname();
  const { walletAddress, walletName, status, connectionError, connectWallet, disconnectWallet } = useMidnight();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleConnectClick = async () => {
    setShowError(false);
    await connectWallet();
    if (status === 'error') setShowError(true);
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-bg-color/70 border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 text-main font-bold text-xl group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-brand-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <span className="tracking-tight">AnonOrg</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 flex-1">
          {NAV_LINKS.map(link => {
            const active = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  active 
                    ? 'bg-brand-500/10 text-brand-400' 
                    : 'text-muted hover:text-main hover:bg-black/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Wallet Button */}
        <div className="relative flex-shrink-0">
          {status === 'connected' ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-[10px] text-muted font-bold uppercase tracking-wider">
                  {walletName}
                </div>
                <div className="text-sm font-mono text-brand-100">
                  {shortAddr}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                Connected
              </div>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <button
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold transition-all disabled:opacity-50"
                onClick={handleConnectClick}
                disabled={status === 'connecting'}
              >
                {status === 'connecting' ? (
                  <><Loader2 size={16} className="animate-spin" /> Connecting…</>
                ) : 'Connect Wallet'}
              </button>
              
              <AnimatePresence>
                {status === 'error' && connectionError && showError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-4 p-4 min-w-[280px] rounded-xl glass-panel bg-bg-color/90 border-red-500/30 shadow-2xl z-50"
                  >
                    <div className="text-red-400 font-bold text-sm mb-1">
                      ⚠ Connection Failed
                    </div>
                    <div className="text-sm text-muted">
                      {connectionError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-muted hover:text-main hover:bg-black/5 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-bg-color/95 backdrop-blur-xl border-t border-black/5"
          >
            <div className="px-6 py-4 space-y-2">
              {NAV_LINKS.map(link => {
                const active = pathname === link.href;
                return (
                  <Link 
                    key={link.href} 
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      active 
                        ? 'bg-brand-500/10 text-brand-400' 
                        : 'text-muted hover:text-main hover:bg-black/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              <div className="pt-4 mt-4 border-t border-black/10">
                {status === 'connected' ? (
                  <button 
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-semibold"
                    onClick={() => { disconnectWallet(); setMobileOpen(false); }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button 
                    className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold"
                    onClick={handleConnectClick} 
                    disabled={status === 'connecting'}
                  >
                    {status === 'connecting' ? 'Connecting…' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
