import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import * as THREE from 'three';
import manifest from '../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import layout from '../missions/m01-tczew/map-layout.json' with {type:'json'};
import * as D from '../src/render/m01-demolition.js';
import {M01CombatFeedback,M01_FEEDBACK_CAPS} from '../src/render/m01-combat-feedback.js';
import {M01Atmosphere} from '../src/render/m01-atmosphere.js';
import {M01_BATTLEFIELD_FX_LIMITS,M01View} from '../src/render/m01-view.js';
import {M01_FX_PROFILES} from '../src/render/m01-battlefield-fx-profile.js';

const source=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const lod0=manifest.files.filter(f=>f.lod===0).flatMap(f=>f.nodes.map(n=>({...n,file:f.file})));
const collapsing=manifest.files.filter(f=>typeof f.lod==='number').flatMap(f=>f.nodes.filter(n=>D.collapseDamageId(n.showAfterEvent)).map(n=>({...n,lod:f.lod,file:f.file,twin:f.nodes.find(t=>t.name===D.collapseTwinName(n.name))})));
const east={id:'east_demolition',x:800,y:0,z:20,started:1000},west={id:'west_demolition',x:70,y:0,z:20,started:2000};
const norm=v=>Math.hypot(...v);

test('collapse duration and the declared presentation constants sit inside the task contract',()=>{
  assert.ok(D.M01_COLLAPSE_DURATION>=2&&D.M01_COLLAPSE_DURATION<=4);
  assert.ok(D.M01_COLLAPSE_MAX_DELAY<D.M01_COLLAPSE_DURATION/4);
  assert.ok(D.M01_SPLASH_DELAY>=3&&D.M01_SPLASH_DELAY<=4&&D.M01_SPLASH_DELAY<=D.M01_COLLAPSE_DURATION);
  assert.ok(D.M01_FLASH_MIN_DURATION>M01_FX_PROFILES.demolition.flashEnd);
  assert.ok(D.M01_SILENCE_SECONDS===2);
  assert.deepEqual(D.M01_DEMOLITION_IDS,['east_demolition','west_demolition']);
});

test('every demolition node of every LOD maps to its intact twin and to a damage id, from the real manifest',()=>{
  assert.equal(collapsing.length,54,'18 collapsed/rubble/damaged nodes per LOD (rail 8 + road 10), three LODs');
  for(const n of collapsing){
    assert.ok(n.twin,`${n.name} has an intact twin in its own file`);
    assert.ok(['east_demolition','west_demolition'].includes(D.collapseDamageId(n.showAfterEvent)));
    assert.equal(D.collapseDamageId(n.twin.destroyedBy),D.collapseDamageId(n.showAfterEvent),`${n.name}: the node hidden by the event is the one it replaces`);
  }
  assert.equal(D.collapseDamageId('evt_m01_bombing_0434'),null);assert.equal(D.collapseDamageId(null),null);assert.equal(D.collapseTwinName('rail_span_03'),null);
  for(const lod of [0,1,2])for(const id of ['collapsed','rubble'])assert.ok(collapsing.some(n=>n.lod===lod&&n.name.endsWith('_'+id)),`lod ${lod} ${id}`);
});

