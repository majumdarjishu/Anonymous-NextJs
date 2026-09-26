import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Compact Smart Contract Verification', () => {
  const compactFilePath = path.join(rootDir, 'contracts', 'anonymous-membership-organisation.compact');

  it('should verify the existence of anonymous-membership-organisation.compact source file', () => {
    assert.equal(fs.existsSync(compactFilePath), true, 'Contract file must exist');
  });

  it('should parse contract source for required language pragmas and standard library imports', () => {
    const content = fs.readFileSync(compactFilePath, 'utf-8');
    assert.match(content, /pragma language_version >= 0\.23;/, 'Contract must declare Compact language version 0.23+');
    assert.match(content, /import CompactStandardLibrary;/, 'Contract must import CompactStandardLibrary');
  });

  it('should declare all required ledger state variables', () => {
    const content = fs.readFileSync(compactFilePath, 'utf-8');
    assert.match(content, /export ledger admin:\s*Bytes<32>;/, 'Must export ledger admin: Bytes<32>');
    assert.match(content, /export ledger memberCommitments:\s*Map<Bytes<32>,\s*Boolean>;/, 'Must export ledger memberCommitments map');
    assert.match(content, /export ledger verifiedMembers:\s*Map<Bytes<32>,\s*Boolean>;/, 'Must export ledger verifiedMembers map');
    assert.match(content, /export ledger verificationCount:\s*Counter;/, 'Must export ledger verificationCount Counter');
    assert.match(content, /export ledger memberCount:\s*Counter;/, 'Must export ledger memberCount Counter');
  });

  it('should declare local ZK witness functions for private state execution', () => {
    const content = fs.readFileSync(compactFilePath, 'utf-8');
    assert.match(content, /witness credential\(\):\s*MembershipCredential;/, 'Must declare witness credential()');
  });

  it('should enforce circuit export definitions', () => {
    const content = fs.readFileSync(compactFilePath, 'utf-8');
    assert.match(content, /export circuit registerMembership\(commitment:\s*Bytes<32>\):\s*\[\]/, 'Must export circuit registerMembership');
    assert.match(content, /export circuit revokeMembership\(commitment:\s*Bytes<32>\):\s*\[\]/, 'Must export circuit revokeMembership');
    assert.match(content, /export circuit transferAdmin\(newAdmin:\s*Bytes<32>\):\s*\[\]/, 'Must export circuit transferAdmin');
    assert.match(content, /export circuit verifyMembership\(actionId:\s*Bytes<32>\):\s*\[\]/, 'Must export circuit verifyMembership with actionId');
  });

  it('should verify compiled contract output folder structure', { skip: !fs.existsSync(path.join(rootDir, 'contracts', 'managed', 'anonymous-membership-organisation')) ? 'contracts/managed/ not present — run `npm run compile` with the Compact toolchain first' : false }, () => {
    const managedDir = path.join(rootDir, 'contracts', 'managed', 'anonymous-membership-organisation');
    assert.equal(fs.existsSync(managedDir), true, 'Managed output directory must exist');
    assert.equal(fs.existsSync(path.join(managedDir, 'contract')), true, 'Compiled contract folder must exist');
    assert.equal(fs.existsSync(path.join(managedDir, 'zkir')), true, 'ZKIR folder must exist');
    assert.equal(fs.existsSync(path.join(managedDir, 'keys')), true, 'Proving keys folder must exist');
  });

  it('should load compiled JS contract module successfully', { skip: !fs.existsSync(path.join(rootDir, 'contracts', 'managed', 'anonymous-membership-organisation')) ? 'contracts/managed/ not present — run `npm run compile` with the Compact toolchain first' : false }, async () => {
    const contractIndexPath = path.join(rootDir, 'contracts', 'managed', 'anonymous-membership-organisation', 'contract', 'index.cjs');
    if (fs.existsSync(contractIndexPath)) {
      const contractMod = await import(contractIndexPath);
      assert.ok(contractMod.Contract, 'Compiled module should export Contract');
    } else {
      const contractJsPath = path.join(rootDir, 'contracts', 'managed', 'anonymous-membership-organisation', 'contract', 'index.js');
      assert.equal(fs.existsSync(contractJsPath), true, 'Contract index file must exist');
    }
  });
});
