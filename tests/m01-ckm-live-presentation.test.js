// T47: what the player sees and hears of the live ckm, and the proof that it is only read from the simulation. The `ally-fire` event contract, the
// event -> pending sound -> ckmBurst path of Game, the real AudioManager recording the burst, the GLB clips fire_burst/aim/feed played from the saved phase
// at the saved time, the muzzle flash and gun smoke as pure functions of the saved burst plan, and a renderer that never writes the simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Simulation,validateM01Snapshot,CKM_POSITION,CKM_BURST_SEC,CKM_FEED_SEC,CKM_STOPPAGES,ckmMuzzle} from '../src/game/m01-simulation.js';
import {validateM01AudioEvent,enemyFireSoundPlan} from '../src/game/m01-audio-events.js';
import {Game} from '../src/game/game.js';
import {AudioManager} from '../src/core/audio.js';
import {M01Characters,ckmClipPhase} from '../src/render/m01-characters.js';
import {ckmFlashes,ckmSmoke,CKM_FLASH_SEC,CKM_SMOKE_SEC} from '../src/render/m01-ckm-fx.js';
import {FakeAudioContext} from './helpers/fake-audio-context.js';
import {firstBurst,firstStoppage} from './helpers/m01-ckm-scenario.js';

const load=async path=>{const b=readFileSync(new URL('../assets/models/provisional/m01/'+path,import.meta.url));const loader=new GLTFLoader();loader.register(()=>({name:'node_no_texture_decode',loadTexture:()=>Promise.resolve(null)}));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const [rig,gun,soldier]=await Promise.all([load('weapons/ckm_wz30/m01_ckm_wz30_animations.glb'),load('weapons/ckm_wz30/m01_ckm_wz30_lod2.glb'),load('characters/m01_soldier_animations.glb')]);
const fixture=()=>{const c=new M01Characters(new THREE.Scene());c.sources.set('pl:2',rig);c.sources.set('ckm:2',gun);for(const g of [soldier,rig])for(const clip of g.animations)c.clips.set(clip.name,clip);return c;};
const matrices=c=>{const out=[];c.scene.updateMatrixWorld(true);c.scene.traverse(n=>out.push(...n.matrixWorld.elements));return out;};
const restore=raw=>{const s=new M01Simulation();s.restoreSnapshot(structuredClone(raw));s.drainEvents();return s;};
const gunnerOf=s=>s.actors.find(a=>a.id==='ckm_gunner');
const PLAYER={x:-10,z:26};
let burst;const scenario=()=>burst??=firstBurst();
let stop;const stoppage=()=>stop??=firstStoppage();

test('the ally-fire event contract: one event per burst with origin, clock, weapon, shooter, rounds and interval; anything else is refused',()=>{
  const good={type:'ally-fire',by:'ckm_gunner',weapon:'ckm_wz30',origin:{x:8,y:-2.36,z:26},rounds:8,interval:.1,at:12.5};
  assert.equal(validateM01AudioEvent(good),good);
  for(const bad of [{...good,at:Number.NaN},{...good,weapon:''},{...good,weapon:7},{...good,by:undefined},{...good,origin:undefined},{...good,origin:{x:8,y:Number.NaN,z:26}},
    {...good,rounds:0},{...good,rounds:2.5},{...good,interval:0},{...good,interval:-.1}])assert.throws(()=>validateM01AudioEvent(bad),/ally-fire/);
  const {fire}=scenario();
  assert.equal(validateM01AudioEvent(structuredClone(fire)).type,'ally-fire');
  assert.deepEqual(fire.origin,ckmMuzzle());assert.equal(fire.rounds,8);assert.equal(fire.interval,.1);assert.equal(fire.weapon,'ckm_wz30');
});

test('Game turns an ally-fire event into a pending sound at 3D distance / 343 s and plays it through ckmBurst; enemy fire still goes through weaponFire',()=>{
  const {fire}=scenario(),sim=restore(scenario().pre),calls=[];
  const game=Object.create(Game.prototype);
  Object.assign(game,{sim,pendingSounds:[],renderer:{m01:{}},audio:{ckmBurst:(...a)=>calls.push(['ckmBurst',...a]),weaponFire:(...a)=>calls.push(['weaponFire',...a])}});
  game.handleM01Event(fire);
  assert.equal(game.pendingSounds.length,1);
  const sound=game.pendingSounds[0],plan=enemyFireSoundPlan(fire,sim.player);
  assert.equal(sound.kind,'fire');assert.equal(sound.weapon,'ckm_wz30');assert.equal(sound.rounds,8);assert.equal(sound.interval,.1);
  assert.equal(sound.at,fire.at+plan.distance/343);assert.equal(sound.distance,plan.distance);assert.equal(sound.pan,plan.pan);assert.equal(sound.front,plan.front);
  assert.ok(sound.at>fire.at,'the report arrives after the burst starts');
  game.playSound(sound);
  assert.equal(calls.length,1);assert.deepEqual(calls[0],['ckmBurst',sound.pan,sound.distance,8,.1,sound.key,sound.front]);
  // The German MG34 keeps its own path (one weaponFire call with the merging `source`).
  game.handleM01Event({type:'enemy-fire',origin:{x:1055,y:0,z:13},rounds:1,interval:.075,weapon:'mg34',at:fire.at});
  game.playSound(game.pendingSounds[1]);
  assert.equal(calls.length,2);assert.equal(calls[1][0],'weaponFire');assert.equal(calls[1][1],'mg34');
});

test('the real AudioManager plays the burst as a ckm_wz30 event of 8 rounds at the cadence of the simulation',()=>{
  const {fire}=scenario(),sim=restore(scenario().pre),ctx=new FakeAudioContext(),audio=new AudioManager({contextFactory:()=>ctx});
  assert.equal(audio.init(),true);
  const game=Object.create(Game.prototype);Object.assign(game,{sim,pendingSounds:[],renderer:{m01:{}},audio});
  game.handleM01Event(fire);game.playSound(game.pendingSounds[0]);
  const d=audio.diagnostics;
  assert.equal(d.eventCounts.ckm,1);
  const last=d.lastEvents.find(e=>e.kind==='ckm');assert.ok(last);assert.deepEqual(last.detail,{weapon:'ckm_wz30',rounds:8,interval:.1});
  assert.ok(d.activeVoices>=1);audio.dispose();
});

test('the GLB clips follow the saved phase and time: fire_burst, aim after it, and feed during a belt change, for the gun and for both crew roles',()=>{
  const {mid,landing,pre}=scenario(),cases=[];
  cases.push(['fire_burst',restore(mid)]);
  cases.push(['aim',restore(landing)]);
  const feedRaw=structuredClone(pre);gunnerOf(feedRaw).ckmFire.belt=10;
  const feed=restore(feedRaw);for(let i=0;i<400&&gunnerOf(feed).ckm.phase!=='feed';i++)feed.tick(.05);cases.push(['feed',feed]);
  for(const [phase,sim] of cases){
    const c=fixture(),copy=fixture(),saved=sim.snapshot(),g=gunnerOf(sim);
    try{
      assert.equal(g.ckm.phase,phase);
      c.update(sim.actors,sim.clock,PLAYER);
      const age=sim.clock-g.ckm.startedAt;
      for(const [id,role] of [['ckm_gunner','gunner'],['ckm_loader','loader']]){
        const v=c.instances.get(id);assert.equal(v.clip,`ckm_wz30_${role}_${phase}`,id);
        assert.ok(Math.abs(v.action.time-Math.min(age,v.action.getClip().duration))<1e-6||phase==='aim'||phase==='idle',`${id} time ${v.action.time} vs age ${age}`);
      }
      assert.equal(c.ckm.clip,`ckm_wz30_gun_${phase}`);assert.deepEqual(c.ckm.root.position.toArray(),Object.values(CKM_POSITION));assert.equal(c.ckm.root.visible,true);
      const clip=c.ckm.clips.find(x=>x.name===c.ckm.clip),expect=phase==='aim'?Math.min(age,clip.duration):Math.min(age,clip.duration);
      assert.ok(Math.abs(c.ckm.time-expect)<1e-6,`gun time ${c.ckm.time} vs ${expect}`);
      if(phase==='fire_burst')assert.ok(age>=0&&age<CKM_BURST_SEC+1e-9);
      if(phase==='feed')assert.ok(age>=0&&age<CKM_FEED_SEC+1e-9);
      // The renderer wrote nothing, a repeated frame is bit-identical, and a fresh renderer on a restored save draws exactly the same frame.
      const pose=matrices(c);c.update(sim.actors,sim.clock,PLAYER);assert.deepEqual(matrices(c),pose);assert.deepEqual(sim.snapshot(),saved);
      const other=restore(saved);copy.update(other.actors,other.clock,PLAYER);assert.deepEqual(matrices(copy),pose);
    }finally{c.dispose();copy.dispose();}
  }
});

test('the muzzle flash and the gun smoke are pure functions of the saved burst plan: only issued rounds flash, 0.07 s each, and a restored save draws the same',()=>{
  const {mid,landing}=scenario(),sim=restore(mid),plan=gunnerOf(sim).ckm.burstPlan,start=plan.startedAt;
  assert.equal(plan.emitted,4);
  // Round k flashes in [start + 0.1k, start + 0.1k + CKM_FLASH_SEC): inside the issued part of the plan only.
  const counts=[0,.02,.069,.071,.099,.101,.12,.171,.21,.29,.31,.34,.371,.45,.8].map(dt=>[dt,ckmFlashes(sim.actors,start+dt).length]);
  for(const [dt,n] of counts){
    const expected=[0,1,2,3].filter(k=>dt-k*.1>=0&&dt-k*.1<CKM_FLASH_SEC).length;
    assert.equal(n,expected,`dt=${dt}`);
  }
  assert.equal(ckmFlashes(sim.actors,start+.4).length,0,'round 4 is not issued in this save: nothing is drawn for it');
  const f=ckmFlashes(sim.actors,start+.02)[0];assert.deepEqual([f.x,f.y,f.z],Object.values(ckmMuzzle()));assert.ok(f.age>=0&&f.age<CKM_FLASH_SEC);
  assert.deepEqual(ckmFlashes(restore(mid).actors,start+.12),ckmFlashes(sim.actors,start+.12));
  const smoke=ckmSmoke(sim.actors,start+.35);assert.ok(smoke&&smoke.age>.3&&smoke.age<.4);assert.equal(ckmSmoke(sim.actors,start-.01),null);assert.equal(ckmSmoke(sim.actors,start+CKM_SMOKE_SEC+.01),null);
  // After the burst: no flash, and no plan at all once its last round has landed.
  const late=restore(landing);assert.equal(ckmFlashes(late.actors,late.clock).length,0);
  for(let i=0;i<40;i++)late.tick(.05);assert.equal(gunnerOf(late).ckm.burstPlan,undefined);assert.deepEqual(ckmFlashes(late.actors,late.clock),[]);assert.equal(ckmSmoke(late.actors,late.clock),null);
  // Hidden or dead: nothing.
  const hidden=restore(mid);gunnerOf(hidden).ckm.visible=false;assert.deepEqual(ckmFlashes(hidden.actors,start+.02),[]);
  const dead=restore(mid);Object.assign(gunnerOf(dead),{alive:false,health:0,state:'DOWN'});assert.deepEqual(ckmFlashes(dead.actors,start+.02),[]);
  validateM01Snapshot(sim.snapshot());
});

test('the renderer reads and never decides: rendering a burst leaves the simulation, its random state and its events untouched',()=>{
  const {pre}=scenario(),a=restore(pre),b=restore(pre),c=fixture();
  try{
    for(let i=0;i<60;i++){
      a.tick(.05,{crouch:i===0});b.tick(.05,{crouch:i===0});
      c.update(b.actors,b.clock,PLAYER);ckmFlashes(b.actors,b.clock);ckmSmoke(b.actors,b.clock);   // b is rendered every tick, a never
      assert.deepEqual(a.snapshot(false),b.snapshot(false),`tick ${i}`);assert.deepEqual(a.drainEvents(),b.drainEvents());assert.equal(a.rng.state,b.rng.state);
    }
    assert.ok(gunnerOf(b).ckmFire.bursts>=1);
  }finally{c.dispose();}
});

// 2026-10-22 (ckm stoppage, golden amendment 15): the stoppage reuses the authored `feed` clips (belt tip in by the loader, tab pulled and the handle back twice by the gunner, `ready` at 3.0 s
// of 3.2 s), placed at the END of the clearance so that `ready` lands as the loader says 115; the lead before it holds the aim pose while the gunner calls the jam.
test('ckmClipPhase: the saved phase and its start decide the clip and the time in it; a stoppage plays the aim pose for its lead, then the feed drill to its last frame at clearAt',()=>{
  for(const phase of ['idle','aim','fire_burst','feed','abandon','retreat'])assert.deepEqual(ckmClipPhase({phase,startedAt:10},12.5),{phase,time:2.5},phase);
  assert.deepEqual(ckmClipPhase({phase:'aim',startedAt:10},9),{phase:'aim',time:0},'a frame drawn before the saved start does not go negative');
  const s={phase:'stoppage',startedAt:10,clearAt:14.6},lead=14.6-10-CKM_FEED_SEC;
  assert.ok(Math.abs(lead-1.4)<1e-9);
  assert.deepEqual(ckmClipPhase(s,10),{phase:'aim',time:0});assert.equal(ckmClipPhase(s,10+lead-.01).phase,'aim');
  const at=ckmClipPhase(s,10+lead+1e-9);assert.equal(at.phase,'feed');assert.ok(Math.abs(at.time)<1e-6,'the drill starts when the lead ends');
  const end=ckmClipPhase(s,14.6);assert.equal(end.phase,'feed');assert.ok(Math.abs(end.time-CKM_FEED_SEC)<1e-9,'and ends as the clearance does');
  assert.deepEqual(ckmClipPhase({phase:'stoppage',startedAt:10,clearAt:10+CKM_FEED_SEC},10),{phase:'feed',time:0},'no lead when the clearance is exactly the drill');
});

test('the GLB clips of a stoppage: the aim pose in the lead, then feed to its last frame at clearAt, for the gun and for both crew roles; a repeated frame and a restored save draw the same',{timeout:240000},()=>{
  const {mid}=stoppage(),sim=restore(mid),g=gunnerOf(sim),saved=sim.snapshot(),{startedAt,clearAt}=g.ckm,lead=clearAt-startedAt-CKM_FEED_SEC;
  assert.equal(g.ckm.phase,'stoppage');assert.ok(lead>=0&&lead<=5-CKM_FEED_SEC+1e-9,`lead ${lead}`);
  const frames=[[ 'aim',startedAt+lead/2,lead/2 ],[ 'feed',startedAt+lead+1,1 ],[ 'feed',startedAt+lead+2.6,2.6 ],[ 'feed',clearAt-.001,CKM_FEED_SEC-.001 ]].filter(([phase,,age])=>phase!=='aim'||lead>.1);
  for(const [phase,time,age] of frames){
    const c=fixture(),copy=fixture();
    try{
      c.update(sim.actors,time,PLAYER);
      for(const [id,role] of [['ckm_gunner','gunner'],['ckm_loader','loader']]){
        const v=c.instances.get(id);assert.equal(v.clip,`ckm_wz30_${role}_${phase}`,`${id} at ${age.toFixed(2)} s into the drill`);
        if(phase==='feed')assert.ok(Math.abs(v.action.time-Math.min(age,v.action.getClip().duration))<1e-6,`${id} time ${v.action.time} vs ${age}`);
      }
      assert.equal(c.ckm.clip,`ckm_wz30_gun_${phase}`);assert.equal(c.ckm.root.visible,true);
      const clip=c.ckm.clips.find(x=>x.name===c.ckm.clip);if(phase==='feed')assert.ok(Math.abs(c.ckm.time-Math.min(age,clip.duration))<1e-6,`gun time ${c.ckm.time} vs ${age}`);
      const pose=matrices(c);c.update(sim.actors,time,PLAYER);assert.deepEqual(matrices(c),pose);assert.deepEqual(sim.snapshot(),saved,'the renderer wrote nothing');
      const other=restore(saved);copy.update(other.actors,time,PLAYER);assert.deepEqual(matrices(copy),pose,'a fresh renderer on a restored save draws exactly the same frame');
    }finally{c.dispose();copy.dispose();}
  }
  // The drill is the one the feed clip authors: the handle is pulled twice and `ready` is at 3.0 s of 3.2 s, so it reads as the loader\'s «Pronto» at clearAt.
  const feed=gun.animations.find(x=>x.name==='ckm_wz30_gun_feed');assert.ok(feed&&Math.abs(feed.duration-CKM_FEED_SEC)<1e-3,'the clip is 3.2 s long (stored as a float32)');
  assert.ok(CKM_STOPPAGES.every(x=>x.sec-CKM_FEED_SEC>=0),'every slot leaves room for the whole drill');
});
