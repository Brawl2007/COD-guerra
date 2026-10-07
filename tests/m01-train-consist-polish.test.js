import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {M01TrainWagons,M01_TRAIN_WAGON_PLAN,chooseWagonLod,wagonLodCandidates} from '../src/render/m01-train-wagons.js';
import {M01_TRAIN_ART_OFFSET_Y,M01_TRAIN_TRACK,M01_TRAIN_DETAIL_BUDGET,m01DetailTier,m01WagonVariation,m01GapVariation,m01WagonWear,m01WagonArtMatrix}
  from '../src/render/m01-train-consist-detail.js';
import {yardWagonState,M01_YARD_WAGON_PLAN} from '../src/render/m01-yard-wagons.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {TczewWorld} from '../src/world/tczew-world.js';

// M01-TRAIN-DETAIL-COUPLING-POLISH-V1: presentation of train 963's 65-wagon consist only.
const BASE='99309d9cb023cc94a07d41ff863e1362e4460570',DIR=new URL('../assets/models/provisional/m01-wagons/',import.meta.url);
async function wagonAsset(type,lod){
  const b=readFileSync(new URL(`m01_wagon_${type}_lod${lod}.glb`,DIR)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  delete j.images;delete j.textures;delete j.samplers;
  for(const m of j.materials){for(const k of ['normalTexture','occlusionTexture','emissiveTexture'])delete m[k];delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;}
  j.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');globalThis.ProgressEvent??=class{constructor(t,p){Object.assign(this,p);}};
  return new GLTFLoader().parseAsync(JSON.stringify(j),'');
}
let real;const realSources=async()=>real??=Object.fromEntries(await Promise.all(['covered','open'].flatMap(t=>[0,1,2].map(async l=>[`${t}:${l}`,await wagonAsset(t,l)]))));
class Assets{constructor(sources,fail=()=>false){this.sources=sources;this.fail=fail;this.calls=[];}
  async load(name,path){this.calls.push(path);if(this.fail(path))throw new Error('forced '+path);return this.sources[name.replace(/^wagon:/,'')];}}
function fixture(assets){
  const parent=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,8),wood=new THREE.MeshStandardMaterial(),metal=new THREE.MeshStandardMaterial();
  const train=new M01TrainWagons(parent,assets,box,cylinder,wood,metal);
  return {train,parent,box,wood,close(){train.dispose();box.dispose();cylinder.dispose();wood.dispose();metal.dispose();}};
}
const meshes=root=>{let n=0;root.traverse(o=>{if(o.isMesh)n++;});return n;};
const instanceMatrices=batch=>Array.from({length:batch.count},(_,i)=>{const m=new THREE.Matrix4();batch.getMatrixAt(i,m);return m;});

test('consist keeps 65 wagons, plan ids/types/x and the plan anchor; LOD hysteresis and candidates are unchanged',()=>{
  assert.equal(M01_TRAIN_WAGON_PLAN.length,65);
  M01_TRAIN_WAGON_PLAN.forEach((w,i)=>assert.deepEqual({...w},{id:`train963_wagon_${String(i+1).padStart(2,'0')}`,type:i%4===3?'open':'covered',x:1090+i*9.1}));
  assert.equal(M01_TRAIN_WAGON_PLAN.filter(w=>w.type==='open').length,16);
  for(const quality of ['low','medium','high']){assert.equal(chooseWagonLod(0,quality,null),0);assert.equal(chooseWagonLod(1e4,quality,null),2);}
  assert.equal(chooseWagonLod(85,'medium',0),0);assert.equal(chooseWagonLod(101,'medium',0),1);assert.equal(chooseWagonLod(150,'high',1),1);
  assert.equal(chooseWagonLod(95,'high',1),0);assert.equal(chooseWagonLod(410,'high',2),2);assert.equal(chooseWagonLod(390,'high',2),1);
  assert.deepEqual([0,1,2].map(wagonLodCandidates),[[0,1,2],[1,2,0],[2,1,0]]);
  // Detail tiers follow the drawn LOD; Low never shows the near set.
  assert.deepEqual(['high','medium','low'].map(q=>[0,1,2,null].map(l=>m01DetailTier(l,q))),[[0,1,2,null],[0,1,2,null],[1,2,2,null]]);
});

