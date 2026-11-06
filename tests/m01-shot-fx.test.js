import test from 'node:test';
import assert from 'node:assert/strict';
import v8 from 'node:v8';
import vm from 'node:vm';
import * as THREE from 'three';
import {M01View} from '../src/render/m01-view.js';
import {collectShotFlashes,createFlashList,ShotSmokeTable,flashRadius,flashTint,smokeRadius,focalPx,isHeavyWeapon,SHOT_FLASH_SEC,RKM_INTERVAL,CLOCK_EPS,MAX_FLASHES,SHOOTER_SLOTS,
  SMOKE_SLOTS_BY_TIER,SMOKE_SEC,FLASH_MIN_PX,SMOKE_MIN_PX,NEAR_BODY_M} from '../src/render/m01-shot-fx.js';
import {route} from './helpers/m01-route.js';

// VIS-a: every real NPC shot gives exactly one flash at its shooter, sized in pixels and tinted by daylight; the smoke is pooled and capped by tier.
// Nothing here is a playtest: the sampled route is the real simulation read tick by tick, and the assertions are on what the view is told to draw.
const round=(by,weapon,firedAt,over={})=>({id:`${by}@${firedAt}`,by,weapon,kind:'player',ox:900,oy:1.2,oz:20,ax:0,ay:1,az:0,h:1,firedAt,arriveAt:firedAt+1.5,tracer:false,victim:null,...over});
const sim=(over={})=>({clock:0,actors:[],enemyFire:{rounds:[]},display:{rounds:[],fixed:{}},...over});
const flashes=(s,t,list=createFlashList())=>collectShotFlashes(s,t,list);

test('pixel sizing: a distant flash is never below its pixel floor at 1366x768, near it is the physical flash, the dark makes it a little larger',()=>{
  const fov=70,H=768,f=focalPx(fov,H);
  for(const d of [100,300,600,1000,1200]){
    for(const [heavy,cls] of [[false,'rifle'],[true,'mg']]){
      const r=flashRadius(heavy,d,fov,H,1),px=2*r/(d/f);
      assert.ok(px>=FLASH_MIN_PX[cls]-1e-9,`${cls} ${d} m: ${px.toFixed(2)} px`);
      assert.ok(flashRadius(heavy,d,fov,H,0)>=r,'darker scene, not smaller');
    }
  }
  assert.equal(flashRadius(false,5,fov,H,.5),.13,'5 m: physical rifle flash (a few cm of sphere radius would be below a pixel, so the floor is not used)');
  assert.ok(flashRadius(true,1000,fov,H)>flashRadius(false,1000,fov,H),'a machine gun flash is larger than a rifle flash');
  assert.ok(Math.abs(flashRadius(false,1000,fov,H,1)-FLASH_MIN_PX.rifle*(1000/f)/2)<1e-9);
  assert.ok(flashTint(0)===1&&flashTint(1)<flashTint(.5)&&flashTint(.5)<1,'tint: 1 at night, lowest at noon');
  // Not a giant: at 1 km the floor is under 6 m radius even at dawn (the old rule was 8 m), and an ADS fov (48) shrinks the world radius for the same pixel floor.
  assert.ok(flashRadius(false,1000,70,768)<6&&flashRadius(false,1000,48,768)<flashRadius(false,1000,70,768));
  for(const d of [350,1000])assert.ok(smokeRadius(false,.5,d,fov,H)*2/(d/f)>=SMOKE_MIN_PX-1e-9,'smoke floor');
  assert.ok(isHeavyWeapon('mg34')&&isHeavyWeapon('rkm_wz28')&&isHeavyWeapon('ckm_wz30')&&!isHeavyWeapon('kar98k')&&!isHeavyWeapon(undefined));
});

