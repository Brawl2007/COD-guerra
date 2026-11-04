import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {STRETCHER,stretcherPose,buildStretcherGeometry,M01AreaStretcher} from '../src/render/m01-area-stretcher.js';
import {DUSK,duskLift,exitLanternSites,haloSize,haloOpacity} from '../src/render/m01-area-dusk.js';
import {M01_FX_PROFILES,battlefieldBlastKind,battlefieldProfile,blastFlashEnvelope,fxLayerCount} from '../src/render/m01-battlefield-fx-profile.js';

// Area render polish (2026-11-05): the stretcher of the VII-b bearers, the shell burst and the VII-c dusk guidance. Pure maths and the objects' bookkeeping; what must be SEEN is in
// tests/browser/m01-area-render-polish.spec.js. None of this reads or writes the simulation beyond the records it is given.
const src=name=>readFileSync(new URL(`../src/render/${name}`,import.meta.url),'utf8');

const bearer=(id,x,z,facing=Math.PI/2)=>({id,x,y:-3,z,facing,active:true,alive:true,state:'IDLE',role:'MEDIC',carriedBy:null});
const scene=()=>{
  const m0=bearer('np_maqueiro_0',-430,-1100),m1=bearer('np_maqueiro_1',-429,-1100.3),man={id:'pl_np_3',x:-430,y:-1.85,z:-1100.25,facing:3,active:true,alive:true,state:'WOUNDED',carriedBy:'np_maqueiro_0',crouched:true};
  return [{id:'other',x:0,z:0,y:0,facing:0,active:true,alive:true,carriedBy:null},m0,m1,man];
};

test('stretcher pose: the rear bearer is drawn GAP behind the first along his heading once the lift is done, and where the simulation has him at the pick-up',()=>{
  const [,m0,m1]=scene();
  const done=stretcherPose(m0,m1,1,{}),start=stretcherPose(m0,m1,0,{});
  assert.ok(Math.abs(Math.hypot(done.rearX-m0.x,done.rearZ-m0.z)-STRETCHER.gapM)<1e-9);
  assert.ok(Math.abs((done.rearX-m0.x)*Math.cos(m0.facing)+(done.rearZ-m0.z)*Math.sin(m0.facing)+STRETCHER.gapM)<1e-9);   // exactly behind
  assert.equal(start.rearX,m1.x);assert.equal(start.rearZ,m1.z);
  assert.ok(start.y<done.y&&Math.abs(done.y-(-3+STRETCHER.heightM))<1e-9);   // lifted from the ground to carrying height
  assert.ok(Math.abs(done.x-(m0.x+done.rearX)/2)<1e-12);   // the stretcher is centred between the pair
  for(let k=0;k<=1.0001;k+=.1){const p=stretcherPose(m0,m1,k,{});assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.y)&&p.y>=start.y-1e-9&&p.y<=done.y+1e-9);}
  assert.equal(stretcherPose(m0,m1,7,{}).rearX,done.rearX);   // lift is clamped
});

test('stretcher pose falls back to nothing (the old shoulder carry) when a record is missing or not finite',()=>{
  const [,m0,m1]=scene();
  assert.equal(stretcherPose(null,m1,1),null);assert.equal(stretcherPose(m0,undefined,1),null);
  assert.equal(stretcherPose({...m0,x:NaN},m1,1),null);assert.equal(stretcherPose(m0,{...m1,facing:undefined},1),null);
  assert.ok(stretcherPose(m0,m1,NaN,{}));   // an unreadable lift counts as done
});

