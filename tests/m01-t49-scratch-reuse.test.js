// T49 pillar E (ported from PR #88 / f70ff8a): per-frame scratch reuse and no GPU upload for empty instance sets.
// Presentation only. The golden file was generated with the code BEFORE this change (M01_T49_WRITE_GOLDEN=1 on 625a169),
// so the equality assertions below prove the refactor is output-identical, not merely self-consistent.
// 2026-10-24 (VIS-a, merge e85336e6): German impostors are drawn at contrast 3.9 instead of 3 (NATION_CONTRAST in m01-impostors.js), an intended
// presentation change. Only the `impostors` record was re-recorded (M01_T49_WRITE_GOLDEN=1 on c66436d4); the diff against the previous file is
// exactly impostors.{east,north,east2}.arrays.de.ink and the contrast of the three German items; every other record is byte-identical.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {M01Impostors} from '../src/render/m01-impostors.js';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {Renderer} from '../src/render/three-renderer.js';
import {Wz29} from '../src/game/wz29.js';
import {seconds} from '../src/game/m01-simulation.js';
import {viewModelFixture} from './helpers/m01-viewmodel-fixture.js';

const GOLDEN_URL=new URL('./fixtures/m01-t49-scratch-golden.json',import.meta.url);
const WRITE=process.env.M01_T49_WRITE_GOLDEN==='1';
const golden=WRITE?{}:JSON.parse(readFileSync(GOLDEN_URL,'utf8'));
const record=(key,value)=>{
  const plain=JSON.parse(JSON.stringify(value));   // numbers survive exactly; NaN would fail loudly below
  if(WRITE){golden[key]=plain;return;}
  assert.deepEqual(plain,golden[key],`${key} differs from the pre-change golden`);
};
test.after(()=>{if(WRITE)writeFileSync(GOLDEN_URL,JSON.stringify(golden,null,1)+'\n');});

const src=name=>readFileSync(new URL(`../src/render/${name}`,import.meta.url),'utf8');
/** One-time lazy scratch creation (`this._x??=new THREE.Vector3()`) is the allowed pattern; everything else is a per-frame allocation. */
const withoutLazyScratch=code=>code.replace(/\?\?=\s*new THREE\.[A-Za-z0-9]+\(\)/g,'??=<scratch>');
/** Body of a class method: from its signature line to the next 2-space-indented member. */
function method(code,name){
  const lines=code.split('\n'),start=lines.findIndex(l=>new RegExp(`^  ${name}\\(.*\\)\\{`).test(l));
  assert.ok(start>=0,`method ${name} not found`);
  let end=lines.findIndex((l,i)=>i>start&&/^  [A-Za-z_]+\(.*\)\{|^  (get|static) [A-Za-z_]+\(/.test(l));if(end<0)end=lines.length;
  return lines.slice(start,end).join('\n');
}

// ---- fixed scene helpers ----
const actor=(id,o={})=>({id,active:true,alive:true,civilian:false,team:'enemy',x:0,y:0,z:0,state:'GUARD',crouched:false,...o});
const frame=(dir=[1,0,0])=>({camera:{position:{x:0,y:1.6,z:0},fov:70,getWorldDirection:v=>v.set(...dir)},clock:10,battleClock:seconds('06:05'),fog:[.5,.5,.5],sunColor:[1,.8,.6],sunDir:[.9,.1,-.3],viewportHeight:720});
const actors=()=>[actor('g1',{x:900}),actor('g2',{x:800,z:5}),actor('g3',{x:1000,z:-9,crouched:true}),actor('a1',{team:'ally',x:700,z:3}),actor('a2',{team:'ally',x:760,z:-4})];
const setup=list=>{const imp=new M01Impostors({add(){}},{debug:false});imp.select(list,new Set(),{x:0,z:0},'low',10);return imp;};
const arrays=imp=>Object.fromEntries(Object.entries(imp.meshes).map(([n,m])=>[n,{count:m.count,matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),
  shape:Array.from(m.geometry.getAttribute('aShape').array.slice(0,m.count*4)),ink:Array.from(m.geometry.getAttribute('aInk').array.slice(0,m.count*3))}]));

// ---- (a) no per-frame allocation in the touched hot paths ----
test('A: touched per-frame statements reuse scratch objects (static guard on the hot-path bodies)',()=>{
  const imp=method(src('m01-impostors.js'),'sync');
  assert.doesNotMatch(imp,/new THREE\./,'M01Impostors.sync constructs no THREE object');
  assert.match(imp,/this\._fwd/);
  const vm=method(src('m01-viewmodel.js'),'update');
  assert.doesNotMatch(withoutLazyScratch(vm),/new THREE\.(Vector3|Color|Matrix4|Quaternion|Euler)/,'M01ViewModel.update constructs no vector/colour/matrix/quaternion');
  const renderer=src('three-renderer.js');
  const fx=method(renderer,'updateEffects');
  assert.doesNotMatch(withoutLazyScratch(fx).split('\n').filter(l=>/setColorAt|setMatrixAt/.test(l)).join('\n'),/new THREE\./,'particle loop does not allocate a Color per particle');
  const weapon=method(renderer,'updateWeapon');
  for(const l of withoutLazyScratch(weapon).split('\n').filter(l=>/localToWorld|transformDirection/.test(l)))assert.doesNotMatch(l,/new THREE\./,`muzzle/axis/port scratch: ${l.trim()}`);
});
test('A: scratch objects keep one identity across frames and are never aliased between callers',()=>{
  const imp=setup(actors());imp.sync(frame());const f=imp._fwd;imp.sync(frame([0,0,1]));
  assert.ok(f instanceof THREE.Vector3);assert.equal(imp._fwd,f);imp.dispose();
});

// ---- (b) empty instance sets are not uploaded ----
test('B: impostor sync uploads only populated nations, limited to counts*16 matrix floats',()=>{
  const imp=setup([actor('g1',{x:900}),actor('g2',{x:800,z:5})]),{pl,de}=imp.meshes;
  imp.sync(frame());
  assert.equal(de.count,2);assert.equal(pl.count,0);
  assert.equal(pl.instanceMatrix.version,0,'empty nation matrix is not re-uploaded');
  assert.equal(pl.geometry.getAttribute('aShape').version,0);assert.equal(pl.geometry.getAttribute('aInk').version,0);
  assert.ok(de.instanceMatrix.version>0);
  assert.deepEqual(de.instanceMatrix.updateRanges,[{start:0,count:32}]);
  imp.sync(frame());   // ranges are replaced, not accumulated
  assert.deepEqual(de.instanceMatrix.updateRanges,[{start:0,count:32}]);
  imp.dispose();
});
test('B: an all-empty impostor frame uploads nothing, and a nation that refills uploads again',()=>{
  const imp=setup([]);imp.sync(frame());
  for(const m of Object.values(imp.meshes)){assert.equal(m.count,0);assert.equal(m.instanceMatrix.version,0);}
  imp.select(actors(),new Set(),{x:0,z:0},'low',10);imp.sync(frame());
  assert.ok(imp.meshes.pl.count>0&&imp.meshes.pl.instanceMatrix.version>0);
  imp.dispose();
});
function fakeRenderer(particles){
  const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,4,3),new THREE.MeshBasicMaterial(),180);
  mesh.count=0;
  return {particles,quality:'high',particleMesh:mesh,smokeViews:new Map(),effects:new THREE.Group(),mesh(){}};
}
test('B: Renderer.updateEffects skips the particle upload when no particle is alive',()=>{
  const r=fakeRenderer([]);
  Renderer.prototype.updateEffects.call(r,1000,undefined);
  assert.equal(r.particleMesh.count,0);assert.equal(r.particleMesh.instanceMatrix.version,0);
  r.particles.push({x:1,y:1,z:1,vx:0,vy:1,vz:0,born:1000,life:450,size:.035,color:'#a7854e'});
  Renderer.prototype.updateEffects.call(r,1100,undefined);
  assert.equal(r.particleMesh.count,1);assert.ok(r.particleMesh.instanceMatrix.version>0);assert.ok(r.particleMesh.instanceColor.version>0);
  const v=r.particleMesh.instanceMatrix.version;
  Renderer.prototype.updateEffects.call(r,5000,undefined);   // expired: count 0, nothing drawn, no further upload
  assert.equal(r.particleMesh.count,0);assert.equal(r.particleMesh.instanceMatrix.version,v);
});