test('an MG34 burst flashes once per round, on the rounds: 6 rounds at 0.075 s, off in every gap, each at its own gunner',()=>{
  const t0=100,rounds=[...Array(6).keys()].map(k=>round('de_east_0','mg34',t0+k*.075,{ox:1054,oy:.4,oz:-15}));
  const s=sim({enemyFire:{rounds}}),keys=new Set(),list=createFlashList();
  let onFrames=0,offGap=0;
  for(let t=t0-.05;t<t0+6*.075+.1;t+=.005){
    flashes(s,t,list);assert.ok(list.count<=1,`never two at once (t ${t.toFixed(3)})`);
    for(let i=0;i<list.count;i++){keys.add(`${list.by[i]}|${list.at[i].toFixed(3)}`);assert.equal(list.by[i],'de_east_0');assert.equal(list.heavy[i],1);assert.equal(list.x[i],1054);}
    const phase=((t-t0)%.075+.075)%.075,inBurst=t>=t0&&t<t0+5*.075+.06;
    if(inBurst&&phase<SHOT_FLASH_SEC-1e-9){assert.equal(list.count,1,`flash at ${t.toFixed(3)}`);onFrames++;}
    if(inBurst&&phase>SHOT_FLASH_SEC+1e-9&&phase<.075-1e-9){assert.equal(list.count,0,`gap at ${t.toFixed(3)}`);offGap++;}
  }
  assert.equal(keys.size,6,'six rounds, six flashes');assert.ok(onFrames>40&&offGap>8,`rhythm sampled (${onFrames} on, ${offGap} off)`);
});

test('gameplay rounds, display rounds and rounds still in the future: one flash inside the window only, with its shooter, origin and class',()=>{
  const s=sim({enemyFire:{rounds:[round('de_east_9','kar98k',10),round('de_east_9','kar98k',10.04),round('de_east_9','kar98k',11)]},
    display:{rounds:[round('de_east_21','mg34',10,{kind:'display',ox:800,oz:5}),round('de_east_21','mg34',9.5,{kind:'display'})],fixed:{}}});
  const l=flashes(s,10.03);
  assert.equal(l.count,2,'the gameplay round at 10 and the display round at 10; 10.04 is still in the future, 11 and 9.5 are not in the window');
  assert.deepEqual([...Array(l.count).keys()].map(i=>[l.by[i],l.source[i],l.heavy[i],l.x[i],l.at[i]]),[['de_east_9',0,0,900,10],['de_east_21',1,1,800,10]]);
  assert.equal(flashes(s,10.0+SHOT_FLASH_SEC).count,1,'the window is half open: 10.06 only keeps the round fired at 10.04');
  assert.equal(flashes(s,9.99).count,0,'nothing before the shot');
});

test('allied fire: a rifle shot flashes once, an rkm burst once per round at 0.11 s, at the right man; enemies, the dead, the ckm crew and men not firing are ignored',()=>{
  const ally=(id,over={})=>({id,team:'ally',x:-100,y:0,z:20,alive:true,active:true,facing:0,crouched:false,shot:0,firedAt:undefined,...over});
  const run=(a,shot0,t0)=>{const s=sim({actors:[a]}),keys=new Set(),l=createFlashList();
    for(let t=t0-.05;t<t0+shot0+.2;t+=.01){a.firedAt=t>=t0?t0:a.firedAt;a.shot=t>=t0?Math.max(0,shot0-(t-t0)):0;flashes(s,t,l);for(let i=0;i<l.count;i++){keys.add(`${l.by[i]}|${l.index[i]}|${l.at[i].toFixed(3)}`);assert.equal(l.by[i],a.id);assert.equal(l.source[i],2);}}
    return keys;};
  assert.equal(run(ally('pl_east_1'),.135,20).size,1,'allied rifle');
  for(const n of [2,3,4,5]){
    const keys=run(ally('szymon_kowal'),Math.max(.25,n*RKM_INTERVAL),30);
    assert.equal(keys.size,n,`rkm burst of ${n}`);
    assert.deepEqual([...keys].map(k=>+k.split('|')[2]).sort((a,b)=>a-b).map(x=>+(x-30).toFixed(2)),[...Array(n).keys()].map(k=>+(k*RKM_INTERVAL).toFixed(2)),'rhythm 0.11 s');
  }
  const s=sim({actors:[ally('a',{shot:.1,firedAt:5}),ally('dead',{shot:.1,firedAt:5,alive:false}),ally('away',{shot:.1,firedAt:5,active:false}),ally('ckm_gunner',{shot:.1,firedAt:5,ckm:{phase:'fire_burst'}}),
    ally('idle',{shot:0,firedAt:5}),ally('never',{shot:.1}),{...ally('de_east_3',{shot:.1,firedAt:5}),team:'enemy'}]});
  const l=flashes(s,5.01);assert.deepEqual([...Array(l.count).keys()].map(i=>l.by[i]),['a'],'only the living, active, firing ally; the enemy has its rounds, the ckm its plan');
});