test('the stretcher replaces the rear bearer and the patient by drawn copies, never touches the records, and leaves the list alone when nobody is carried',()=>{
  const parent=new THREE.Group(),st=new M01AreaStretcher(parent),actors=scene(),before=JSON.stringify(actors);
  const out=st.present(actors,{state:'carry',since:100},102.5);
  assert.equal(JSON.stringify(actors),before);   // the simulation's records are untouched
  assert.notEqual(out,actors);assert.equal(out.length,actors.length);
  const [other,m0,m1,man]=actors,[o2,f2,r2,p2]=out;
  assert.equal(o2,other);assert.equal(f2,m0);   // the first bearer and the others are the very same objects
  assert.notEqual(r2,m1);assert.notEqual(p2,man);
  assert.equal(p2.carriedBy,null);assert.equal(p2.state,'WOUNDED');assert.equal(p2.id,'pl_np_3');assert.equal(r2.id,'np_maqueiro_1');
  assert.ok(Math.abs(Math.hypot(r2.x-m0.x,r2.z-m0.z)-STRETCHER.gapM)<1e-9);
  assert.ok(Math.abs(p2.x-(m0.x+r2.x)/2)<1e-9&&Math.abs(p2.z-(m0.z+r2.z)/2)<1e-9);
  assert.equal(st.group.visible,true);assert.equal(st.diagnostics.active,true);
  // no allocation growth: the same copies and list are reused on the next frame
  const again=st.present(actors,{state:'carry',since:100},102.6);assert.equal(again,out);assert.equal(again[2],r2);assert.equal(again[3],p2);
  // nobody carried: the list itself, the group hidden
  const idle=scene();idle[3].carriedBy=null;const same=st.present(idle,{state:'idle',since:0},103);assert.equal(same,idle);assert.equal(st.group.visible,false);
  // a bearer missing: the shoulder carry stays
  const lone=scene().filter(a=>a.id!=='np_maqueiro_1');assert.equal(st.present(lone,{state:'carry',since:1},3),lone);assert.equal(st.group.visible,false);
  // an inactive rear bearer (he has left the field): the same
  const gone=scene();gone[2].active=false;assert.equal(st.present(gone,{state:'carry',since:1},3),gone);
  // the lift starts at the simulation's `since`, so a restore mid-carry does not replay it
  const late=st.present(scene(),{state:'carry',since:10},50);assert.ok(Math.abs(st.pose.lift-1)<1e-9);void late;
  const early=st.present(scene(),{state:'carry',since:10},10.1);assert.ok(st.pose.lift<.05);void early;
  st.dispose();assert.equal(parent.children.length,0);
});

test('act 1 is untouched: only a carrier named np_maqueiro_N makes a stretcher',()=>{
  const st=new M01AreaStretcher(new THREE.Group()),act1=[{id:'medic_a',x:1,z:1,y:0,facing:0,active:true,carriedBy:null},{id:'generic_rifleman',x:2,z:1,y:0,facing:0,active:true,carriedBy:'medic_a',state:'WOUNDED'}];
  assert.equal(st.present(act1,{state:'carry',since:0},9),act1);assert.equal(st.diagnostics.active,false);st.dispose();
});

test('the stretcher geometry is small, finite and sized for a man',()=>{
  const [wood,canvas]=buildStretcherGeometry();
  for(const g of [wood,canvas]){g.computeBoundingBox();const b=g.boundingBox;for(const v of [b.min.x,b.max.x,b.min.y,b.max.y,b.min.z,b.max.z])assert.ok(Number.isFinite(v));}
  assert.ok(Math.abs(wood.boundingBox.max.x-wood.boundingBox.min.x-STRETCHER.lengthM)<.1);
  assert.ok(wood.boundingBox.max.z-wood.boundingBox.min.z<.7&&canvas.boundingBox.max.x-canvas.boundingBox.min.x>1.8);
  assert.ok(wood.index.count/3+canvas.index.count/3<700);   // a few hundred triangles at most
  wood.dispose();canvas.dispose();
});

