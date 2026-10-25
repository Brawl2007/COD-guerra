// R3-a review (2026-10-25, golden amendment 19): the retreat of the section ends at places of its own near the old retreat point (src/game/m01-retreat.js, mission.json `retreat`), not at the one
// point (x -170, z 22) where every man stopped 0.8 m short of it, inside the personal space of the others, so that the sergeant could not get out of the pile to fetch the player (README §7 of
// docs/verification/m01-runtime/sappers-r3a-2026-10-24). State-level tests of the simulation: the data as validated mission data, the places on open ground the navigator can reach, every man who
// can need one has one, a pile of men on the old point falls apart and each reaches his place, and on the real route nobody of the retreat stands within 1.5 m of anybody (before: 0.52 m).
// The escort that the pile used to prevent is asserted, unchanged, by tests/m01-runtime.test.js (west hold timeout).
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {RETREAT,RETREAT_POINT,RETREAT_GAP_M,RETREAT_REACH_M,ckmFinal,retreatPlan,retreatSlot} from '../src/game/m01-retreat.js';
import {SQUAD,SQUAD_IDS} from '../src/game/m01-squad.js';
import {route} from './helpers/m01-route.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const IDS=['jozef_bak','leon_dudek','marek_zielinski','pawel_krawiec','sapper_2','sapper_3'];
const CKM=['ckm_gunner','ckm_loader','ckm_reserve'];
const mutate=fn=>{const d=structuredClone(definition);fn(d.retreat);return d;};

test('the retreat is mission data, validated when it loads: a place for every man who can need one, near the old point, clear of the ckm finals and of the squad rally',()=>{
  assert.ok(Object.isFrozen(RETREAT)&&Object.isFrozen(RETREAT.slots));
  assert.deepEqual(Object.keys(RETREAT.slots).sort(),IDS);
  assert.deepEqual(RETREAT_POINT,{x:-170,z:22},'the old retreat point is still the first final of the ckm crew');
  const taken=[...CKM.map((id,i)=>[id,ckmFinal(i)]),...Object.entries(SQUAD.posts[2].slots).map(([id,[x,z]])=>[id+' at the rally',{x,z}])];
  assert.deepEqual(ckmFinal(0),RETREAT_POINT);
  for(const id of IDS){
    const s=RETREAT.slots[id];
    assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.z)&&Number.isFinite(s.facing),id);
    assert.ok(dist(s,RETREAT_POINT)<=RETREAT_REACH_M,`${id} stays near the old point (${dist(s,RETREAT_POINT).toFixed(1)} m)`);
    for(const [name,p] of taken)assert.ok(dist(s,p)>=RETREAT_GAP_M,`${id} is ${dist(s,p).toFixed(2)} m from ${name}`);
    for(const other of IDS)if(other>id)assert.ok(dist(s,RETREAT.slots[other])>=RETREAT_GAP_M,`${id} and ${other} are ${dist(s,RETREAT.slots[other]).toFixed(2)} m apart`);
    assert.equal(retreatSlot(id),s);
  }
  assert.equal(retreatSlot('nobody'),RETREAT_POINT,'a man the plan does not know still goes to the old point');
  for(const [name,fn,re] of [
    ['no places',r=>{delete r.slots;},/slots: exactly/],
    ['a man without a place',r=>{delete r.slots.sapper_3;},/slots: exactly/],
    ['a place for the player',r=>{r.slots.jan_wrona=[-168,24,0];},/slots: exactly/],
    ['a place that is not [x, z, facing]',r=>{r.slots.sapper_2=[-168.4,19.4];},/a slot \[x, z, facing\]/],
    ['a place far from the point',r=>{r.slots.leon_dudek=[-190,22,0];},/more than 8 m from the retreat point/],
    ['two men on one place',r=>{r.slots.sapper_2=[...r.slots.sapper_3];},/closer than 2\.6 m/],
    ['a place on the ckm gunner',r=>{r.slots.jozef_bak=[-170.5,22.5,0];},/closer than 2\.6 m to ckm final 0/],
    ['a place on the squad rally',r=>{r.slots.marek_zielinski=[-164.5,19.0,0];},/closer than 2\.6 m to (staszek_pawlak|east_platoon_voice|szymon_kowal) at the rally/],
    ['another point',r=>{r.point=[-150,14];},/the old retreat point/],
    ['not a dramatization',r=>{r.classification='DOCUMENTED';},/classification/],
  ])assert.throws(()=>retreatPlan(mutate(fn)),re,name);
  assert.throws(()=>retreatPlan({...definition,retreat:undefined}),/classification/);
});

test('every place is open ground that the navigator can walk to: out of every solid, not in the river, and reached from the second cut and from the squad post',()=>{
  const sim=new M01Simulation(1),world=sim.world,nav=sim.navigator;
  const walker=(x,z)=>({x,y:world.heightAt(x,z),z,radius:.3});
  for(const id of IDS){
    const s=RETREAT.slots[id],y=world.heightAt(s.x,s.z);
    assert.ok(!world.isWater(s.x)&&y>-3.5,`${id} stands on the bank`);
    assert.equal(nav.blockedAt(s.x,s.z,.45,y),false,`${id}: the place is out of every solid, with a body's width to spare`);
    for(const from of [[-136.6,10.3],[-70,22],[-332,24],[-250,40]]){
      const r=nav.route(walker(...from),s);
      assert.ok(r,`${id}: a route from (${from}) exists`);assert.deepEqual(r.at(-1),[s.x,s.z]);
    }
  }
});

