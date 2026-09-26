import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  serverExternalPackages: [
    '@midnight-ntwrk/compact-runtime',
    '@midnight-ntwrk/midnight-js-network-id',
    '@midnight-ntwrk/midnight-js-level-private-state-provider',
    '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
    '@midnight-ntwrk/midnight-js-http-client-proof-provider',
    '@midnight-ntwrk/midnight-js-node-zk-config-provider',
    '@midnight-ntwrk/midnight-js-protocol',
    '@midnight-ntwrk/midnight-js-utils',
    '@midnight-ntwrk/midnight-js-contracts',
    '@midnight-ntwrk/wallet-sdk',
    'isomorphic-ws',
    'ws'
  ],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      'isomorphic-ws$': path.resolve(__dirname, './src/lib/isomorphic-ws.js')
    };
    return config;
  },
};

export default nextConfig;
