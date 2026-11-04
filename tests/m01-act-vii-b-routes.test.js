import test from 'node:test';
import assert from 'node:assert/strict';
import {M01AreaSimulation} from '../src/game/m01-area-sim.js';
import {SAFE_IMPACT_M} from '../src/game/m01-shell-blast.js';
import {actBRoute} from './helpers/m01-act-b-route.js';
import {stackingAudit} from './helpers/m01-clipping.js';
import {areaClippingAudit} from './helpers/m01-act-audit.js';

// R4 INC-2 (2026-11-04): the routes of Act VII-b. Two scripted pilots (tests/helpers/m01-act-b-route.js: the passive one kneels at the west post and never fires, the active one stands and fires like a
// human-paced rifleman) x the three levels x three seeds, on the whole act: the entry card, the resupply, the first barrage with its wounded man and its bearers, the first attack, the pause with the
// second barrage, the second attack, the end beat and the end card. Pilots are not players and a pass here is not a playtest: it guards the data and the machine against a route that cannot finish, a
// shell near the player, a death by artillery, men walking through each other or through earth, and a duration that has left the 4-6 minutes the design asks for (tests/m01-act-vii-b.test.js has the rest).
const ID='act_vii_b_north_day';
const MIN_ACT_SEC=200,MAX_ACT_SEC=380;   // the guard band of the act clock (card to card, deaths included); the measured numbers are in the evidence README

test('Act VII-b completes on 18 routes (passive and active pilot x 3 levels x 3 seeds): both barrages, both attacks, CP-I and CP-I2, a wounded man carried away, no shell within 30 m of the player, the player never hurt or killed by artillery, no clipping, no men inside each other',{timeout:1800000},t=>{
  const table=[];
  for(const mode of ['passive','active'])for(const d of ['recruta','soldado','veterano'])for(const seed of [19390901,3,7]){
    const id=`${mode} ${d} ${seed}`,sim=new M01AreaSimulation(seed,{difficulty:d,actId:ID}),clip=areaClippingAudit(),stack=stackingAudit();
    let landed=0,nearest=Infinity,artilleryHurt=0;const causes=[];
    const land=sim.landShell.bind(sim);
    sim.landShell=(run,b,shell)=>{   // the shells: where each one really fell against the player at that very moment, and what it did to him
      const p=sim.player,health=p.health,alive=p.alive;
      land(run,b,shell);
      const crater=sim.sectors.damage.at(-1);landed++;nearest=Math.min(nearest,Math.hypot(crater.x-p.x,crater.z-p.z));
      if(p.health<health||p.alive!==alive)artilleryHurt++;
    };
    const r=actBRoute(sim,{mode,maxSec:900,onEvent:e=>{if(e.type==='player-down')causes.push(e.cause);},onStep:x=>{clip.observe(x);stack.observe(x);}});
    assert.equal(r.complete,true,id);assert.equal(sim.flags['m01npb.wave'],'repelled',id);assert.equal(sim.objectives.obj_npb_hold.state,'done',id);assert.equal(sim.mission.phase,'NPB_END',id);
    // the barrages: both came, every impact landed where the player was not
    assert.deepEqual(Object.keys(sim.timers.barrage.done).sort(),['brg_npb_1','brg_npb_2'],id);assert.equal(sim.timers.barrage.run,null,id);
    const craters=sim.sectors.damage.filter(d=>d.id.startsWith('np_shell_crater_')).length;   // the craters of the life that finished the act (a death returns to a checkpoint, and the barrage after it falls again: `landed` counts every life)
    assert.ok(craters>=14&&craters<=18&&landed>=craters,`${id}: ${craters} craters, ${landed} shells over ${r.deaths+1} lives`);assert.ok(nearest>=SAFE_IMPACT_M,`${id}: the nearest shell fell ${nearest.toFixed(1)} m from the player`);
    assert.equal(artilleryHurt,0,`${id}: the player is never hurt or killed by a shell`);assert.ok(causes.every(c=>c==='shot'),`${id}: the player dies only by German rounds (${causes})`);
    // the wounded man of the first barrage is carried away by the bearers; the act's limit holds
    assert.ok(sim.timers.medics.handled>=1&&sim.timers.medics.handled<=2,`${id}: ${sim.timers.medics.handled} wounded carried away`);
    assert.equal(sim.actor('pl_np_3').active===false||!sim.actor('pl_np_3').alive,true,`${id}: the scripted casualty is gone from the line`);
    // the two attacks and the two checkpoints (the second when the first broke)
    const W=sim.timers.wave;assert.equal(W.echs.length,2,id);assert.ok(W.echs[0].brokenAt!==null&&W.echs[1].brokenAt!==null&&W.brokenAt===W.echs[1].brokenAt,id);
    assert.deepEqual([...sim.checkpointsReached].sort(),['cp_npb_i2_pausa','cp_npb_i_dia'],id);assert.equal(sim.respawn.label,'CP-I2',id);
    assert.ok(sim.enemyFire.nextId>=20&&sim.ckm.bursts>=1,`${id}: the Germans and the ckm fire real rounds`);assert.ok(W.casualties>=10,`${id}: the attacks cost them men`);
    // no clipping, nobody inside anybody
    assert.deepEqual(clip.report(),[],id);assert.equal(stack.summary().pairs,0,`${id}: ${stack.report()}`);
    assert.ok(sim.clock>=MIN_ACT_SEC&&sim.clock<=MAX_ACT_SEC,`${id}: the act took ${Math.round(sim.clock)} s (${MIN_ACT_SEC}-${MAX_ACT_SEC})`);
    table.push({id,clock:Math.round(sim.clock),fight:Math.round(W.repelledAt-W.at),deaths:r.deaths,shells:craters,nearest:Math.round(nearest),wounded:sim.timers.medics.handled,ckm:sim.ckm.bursts,polesDead:sim.allies.filter(a=>!a.alive).length});
  }
  t.diagnostic(`act clock (s), fight (s), deaths, shells, nearest shell (m), carried away, ckm bursts, Poles dead:\n${table.map(x=>`  ${x.id}: ${x.clock} ${x.fight} ${x.deaths} ${x.shells} ${x.nearest} ${x.wounded} ${x.ckm} ${x.polesDead}`).join('\n')}`);
  const passive=table.filter(x=>x.id.startsWith('passive')).map(x=>x.clock),active=table.filter(x=>x.id.startsWith('active')).map(x=>x.clock);
  t.diagnostic(`passive ${Math.min(...passive)}-${Math.max(...passive)} s, active ${Math.min(...active)}-${Math.max(...active)} s`);
  assert.ok(Math.max(...passive)<=360,`the pilot who never fires finishes within 6 minutes (${Math.max(...passive)} s)`);
});

test('determinism: the same seed and pilot give the same act twice, the whole state, and a different seed a different one',{timeout:600000},()=>{
  const run=(seed,mode)=>{const sim=new M01AreaSimulation(seed,{difficulty:'soldado',actId:ID});actBRoute(sim,{mode,maxSec:900});return JSON.stringify(sim.snapshot());};
  const a=run(19390901,'active');assert.equal(run(19390901,'active'),a);assert.notEqual(run(3,'active'),a);
});