test('pools are bounded: the flash list never exceeds its capacity, the smoke table never exceeds the tier cap or its slots, and a puff dies with its life',()=>{
  const many=[...Array(300).keys()].map(i=>round(`de_east_${i}`,'kar98k',10));
  const l=flashes(sim({enemyFire:{rounds:many}}),10.01);
  assert.equal(l.count,MAX_FLASHES);assert.equal(l.dropped,300-MAX_FLASHES,'what does not fit is counted, never grown into');
  assert.equal(l.by.length,MAX_FLASHES,'the arrays kept their size');
  const tiers=Object.entries(SMOKE_SLOTS_BY_TIER);
  assert.ok(SMOKE_SLOTS_BY_TIER.low<SMOKE_SLOTS_BY_TIER.medium&&SMOKE_SLOTS_BY_TIER.medium<SMOKE_SLOTS_BY_TIER.high&&SMOKE_SLOTS_BY_TIER.high<=64,'tiers scale and fit the 64-instance smoke batch');
  for(const [tier,cap] of tiers){
    const table=new ShotSmokeTable(),list=createFlashList();
    for(let i=0;i<90;i++)list.by[i]=`s${i}`,list.at[i]=10,list.x[i]=i,list.y[i]=1,list.z[i]=2,list.heavy[i]=i%2;list.count=90;
    table.note(list,10.01,cap);
    assert.equal(table.activeCount(10.01,1e9),cap,`${tier}: at most ${cap} puffs`);assert.equal(table.skipped,90-cap);
    assert.equal(table.activeCount(10.01+SMOKE_SEC.mg+.01,1e9),0,'every puff is over');
    // A second shot of the same shooter moves his puff; it does not take a second slot.
    const one=createFlashList();one.by[0]='s0';one.at[0]=10.5;one.x[0]=5;one.count=1;table.note(one,10.51,cap);assert.equal(table.activeCount(10.51,1e9),cap);assert.equal(table.at[table.id.indexOf('s0')],10.5);
  }
  assert.equal(new ShotSmokeTable().slots,SHOOTER_SLOTS);
});

test('no allocation per frame: the collector and the smoke table settle to zero heap growth over 30000 frames of 40 rounds',()=>{
  v8.setFlagsFromString('--expose_gc');const gc=vm.runInNewContext('gc');
  const rounds=[...Array(40).keys()].map(i=>round(`de_east_${i}`,i%7?'kar98k':'mg34',10+(i%5)*.01,{kind:i%2?'display':'player'}));
  const s=sim({enemyFire:{rounds:rounds.filter((_,i)=>i%2===0)},display:{rounds:rounds.filter((_,i)=>i%2===1),fixed:{}}}),list=createFlashList(),table=new ShotSmokeTable();
  const frame=t=>{collectShotFlashes(s,t,list);table.note(list,t,24);table.activeCount(t,24);};
  for(let i=0;i<3000;i++)frame(10.02);   // warm-up: JIT, string table
  gc();const before=process.memoryUsage().heapUsed;
  for(let i=0;i<30000;i++)frame(10.02+(i%3)*.01);
  gc();const grown=process.memoryUsage().heapUsed-before;
  assert.ok(list.count>=20,'the scene did flash');
  assert.ok(grown<150*1024,`heap grew ${grown} bytes over 30000 frames`);
});

