import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sunState,lightingModel,M01_FOG_RANGE} from '../src/render/m01-lighting.js';
import {seconds} from '../src/game/m01-simulation.js';
import {HANDOFF_M,IMPOSTOR_CAPACITY,POSTURES,MIN_CONTRAST,MIN_WIDTH_PX,BACKLIGHT_FROM,BACKLIGHT_TO,focalPx,projectedHeightPx,impostorSize,impostorPosture,stepPhase,handoff,
  selectImpostors,contrastRatio,fogFactor,backdropColor,impostorInk,backlightStrength,sunFacing,M01Impostors} from '../src/render/m01-impostors.js';

const layout=JSON.parse(readFileSync(new URL('../missions/m01-tczew/map-layout.json',import.meta.url)));
const modelAt=c=>{const s=sunState(layout.sun.keyframes,seconds(c));return lightingModel(s.altDeg,s.azDeg);};
const source=readFileSync(new URL('../src/render/m01-impostors.js',import.meta.url),'utf8');
const actor=(id,o={})=>({id,active:true,alive:true,civilian:false,team:'enemy',x:0,y:0,z:0,state:'GUARD',crouched:false,...o});
const H=720;

test('projected height is max(3 px, 1.7 m) for several distances, fovs and viewports',()=>{
  for(const fov of [70,48])for(const vh of [720,1080])for(const d of [350,650,1100,2000]){
    const s=impostorSize('standing',d,fov,vh),natural=projectedHeightPx(1.7,d,fov,vh);
    assert.ok(Math.abs(s.heightPx-Math.max(3,natural))<1e-9,`${fov} ${vh} ${d}`);
    assert.equal(s.floored,natural<3);
    assert.ok(s.heightPx>=3-1e-9);assert.ok(s.widthPx>=MIN_WIDTH_PX-1e-9);
  }
  assert.ok(projectedHeightPx(1.7,1100,70,H)<1,'a 1.7 m man is under one pixel at 1.1 km (the problem being solved)');
  assert.equal(impostorSize('standing',1100,70,H).heightPx.toFixed(6),'3.000000');
  assert.ok(impostorSize('standing',100,70,H).heightM===1.7,'below the floor distance the world height is the real height');
  assert.ok(Math.abs(focalPx(90,720)-360)<1e-9);
});
test('posture heights are distinct in metres and in pixels, and follow the existing pose state',()=>{
  const px=['standing','crouched','prone'].map(p=>impostorSize(p,650,70,H).heightPx);
  assert.ok(px[0]>px[1]&&px[1]>px[2],px.join());
  const m=['standing','crouched','prone'].map(p=>POSTURES[p].heightM);assert.equal(new Set(m).size,3);
  assert.equal(impostorPosture(actor('a'),0),'standing');
  assert.equal(impostorPosture(actor('a',{crouched:true}),0),'crouched');
  assert.equal(impostorPosture(actor('a',{state:'WOUNDED'}),0),'prone');
  assert.equal(impostorPosture(actor('a',{alive:false}),0),null);
  assert.equal(impostorPosture(actor('a',{carriedBy:'x'}),0),null);
  assert.equal(impostorPosture(actor('a',{civilian:true}),0),null);
  assert.equal(impostorPosture(actor('a',{active:false}),0),null);
  assert.equal(impostorPosture(actor('a',{team:'ally',suppressedUntil:10}),0),'crouched','pinned ally is crouched');
});
test('step phase: same sim clock and id => same phase; ids differ; clock advances it; no wall clock',()=>{
  assert.equal(stepPhase('de_east_3',123.4),stepPhase('de_east_3',123.4));
  assert.notEqual(stepPhase('de_east_3',123.4),stepPhase('de_east_4',123.4));
  assert.notEqual(stepPhase('de_east_3',123.4),stepPhase('de_east_3',123.9));
  for(let i=0;i<50;i++){const p=stepPhase('x'+i,i*7.31);assert.ok(p>=0&&p<1);}
  assert.doesNotMatch(source.replace(/\/\/.*$/gm,''),/performance\.now|Date\.now|Math\.random/);
});
test('hand-off: exactly one representation; nothing changes below 350 m',()=>{
  const a=actor('g1');
  assert.equal(handoff(a,HANDOFF_M-.01),'none','below the hand-off the existing procedural body stays');
  assert.equal(handoff(a,HANDOFF_M),'impostor');
  assert.equal(handoff(a,1100),'impostor');
  assert.equal(handoff(a,1100,{skinned:true}),'lod','a skinned body (e.g. the MG34 gunners) is never also an impostor');
  assert.equal(handoff(a,50,{skinned:true}),'lod');
  assert.equal(handoff(actor('g2',{alive:false}),1100),'none');
  assert.equal(handoff(actor('g3',{civilian:true}),1100),'none');
  assert.equal(handoff(actor('g4',{active:false}),1100),'none');
  for(const d of [0,100,349.9,350,351,800])for(const skinned of [false,true])assert.ok(['lod','impostor','none'].includes(handoff(a,d,{skinned})));
});
test('capacity 128/96/64 per nation; overflow keeps the nearest, deterministically; one draw call per nation',()=>{
  assert.deepEqual({...IMPOSTOR_CAPACITY},{high:128,medium:96,low:64});
  const mk=n=>Array.from({length:n},(_,i)=>({actor:actor('e'+String(i).padStart(3,'0'),{team:'enemy'}),distance:400+(i%50)}));
  for(const [q,cap] of Object.entries(IMPOSTOR_CAPACITY)){
    const out=selectImpostors(mk(cap+30),q);assert.equal(out.length,cap);
    const rev=selectImpostors(mk(cap+30).reverse(),q);assert.deepEqual(out.map(o=>o.actor.id),rev.map(o=>o.actor.id),'input order does not matter');
    const worst=Math.max(...out.map(o=>o.distance)),dropped=mk(cap+30).filter(c=>!out.some(o=>o.actor.id===c.actor.id));
    assert.ok(dropped.every(c=>c.distance>=worst),'every dropped actor is at least as far as every kept one');
    for(let i=1;i<out.length;i++)assert.ok(out[i-1].distance<out[i].distance||out[i-1].distance===out[i].distance&&out[i-1].actor.id<out[i].actor.id);
  }
  const both=selectImpostors([...mk(70),...mk(70).map(c=>({...c,actor:actor('p'+c.actor.id,{team:'ally'})}))],'low');
  assert.equal(both.filter(o=>o.nation==='de').length,64);assert.equal(both.filter(o=>o.nation==='pl').length,64);
});
test('minimum contrast against the backdrop at the actor distance, every phase, 350..2000 m',()=>{
  for(const clock of ['04:30','04:45','05:30','06:05','07:05'])for(const d of [350,650,1100,1400,2000])for(const nation of ['pl','de']){
    const fog=modelAt(clock).fog.color,r=impostorInk(nation,fog,d);
    assert.ok(r.ratio>=MIN_CONTRAST-1e-6,`${clock} ${nation} ${d}: ratio ${r.ratio}`);
    assert.ok(r.ink.every(v=>v>=0&&v<=1.0000001),`${clock} ${nation} ${d} ink in gamut ${r.ink}`);
    assert.ok(Math.abs(contrastRatio(r.ink,backdropColor(fog,d))-r.ratio)<1e-9);
  }
  assert.equal(fogFactor(M01_FOG_RANGE.near),0);assert.equal(fogFactor(M01_FOG_RANGE.far),1);assert.ok(fogFactor(1100)>0&&fogFactor(1100)<1);
  assert.ok(impostorInk('de',[.5,.5,.5],1100).dark,'light fog => dark ink');
  assert.ok(!impostorInk('de',[.02,.025,.04],1100).dark,'blue-hour fog => light ink');
  assert.ok(impostorInk('de',[.5,.5,.5],1100).ratio>=MIN_CONTRAST);
  assert.notDeepEqual(impostorInk('pl',[.5,.5,.5],900).ink.map(v=>+v.toFixed(3)),impostorInk('de',[.5,.5,.5],900).ink.map(v=>+v.toFixed(3)),'nations keep their hue');
});
test('backlight is active 05:30-06:40 only and only when the camera faces the sun',()=>{
  assert.equal(BACKLIGHT_FROM,seconds('05:30'));assert.equal(BACKLIGHT_TO,seconds('06:40'));
  assert.equal(backlightStrength(seconds('05:29:59')),0);assert.equal(backlightStrength(seconds('06:40:01')),0);assert.equal(backlightStrength(seconds('04:30')),0);assert.equal(backlightStrength(seconds('07:05')),0);
  assert.ok(backlightStrength(seconds('06:05'))===1);assert.ok(backlightStrength(seconds('05:31'))>0&&backlightStrength(seconds('05:31'))<1);
  assert.ok(backlightStrength(BACKLIGHT_FROM)===0,'ramp starts at zero at the boundary');
  assert.equal(sunFacing([1,0],[1,0]),1);assert.equal(sunFacing([1,0],[-1,0]),0);assert.equal(sunFacing([0,0],[1,0]),0);
});
test('class: one InstancedMesh per nation, capacity by quality, disabled => empty selection, no GPU needed',()=>{
  const scene={add(m){(this.c??=[]).push(m);}};
  const imp=new M01Impostors(scene,{debug:false});
  const far=[actor('g1',{x:900,state:'ADVANCE'}),actor('g2',{x:800,z:5}),actor('p1',{team:'ally',x:500}),actor('near',{x:100}),actor('dead',{x:900,alive:false})];
  const picked=imp.select(far,new Set(['g2']),{x:0,z:0},'low',10);
  assert.deepEqual([...picked].sort(),['g1','p1']);   // skinned g2, near and dead are not impostors
  assert.equal(imp.capacity,64);assert.equal(Object.keys(imp.meshes).length,2);assert.equal(imp.meshes.de.instanceMatrix.count,64);
  imp.sync({camera:{position:{x:0,y:1.6,z:0},fov:70,getWorldDirection:v=>v.set(1,0,0)},clock:10,battleClock:seconds('06:05'),fog:[.5,.5,.5],sunColor:[1,.8,.6],sunDir:[.9,.1,-.3],viewportHeight:720});
  const d=imp.diagnostics;assert.deepEqual(d.count,{pl:1,de:1});assert.equal(d.drawCalls,2);assert.equal(d.handoffM,350);assert.equal(d.items.length,2);
  assert.ok(d.items.every(i=>i.heightPx>=3-1e-9));assert.ok(d.backlight>0);
  imp.enabled=false;assert.equal(imp.select(far,new Set(),{x:0,z:0},'low',10).size,0);
  imp.select(far,new Set(),{x:0,z:0},'high',10);assert.equal(imp.capacity,128);
  imp.dispose();
});
test('wiring: only the view and the characters hand-off know the module; sim never imports it',()=>{
  const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
  assert.match(view,/impostored\.has\(a\.id\)/);assert.match(view,/impostors:this\.impostors\?\.enabled/);
  for(const dir of ['game','world','core']){
    for(const f of (jsFilesIn(dir)))assert.doesNotMatch(readFileSync(f,'utf8'),/m01-impostors/,f);
  }
});
import {readdirSync,statSync} from 'node:fs';
function jsFilesIn(dir){
  const out=[],walk=p=>{for(const n of readdirSync(p)){const q=p+'/'+n;statSync(q).isDirectory()?walk(q):/\.js$/.test(n)&&out.push(q);}};
  walk(new URL('../src/'+dir,import.meta.url).pathname);return out;
}