test('collapse pose: untouched before the blast, full intact offset at age 0, exactly the stored pose from T on',()=>{
  const T=D.M01_COLLAPSE_DURATION,spans=collapsing.filter(n=>/_span_\d\d_collapsed$/.test(n.name)&&n.lod===0);
  assert.equal(spans.length,8);
  for(const n of collapsing){
    const offset=n.twin.pivot.map((v,i)=>v-n.pivot[i]),seed=D.collapseSeed(n.name);
    for(const age of [-5,-1e-9,NaN,undefined])assert.deepEqual(D.collapsePose({age,offset,seed}),{active:false,progress:0,remaining:0,offset:[0,0,0],tilt:[0,0,0]},`${n.name} age ${age}`);
    const start=D.collapsePose({age:0,offset,seed});
    assert.equal(start.active,true);assert.equal(start.progress,0);assert.equal(start.remaining,1);
    assert.deepEqual(start.offset,D.collapseStartOffset(offset),`${n.name} starts at the intact pivot (plus the minimum drop)`);
    assert.ok(start.offset[1]>=D.M01_COLLAPSE_MIN_DROP);
    for(const age of [T,T+1e-9,T+1,60,86400]){
      const end=D.collapsePose({age,offset,seed});
      assert.equal(end.active,false);assert.equal(end.progress,1);assert.deepEqual(end.offset,[0,0,0]);assert.deepEqual(end.tilt,[0,0,0]);
    }
    for(const t of start.tilt)assert.ok(Math.abs(t)<=D.M01_COLLAPSE_START_TILT);
  }
  // Real numbers: rail_span_01 drops 8.004 m (intact pivot y 0 -> collapsed y -8.004).
  const rail01=spans.find(n=>n.name==='rail_span_01_collapsed'),offset=rail01.twin.pivot.map((v,i)=>v-rail01.pivot[i]);
  assert.ok(Math.abs(offset[1]-8.004233377092849)<1e-9);
  assert.ok(Math.abs(D.collapsePose({age:0,offset,seed:1}).offset[1]-8.004233377092849)<1e-9);
});

test('collapse pose is monotonic, gravity-like (ease-in), and the same clock always gives the same pose',()=>{
  const T=D.M01_COLLAPSE_DURATION;
  for(const n of collapsing.filter(c=>c.lod===0)){
    const offset=n.twin.pivot.map((v,i)=>v-n.pivot[i]),seed=D.collapseSeed(n.name);let progress=-1,distance=Infinity,rotation=Infinity;
    for(let age=0;age<=T+.5;age+=.02){
      const pose=D.collapsePose({age,offset,seed});
      assert.ok(pose.progress>=progress,`${n.name}: progress never goes back at ${age.toFixed(2)} s`);
      const d=norm(pose.offset),r=norm(pose.tilt)*pose.remaining;
      assert.ok(d<=distance+1e-12&&r<=rotation+1e-12,`${n.name}: distance to the stored pose never grows at ${age.toFixed(2)} s`);
      progress=pose.progress;distance=d;rotation=r;
    }
    const mid=D.collapsePose({age:T/2,offset,seed});
    assert.ok(mid.progress>0&&mid.progress<.5,`${n.name}: ease-in, less than half the fall done at T/2`);
    assert.ok(mid.active&&norm(mid.offset)<norm(D.collapsePose({age:0,offset,seed}).offset)&&norm(mid.offset)>0);
    // Determinism: no hidden state, any evaluation order.
    const order=[2.9,.1,1.7,3.3,0,1.7].map(age=>D.collapsePose({age,offset,seed}));
    assert.deepEqual(order[2],order[5]);assert.deepEqual(order[1],D.collapsePose({age:.1,offset,seed}));
  }
  assert.equal(D.collapseProgress(T),1);assert.equal(D.collapseProgress(0),0);assert.equal(D.collapseProgress(-1),0);assert.equal(D.collapseProgress(NaN),0);
  // Every piece lands at the same instant, but not the same way: per-piece delay and start rotation differ.
  const delays=new Set(collapsing.filter(n=>n.lod===0).map(n=>D.collapseDelay(D.collapseSeed(n.name)).toFixed(4)));
  assert.ok(delays.size>10);for(const v of delays)assert.ok(v>=0&&v<=D.M01_COLLAPSE_MAX_DELAY);
});

