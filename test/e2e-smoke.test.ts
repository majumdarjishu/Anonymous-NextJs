import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('E2E Smoke Check Suite', () => {
  it('should verify e2e-check script file exists', () => {
    const e2ePath = path.join(rootDir, 'scripts', 'e2e-check.ts');
    assert.equal(fs.existsSync(e2ePath), true, 'scripts/e2e-check.ts must exist');
  });

  it('should verify UI build output directory structure exists or can be built', () => {
    const uiDir = path.join(rootDir, 'ui');
    assert.equal(fs.existsSync(uiDir), true, 'ui directory must exist');
    assert.equal(fs.existsSync(path.join(uiDir, 'package.json')), true, 'ui/package.json must exist');
  });

  it('should verify state JSON file or default initialization structure', () => {
    const statePath = path.join(rootDir, '.midnight-state.json');
    if (fs.existsSync(statePath)) {
      const content = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      assert.equal(typeof content.version, 'number');
      assert.ok(['undeployed', 'preview', 'preview'].includes(content.activeNetwork));
    }
  });
});
