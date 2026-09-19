import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNetworkId,
  parseNetworkFlag,
  resolveNetwork,
  getOrCreateSeed,
  NETWORK_CONFIGS,
  NETWORK_IDS,
  GENESIS_SEED,
} from '../src/network.ts';

describe('Network & Wallet Resolution Utilities', () => {
  it('should correctly identify valid NetworkId values', () => {
    assert.equal(isNetworkId('undeployed'), true);
    assert.equal(isNetworkId('preview'), true);
    assert.equal(isNetworkId('preview'), true);
    assert.equal(isNetworkId('mainnet'), false);
    assert.equal(isNetworkId(123), false);
    assert.equal(isNetworkId(null), false);
  });

  it('should parse --network flag from command line arguments', () => {
    assert.equal(parseNetworkFlag(['node', 'script.js', '--network', 'preview']), 'preview');
    assert.equal(parseNetworkFlag(['node', 'script.js', '--network=preview']), 'preview');
    assert.equal(parseNetworkFlag(['node', 'script.js']), null);
  });

  it('should throw when --network flag value is missing or invalid', () => {
    assert.throws(() => parseNetworkFlag(['node', 'script.js', '--network']), {
      message: '--network requires a value',
    });
    assert.throws(() => parseNetworkFlag(['node', 'script.js', '--network', 'invalid']), {
      message: /Unknown network: invalid/,
    });
  });

  it('should default to undeployed network when no flags or state files exist', () => {
    const res = resolveNetwork({ argv: ['node', 'script.js'], cwd: process.cwd() });
    assert.equal(res.network, 'undeployed');
    assert.equal(res.config.proofServer, 'http://127.0.0.1:6300');
  });

  it('should return fixed genesis seed for undeployed network', () => {
    const seed = getOrCreateSeed('undeployed');
    assert.equal(seed, GENESIS_SEED);
  });

  it('should contain expected network configurations for preview and preview', () => {
    assert.ok(NETWORK_CONFIGS.preview.indexer.includes('preview.midnight.network'));
    assert.ok(NETWORK_CONFIGS.preview.indexer.includes('preview.midnight.network'));
    assert.equal(NETWORK_CONFIGS.preview.proofServer, 'http://127.0.0.1:6300');
  });
});