test('view: collapsed nodes are SET from the cached stored transform (never accumulated); pause, replay and restore give the same pose',()=>{
  const view=Object.assign(Object.create(M01View.prototype),{combatFeedback:new M01CombatFeedback(),demolitionState:{entries:[],pieces:[],flash:null},
    collapseTilt:new THREE.Quaternion(),collapseEuler:new THREE.Euler()});
  const make=name=>{
    const node=manifest.files.flatMap(f=>f.nodes).find(n=>n.name===name),object=new THREE.Object3D();object.name=name;object.position.fromArray(node.pivot);
    const stored=collapsing.find(c=>c.name===name&&c.lod===0);
    // Stored final transforms of the collapsed nodes (small tilt like the GLB's), intact nodes at the identity.
    if(stored)object.quaternion.set(.045,-.0004,-.0097,.99894).normalize();
    object.visible=true;return {name,node:object,show:node.showAfterEvent??null};
  };
  const names=['rail_span_07','rail_span_07_collapsed','rail_span_06','rail_span_06_collapsed','rail_support_06','rail_support_06_rubble'];
  const pieces=names.map(make);view.setupCollapse(pieces);view.kit=[{file:{lod:0},pieces}];
  const collapsed=pieces.filter(p=>p.collapse),by=Object.fromEntries(pieces.map(p=>[p.name,p]));
  assert.deepEqual(collapsed.map(p=>p.name),['rail_span_07_collapsed','rail_span_06_collapsed','rail_support_06_rubble']);
  const stored=Object.fromEntries(collapsed.map(p=>[p.name,{position:p.node.position.toArray(),quaternion:p.node.quaternion.toArray()}]));
  const sim={player:{x:38,y:0,z:0}},state=at=>({damage:at===null?[]:[{...east,started:100}]});
  const pose=clock=>{view.updateDemolition(state(clock===null?null:0),clock??0,sim);return Object.fromEntries(collapsed.map(p=>[p.name,{position:p.node.position.toArray(),quaternion:p.node.quaternion.toArray()}]));};
  // No damage entry: untouched.
  assert.deepEqual(pose(null),stored);
  // Before the blast: untouched.
  assert.deepEqual(pose(99.9),stored);
  // Blast instant: span 07 sits at its intact pivot (x 795, y 0), it has not fallen yet.
  let p=pose(100);
  assert.ok(Math.abs(p.rail_span_07_collapsed.position[1]-0)<1e-9);assert.ok(Math.abs(p.rail_span_07_collapsed.position[0]-795)<1e-9);
  // Mid collapse: between the two poses; paused re-render at the same clock changes nothing; a long detour in time and back is identical (SET, not accumulate).
  const mid=pose(101.6),again=pose(101.6);assert.deepEqual(again,mid);
  const y=mid.rail_span_07_collapsed.position[1];assert.ok(y<0&&y>stored.rail_span_07_collapsed.position[1]);
  pose(103.1);pose(100.2);pose(150);assert.deepEqual(pose(101.6),mid);
  // After T (and for a restore that starts long after): exactly the stored transform, bit for bit.
  assert.deepEqual(pose(100+D.M01_COLLAPSE_DURATION),stored);assert.deepEqual(pose(100+D.M01_COLLAPSE_DURATION+.001),stored);assert.deepEqual(pose(5000),stored);
  // A restore before the blast puts everything back.
  pose(101.6);assert.deepEqual(pose(50),stored);
  // Visibility is owned by renderState.parts: the animation never touches it.
  for(const piece of pieces)assert.equal(piece.node.visible,true);
  // Diagnostics are JSON-safe and carry per-piece phase/progress.
  pose(101.6);const diag=structuredClone(view.demolitionState);
  assert.equal(diag.entries[0].id,'east_demolition');assert.ok(diag.entries[0].progress>0&&diag.entries[0].progress<1);
  assert.ok(diag.pieces.some(q=>q.name==='rail_span_07_collapsed'&&q.phase==='falling'));
  assert.equal(by.rail_span_06_collapsed.collapse.offset[1],0.0021660935158588357);
});

