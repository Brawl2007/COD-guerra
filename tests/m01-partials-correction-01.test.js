import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01Simulation,seconds} from '../src/game/m01-simulation.js';
import {M01Characters} from '../src/render/m01-characters.js';
import {actorPose} from '../src/render/m01-actor-pose.js';
import {route} from './helpers/m01-route.js';
import {compareContinuation} from './helpers/m01-determinism.js';

const observations=new Map();
export function correctionRoute(seed=19390901,support=false){
 const key=seed+':'+support;if(observations.has(key))return observations.get(key);
 const row={seed,support,phases:{},states:{},delivery:null,firstPostTickReadiness:null,gateRelease:null,outroSkip:false,feed:null};let previous;
 const result=route(seed,{support,onStep:({sim,controls})=>{
   const bak=sim.actor('jozef_bak'),phase=bak.carry?.phase;
   if(phase&&!row.phases[phase]){row.phases[phase]={clock:sim.clock,battleClock:sim.battleClock,duration:bak.carry.duration};row.states[phase]=sim.snapshot();}
   if(previous==='putdown'&&!phase&&!bak.carriedBy){row.delivery={clock:sim.clock,battleClock:sim.battleClock,x:bak.x,z:bak.z};}
   if(!row.firstPostTickReadiness&&sim.readiness('evt_m01_west_demolition'))row.firstPostTickReadiness={clock:sim.clock,battleClock:sim.battleClock};
   // advanceBattle reads the completed previous actor pass at the start of its next tick.
   if(row.delivery&&!row.gateRelease&&sim.readiness('evt_m01_west_demolition')&&sim.battleClock>row.delivery.battleClock)row.gateRelease={clock:sim.clock,battleClock:sim.battleClock};
   if(controls.skip&&sim.mission.phase==='OUTRO')row.outroSkip=true;
   const gun=sim.actor('de_east_0');if(!row.feed&&gun.mg34Prone?.phase==='reload'&&sim.clock-gun.mg34Prone.startedAt>=.35&&sim.actor('de_mg34_loader_0').mg34Loader.phase==='feed')row.feed=sim.snapshot();
   previous=phase;
 }});
 row.final={clock:result.sim.clock,battleClock:result.sim.battleClock,complete:result.sim.mission.complete,bak:result.sim.actor('jozef_bak'),dudek:result.sim.actor('leon_dudek')};
 observations.set(key,row);return row;
}

for(const [seed,support]of [[19390901,false],[7,true]])test(`real route ${seed}/${support}: finite delivery precedes west gate release and ordinary outro Skip`,()=>{
 const row=correctionRoute(seed,support);
 assert.deepEqual(Object.keys(row.phases),['pickup','carry','putdown']);
 for(const [phase,state]of Object.entries(row.states)){const restored=new M01Simulation();restored.restoreSnapshot(state);compareContinuation(restored,{label:`real-${seed}-${phase}`,ticks:8,doubleAt:[3]});}
 assert.equal(row.phases.pickup.duration,1.6);assert.equal(row.phases.putdown.duration,1.6);
 assert.ok(row.delivery.x<-329&&row.delivery.x>-335,'actual station delivery, no relocation by the test');
 assert.ok(row.delivery.clock<row.gateRelease.clock);
 assert.ok(row.delivery.battleClock<row.gateRelease.battleClock&&row.gateRelease.battleClock<seconds('06:45:00'));
 assert.equal(row.firstPostTickReadiness.clock,row.delivery.clock,'no artificial extra settling timer');
 assert.equal(row.final.bak.carriedBy,null);assert.equal(row.final.bak.carry,undefined);
 assert.equal(row.final.complete,true);assert.equal(row.outroSkip,true);assert.equal(row.final.battleClock,seconds('07:05:00'));
 if(process.env.M01_CORRECTION_OUT){mkdirSync(process.env.M01_CORRECTION_OUT,{recursive:true});writeFileSync(`${process.env.M01_CORRECTION_OUT}/delivery-${seed}-${support}.json`,JSON.stringify(row,null,2));}
});

