import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK_CONFIGS } from '../src/network.ts';

describe('CLI & Helper Functions', () => {
  it('should validate hex address formatting helper', () => {
    function isHexAddress(s: unknown): boolean {
      return typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s) && s.length >= 32;
    }

    assert.equal(isHexAddress('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'), true);
    assert.equal(isHexAddress('invalid-hex-string'), false);
    assert.equal(isHexAddress(12345), false);
    assert.equal(isHexAddress(''), false);
  });

  it('should verify proof server configuration URLs for local and cloud environments', () => {
    assert.equal(NETWORK_CONFIGS.undeployed.proofServer, 'http://127.0.0.1:6300');
    assert.equal(NETWORK_CONFIGS.preview.proofServer, 'http://127.0.0.1:6300');
    assert.equal(NETWORK_CONFIGS.preview.proofServer, 'http://127.0.0.1:6300');
  });

  it('should verify GraphQL indexer endpoint structures', () => {
    assert.ok(NETWORK_CONFIGS.preview.indexer.startsWith('https://'));
    assert.ok(NETWORK_CONFIGS.preview.indexerWS.startsWith('wss://'));
    assert.ok(NETWORK_CONFIGS.undeployed.indexer.startsWith('http://'));
  });
});
