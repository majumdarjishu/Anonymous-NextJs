import type { Metadata } from 'next';
import './globals.css';
import { ClientMidnightProvider } from '@/components/ClientMidnightProvider';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Anonymous Membership Organisation | Midnight Network',
  description: 'Prove your organisation membership privately using Zero-Knowledge proofs on the Midnight blockchain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <ClientMidnightProvider>
          <Navbar />
          <main>
            {children}
          </main>
        </ClientMidnightProvider>
      </body>
    </html>
  );
}