// ---- (c) identical outputs on a fixed scene ----
test('C: impostor matrices, ink, shape, rim uniforms and diagnostics equal the pre-change golden',()=>{
  const imp=setup(actors()),out={};
  for(const [k,dir] of [['east',[1,0,0]],['north',[0,0,1]],['east2',[1,0,0]]]){
    imp.sync(frame(dir));
    out[k]={arrays:arrays(imp),rim:[imp.uniforms.uRimStrength.value,imp.uniforms.uRimSide.value,...imp.uniforms.uRim.value.toArray()],
      backlight:imp.backlight,facing:imp.rimFacing,items:imp.last.list,counts:imp.last.counts};
  }
  assert.deepEqual(out.east,out.east2,'forward scratch does not leak between frames');
  record('impostors',out);imp.dispose();
});
test('C: particle instance matrices and colours equal the pre-change golden',()=>{
  const r=fakeRenderer([]);
  const colors=['#a7854e','#ccc9b7','#8b7650','#ffd57e','#7d3028','#ffb450','#736654'];
  for(let i=0;i<7;i++)r.particles.push({x:i*.5,y:1+i*.1,z:-i,vx:.2*i,vy:1.5,vz:-.3*i,born:1000+i*10,life:450+i*50,size:.035+i*.01,color:colors[i]});
  const out=[];
  for(const t of [1100,1250,1400]){
    Renderer.prototype.updateEffects.call(r,t,undefined);
    out.push({count:r.particleMesh.count,matrix:Array.from(r.particleMesh.instanceMatrix.array.slice(0,r.particleMesh.count*16)),
      color:Array.from(r.particleMesh.instanceColor.array.slice(0,r.particleMesh.count*3))});
  }
  record('particles',out);
});
test('C: first-person view model muzzle, sights and presentation equal the pre-change golden',async()=>{
  const c=await viewModelFixture(),out=[];
  try{
    const v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture());
    for(const [aiming,clock,state] of [[true,10,'READY'],[false,10.4,'READY'],[true,10.8,'READY']]){
      const w=new Wz29();w.state=state;
      assert.equal(v.update({clock,player:{aiming,moveBlend:0,sprinting:false},weapon:w,renderState:{weaponVisible:true}},'high',0),true);
      out.push({muzzle:v.stats.visualMuzzle,sights:v.stats.visualSights,reach:v.stats.presentation.muzzleReach,clip:v.stats.clip,clipTime:v.stats.clipTime});
    }
    assert.notDeepEqual(out[0].muzzle,out[1].muzzle,'fixture actually moves the muzzle');
    assert.notEqual(out[0].sights.rear,out[0].sights.front);
    record('viewmodel',out);v.dispose();
  }finally{c.dispose();}
});