test('everybody who can reach the generic retreat rule has a place: the roster is closed (a new ally without one fails here, not as a pile in the game)',()=>{
  const sim=new M01Simulation(1);
  // the rule (updateActors): an ally who is not a civilian, a ckm man (own finals), the east platoon, the yard or the garrison (groups with their own walk), nor a fire team's man (squadWalk)
  const exempt=new Set(['tadeusz_nowicki','generic_rifleman',...SQUAD_IDS]);   // Nowicki goes with the bomb that cuts the cable; the station patient is wounded for good
  const reach=sim.actors.filter(a=>a.team==='ally'&&!a.civilian&&!a.displayOnly&&!a.group&&!exempt.has(a.id)).map(a=>a.id).sort();
  assert.deepEqual(reach,IDS,'the men the rule can send to the retreat are exactly the men with a place');
  for(const a of sim.actors.filter(a=>a.group==='grp_ckm_crew'))assert.ok(!RETREAT.slots[a.id],`${a.id} has his own final`);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// One real route (the golden control route), run once and only by the tests that need it: the observations and the checkpoint of the retreat come from the same run.
let routed;
const real=()=>routed??=(()=>{
  const observed={at:{}},done=route(19390901,{onStep:({sim})=>{
    if(observed.t0===undefined&&sim.consumedEvent('evt_m01_east_demolition'))observed.t0=sim.clock;
    if(observed.t0===undefined)return;
    for(const after of [30,60,150])if(observed.at[after]===undefined&&sim.clock-observed.t0>=after){
      const near=sim.actors.filter(a=>a.team==='ally'&&a.alive&&a.active&&!a.displayOnly&&dist(a,RETREAT_POINT)<10);
      let least=Infinity;for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++)least=Math.min(least,dist(near[i],near[j]));
      observed.at[after]={ids:near.map(a=>a.id).sort(),least,place:Object.fromEntries(IDS.map(id=>{const a=sim.actor(id);return [id,a.alive&&a.active?dist(a,RETREAT.slots[id]):null];}))};
    }
  }});
  return {observed,done};
})();

test('on the real route nobody of the retreat stands within 1.5 m of anybody, and each man stands at the place of his own (before: 0.52 m between the sergeant and a sapper)',{timeout:600000},()=>{
  const {observed}=real();
  for(const after of [30,60,150]){
    const o=observed.at[after];assert.ok(o,`observed at +${after} s`);
    assert.ok(o.ids.includes('marek_zielinski')&&o.ids.includes('sapper_3'),`+${after} s: the sergeant and the sappers are at the retreat (${o.ids})`);
    assert.ok(o.least>=1.5,`+${after} s: the least distance between two men at the retreat is ${o.least.toFixed(2)} m`);
  }
  for(const after of [60,150])for(const id of ['marek_zielinski','pawel_krawiec','sapper_2','sapper_3']){
    const d=observed.at[after].place[id];assert.ok(d!==null&&d<=.85,`+${after} s: ${id} is ${d?.toFixed(2)} m from his place`);
  }
  assert.ok(observed.at[150].ids.includes('ckm_gunner')&&observed.at[150].least>=1.9,'the ckm crew keeps its own diagonal, 2 m apart');
});

test('a pile of men on the old retreat point falls apart: each reaches the place of his own and the sergeant is out of it (a save made inside the old pile)',{timeout:600000},()=>{
  const {done}=real();
  const sim=new M01Simulation(1);sim.restoreSnapshot(done.checkpoints.cp_m01_d_retirada);
  const men=['marek_zielinski','pawel_krawiec','sapper_2','sapper_3'].map(id=>sim.actor(id));
  men.forEach((a,i)=>{const t=i*Math.PI/2;a.x=RETREAT_POINT.x+.5*Math.cos(t);a.z=RETREAT_POINT.z+.5*Math.sin(t);a.y=sim.world.heightAt(a.x,a.z);a.state='GUARD';a.target=null;delete a.nav;});
  for(let i=0;i<20*60;i++)sim.tick(.05,{});
  for(const a of men)assert.ok(dist(a,RETREAT.slots[a.id])<=.85,`${a.id} is ${dist(a,RETREAT.slots[a.id]).toFixed(2)} m from his place`);
  for(let i=0;i<men.length;i++)for(let j=i+1;j<men.length;j++)assert.ok(dist(men[i],men[j])>=1.5,`${men[i].id} and ${men[j].id} are ${dist(men[i],men[j]).toFixed(2)} m apart (their places are 3.1 m or more apart; before: 0.5 m)`);
  assert.ok(dist(sim.actor('marek_zielinski'),RETREAT_POINT)>=2,'the sergeant stands 2 m or more from the point (his place is 3 m from it), free to go');
  for(const a of men)assert.equal(a.facing,RETREAT.slots[a.id].facing,`${a.id} turned to the river on arrival`);
});
