// Scratch (not part of the repository): the two golden routes of m01-animation-contract, but printing the COMPLETE block list
// (the test only prints blocks that differ from the x86 golden). usage: node digest.mjs <repoRoot> <outFile>
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const [,, root, out] = process.argv;
const {route} = await import(pathToFileURL(`${root}/tests/helpers/m01-route.js`).href);
const {gameplayFrame, GameplayDigest} = await import(pathToFileURL(`${root}/tests/helpers/m01-animation-contract.js`).href);
const result = [];
for (const {seed, support} of [{seed: 19390901, support: false}, {seed: 7, support: true}]) {
  const trace = new GameplayDigest(), t0 = performance.now();
  route(seed, {support, onStep: ({sim, events}) => trace.add(gameplayFrame(sim, events))});
  const done = trace.finish();
  result.push({seed, support, ticks: done.ticks, blocks: done.blocks, seconds: Number(((performance.now() - t0) / 1000).toFixed(1))});
  console.log(JSON.stringify({seed, support, ticks: done.ticks, blocks: done.blocks.length}));
}
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
