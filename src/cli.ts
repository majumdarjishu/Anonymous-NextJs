/**
 * CLI for interacting with anonymous-membership-organisation contract
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';
import { Buffer } from 'buffer';

// Midnight SDK imports
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateSeed, getDeployment } from './network.ts';
import { createWallet, persistWalletState, unshieldedToken, type WalletContext } from './wallet.ts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// Enable WebSocket for GraphQL subscriptions
// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

// Must match the privateStateId used at deploy time so the CLI reconnects to
// the same private state.
const PRIVATE_STATE_ID = 'helloWorldPrivateState';

const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'anonymous-membership-organisation');
const contractPath = path.join(zkConfigPath, 'contract', 'index.js');
if (!fs.existsSync(contractPath)) {
  console.error('\n❌ Contract not compiled! Run: npm run compile\n');
  process.exit(1);
}
const Contract_Module = await import(pathToFileURL(contractPath).href);

const compiledContract = CompiledContract.make('anonymous-membership-organisation', Contract_Module.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

// ─── Providers ─────────────────────────────────────────────────────────────────

async function createProviders(walletCtx: WalletContext) {
  const privateStatePassword = process.env.PRIVATE_STATE_PASSWORD?.trim() || 'Local-Devnet-Development-Placeholder-1';

  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  const accountId = walletCtx.unshieldedKeystore.getBech32Address().toString();

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'anonymous-membership-organisation-state',
      accountId,
      privateStoragePasswordProvider: () => privateStatePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

// ─── Main CLI ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Anonymous Organization Membership CLI              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const rl = createInterface({ input: stdin, output: stdout });

  const deployment = getDeployment(network);
  if (!deployment) {
    console.error(`No deploy on file for network ${network}. Run \`npm run setup -- --network ${network}\` first.`);
    process.exit(1);
  }
  console.log(`  Contract: ${deployment.address}`);
  console.log(`  Network: ${network}\n`);

  try {
    const seed = SEED;
    console.log('  Connecting to wallet...');
    const walletCtx = await createWallet({ network, networkConfig, seed });
    const restoredCount = Object.values(walletCtx.restored).filter(Boolean).length;
    if (restoredCount > 0) {
      console.log(`  Restored ${restoredCount}/3 child wallets from .midnight-wallet-state — sync will resume from saved point.`);
    }

    console.log('  Syncing with network...');
    console.log('  ℹ  This may take several minutes depending on network size.');
    console.log('     RPC disconnection messages during sync are normal and can be safely ignored.\n');
    const syncStart = Date.now();
    const syncInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - syncStart) / 1000);
      process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
    }, 5000);
    const state = await walletCtx.wallet.waitForSyncedState();
    clearInterval(syncInterval);
    process.stdout.write('\r  ✓ Synced with network.                                      \n');

    await persistWalletState(network, walletCtx);
    const balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    console.log(`  Balance: ${balance.toLocaleString()} tNight\n`);

    if (balance === 0n && network !== 'undeployed' && networkConfig.faucet) {
      const address = walletCtx.unshieldedKeystore.getBech32Address();
      console.log('  ⚠ Wallet has no tNight. Fund it from the faucet to send transactions:');
      console.log(`     ${networkConfig.faucet}`);
      console.log(`     Wallet address: ${address}\n`);
    }

    console.log('  Connecting to contract...');
    const providers = await createProviders(walletCtx);

    const deployed: any = await findDeployedContract(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {},
    });

    console.log('  ✅ Connected!\n');

    let running = true;
    while (running) {
      console.log('─── Menu ───────────────────────────────────────────────────────');
      console.log('  1. Register Membership (Admin)');
      console.log('  2. Revoke Membership (Admin)');
      console.log('  3. Transfer Admin Authority (Admin)');
      console.log('  4. Read public ledger state');
      console.log('  5. Check wallet balance');
      console.log('  6. Exit\n');

      const choice = await rl.question('  Your choice: ');

      switch (choice.trim()) {
        case '1': {
          const commitmentHex = await rl.question('  Enter 32-byte commitment (hex without 0x): ');
          if (commitmentHex.length !== 64) {
            console.log('  ❌ Commitment must be 64 hex characters (32 bytes).');
            break;
          }
          const commitment = new Uint8Array(Buffer.from(commitmentHex, 'hex'));
          console.log('\n  Submitting transaction (this may take 30-60 seconds)...');
          try {
            const tx = await deployed.callTx.registerMembership(commitment);
            console.log(`\n  ✅ Membership commitment registered.`);
            console.log(`  Transaction ID: ${tx.public.txId}`);
          } catch (error) {
            console.error('\n  ❌ Failed:', error instanceof Error ? error.message : error);
          }
          break;
        }

        case '2': {
          const commitmentHex = await rl.question('  Enter 32-byte commitment (hex without 0x): ');
          if (commitmentHex.length !== 64) {
            console.log('  ❌ Commitment must be 64 hex characters (32 bytes).');
            break;
          }
          const commitment = new Uint8Array(Buffer.from(commitmentHex, 'hex'));
          console.log('\n  Submitting transaction (this may take 30-60 seconds)...');
          try {
            const tx = await deployed.callTx.revokeMembership(commitment);
            console.log(`\n  ✅ Membership commitment revoked.`);
            console.log(`  Transaction ID: ${tx.public.txId}`);
          } catch (error) {
            console.error('\n  ❌ Failed:', error instanceof Error ? error.message : error);
          }
          break;
        }

        case '3': {
          const newAdminHex = await rl.question('  Enter 32-byte new admin public key (hex without 0x): ');
          if (newAdminHex.length !== 64) {
            console.log('  ❌ Admin key must be 64 hex characters (32 bytes).');
            break;
          }
          const newAdmin = new Uint8Array(Buffer.from(newAdminHex, 'hex'));
          console.log('\n  Submitting transaction (this may take 30-60 seconds)...');
          try {
            const tx = await deployed.callTx.transferAdmin(newAdmin);
            console.log(`\n  ✅ Admin authority transferred.`);
            console.log(`  Transaction ID: ${tx.public.txId}`);
          } catch (error) {
            console.error('\n  ❌ Failed:', error instanceof Error ? error.message : error);
          }
          break;
        }

        case '4': {
          console.log('\n  Reading state from blockchain...');
          try {
            const contractState = await providers.publicDataProvider.queryContractState(deployment.address);
            if (contractState) {
              const ledgerState = Contract_Module.ledger(contractState.data);
              console.log(`\n  📋 Total verifications: ${ledgerState.verificationCount.toString()}`);
              console.log(`  📋 Active members:      ${ledgerState.memberCount?.toString() ?? '0'}\n`);
            } else {
              console.log('\n  📋 No state found\n');
            }
          } catch (error) {
            console.error('\n  ❌ Failed:', error instanceof Error ? error.message : error);
          }
          break;
        }

        case '5': {
          console.log('\n  Checking balance...');
          const currentState = await walletCtx.wallet.waitForSyncedState();
          const currentBalance = currentState.unshielded.balances[unshieldedToken().raw] ?? 0n;
          const dustBalance = currentState.dust.balance(new Date());
          console.log(`\n  tNight: ${currentBalance.toLocaleString()}`);
          console.log(`  DUST: ${dustBalance.toLocaleString()}\n`);
          break;
        }

        case '6':
          running = false;
          console.log('\n  👋 Goodbye!\n');
          break;

        default:
          console.log('\n  ❌ Invalid choice. Please enter 1-6.\n');
      }
    }

    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