test('flash: minimum angular size and duration at 762 m and 362 m; the near-field profile is unchanged',()=>{
  const profile=M01_FX_PROFILES.demolition,args={scale:profile.scale,flashEnd:profile.flashEnd,lightRange:profile.lightDistance};
  for(const distance of [362,762,1100]){
    const f=D.demolitionFlash(distance,args);
    assert.ok(f.angular>=D.M01_FLASH_MIN_ANGULAR-1e-12,`${distance} m: ${f.angular}`);
    assert.ok(f.duration>=D.M01_FLASH_MIN_DURATION,`${distance} m duration`);
    assert.ok(f.scale>=profile.scale&&f.scale<=profile.scale*D.M01_FLASH_MAX_SCALE_FACTOR);
    assert.ok(f.lightRange>profile.lightDistance&&f.lightSeconds>.34&&f.lightDecay<2,'the light reaches the far viewer');
  }
  assert.ok(D.demolitionFlash(762,args).scale>profile.scale);
  for(const distance of [0,10,50,85]){
    const f=D.demolitionFlash(distance,args);
    assert.equal(f.scale,profile.scale);assert.equal(f.duration,profile.flashEnd);assert.equal(f.lightRange,profile.lightDistance);assert.equal(f.lightSeconds,.34);assert.equal(f.lightDecay,2);
  }
  let scale=0,duration=0,range=0;
  for(let d=0;d<=2000;d+=10){const f=D.demolitionFlash(d,args);assert.ok(f.scale>=scale&&f.duration>=duration&&f.lightRange>=range);scale=f.scale;duration=f.duration;range=f.lightRange;}
});

test('far field: exposure at the light (age 0), tremor at distance/343 s, complementary to the existing 180 m path, inside M01_FEEDBACK_CAPS',()=>{
  for(const distance of [362,762]){
    const early=D.farFeedback(0,distance),delay=distance/343;
    assert.equal(early.applies,true);assert.ok(early.exposure>0&&early.tremor===0&&early.tremorAt===delay);
    assert.equal(D.farFeedback(delay-.01,distance).tremor,0);assert.ok(D.farFeedback(delay+.01,distance).tremor>0);
    assert.equal(D.farFeedback(D.farFeedbackWindow(distance)+.01,distance).tremor,0);assert.equal(D.farFeedback(D.M01_FAR_EXPOSURE_SECONDS+.01,distance).exposure,0);
    assert.equal(D.farFeedback(-1,distance).exposure,0);
  }
  // The near path (M01CombatFeedback.explosion) and the far path partition every distance: exactly one of them reacts.
  for(let d=0;d<=2500;d+=.5){
    const near=new M01CombatFeedback().explosion({clock:5,distance:d}),far=D.farFeedbackApplies(d);
    assert.notEqual(near,far,`${d} m is covered by exactly one path`);assert.equal(near,D.nearExplosionFeedbackApplies(d));
  }
  const f=new M01CombatFeedback();
  assert.equal(f.demolition({id:'west_demolition',started:2000,clock:2000,distance:362}),true);
  assert.equal(f.demolition({id:'west_demolition',started:2000,clock:2000.5,distance:362}),false,'once per damage entry');
  assert.equal(f.demolition({id:'east_demolition',started:1000,clock:1000,distance:100}),false,'near demolitions stay with explosion(), not doubled');
  assert.equal(f.demolition({id:'m01_grenade_0',started:5,clock:5,distance:400}),false,'small/bombing explosions never take the far path');
  assert.equal(f.demolition({id:'station_bomb',started:5,clock:5,distance:400}),false);
  const t0=f.diagnostics(2000,'high'),tShock=f.diagnostics(2000+362/343+.05,'high'),later=f.diagnostics(2010,'high');
  assert.ok(t0.exposureFlash>0&&t0.exposureFlash<=.13&&t0.shakeStrength===0&&t0.farExposure>0&&t0.farTremor===0);
  assert.ok(tShock.shakeStrength>0&&tShock.exposureFlash===0&&tShock.farTremor>0);
  assert.equal(later.exposureFlash,0);assert.equal(later.shakeStrength,0);assert.equal(later.overlayAlpha,0);
  for(const s of [t0,tShock]){
    assert.ok(Math.abs(s.cameraX)<=M01_FEEDBACK_CAPS.cameraOffset&&Math.abs(s.cameraY)<=M01_FEEDBACK_CAPS.cameraOffset&&Math.abs(s.roll)<=M01_FEEDBACK_CAPS.cameraRoll);
    assert.ok(s.shakeStrength<=M01_FEEDBACK_CAPS.cameraOffset&&s.overlayAlpha<=M01_FEEDBACK_CAPS.overlayAlpha&&s.explosionImpulse<=M01_FEEDBACK_CAPS.explosionImpulse);
  }
  assert.equal(f.diagnostics(2000,'low').exposureFlash,0,'Low keeps its no-exposure-flash policy');
  assert.ok(f.diagnostics(2000+362/343+.05,'low').shakeStrength>0&&f.diagnostics(2000+362/343+.05,'low').shakeStrength<tShock.shakeStrength);
  // Stacked with every near-field source it still obeys the hard caps.
  const stacked=new M01CombatFeedback();stacked.demolition({id:'east_demolition',started:10,clock:10,distance:762});stacked.demolition({id:'west_demolition',started:10,clock:10,distance:362});
  for(let i=0;i<30;i++){stacked.explosion({clock:10+i*.01,distance:5});stacked.playerHit(10+i*.01,.3);}
  for(const t of [10,10.5,12.5,12.8]){const s=stacked.diagnostics(t,'high');
    assert.ok(s.shakeStrength<=M01_FEEDBACK_CAPS.cameraOffset&&s.overlayAlpha<=M01_FEEDBACK_CAPS.overlayAlpha&&s.exposureFlash<=.13);}
});