test('real GLB instances keep plan x/z, sit on the rail-top offset and stay in the original LOD batches',async()=>{
  const f=fixture(new Assets(await realSources()));
  try{
    await f.train.load();f.train.update({x:1090,z:-2.5},'high');const d=f.train.diagnostics;
    assert.equal(d.wagons,65);assert.equal(d.proxies,0);assert.deepEqual(d.first,[1090,0,-2.5]);assert.deepEqual(d.last,[1672.4,0,-2.5]);assert.equal(d.artOffsetY,-.82);
    assert.equal(d.batches,24,'5 covered + 3 open nodes per LOD; no extra GLB batches');
    for(const lod of [0,1,2])assert.ok(d.lodDistribution[lod]>0);
    const byX=new Map(M01_TRAIN_WAGON_PLAN.map(w=>[w.x.toFixed(4),w])),seen=new Set(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    for(const batch of f.train.batches.filter(b=>b.name.endsWith('_body'))){
      const type=batch.name.split('_')[1],lod=batch.userData.lod;
      for(const m of instanceMatrices(batch)){
        m.decompose(p,q,s);const w=byX.get(p.x.toFixed(4));assert.ok(w,`plan x ${p.x}`);assert.equal(w.type,type);assert.equal(f.train.lods.get(w.id),lod);
        assert.ok(Math.abs(p.y-M01_TRAIN_ART_OFFSET_Y)<1e-6&&Math.abs(p.z+2.5)<1e-6);seen.add(w.id);   // float32 instance buffer
        const node=real[`${type}:${lod}`].scene.getObjectByName('body');node.updateWorldMatrix(true,false);
        const art=m01WagonArtMatrix(w).multiply(node.matrixWorld).elements;assert.ok(m.elements.every((e,k)=>Math.abs(e-art[k])<(k===12?3e-4:1e-6)),'instance = wagon art matrix × GLB node (float32 x≈1.6 km)');
        const yaw=new THREE.Euler().setFromQuaternion(q,'YXZ').y;assert.ok(Math.abs(Math.abs(yaw)-Math.PI/2)<1e-6);
        assert.ok(Math.abs(s.x-1)+Math.abs(s.y-1)+Math.abs(s.z-1)<1e-9,'no scale');
      }
      assert.ok(batch.geometry===real[`${type}:${lod}`].scene.getObjectByName('body').geometry,'shared GLB geometry');
      assert.ok(batch.material===real[`${type}:${lod}`].scene.getObjectByName('body').material,'shared GLB material');
    }
    assert.equal(seen.size,65);
  }finally{f.close();}
});

test('wheel/rail fit: tread on the rail head within 1 cm, flanges inside the gauge, no lateral offset (all types and LODs)',async()=>{
  const sources=await realSources(),{railTop,railCentre,headWidth,z}=M01_TRAIN_TRACK,report=[];
  assert.equal(railTop,M01_TRAIN_ART_OFFSET_Y);assert.ok(Math.abs(2*railCentre-headWidth-1.435)<1e-9,'standard gauge between rail-head inner faces');
  // East track geometry used by the environment: terrain -1, rail box centre +.12, height .12 => rail top -.82.
  assert.ok(Math.abs(new TczewWorld().terrainHeightAt(1300,-2.5)+.12+.06-railTop)<1e-9);
  for(const [key,source] of Object.entries(sources)){
    source.scene.updateMatrixWorld(true);
    for(const wagon of [M01_TRAIN_WAGON_PLAN[0],M01_TRAIN_WAGON_PLAN[1],M01_TRAIN_WAGON_PLAN[3]]){
      if(wagon.type!==key.split(':')[0])continue;const art=m01WagonArtMatrix(wagon);
      for(const name of ['wheelset_1','wheelset_2']){
        const node=source.scene.getObjectByName(name),world=new THREE.Matrix4().multiplyMatrices(art,node.matrixWorld),pos=node.geometry.attributes.position,v=new THREE.Vector3();
        const centre=new THREE.Vector3().setFromMatrixPosition(world),rings=new Map();let minY=Infinity;
        assert.ok(Math.abs(centre.z-z)<1e-9,'wheelset centred on the track');
        for(let i=0;i<pos.count;i++){
          v.fromBufferAttribute(pos,i).applyMatrix4(world);minY=Math.min(minY,v.y);
          const across=+Math.abs(v.z-z).toFixed(4);if(across<.5)continue;rings.set(across,Math.min(rings.get(across)??Infinity,v.y));
        }
        // Lowest generator line of the conical tread, sampled at the rail-head centre.
        const xs=[...rings.keys()].sort((a,b)=>a-b),hi=xs.find(x=>x>=railCentre)??xs.at(-1),lo=[...xs].reverse().find(x=>x<=railCentre)??xs[0];
        const contact=hi===lo?rings.get(lo):rings.get(lo)+(rings.get(hi)-rings.get(lo))*(railCentre-lo)/(hi-lo);
        const flange=xs.filter(x=>rings.get(x)<railTop-.02);
        report.push({key,wagon:wagon.id,name,contact:+(contact-railTop).toFixed(4),minY:+(minY-railTop).toFixed(4)});
        // LOD0 wheels are 16-sided and touch within 1 cm. LOD1/2 are 8-sided with a flat bottom edge (22.5° vertices), so
        // the tread clears the head by ≤3.5 cm: under 0.6 px at the nearest LOD1 distance (31 m on Low, 1 px ≈ 6 cm).
        const tolerance=key.endsWith(':0')?.01:.035;
        assert.ok(contact>=railTop-.01&&contact-railTop<=tolerance,`${key} ${name}: tread ${contact} vs rail ${railTop}`);
        assert.ok(minY>=railTop-.04,`${key} ${name}: not buried (${minY})`);
        for(const x of flange)assert.ok(x<=railCentre-headWidth/2,`${key}: flange ${x} inside the gauge`);
        if(key.endsWith(':0'))assert.ok(flange.length>0,'LOD0 keeps its flange below the rail top');
      }
    }
  }
  assert.ok(report.length>=12);
});

test('details follow LOD/quality tiers, use a fixed number of instanced batches and stay within the draw-call budget',async()=>{
  const f=fixture(new Assets(await realSources()));
  try{
    await f.train.load();
    for(const quality of ['high','medium','low'])for(const x of [1090,1300,1700,2500]){
      f.train.update({x,z:-2.5},quality);const d=f.train.diagnostics,t=d.detail,lod=d.lodDistribution;
      assert.equal(t.quality,quality);assert.equal(t.wagons,65);assert.equal(t.gaps,64);assert.equal(t.collidersAdded,0);
      if(quality==='low')assert.deepEqual(t.instancesByTier,{near:0,mid:lod[0],far:lod[1]+lod[2]});
      else assert.deepEqual(t.instancesByTier,{near:lod[0],mid:lod[1],far:lod[2]});
      assert.equal(t.instances.nearFrame,t.instancesByTier.near);assert.equal(t.instances.shade,65);
      assert.equal(t.instances.nearGap+t.instances.midGap+t.instances.farGap,64);
      assert.ok(t.drawCalls<=M01_TRAIN_DETAIL_BUDGET.drawCalls,`${quality}@${x}: ${t.drawCalls}`);
      assert.equal(f.train.detail.group.children.length,11,'8 tier batches + ballast, rails, sleepers; never per wagon');
    }
  }finally{f.close();}
});

test('fallback: total and partial GLB failure keep the old proxies and never float details on them',async()=>{
  const total=fixture(new Assets({},()=>true));
  try{
    await total.train.load();total.train.update({x:1090,z:-2.5},'high');const d=total.train.diagnostics;
    assert.equal(d.proxies,65);assert.equal(d.batches,0);assert.deepEqual(d.detail.instancesByTier,{near:0,mid:0,far:0});
    assert.equal(d.detail.instances.shade,0);assert.equal(d.detail.drawCalls,3,'only the static siding');
    const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    total.train.proxyBody.getMatrixAt(0,m);m.decompose(p,q,s);assert.deepEqual([p.x,p.y,p.z].map(v=>+v.toFixed(6)),[1090,2,-2.5]);assert.deepEqual([s.x,s.y,s.z].map(v=>+v.toFixed(6)),[7.86,3.2,2.8]);
  }finally{total.close();}
  const sources=await realSources(),partial=fixture(new Assets(sources,path=>path.includes('_open_')));
  try{
    await partial.train.load();partial.train.update({x:1090,z:-2.5},'high');const d=partial.train.diagnostics;
    assert.equal(d.proxies,16);const t=d.detail;assert.equal(t.instances.shade,49);
    const pairs=M01_TRAIN_WAGON_PLAN.slice(1).filter((w,i)=>w.type==='covered'&&M01_TRAIN_WAGON_PLAN[i].type==='covered').length;
    assert.equal(t.instances.nearGap+t.instances.midGap+t.instances.farGap,pairs);
  }finally{partial.close();}
});

test('train consist never asks for damage art and the yard intact/burned authority is unchanged',async()=>{
  const assets=new Assets(await realSources()),f=fixture(assets);
  try{
    await f.train.load();f.train.update({x:1090,z:-2.5},'high');
    assert.equal(assets.calls.length,6);assert.ok(assets.calls.every(p=>p.startsWith('assets/models/provisional/m01-wagons/')&&!/burn|damage/.test(p)));
    const [a,b,c]=M01_YARD_WAGON_PLAN;
    assert.equal(yardWagonState(c,[]),'intact');assert.equal(yardWagonState(c,['station_wagon_fire']),'burned');
    assert.equal(yardWagonState(a,['station_wagon_fire']),'intact');assert.equal(yardWagonState(b,['station_wagon_fire']),'intact');
  }finally{f.close();}
});

test('save/reload, pause frames and repeated updates never mutate simulation state or RNG; detail state follows only player/quality',async()=>{
  const sources=await realSources(),sim=new M01Simulation(19390901);sim.tick(.05,{skip:true});sim.consume('evt_m01_train963_arrives');
  const saved=sim.snapshot(),rng=sim.rng.state,f=fixture(new Assets(sources)),g=fixture(new Assets(sources));
  try{
    await f.train.load();
    for(let i=0;i<30;i++){f.train.update(sim.player,['low','medium','high'][i%3]);assert.deepEqual(sim.snapshot(),saved);}
    assert.equal(sim.rng.state,rng);
    const other=new M01Simulation();other.restoreSnapshot(saved);await g.train.load();
    f.train.update(sim.player,'high');g.train.update(other.player,'high');
    assert.deepEqual(g.train.diagnostics,f.train.diagnostics);assert.deepEqual(other.snapshot(),saved);
    // Same matrices for every detail batch after an independent restore.
    for(const [key,mesh] of Object.entries(f.train.detail.meshes))assert.deepEqual(Array.from(g.train.detail.meshes[key].instanceMatrix.array.slice(0,mesh.count*16)),Array.from(mesh.instanceMatrix.array.slice(0,mesh.count*16)),key);
  }finally{f.close();g.close();}
  const source=readFileSync(new URL('../src/render/m01-train-consist-detail.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/Math\.random|\.rng\b|src\/game|src\/world|from '\.\.\/game|from '\.\.\/world/);
  for(const w of M01_TRAIN_WAGON_PLAN)assert.deepEqual(m01WagonVariation(w.id),m01WagonVariation(w.id));
});

test('variation is deterministic, bounded and visibly non-uniform without touching wagon type',()=>{
  const v=M01_TRAIN_WAGON_PLAN.map(w=>m01WagonVariation(w.id)),tones=new Set(v.map(x=>x.tone));
  assert.ok(tones.size>=4);assert.ok(v.some(x=>x.flip)&&v.some(x=>!x.flip));assert.ok(v.some(x=>x.patches>0)&&v.some(x=>x.label));
  for(const x of v)for(const c of x.tint)assert.ok(c>=.6&&c<=1.3,`${x.id} tint ${c}`);
  let repeats=0;for(let i=1;i<v.length;i++)if(v[i].tone===v[i-1].tone&&v[i].flip===v[i-1].flip)repeats++;assert.ok(repeats<16,`${repeats} adjacent repeats`);
  const gaps=Array.from({length:64},(_,i)=>m01GapVariation(i).engaged);assert.ok(gaps.includes('west')&&gaps.includes('east'));
  assert.deepEqual(m01WagonVariation('train963_wagon_01'),{id:'train963_wagon_01',flip:true,tone:'warm',tint:[1.165,.9794,.866],wear:.4441,patches:0,label:true});
  // Wear stays on the side walls/solebars inside the wagon outline.
  for(const w of M01_TRAIN_WAGON_PLAN)for(const item of m01WagonWear(w)){
    const [x,y,z]=item.at;assert.ok(Math.abs(x)>=1.0&&Math.abs(x)<=1.47&&Math.abs(z)<3.9&&y>.85&&y<2.95,`${w.id} ${item.kind}`);
  }
});

test('couplings and underframe add no collider: world obstacles/walk surfaces are identical and nothing reads the world',async()=>{
  const world=new TczewWorld(),before=JSON.stringify({o:world.obstacles,w:world.walkSurfaces,c:world.covers,h:[1090,1121.85,1300].map(x=>world.heightAt(x,-2.5))});
  const f=fixture(new Assets(await realSources()));
  try{
    await f.train.load();for(const x of [1090,1121.85,1400])f.train.update({x,z:-2.5},'high');
    assert.equal(JSON.stringify({o:world.obstacles,w:world.walkSurfaces,c:world.covers,h:[1090,1121.85,1300].map(x=>world.heightAt(x,-2.5))}),before);
    assert.equal(f.train.diagnostics.detail.collidersAdded,0);
    f.train.group.traverse(o=>assert.ok(!o.userData.collider&&!/collider/i.test(o.name),o.name));
  }finally{f.close();}
});

test('dispose/recreate and repeated rebuilds never duplicate meshes or free shared art',async()=>{
  const sources=await realSources(),f=fixture(new Assets(sources));let released=0,owned=0;
  const shared=[f.box,sources['covered:0'].scene.getObjectByName('body').geometry];for(const g of shared)g.addEventListener('dispose',()=>released++);
  await f.train.load();f.train.update({x:1090,z:-2.5},'high');const first=meshes(f.parent),detailMeshes=Object.values(f.train.detail.meshes);
  for(let i=0;i<12;i++){f.train.update({x:1090+i*60,z:-2.5},['high','low','medium'][i%3]);f.train.rebuild();}
  f.train.update({x:1090,z:-2.5},'high');assert.equal(meshes(f.parent),first);assert.deepEqual(Object.values(f.train.detail.meshes),detailMeshes);
  for(const g of Object.values(f.train.detail.geometries))g.addEventListener('dispose',()=>owned++);
  f.train.dispose();assert.equal(f.parent.children.length,0);assert.equal(owned,10);assert.equal(released,0,'shared box and GLB geometry stay owned by their caches');
  f.train.rebuild();assert.equal(f.parent.children.length,0,'disposed renderer stays detached');
  const g=fixture(new Assets(sources));try{await g.train.load();g.train.update({x:1090,z:-2.5},'high');assert.equal(meshes(g.parent),first);assert.equal(g.parent.children.length,1);}finally{g.close();f.close();}
});

test('only the train renderer changed: gameplay, world, missions, assets and other presentation files equal the approved base',()=>{
  const allowed=new Set(['src/render/m01-train-wagons.js']);
  const paths=execFileSync('git',['ls-tree','-r','--name-only',BASE],{encoding:'utf8'}).trim().split('\n').filter(p=>/^(src|missions|assets)\//.test(p)&&!allowed.has(p));
  assert.ok(paths.some(p=>p==='src/render/m01-atmosphere.js')&&paths.some(p=>p==='src/render/m01-view.js')&&paths.some(p=>p.startsWith('src/game/')));
  for(const p of paths)assert.deepEqual(readFileSync(new URL('../'+p,import.meta.url)),execFileSync('git',['show',`${BASE}:${p}`],{maxBuffer:64*1024*1024}),p);
});
