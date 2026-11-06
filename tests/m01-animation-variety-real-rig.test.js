// T08 clip library on the REAL shipped soldier rigs (LOD0..2, both nations), parsed on the CPU without textures like the T37 tests.
// Proves what the synthetic-rig tests cannot: every library clip the variety layer can select binds to the production skeleton (no missing
// bones), corpses end lying on the ground (not through it), and eight neighbouring soldiers really end up at different points of their loops.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createIkCharacters,loadIkAssets,boneSnapshot} from './helpers/m01-ik-fixture.js';
import {STAND_IDLES,CROUCH_IDLES,FIDGETS,DEATHS,HITS,POSTURE_TRANSITIONS,restingVariant} from '../src/render/m01-animation-variety.js';

let libraryCache=null;
const libraryClips=()=>libraryCache??=(async()=>{
  const b=readFileSync(new URL('../assets/models/provisional/m01/characters/clip-library-v2/m01_soldier_clip_library_v2.glb',import.meta.url));
  const loader=new GLTFLoader().register(()=>({name:'CPU_NO_TEXTURE',loadTexture:()=>Promise.resolve(null)}));
  return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).animations;
})();
async function characters(options={}){
  const c=await createIkCharacters({ik:false,ikMeasure:false,...options});
  for(const clip of await libraryClips())c.clips.set(clip.name,clip);   // what M01Characters.load() does with the library pack
  return c;
}
const base={team:'ally',role:'RIFLEMAN',active:true,alive:true,state:'GUARD',x:0,y:0,z:0,facing:0,bodyYaw:0,shot:0,crouched:false,posture:'stand',postureSince:0,
  motion:{speed:0,odometer:0,gait:'idle',gaitSince:0},hitAt:-1e9,suppressedAt:-1e9,diedAt:-1e9,deathYaw:0,hitYaw:0,firedAt:-1e9,suppressedUntil:0};
const player={x:6,z:0};
const stat=(c,id)=>c.stats.actors.find(a=>a.id===id);

test('every library clip the variety layer can select binds to every shipped soldier rig (LOD0..2, pl and de) without a missing bone',async()=>{
  const {sources}=await loadIkAssets(),clips=await libraryClips();
  const names=new Set([...STAND_IDLES,...CROUCH_IDLES,...FIDGETS,...Object.values(DEATHS),...Object.values(HITS),...Object.values(POSTURE_TRANSITIONS),'blast_duck','prone_flinch','seated_b']);
  const warnings=[],warn=console.warn;console.warn=(...a)=>warnings.push(a.join(' '));
  try{
    for(const [key,gltf] of sources){
      const root=gltf.scene.clone(true),mixer=new THREE.AnimationMixer(root);
      for(const clip of clips)if(names.has(clip.name))mixer.clipAction(clip).play();
      mixer.update(0);
      root.updateMatrixWorld(true);
      root.traverse(n=>{if(n.isBone)for(const e of n.matrixWorld.elements)assert.ok(Number.isFinite(e),`${key} ${n.name}`);});
      mixer.uncacheRoot(root);
    }
  }finally{console.warn=warn;}
  assert.deepEqual(warnings.filter(w=>/PropertyBinding/.test(w)),[],'a library track points at a bone the shipped rig does not have');
});

test('eight neighbouring platoon men, real rig: their clip times are spread over the cycle (legacy: within 40 ms) and they split over several idle clips',async()=>{
  const c=await characters(),legacy=await createIkCharacters({ik:false,ikMeasure:false});
  try{
    const ids=Array.from({length:8},(_,i)=>`pl_east_${i}`),mk=()=>ids.map((id,i)=>({...base,id,x:2,z:i*1.2,group:'grp_east_platoon'}));
    c.update(mk(),500.5,player,'high');legacy.update(mk(),500.5,player,'high');
    const t=[],tl=[];
    for(const id of ids){const s=stat(c,id),l=stat(legacy,id);assert.ok(s&&l,id);t.push(s.clipTime/(s.clip.startsWith('fidget')?2.4:4));tl.push(l.clipTime);}
    const spread=a=>Math.max(...a)-Math.min(...a);
    assert.ok(spread(tl)<.04,`legacy spread ${spread(tl)}`);
    const clipNames=new Set(ids.map(id=>stat(c,id).clip));
    assert.ok(new Set(ids.map(id=>stat(c,id).clipTime.toFixed(3))).size===8,'eight different loop times');
    assert.ok(clipNames.size>=2,`variants in use: ${[...clipNames]}`);
    for(const id of ids){const m=c.instances.get(id).root;m.traverse(n=>{if(n.isBone)for(const e of n.matrixWorld.elements)assert.ok(Number.isFinite(e));});}
  }finally{c.dispose();legacy.dispose();}
});