test('far field is a pure function of the clock: pause freezes, a late registration or a restore reproduces the same values; reset clears it',()=>{
  const a=new M01CombatFeedback(),b=new M01CombatFeedback();
  a.demolition({id:'east_demolition',started:1000,clock:1000,distance:762});
  const clocks=[1000,1000.4,1002.3,1002.6,1003.1];const live=clocks.map(c=>a.diagnostics(c,'high'));
  assert.deepEqual(a.diagnostics(1002.3,'high'),a.diagnostics(1002.3,'high'));
  // Restore into the middle of the window: registered later, same entry, same numbers at the same clock.
  b.demolition({id:'east_demolition',started:1000,clock:1002.3,distance:762});
  for(const c of [1002.3,1002.6,1003.1])assert.deepEqual(pick(b.diagnostics(c,'high')),pick(a.diagnostics(c,'high')));
  // Out of the window: nothing is registered (a restore long after the blast replays no tremor).
  assert.equal(new M01CombatFeedback().demolition({id:'east_demolition',started:1000,clock:1100,distance:762}),false);
  a.reset();assert.equal(a.diagnostics(1002.3,'high').shakeStrength,0);assert.deepEqual(a.diagnostics(1000,'high').farDemolitions,[]);
  assert.ok(live[0].exposureFlash>0);
  function pick(s){return {shakeStrength:s.shakeStrength,exposureFlash:s.exposureFlash,overlayAlpha:s.overlayAlpha,farExposure:s.farExposure,farTremor:s.farTremor,cameraX:s.cameraX,cameraY:s.cameraY};}
});

test('fall points: spans land where the manifest says, splashes only on water (x 25..265), earth elsewhere',()=>{
  for(const damage of [east,west]){
    const points=D.demolitionFallPoints(damage),want=collapsing.filter(n=>n.lod===0&&/_span_\d\d_collapsed$/.test(n.name)&&D.collapseDamageId(n.showAfterEvent)===damage.id);
    assert.equal(points.length,4);
    for(const n of want)assert.ok(points.some(p=>Math.abs(p.x-n.pivot[0])<1&&Math.abs(p.z-(n.name.startsWith('rail')?damage.z-20:damage.z+20))<1e-9),`${n.name} x=${n.pivot[0]} has a fall point on its own bridge`);
    assert.deepEqual([...new Set(points.map(p=>p.z))].sort((a,b)=>a-b),[0,40]);
  }
  assert.ok(D.demolitionFallPoints(west).some(p=>p.surface==='water'&&Math.round(p.x)===142)&&D.demolitionFallPoints(west).some(p=>p.surface==='earth'&&Math.round(p.x)===10));
  assert.ok(D.demolitionFallPoints(east).every(p=>p.surface==='earth'),'the east spans fall on the flood plain, not the river');
  const world=source('src/world/tczew-world.js');assert.match(world,/x>25&&x<265\)return -10/);
  assert.deepEqual([...D.M01_WATER_RANGE],[25,265]);assert.equal(D.M01_WATER_Y,-10);
  assert.deepEqual(D.demolitionFallPoints({id:'station_bomb',z:0}),[]);
});