// ---------------------------------------------------------------- the view: what is drawn, on every tier
function rig(quality,extra={}){
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial(),view=Object.create(M01View.prototype);
  Object.assign(view,{camera:(()=>{const c=new THREE.PerspectiveCamera(70,16/9);c.position.set(0,1.7,0);return c;})(),fireDummy:new THREE.Object3D(),fireColor:new THREE.Color(),characters:null,impacts:[],fireBatches:{},
    owner:{quality,canvas:{height:768}},lightingModel:{daylight:.16},...extra});
  for(const [name,n] of Object.entries({muzzle:96,tracer:48,puff:144,spark:96,smoke:64,chip:128}))view.fireBatches[name]=new THREE.InstancedMesh(geometry,material,n);
  return {view,draw(s){view.updateFire(s);return structuredClone(view.fx);},dispose(){Object.values(view.fireBatches).forEach(b=>b.dispose());geometry.dispose();material.dispose();}};
}
const crowd=(n,t0=10)=>sim({clock:t0+.01,enemyFire:{rounds:[...Array(n).keys()].map(i=>round(`de_east_${i}`,'kar98k',t0,{ox:900+i,oy:1.2,oz:i}))}});

test('every tier draws every flash; smoke is capped per tier and smaller tiers draw no more puffs',()=>{
  const out={};
  for(const q of ['low','medium','high']){
    const r=rig(q);try{out[q]=r.draw(crowd(50));assert.equal(r.view.shotDiagnostics.flashes,50);assert.equal(r.view.shotDiagnostics.smokeCap,SMOKE_SLOTS_BY_TIER[q]);}finally{r.dispose();}
  }
  assert.deepEqual([out.low.muzzle,out.medium.muzzle,out.high.muzzle],[50,50,50],'flashes are gameplay-relevant: identical on all tiers');
  assert.deepEqual([out.low.smoke,out.medium.smoke,out.high.smoke],[SMOKE_SLOTS_BY_TIER.low,SMOKE_SLOTS_BY_TIER.medium,SMOKE_SLOTS_BY_TIER.high]);
});

test('the flash of a drawn impostor sits at its rifle, a far shooter without body at the round origin; the flash is a few pixels at 1 km and instance-tinted',()=>{
  const gunman={id:'de_east_4',team:'enemy',x:1050,y:.2,z:-15,alive:true,active:true,facing:Math.PI,crouched:false,shot:0,firedAt:-1e9};
  const r=rig('medium',{impostors:{byId:new Map([['de_east_4',{posture:'standing'}]])}});
  try{
    r.draw(sim({clock:50.01,actors:[gunman],enemyFire:{rounds:[round('de_east_4','kar98k',50,{ox:1050,oy:1.9,oz:-15})]}}));
    const d=r.view.shotDiagnostics;assert.equal(d.list.length,1);
    assert.ok(Math.abs(d.list[0].y-(.2+1.7*.74))<1e-9,'impostor muzzle point, not the sim eye');assert.equal(d.list[0].x,1050);
    const m=new THREE.Matrix4().fromArray(r.view.fireBatches.muzzle.instanceMatrix.array,0),sc=new THREE.Vector3().setFromMatrixScale(m);
    const px=2*sc.x/(1050/focalPx(70,768));assert.ok(px>=FLASH_MIN_PX.rifle&&px<FLASH_MIN_PX.rifle*2,`a few pixels, not a blob: ${px.toFixed(1)} px`);
    const tint=r.view.fireBatches.muzzle.instanceColor.array[0];assert.ok(Math.abs(tint-flashTint(.16))<1e-6,'tinted by daylight at dawn');
    // The same shot with no actor in the roster (a fixed-origin profile): the round's own origin.
    const r2=rig('medium');try{r2.draw(sim({clock:50.01,actors:[],enemyFire:{rounds:[round('x','kar98k',50,{ox:1050,oy:1.9,oz:-15})]}}));assert.equal(r2.view.shotDiagnostics.list[0].y,1.9);}finally{r2.dispose();}
  }finally{r.dispose();}
});

test('the view only reads: the simulation is not written and the same clock draws the same frame',()=>{
  const s=crowd(6),before=JSON.stringify(s),r=rig('high');
  try{
    const a=r.draw(s),m1=Array.from(r.view.fireBatches.muzzle.instanceMatrix.array.slice(0,16*a.muzzle));
    const b=r.draw(s),m2=Array.from(r.view.fireBatches.muzzle.instanceMatrix.array.slice(0,16*b.muzzle));
    assert.deepEqual(a,b);assert.deepEqual(m1,m2);assert.equal(JSON.stringify(s),before,'nothing written into the simulation');
  }finally{r.dispose();}
});

