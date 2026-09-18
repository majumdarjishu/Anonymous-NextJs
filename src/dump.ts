import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import * as Contract_Module from '../contracts/managed/anonymous-membership-organisation/contract/index.js';

const zkConfigPath = './contracts/managed/anonymous-membership-organisation';

const c1 = CompiledContract.make('anon', Contract_Module.Contract).pipe(
  CompiledContract.withWitnesses({
    credential: (context) => [context.privateState, { secret: new Uint8Array(32), membershipId: 0n }]
  })
);

try {
  console.log(Object.keys(c1));
  console.log("c1.contract type:", typeof c1.contract);
  new (c1 as any).contract({});
  console.log("Success withWitnesses!");
} catch (e) {
  console.error("Failed withWitnesses:", e);
}