test('debris, splashes, earth rain and dust: timed from the blast, deterministic, bounded by the per-preset budgets',()=>{
  const WATER='#d7e1e3',post=D.M01_WEST_FIRING_POST;
  const at=(damage,t,quality='high')=>D.demolitionParticles({damage,clock:damage.started+t,quality,surfaceY:()=>-5});
  // Firing post is the map-layout feature `firing_point`.
  assert.deepEqual([post.x,post.y,post.z],layout.features.find(f=>f.id==='firing_point').point);
  // East: nothing before the spans land; afterwards ground dust + debris (no water) and a haze that fades out.
  for(let t=0;t<D.M01_HAZE_DELAY;t+=.05)assert.deepEqual(at(east,t),{puffs:[],chips:[]},`east t=${t}`);
  const impact=at(east,D.M01_SPLASH_DELAY+.6);assert.ok(impact.puffs.length>0&&impact.chips.length>0&&impact.puffs.every(p=>p.color!==WATER));
  assert.ok(at(east,7).puffs.length>0,'suspended dust after the collapse');assert.equal(at(east,D.M01_SPLASH_DELAY+D.M01_HAZE_LIFE+.5).puffs.length,0);
  // West: river splash (white-blue puffs) at the water fall points around 3..5 s.
  const splash=at(west,D.M01_SPLASH_DELAY+.6);assert.ok(splash.puffs.some(p=>p.color===WATER),'water splash');
  assert.equal(at(west,D.M01_SPLASH_DELAY-.2).puffs.filter(p=>p.color===WATER).length,0);assert.equal(at(west,D.M01_SPLASH_DELAY+D.M01_SPLASH_LIFE+.6).puffs.filter(p=>p.color===WATER).length,0);
  for(const c of splash.chips)assert.ok(Number.isFinite(c.x+c.y+c.z));
  // Earth rain at the firing post: only after the west demolition, only after the shock arrives (distance / 343).
  const near=c=>Math.hypot(c.x-post.x,c.z-post.z)<40&&c.y>post.y;
  const arrive=Math.hypot(west.x-post.x,west.z-post.z)/343;
  assert.equal(at(west,arrive-.05).chips.filter(near).length,0);
  let rained=0;for(let t=arrive;t<arrive+8;t+=.1)rained=Math.max(rained,at(west,t).chips.filter(near).length);
  assert.ok(rained>=4,`earth rain peaks at ${rained} clods`);
  for(let t=0;t<14;t+=.1)assert.equal(at(east,t).chips.filter(near).length,0,'no rain for the east demolition');
  // Falling clods drop from M01_RAIN_HEIGHT: strictly lower later in the fall.
  for(let t=0;t<14;t+=.1)for(const c of at(west,t).chips.filter(near))assert.ok(c.y>=-5-1e-9&&c.y<=-5+D.M01_RAIN_HEIGHT+1e-9,`clod y ${c.y} within one fall of M01_RAIN_HEIGHT`);
  // Deterministic: a pure function of (damage, clock, quality).
  assert.deepEqual(at(west,3.7),at(west,3.7));assert.deepEqual(at(west,3.7),D.demolitionParticles({damage:structuredClone(west),clock:west.started+3.7,quality:'high',surfaceY:()=>-5}));
  assert.notDeepEqual(at(west,3.7),at(west,3.8));
  // Age based: the same age after a different blast instant gives the identical particles (no absolute clock anywhere).
  const rounded=r=>JSON.parse(JSON.stringify(r,(k,v)=>typeof v==='number'?Math.round(v*1e6)/1e6:v));
  assert.deepEqual(rounded(at({...west,started:5},3.7)),rounded(at(west,3.7)));
  // Budgets: never above the preset budget, and the budgets fit the atmosphere pools next to the generic blast chips / smoke.
  const maxPuffs={low:112,medium:192,high:256};
  for(const quality of ['low','medium','high']){
    const budget=D.M01_DEMOLITION_BUDGET[quality];let most={puffs:0,chips:0};
    for(const damage of [east,west])for(let t=0;t<16;t+=.05){
      const r=at(damage,t,quality);assert.ok(r.puffs.length<=budget.puffs&&r.chips.length<=budget.debris,`${damage.id} ${quality} t=${t}`);
      most={puffs:Math.max(most.puffs,r.puffs.length),chips:Math.max(most.chips,r.chips.length)};
      for(const p of r.puffs)assert.ok(p.opacity>=0&&p.opacity<=1&&p.sx>0&&p.sy>0&&Number.isFinite(p.x+p.y+p.z));
    }
    assert.ok(most.puffs>0&&most.chips>0,quality+' still shows the set-piece');
    assert.ok(budget.puffs<=maxPuffs[quality]/4&&budget.debris+28<=64,'room left for the generic smoke columns and the 28 generic blast chips');
  }
  assert.ok(D.M01_DEMOLITION_BUDGET.low.puffs<D.M01_DEMOLITION_BUDGET.medium.puffs&&D.M01_DEMOLITION_BUDGET.medium.puffs<D.M01_DEMOLITION_BUDGET.high.puffs);
  assert.deepEqual(D.demolitionParticles({damage:{id:'m01_grenade_0',started:0,x:0,z:0},clock:3.5}),{puffs:[],chips:[]});
  assert.deepEqual(D.demolitionParticles({damage:east,clock:east.started-1}),{puffs:[],chips:[]});
  assert.equal(M01_BATTLEFIELD_FX_LIMITS.lights,1,'the explosion light is still one PointLight');
});