// ---------------------------------------------------------------- the real simulation, sampled tick by tick
test('sampled real route: every German round and every allied shot of the simulation maps to exactly one flash at the right shooter',()=>{
  const attrition=new Set(),displayRounds=new Map(),ticks=[],list=createFlashList(),german=new Map(),display=new Map(),allied=new Map(),events={german:0,ally:0,allyBy:[]};
  let nearTick=0,frames=0,smokePeak=0;const table=new ShotSmokeTable();
  route(19390901,{support:true,onStep:({sim:s,events:emitted})=>{
    for(const e of emitted){
      if(e.type==='enemy-fire')events.german+=e.rounds;
      if(e.type==='npc-shot'){events.ally+=e.rounds;events.allyBy.push(e.by??'szymon_kowal');}
    }
    // The view can only see a round on a simulation tick (20 Hz) while the sim still lists it: a display round that lands within one tick of its window (a 30 m ckm label of the platoon) can never be seen.
    ticks.push(s.clock);for(const r of s.display.rounds)displayRounds.set(r.id,{by:r.by,firedAt:r.firedAt,arriveAt:r.arriveAt});
    for(const r of s.enemyFire.rounds)if(r.kind==='attrition')attrition.add(r.id);   // T23 attrition rounds have no `enemy-fire` event (shootAttrition), only the round
    collectShotFlashes(s,s.clock,list);frames++;table.note(list,s.clock,SMOKE_SLOTS_BY_TIER.medium);smokePeak=Math.max(smokePeak,table.activeCount(s.clock,1e9));
    for(let i=0;i<list.count;i++){
      const key=`${list.by[i]}|${list.at[i].toFixed(4)}|${list.index[i]}`;
      if(list.source[i]===0){german.set(key,{x:list.x[i],y:list.y[i],z:list.z[i],by:list.by[i]});
        const shooter=s.actor(list.by[i]);assert.ok(shooter?.team==='enemy'&&shooter.active,`${key}: a living-roster German`);}
      if(list.source[i]===1)display.set(key,list.by[i]);
      if(list.source[i]===2){allied.set(key,list.by[i]);const a=s.actor(list.by[i]);assert.ok(a.team!=='enemy'&&Math.hypot(list.x[i]-a.x,list.z[i]-a.z)<1e-6,'at the ally');}
      if(list.heavy[i]&&list.source[i]===0)assert.equal(s.actor(list.by[i]).weapon,'mg34');
    }
    nearTick=Math.max(nearTick,list.count);
    if(frames%400===0)assert.ok(list.count<=MAX_FLASHES);
  }});
  assert.equal(german.size,events.german+attrition.size,`German rounds: ${events.german} enemy-fire rounds + ${attrition.size} attrition rounds, ${german.size} flashes`);
  assert.ok(attrition.size>=1,'the attrition rifles are part of the route');
  const visible=[...displayRounds.values()].filter(r=>{let lo=0,hi=ticks.length;while(lo<hi){const m=(lo+hi)>>1;if(ticks[m]<r.firedAt-CLOCK_EPS)lo=m+1;else hi=m;}const t=ticks[lo];return t!==undefined&&t<r.firedAt+SHOT_FLASH_SEC&&t<r.arriveAt;});
  assert.equal(display.size,visible.length,`display rounds with a tick inside their window: ${visible.length} of ${displayRounds.size}, ${display.size} flashes`);
  assert.ok(displayRounds.size-visible.length<=10,'only the short-flight 30 m platoon ckm label rounds can fall between two ticks');
  assert.equal(allied.size,events.ally,`allied rounds: ${events.ally} sim rounds, ${allied.size} flashes`);
  assert.ok(german.size>300&&display.size>20&&allied.size>50,`a real battle: ${german.size}/${display.size}/${allied.size}`);
  assert.ok(new Set(events.allyBy).has('szymon_kowal')&&[...allied.values()].some(id=>id.startsWith('pl_east_')),'the rkm and the allied riflemen both flash');
  assert.ok(nearTick<=MAX_FLASHES&&smokePeak<=SMOKE_SLOTS_BY_TIER.medium,`bounds held: peak ${nearTick} flashes, ${smokePeak} puffs`);
  assert.ok(NEAR_BODY_M>=100);
});
