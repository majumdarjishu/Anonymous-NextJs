import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
// @ts-ignore
import * as Contract_Module from '../contracts/managed/anonymous-membership-organisation/contract/index.js';

const zkConfigPath = './contracts/managed/anonymous-membership-organisation';

const c1 = CompiledContract.make('anon', Contract_Module.Contract).pipe(
  CompiledContract.withWitnesses({
    credential: (context: any) => [context.privateState, { secret: new Uint8Array(32), membershipId: 0n }]
  } as unknown as never)
);

try {
  console.log(Object.keys(c1));
  // @ts-ignore
  console.log("c1.contract type:", typeof (c1 as any).contract);
  new (c1 as any).contract({});
  console.log("Success withWitnesses!");
} catch (e) {
  console.error("Failed withWitnesses:", e);
}