test('M01Atmosphere draws the set-piece inside its existing pools, deterministically, and ignores non-demolition ids',()=>{
  const original=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
  const a=new M01Atmosphere(new THREE.Scene()),b=new M01Atmosphere(new THREE.Scene());
  try{
    const filler=Array.from({length:12},(_,i)=>({id:`m01_grenade_${i}`,smokeVisible:true,started:1990,x:-300+i*3,y:0,z:0}));
    const state={damage:[{...east,smokeVisible:true},{...west,smokeVisible:true},...filler]},saved=structuredClone(state),context={surfaceY:()=>-5};
    const read=v=>({count:v.count,matrix:Array.from(v.puffs.instanceMatrix.array.slice(0,v.count*16)),fade:Array.from(v.fade.array.slice(0,v.count)),debris:v.debris.count,debrisMatrix:Array.from(v.debris.instanceMatrix.array.slice(0,v.debris.count*16))});
    const limits={low:112,medium:192,high:256};
    for(const [quality,clock] of [['low',2003.6],['medium',2003.6],['high',2003.6],['high',2006],['high',1003.6],['medium',2001.5]]){
      a.update(state,clock,quality,context);const frame=read(a);
      assert.ok(frame.count<=limits[quality],`${quality} puffs ${frame.count}`);assert.ok(frame.debris<=64);
      a.update(state,clock,quality,context);assert.deepEqual(read(a),frame,'same clock, same frame (pause)');
      b.update(structuredClone(state),clock,quality,context);assert.deepEqual(read(b),frame,'restore replays the same frame');
    }
    a.update(state,2003.6,'high',context);const withFx=a.debris.count;
    a.update({damage:state.damage.map(d=>({...d,id:d.id.replace('west_demolition','x_west'),started:d.started}))},2003.6,'high',context);
    assert.ok(withFx>a.debris.count,'the set-piece adds debris at the fall points');
    a.update(state,2003.6,'high');assert.ok(a.count>0,'surfaceY context is optional');
    a.update(state,2300,'high',context);assert.equal(a.debris.count,0);assert.deepEqual(state,saved);
  }finally{a.dispose();b.dispose();globalThis.document=original;}
});

