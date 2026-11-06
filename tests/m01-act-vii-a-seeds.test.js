import test from 'node:test';
import assert from 'node:assert/strict';
import {M01AreaSimulation} from '../src/game/m01-area-sim.js';
import {actRoute} from './helpers/m01-act-route.js';
import {ACT_SEEDS,MIN_FIGHT_SEC,MIN_SHARE,PASSIVE_LIMIT_SEC} from './helpers/m01-act-seeds.js';

// Duration robustness of Act VII-a (Captain's decision 2026-11-04; the review of 2026-11-04 had found 11 of 26 routes under 120 s on seeds the tests did not use). The fight, from the start
// of the wave to the end of the attack, must last at least 110 s with the active pilot on at least 90 % of 15 seeds (the 3 seeds of the golden and of the 18 routes of
// m01-act-vii-a.test.js, and 12 others: tests/helpers/m01-act-seeds.js), and the passive pilot, who never fires, must be done in 6 minutes on the seeds that took it longest. Pilots are not
// players and a pass here is not a playtest: this guards the data (echelon sizes, thresholds, pause, entry of the second echelon) against drifting back to a combat that is over in a
// minute and a half. One level (soldado) keeps the run short; tools/verification/m01-act-vii-a-duration-sweep.mjs measures the three levels and the held-out seeds (the README of the
// duration evidence has the tables).
const LEVEL='soldado';

test(`the active pilot fights at least ${MIN_FIGHT_SEC} s (wave start to repelled) on at least ${MIN_SHARE*100} % of ${ACT_SEEDS.length} seeds, level ${LEVEL}`,{timeout:1800000},t=>{
  const rows=[];
  for(const seed of ACT_SEEDS){
    const sim=new M01AreaSimulation(seed,{difficulty:LEVEL}),r=actRoute(sim,{mode:'active',maxSec:600}),W=sim.timers.wave;
    assert.equal(r.complete,true,`seed ${seed}: the act completes`);assert.equal(sim.flags['m01np.wave'],'repelled',`seed ${seed}`);
    rows.push({seed,fight:Math.round((W.repelledAt-W.at)*10)/10,deaths:r.deaths,end:Math.round(sim.clock*10)/10,echelons:W.echs.length});
  }
  t.diagnostic(`fight seconds by seed: ${rows.map(r=>`${r.seed}:${r.fight}`).join(' ')}`);
  const ok=rows.filter(r=>r.fight>=MIN_FIGHT_SEC);
  assert.ok(ok.length/rows.length>=MIN_SHARE,`${ok.length} of ${rows.length} seeds reach ${MIN_FIGHT_SEC} s; under: ${rows.filter(r=>r.fight<MIN_FIGHT_SEC).map(r=>`${r.seed}:${r.fight}`)}`);
  assert.ok(rows.every(r=>r.echelons===2),'both echelons came on every seed');
  assert.ok(Math.min(...rows.map(r=>r.fight))>=90,`and the shortest fight is not a collapse (${Math.min(...rows.map(r=>r.fight))} s)`);
});

// The passive pilot never fires: the Polish line alone repels both echelons, and on some seeds it loses most of its men doing it. These are the seeds that took it longest when the data were tuned.
const SLOWEST_PASSIVE_SEEDS=[13,5,7,8,2];
test(`the passive pilot is done in ${PASSIVE_LIMIT_SEC/60} minutes on the ${SLOWEST_PASSIVE_SEEDS.length} slowest seeds`,{timeout:1800000},t=>{
  const rows=[];
  for(const seed of SLOWEST_PASSIVE_SEEDS){
    const sim=new M01AreaSimulation(seed,{difficulty:LEVEL}),r=actRoute(sim,{mode:'passive',maxSec:600});
    assert.equal(r.complete,true,`seed ${seed}: the act completes`);rows.push({seed,end:Math.round(sim.clock*10)/10});
  }
  t.diagnostic(`act clock at the end by seed: ${rows.map(r=>`${r.seed}:${r.end}`).join(' ')}`);
  assert.ok(rows.every(r=>r.end<=PASSIVE_LIMIT_SEC),`done within ${PASSIVE_LIMIT_SEC} s: ${rows.map(r=>`${r.seed}:${r.end}`)}`);
});