test('dusk lift: zero in daylight and just after sunset, full at the act\'s own sun (-3.8 deg), monotone, bounded',()=>{
  assert.equal(duskLift(10),0);assert.equal(duskLift(-.6),0);assert.equal(duskLift(NaN),0);
  assert.ok(Math.abs(duskLift(-3.8)-1)<1e-9&&Math.abs(duskLift(-6)-1)<1e-9);
  let last=-1;for(let a=5;a>=-8;a-=.1){const v=duskLift(a);assert.ok(v>=last-1e-12&&v>=0&&v<=1);last=v;}
  assert.ok(DUSK.liftHemi<=.3&&DUSK.liftExposure<=.08);   // slight
});

test('exit lanterns: two posts inside the band\'s x range on its south edge; unusable exit gives none',()=>{
  const exit={minX:-600,maxX:-560,minZ:-1068,maxZ:-1056},sites=exitLanternSites(exit);
  assert.equal(sites.length,2);assert.ok(sites.every(s=>s.x>exit.minX&&s.x<exit.maxX&&s.z>exit.maxZ));assert.ok(sites[0].x<sites[1].x);
  assert.equal(exitLanternSites(null),null);assert.equal(exitLanternSites({minX:1}),null);
});

test('halo: a minimum angular size (grows with distance, bounded) and no glare close up',()=>{
  assert.equal(haloSize(0),DUSK.haloMin);assert.equal(haloSize(5000),DUSK.haloMax);assert.ok(haloSize(200)>haloSize(60)&&haloSize(60)>=DUSK.haloMin);
  assert.ok(haloOpacity(3)<haloOpacity(60)&&haloOpacity(3)<.4&&haloOpacity(300)<=.9);
});

test('shell bursts: np_shell_crater_* is its own kind with a longer flash than a grenade; every act-1 id keeps its kind',()=>{
  assert.equal(battlefieldBlastKind('np_shell_crater_brg_npb_1_4',false),'shell');
  for(const [id,aerial,kind] of [['m01_grenade_2',false,'small'],['station_bomb',true,'bombing'],['raid_0530',true,'bombing'],['east_demolition',false,'demolition'],['',false,'small'],['m01_bomb_1',false,'bombing']])assert.equal(battlefieldBlastKind(id,aerial),kind);
  const shell=M01_FX_PROFILES.shell,small=M01_FX_PROFILES.small,bomb=M01_FX_PROFILES.bombing;
  assert.ok(shell.flashEnd>small.flashEnd&&shell.flashEnd>bomb.flashEnd&&shell.scale>small.scale&&shell.scale<bomb.scale);
  assert.ok(blastFlashEnvelope(.12,battlefieldProfile('np_shell_crater_x_1'),60).active);   // still on at 120 ms
  for(const q of ['low','medium','high'])for(const layer of ['flash','core','fire','dust','smoke','shard'])assert.ok(fxLayerCount(shell.counts[layer],q,60)>=1);
  assert.ok(shell.counts.flash<=16&&shell.counts.core<=48&&shell.counts.fire<=96&&shell.counts.smoke<=128&&shell.counts.dust<=128&&shell.counts.shard<=96);   // inside the pools
});

test('the view builds the polish only for an area plan and ages only a shell burst from its first drawn frame',()=>{
  const view=src('m01-view.js');
  assert.match(view,/const plan=this\.areaDressing\?sim\.plan:null/);
  assert.match(view,/medics=Boolean\(plan\?\.medics\)/);assert.match(view,/withdrawal=plan\?\.withdrawal\?\?null/);
  assert.match(view,/if\(kind==='shell'&&b\.first===undefined\)/);assert.match(view,/age=time-b\.start-\(kind==='shell'\?b\.first:0\)/);
  assert.match(view,/if\(this\.areaDusk\)\{const lift=/);
  for(const f of ['m01-area-stretcher.js','m01-area-dusk.js']){const s=src(f);assert.doesNotMatch(s,/Math\.random|\.damage\s*=|\.health\s*=|\.emit\(/,f);}   // presentation only: no RNG, no state written
});
