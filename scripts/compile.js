import { execSync } from 'node:child_process';
import os from 'node:os';

const isWindows = os.platform() === 'win32';
// On Windows, the midnight compiler must be renamed to compactc because 'compact' is a system utility for file compression.
const command = isWindows ? 'compactc' : 'compact';
const args = 'compile contracts/anonymous-membership-organisation.compact contracts/managed/anonymous-membership-organisation';

try {
  console.log(`Running: ${command} ${args}`);
  execSync(`${command} ${args}`, { stdio: 'inherit' });
} catch (error) {
  console.error(`\n❌ Failed to compile contract.`);
  if (isWindows) {
    console.error(`\n⚠️  It looks like you are on Windows.`);
    console.error(`   The Midnight compiler must be renamed to 'compactc' or 'compactc.exe'`);
    console.error(`   because the default 'compact' command conflicts with a Windows system utility.`);
    console.error(`   Please rename your compiler executable and ensure it is in your PATH.`);
    console.error(`   (Or run this in WSL).`);
  }
  process.exit(1);
}