test('unfinished legacy transport blocks readiness; interrupted/dead and unhurt states add no extra lock',()=>{
 const input=correctionRoute().states.putdown,legacy=structuredClone(input);delete legacy.actors.find(a=>a.id==='jozef_bak').carry;
 const s=new M01Simulation();s.restoreSnapshot(legacy);assert.equal(s.readiness('evt_m01_west_demolition'),false,'carriedBy alone preserves old-save gate');
 const medic=s.actor('leon_dudek');Object.assign(medic,{alive:false,health:0,state:'DOWN'});s.tick(.05);
 assert.equal(s.actor('jozef_bak').carriedBy,null);assert.equal(s.actor('jozef_bak').carry,undefined);assert.equal(s.readiness('evt_m01_west_demolition'),true);
 const unhurt=new M01Simulation();unhurt.restoreSnapshot(input);const bak=unhurt.actor('jozef_bak');delete bak.carry;bak.carriedBy=null;unhurt.flags['m01.bak_status']='unhurt';assert.equal(unhurt.readiness('evt_m01_west_demolition'),true);
});

const gltf=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
async function asset(path){const b=readFileSync('assets/models/provisional/m01/'+path);return gltf.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const matrices=v=>{v.root.updateMatrixWorld(true);const out=[];v.root.traverse(n=>out.push(...n.matrixWorld.elements));return out;};
test('actual distant linked loader rig feeds from a real reload; pause/reload, optional proxy and death cleanup retain authority',async()=>{
 const input=correctionRoute().feed;assert.ok(input);const sim=new M01Simulation();sim.restoreSnapshot(input);
 const loader=sim.actor('de_mg34_loader_0'),gun=sim.actor(loader.loaderFor);assert.ok(Math.hypot(loader.x-sim.player.x,loader.z-sim.player.z)>1000);
 const c=new M01Characters(new THREE.Scene(),{visualVariation:false});
 c.sources.set('de:2',await asset('characters/m01_soldier_de_lod2.glb'));c.sources.set('mg34:2',await asset('weapons/mg34/m01_mg34_lod2.glb'));
 for(const path of ['characters/m01_soldier_animations.glb','characters/crews-evacuation/m01_crews_evacuation.glb','weapons/mg34/m01_mg34_animations.glb','weapons/mg34-prone/m01_mg34_prone_animations.glb'])for(const clip of (await asset(path)).animations)c.clips.set(clip.name,clip);
 try{
   const saved=sim.snapshot();assert.ok(c.update(sim.actors,sim.clock,sim.player,'low').has(loader.id));
   const v=c.instances.get(loader.id);assert.equal(v.clip,'mg34_loader_prone_feed');assert.ok(Math.abs(v.action.time-(sim.clock-loader.mg34Loader.startedAt))<1e-6);
   assert.ok(c.diagnostics.actors.length<=18);assert.deepEqual(c.diagnostics.actors.find(a=>a.id===loader.id).weaponMeshes,[]);
   const frame=matrices(v);c.update(sim.actors,sim.clock,sim.player,'low');assert.deepEqual(matrices(v),frame);
   const restored=new M01Simulation();restored.restoreSnapshot(saved);c.update(restored.actors,restored.clock,restored.player,'low');assert.deepEqual(matrices(v),frame);assert.deepEqual(sim.snapshot(),saved);
   compareContinuation(sim,{label:'real-mg34-feed-correction01',ticks:30,doubleAt:[7,16]});
   for(const name of [...c.clips.keys()])if(name.startsWith('mg34_loader_prone_'))c.clips.delete(name);
   assert.ok(!c.update(sim.actors,sim.clock,sim.player,'low').has(loader.id));const proxy=actorPose(loader,sim.clock);assert.equal(proxy.name,'prone');assert.equal(proxy.firing,false);assert.ok(proxy.head[1]<.5);assert.ok(proxy.limbs.every(l=>l.to.every(Number.isFinite)));
   Object.assign(gun,{health:0,alive:false,state:'DOWN'});sim.tick(.05);assert.equal(loader.mg34Loader.phase,'leave');assert.equal(loader.shot,0);
   for(let i=0;i<40;i++)sim.tick(.05);assert.equal(loader.active,false);assert.equal(loader.carry,undefined);
 }finally{c.dispose();}
});