test('real rig: corpses end lying on the ground (hips low, nothing through the floor) for every death clip',async()=>{
  const c=await characters();
  try{
    const lowest=inst=>Math.min(...boneSnapshot(inst).map(b=>b[3][13])),hipsY=inst=>boneSnapshot(inst).find(b=>b[0]==='hips')[3][13];
    const fallen=await createIkCharacters({ik:false,ikMeasure:false});
    fallen.update([{...base,id:'ref',alive:false,diedAt:100,x:2}],110,player,'high');
    const refHips=hipsY(fallen.instances.get('ref')),refLow=lowest(fallen.instances.get('ref'));
    fallen.dispose();
    const seen=new Set();
    // Each direction, shot at the moment of death, plus a death with no recorded shot.
    const cases=[{yaw:0,shot:true},{yaw:Math.PI,shot:true},{yaw:-Math.PI/2,shot:true},{yaw:Math.PI/2,shot:true},{yaw:0,shot:false}];
    let n=0;
    for(let i=0;i<200&&seen.size<5;i++){
      for(const {yaw,shot} of cases){
        const id=`de_east_${n++}`,a={...base,id,team:'enemy',alive:false,diedAt:100,deathYaw:0,hitAt:shot?100:-1e9,hitYaw:yaw,x:2};
        c.update([a],110,player,'high');
        const s=stat(c,id);if(!s)continue;
        seen.add(s.clip);
        assert.ok(Object.values(DEATHS).includes(s.clip),s.clip);
        const inst=c.instances.get(id),y=hipsY(inst),low=lowest(inst);
        assert.ok(y<.45,`${s.clip} hips ${y.toFixed(3)} m: corpse must lie down (fallen: ${refHips.toFixed(3)})`);
        assert.ok(low>-.06,`${s.clip} lowest bone ${low.toFixed(3)} m: nothing may sink through the ground (fallen: ${refLow.toFixed(3)})`);
        assert.ok(s.blend.length===1&&Math.abs(s.blend[0].weight-1)<1e-9,'a corpse long dead is a single full-weight layer');
        assert.ok(Math.abs(s.clipTime-(s.clip==='death_front'?1.6:s.clip==='death_crumple'?1.8:1.5))<1e-6,`${s.clip} holds its last frame`);
        c.update([],112,player,'high');
      }
    }
    assert.ok(seen.size>=4,`death clips exercised on the real rig: ${[...seen]}`);
  }finally{c.dispose();}
});

test('real rig: a hit from the left plays hit_left with the body inside its pose envelope, then returns to the idle without a pop',async()=>{
  const c=await characters();
  try{
    const a={...base,id:'pl_east_1',x:2,hitAt:200,hitYaw:-Math.PI/2};
    const hips=()=>{const b=boneSnapshot(c.instances.get('pl_east_1')).find(x=>x[0]==='hips');return b[3].slice(12,15);};
    let previous=null,worst=0;
    for(let i=0;i<=90;i++){
      const t=199.9+i/60;c.update([a],t,player,'high');
      const s=stat(c,'pl_east_1');assert.ok(Math.abs(s.blend.reduce((m,b)=>m+b.weight,0)-1)<1e-9);
      if(t>=200&&t<200.7)assert.equal(s.clip,'hit_left',`t=${t}`);
      const p=hips();if(previous)worst=Math.max(worst,Math.hypot(p[0]-previous[0],p[1]-previous[1],p[2]-previous[2]));previous=p;
    }
    assert.ok(worst<.06,`largest hips step between 60 Hz frames ${worst.toFixed(4)} m`);
  }finally{c.dispose();}
});

// ---- foot skate: the library one-shots and idles were authored on specific foot marks; the layer must never cross-fade between different ones ----
const ROSTER=Array.from({length:60},(_,i)=>`de_east_${i+2}`);
const idOf=(family,variant)=>ROSTER.find(id=>restingVariant({id},family,false)===variant);
const feetOf=(c,id)=>{const b=boneSnapshot(c.instances.get(id)),g=n=>b.find(x=>x[0]===n)[3].slice(12,15);return [...g('foot_l'),...g('foot_r')];};
const footStep=(a,b)=>Math.max(Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),Math.hypot(a[3]-b[3],a[4]-b[4],a[5]-b[5]));
/** Largest world step of either foot between two frames of one authored clip played alone, at `hz`. */
function authoredPeak(c,name,hz){
  const root=c.sources.get('pl:1').scene.clone(true),mixer=new THREE.AnimationMixer(root),clip=c.clips.get(name),act=mixer.clipAction(clip);
  const fl=root.getObjectByName('foot_l'),fr=root.getObjectByName('foot_r'),v=new THREE.Vector3(),w=new THREE.Vector3();
  act.play();let prev=null,worst=0;
  for(let t=0;t<=clip.duration+1e-9;t+=1/hz){act.time=Math.min(t,clip.duration);mixer.update(0);root.updateMatrixWorld(true);fl.getWorldPosition(v);fr.getWorldPosition(w);
    const f=[...v.toArray(),...w.toArray()];if(prev)worst=Math.max(worst,footStep(prev,f));prev=f;}
  mixer.uncacheRoot(root);return worst;
}

