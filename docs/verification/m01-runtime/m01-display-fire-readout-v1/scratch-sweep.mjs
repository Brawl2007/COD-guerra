// Scratch sweep (not part of the repository): route() per seed; per tick hash of rng.state and of a few gameplay numbers.
// usage: node sweep.mjs <repoRoot> <outFile> [runs]   runs: comma list of seed or seed:support (default: all 13)
import {createHash} from 'node:crypto';
import {appendFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [,, root, out, runsArg] = process.argv;
const {route} = await import(pathToFileURL(`${root}/tests/helpers/m01-route.js`).href);
const defaults = [{seed:19390901,support:false},...[1,2,3,4,5,6,7,8,9,10,11].map(seed=>({seed,support:false})),{seed:7,support:true}];
const runs = runsArg ? runsArg.split(',').map(t=>{const [seed,support]=t.split(':');return {seed:Number(seed),support:support==='1'};}) : defaults;
writeFileSync(out, '');
for (const {seed, support} of runs) {
  const rngHash = createHash('sha256'), gameHash = createHash('sha256'), buf = Buffer.alloc(4);
  let ticks = 0; const t0 = performance.now();
  const result = route(seed, {support, onStep: ({sim}) => {
    ticks++; buf.writeUInt32LE(sim.rng.state >>> 0); rngHash.update(buf);
    gameHash.update(JSON.stringify([sim.clock, sim.battleClock, sim.player.x, sim.player.z, sim.player.health, sim.enemyFire.nextId, sim.enemyFire.rounds.length, sim.flags['m01.east_platoon_survivors']]) + '\n');
  }});
  const s = result.sim;
  const row = {seed, support, ticks, finalRng: s.rng.state, finalClock: s.clock, finalBattleClock: s.battleClock, health: s.player.health,
    rngStreamSha256: rngHash.digest('hex'), gameStreamSha256: gameHash.digest('hex'), seconds: Number(((performance.now() - t0) / 1000).toFixed(1))};
  appendFileSync(out, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row));
}
