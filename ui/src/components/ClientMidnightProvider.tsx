"use client";
import dynamic from 'next/dynamic';
import React from 'react';

const MidnightProvider = dynamic(
  () => import('@/context/MidnightContext').then((mod) => mod.MidnightProvider),
  { ssr: false }
);

export function ClientMidnightProvider({ children }: { children: React.ReactNode }) {
  return <MidnightProvider>{children}</MidnightProvider>;
}