test('blast chips and shards have real colour: no vertexColors without a colour attribute',()=>{
  for(const [name,options] of Object.entries(D.M01_BLAST_CHIP_MATERIALS)){
    const material=new THREE.MeshStandardMaterial(options);
    assert.equal(material.vertexColors,false,`${name} must not multiply by a missing vertex colour attribute`);assert.ok(material.color.getHex()>0,name+' is not black');
  }
  const geometry=new THREE.TetrahedronGeometry(1);assert.equal(geometry.getAttribute('color'),undefined,'the tetrahedron really has no colour attribute');
  const view=source('src/render/m01-view.js'),atmosphere=source('src/render/m01-atmosphere.js');
  assert.doesNotMatch(view,/vertexColors\s*:\s*true/);assert.doesNotMatch(atmosphere,/vertexColors\s*:\s*true/);
  assert.match(view,/this\.materials\.chip=new THREE\.MeshStandardMaterial\(M01_BLAST_CHIP_MATERIALS\.chip\)/);
  assert.match(view,/this\.materials\.blastShard=new THREE\.MeshStandardMaterial\(M01_BLAST_CHIP_MATERIALS\.blastShard\)/);
  // Per-instance colour is allocated before the first draw for both pools (stable shader variant) and set for every instance.
  assert.match(view,/this\.fireBatches\.chip\.setColorAt\(0,/);assert.match(view,/this\.battlefieldShards\.setColorAt\(0,/);
  assert.match(view,/this\.battlefieldShards\.setColorAt\(shardCount,/);assert.match(view,/put\('chip'[\s\S]{0,400}profile\.color\)/);
  // Three.js enables USE_COLOR for instance colours without vertexColors, which is what the fix relies on.
  assert.match(readFileSync(new URL('../node_modules/three/src/renderers/webgl/WebGLProgram.js',import.meta.url),'utf8'),/parameters\.vertexColors \|\| parameters\.instancingColor \? '#define USE_COLOR'/);
});

test('silence hook: a 2 s window from the blast is exported and surfaced in the view diagnostics; the audio module is untouched',()=>{
  assert.deepEqual(D.demolitionSilenceWindow(east),{id:'east_demolition',from:1000,to:1002});
  assert.equal(D.demolitionSilenceActive(east,999.99),false);assert.equal(D.demolitionSilenceActive(east,1000),true);assert.equal(D.demolitionSilenceActive(east,1001.99),true);assert.equal(D.demolitionSilenceActive(east,1002),false);
  const view=source('src/render/m01-view.js');
  assert.match(view,/silence=demolitionSilenceWindow\(d\)/);assert.match(view,/silence:\{\.\.\.silence,active:time>=silence\.from&&time<silence\.to\}/);
  assert.match(view,/demolition:\{clock:this\.lastClock,collapseSeconds:M01_COLLAPSE_DURATION/);
  assert.doesNotMatch(source('src/core/audio.js'),/m01-demolition/);
});

test('presentation only: the simulation never imports the module, the module reads no wall clock/RNG, the view keeps owning visibility from renderState.parts',()=>{
  const walk=dir=>readdirSync(dir).flatMap(n=>{const p=join(dir,n);return statSync(p).isDirectory()?walk(p):p.endsWith('.js')?[p]:[];});
  for(const dir of ['src/game','src/world','src/core'])for(const file of walk(new URL(`../${dir}`,import.meta.url).pathname))assert.doesNotMatch(readFileSync(file,'utf8'),/m01-demolition/,file);
  const module=source('src/render/m01-demolition.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');   // code only, not the comments that name what is forbidden
  assert.doesNotMatch(module,/performance\.now|Date\.now|Math\.random|requestAnimationFrame|from 'three'|document\./);
  const view=source('src/render/m01-view.js');
  assert.equal(view.match(/piece\.node\.visible\s*=/g).length,1,'only the renderState.parts line writes node visibility');
  assert.doesNotMatch(view,/state\.parts\[[^\]]*\]\s*=/);
  assert.match(view,/this\.updateDemolition\(state,time,sim\);\s*this\.updateActors\(/);
  const body=view.slice(view.indexOf('  updateDemolition(state,time,sim){'),view.indexOf('  updateBattlefieldFx(state,time){'));
  assert.doesNotMatch(body,/performance|Date\.now|Math\.random|dt\b/);
  assert.doesNotMatch(body,/position\.add|position\.x\s*\+=|position\.y\s*\+=|quaternion\.multiply|rotateX|rotateY|rotateZ/,'no accumulation');
});