test('real rig, no foot skate: a stationary soldier never moves his feet in any resting idle or fidget (only the authored boot step of fidget_shift)',async()=>{
  const c=await characters();
  try{
    const hz=30,shift=authoredPeak(c,'fidget_shift',hz);let fidgetsSeen=0;
    for(const [family,variant] of [['stand',0],['stand',1],['stand',2],['crouch',0],['crouch',1]]){
      const id=idOf(family,variant);assert.ok(id,`${family} ${variant}`);
      const actor={...base,id,team:'enemy',...(family==='crouch'?{crouched:true,posture:'crouch',postureSince:1}:{})};
      let prev=null,worst=0;
      for(let t=100;t<=220;t+=1/hz){
        c.update([actor],t,player,'high');const f=feetOf(c,id),s=stat(c,id);
        if(prev){
          const step=footStep(prev,f),shifting=s.blend.some(b=>b.clip==='fidget_shift');
          if(s.blend.some(b=>b.clip.startsWith('fidget_')))fidgetsSeen++;
          if(shifting)assert.ok(step<=shift*1.25+1e-4,`${id} fidget_shift step ${step} > authored ${shift}`);
          else worst=Math.max(worst,step);
        }
        prev=f;
      }
      assert.ok(worst<.001,`${id} (${family} variant ${variant}) feet moved ${(worst*1000).toFixed(2)} mm in one frame while standing still`);
    }
    assert.ok(fidgetsSeen>0,'the scenario includes fidgets');
  }finally{c.dispose();}
});

test('real rig, no foot skate: stand -> kneel -> stand on the base kneeling idle moves the feet only as fast as the authored transitions, and rests still after them',async()=>{
  const c=await characters();
  try{
    const hz=60,peak=Math.max(authoredPeak(c,'stand_to_crouch',hz),authoredPeak(c,'crouch_to_stand',hz)),id=idOf('crouch',0);
    let prev=null,worst=0;const rest=[];
    for(let t=299;t<=309;t+=1/hz){
      const actor={...base,id,team:'enemy',...(t>=300&&t<304?{crouched:true,posture:'crouch',postureSince:300}:{}),...(t>=304?{postureSince:304}:{})};
      c.update([actor],t,player,'high');const f=feetOf(c,id);
      if(prev){const step=footStep(prev,f);worst=Math.max(worst,step);if((t>300.9&&t<303.9)||t>305)rest.push(step);}
      prev=f;
    }
    assert.ok(worst<=peak*1.25,`peak foot step ${(worst*1000).toFixed(1)} mm/frame vs authored transition peak ${(peak*1000).toFixed(1)}`);
    assert.ok(Math.max(...rest)<.001,`feet slide after the transition: ${(Math.max(...rest)*1000).toFixed(2)} mm/frame`);
    assert.ok(rest.length>200);
  }finally{c.dispose();}
});

test('real rig, hit direction: the clip follows the shooter\'s side at any facing, and the lateral clips push the head away from the shooter (left/right authored as "pushed away")',async()=>{
  // A fresh renderer per sample is a pure clip pose (single layer, no idle blended in): frame 0 of the reaction vs its 0.3 s frame.
  const headAt=async(a,t)=>{const c=await characters();try{c.update([a],t,player,'high');const b=boneSnapshot(c.instances.get(a.id)).find(x=>x[0]==='head');return {clip:stat(c,a.id).clip,p:[b[3][12],b[3][14]]};}finally{c.dispose();}};
  for(const facing of [0,1.1,-2.3,Math.PI]){
    for(const [label,off,clip] of [['front',0,'hit_front'],['left',-Math.PI/2,'hit_left'],['back',Math.PI,'hit_back'],['right',Math.PI/2,'hit_right']]){
      const yaw=facing+off,a={...base,id:`pl_east_${label}`,facing,bodyYaw:facing,hitAt:400,hitYaw:yaw,x:3,z:2};
      const start=await headAt(a,400),peak=await headAt(a,400.3);
      assert.equal(start.clip,clip,`${label} at facing ${facing}`);assert.equal(peak.clip,clip);
      if(label!=='left'&&label!=='right')continue;   // ponytail: hit_front/hit_back are chest and shoulder impulses (head bows / rocks), not lateral pushes: only their selection is asserted
      const along=(peak.p[0]-start.p[0])*Math.cos(yaw)+(peak.p[1]-start.p[1])*Math.sin(yaw);
      assert.ok(along<-.01,`${label} at facing ${facing}: the head moved ${(along*1000).toFixed(1)} mm toward the shooter`);
    }
  }
});
