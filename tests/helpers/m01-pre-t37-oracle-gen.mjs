// Regenerates tests/fixtures/m01-pre-t37-bones.json from the PRE-T37 renderer. Only needed if the oracle scene changes:
//   git show 5a169ba:src/render/m01-characters.js > src/render/_pre_t37_characters.js
//   node tests/helpers/m01-pre-t37-oracle-gen.mjs && rm src/render/_pre_t37_characters.js
import {writeFileSync} from 'node:fs';
import {runOracleScene} from './m01-pre-t37-oracle.js';
const {M01Characters}=await import('../../src/render/_pre_t37_characters.js');
const snapshots=await runOracleScene(M01Characters);
writeFileSync(new URL('../fixtures/m01-pre-t37-bones.json',import.meta.url),JSON.stringify({
  source:'git show 5a169ba:src/render/m01-characters.js (pre-T37 M01Characters), scene tests/helpers/m01-pre-t37-oracle.js, quality high, CPU-parsed production GLBs',snapshots},null,1)+'\n');
