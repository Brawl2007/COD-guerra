// Pacing x combat AI (integration claude/busy-ritchie-3fkvk2-integ-pc, 2026-10-18). The clock compression of the P2 pacing (mission.json clock.segments[].compress: seg_hold at
// 24x while the player holds the deck; readyScale: seg_repair at 27x once the repair is done) scales ONLY the battle clock (M01Simulation.advanceBattle). Every combat timer
// (actor.cooldown, the actor.ai peeks, burst groups and cover pauses, suppressedUntil, clip reloads, MG34 bursts and belts, Kowal's rkm) runs on the real clock: sim.clock and the
// real tick dt. Decision: the player perceives the cadence of the fight in real seconds; the compression is a «Mais tarde…» skip of the historical clock, not a fast-forward of the
// fight, so the Germans neither fire 24x faster nor freeze while it runs. aiFire, aiTarget, aiPinned, aiBurstRounds and kowalFire read no battleClock (grep), and their state
// never moves an actor (no x, z, target or nav write: the slice-1 AI has no cover moves; walking stays in moveActor and the navigator).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {route} from './helpers/m01-route.js';

const DT=.05,german=a=>a.id.startsWith('de_');
// One real route, observed tick by tick: the first compressed tick of each scale (a snapshot to restore) and German shot starts per real tick, compressed or not.
let observed;
const full=()=>observed??=(()=>{
  const snaps={},rows=[],last=new Map();
  route(19390901,{onStep:({sim})=>{
    const t=sim.tempo;if(t.compressed&&!snaps[t.scale])snaps[t.scale]=sim.snapshot();
    let starts=0;for(const a of sim.actors)if(german(a)){if(last.has(a.id)&&a.firedAt!==last.get(a.id))starts++;last.set(a.id,a.firedAt);}
    rows.push({battle:sim.battleClock,compressed:t.compressed,scale:t.scale,starts,
      fight:sim.consumedEvent('evt_m01_train963_arrives')&&!sim.consumedEvent('evt_m01_east_demolition'),hold:sim.active('hold_access')});
  }});
  return {snaps,rows};
})();

test('the AI source reads no battle clock and moves nobody',()=>{
  const src=readFileSync(new URL('../src/game/m01-simulation.js',import.meta.url),'utf8');
  for(const name of ['aiFire','aiTarget','aiPinned','aiBurstRounds','kowalFire']){
    const at=src.indexOf(`  ${name}(`);assert.ok(at>0,name);
    const end=src.indexOf('\n  }\n',at),body=src.slice(at,end);
    assert.doesNotMatch(body,/battleClock/,`${name} runs on the real clock`);
    assert.doesNotMatch(body,/\b(a|kowal)\.(x|z|target|nav)\s*=(?!=)/,`${name} moves nobody`);
  }
});

for(const scale of [24,27])test(`under the ${scale}x compression every combat timer runs on real dt and the battle clock alone runs ${scale}x`,{timeout:240000},()=>{
  const {snaps}=full();assert.ok(snaps[scale],`the route reaches a ${scale}x compressed tick`);
  const s=new M01Simulation();s.restoreSnapshot(structuredClone(snaps[scale]));
  let checked=0,shots=0,ticks=0;
  for(let i=0;i<400;i++){
    const t=s.tempo;if(!t.compressed||t.scale!==scale)break;ticks++;
    const before=new Map(s.actors.filter(a=>(german(a)||a.id==='szymon_kowal')&&a.alive&&a.active&&Number.isFinite(a.cooldown)).map(a=>[a.id,{cooldown:a.cooldown,firedAt:a.firedAt,suppressedUntil:a.suppressedUntil,clock:s.clock}]));
    const battle=s.battleClock;s.player.health=100;s.tick(DT);
    // The battle clock: dt x scale (capped at the end of the compress window, never past it).
    assert.ok(s.battleClock-battle<=DT*scale+1e-9&&s.battleClock>battle,`battle clock ${battle} -> ${s.battleClock}`);
    for(const [id,b] of before){const a=s.actor(id);
      if(a.firedAt!==b.firedAt){shots++;continue;}
      // Not fired, not under suppression before or after: his cooldown ran down by the REAL dt, exactly (not dt x scale, not 0).
      if(b.clock<b.suppressedUntil||s.clock<a.suppressedUntil||b.cooldown<=DT||a.cooldown>b.cooldown)continue;
      assert.ok(Math.abs(b.cooldown-a.cooldown-DT)<1e-9,`${id}: cooldown ${b.cooldown} -> ${a.cooldown} in one ${DT} s tick at ${scale}x`);checked++;
    }
  }
  assert.ok(ticks>=20,`${ticks} compressed ticks observed`);assert.ok(checked>=200,`${checked} cooldown decrements checked`);
  if(scale===24)assert.ok(shots>0,'the Germans keep firing while the hold is compressed (not frozen)');
});

test('the Germans fire at the same real-time rate with and without the hold compression (not 24x faster, not frozen)',{timeout:240000},()=>{
  const {rows}=full(),hold=rows.filter(r=>r.fight&&r.hold);
  const rate=xs=>xs.reduce((n,r)=>n+r.starts,0)/(xs.length*DT);
  const on=hold.filter(r=>r.compressed&&r.scale===24),off=hold.filter(r=>!r.compressed);
  assert.ok(on.length>=200&&off.length>=200,`${on.length} compressed and ${off.length} uncompressed hold ticks`);
  const ratio=rate(on)/rate(off);
  assert.ok(ratio>.5&&ratio<2,`German shot starts per real second: ${rate(on).toFixed(3)} compressed vs ${rate(off).toFixed(3)} uncompressed (ratio ${ratio.toFixed(2)})`);
});
