import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { applyBridgeState } from '../tools/assets/m01-bridges/src/state.mjs';
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url));
const DIR='assets/models/provisional/m01/',layoutText=read('missions/m01-tczew/map-layout.json');
const layout=JSON.parse(layoutText),manifest=JSON.parse(read(`${DIR}bridges.manifest.json`));
const feature=id=>layout.features.find(f=>f.id===id);
const bridges=[{file:'bridge_rail_1891_1912',root:'rail_bridge',prefix:'rail'},{file:'bridge_road_lentze_1857_1912',root:'road_bridge',prefix:'road'}];
const fileFor=(b,lod)=>`${b.file}${lod?`.lod${lod}`:''}.glb`;
const EAST='evt_m01_east_demolition',WEST='evt_m01_west_demolition';
function glb(file){
  const buf=read(DIR+file);assert.equal(buf.readUInt32LE(0),0x46546c67);assert.equal(buf.readUInt32LE(4),2);assert.equal(buf.readUInt32LE(8),buf.length);
  const len=buf.readUInt32LE(12);assert.equal(buf.readUInt32LE(16),0x4e4f534a);
  const json=JSON.parse(buf.subarray(20,20+len).toString('utf8'));assert.equal(buf.readUInt32LE(24+len),0x004e4942);
  const bin=buf.subarray(28+len),byName=new Map(json.nodes.map((n,i)=>[n.name,{...n,index:i}]));
  assert.equal(byName.size,json.nodes.length,`${file}: unique node names`);
  const triangles=mesh=>json.meshes[mesh].primitives.reduce((s,p)=>s+json.accessors[p.indices].count/3,0);
  const vec=(accessor,i)=>{const a=json.accessors[accessor],v=json.bufferViews[a.bufferView];assert.equal(a.componentType,5126);assert.equal(a.type,'VEC3');const off=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12);return [0,4,8].map(d=>bin.readFloatLE(off+d));};
  return {json,byName,triangles,bytes:buf.length,vec};
}
function objectTree(json){
  const make=index=>{const n=json.nodes[index],o={name:n.name,userData:n.extras??{},visible:true,children:(n.children??[]).map(make)};o.traverse=fn=>{fn(o);o.children.forEach(c=>c.traverse(fn));};return o;};
  return make(json.scenes[json.scene??0].nodes[0]);
}
test('M01 GLBs keep nine spans, measured supports and map placement in every LOD',()=>{
  for(const b of bridges)for(const lod of [0,1,2]){
    const {byName,json}=glb(fileFor(b,lod)),f=feature(b.root),root=byName.get(b.root);
    const portal=byName.get(`${b.prefix}_portal_west`),pa=json.meshes[portal.mesh].primitives.map(p=>json.accessors[p.attributes.POSITION]);
    assert.ok(Math.abs(Math.max(...pa.map(a=>a.max[1]))-Math.min(...pa.map(a=>a.min[1]))-feature(`portal_${b.prefix}_west`).heightM)<0.001);
    assert.equal(json.extras.units,'meters');assert.ok(root);assert.deepEqual(root.translation??[0,0,0],f.polyline[0]);assert.equal(root.extras.m01.placement.appliedToRoot,true);assert.deepEqual(root.extras.m01.supportsX,f.supportsX);
    assert.deepEqual(root.scale??[1,1,1],[1,1,1]);
    assert.equal([...byName.keys()].filter(k=>new RegExp(`^${b.prefix}_span_\\d\\d$`).test(k)).length,9);
    for(let i=0;i<10;i++){const n=byName.get(`${b.prefix}_support_${String(i).padStart(2,'0')}`);assert.ok(n);assert.equal((n.translation??[0,0,0])[0],f.supportsX[i]);assert.equal(n.extras.m01.logicalId,n.name);}
    assert.ok(!json.nodes.some(n=>n.extras?.m01?.supportIndex&&f.postwarSupportsX?.includes(n.translation?.[0])));
  }
});
test('M01 all LODs ship event-linked damage replacements with stable logical IDs',()=>{
  for(const b of bridges){let expected;for(const lod of [0,1,2]){
    const {byName}=glb(fileFor(b,lod));const ids=[...byName.values()].filter(n=>n.extras?.m01?.logicalId).map(n=>n.extras.m01.logicalId).sort();if(expected)assert.deepEqual(ids,expected);else expected=ids;
    for(const n of byName.values())if(n.extras?.m01?.destroyedBy){assert.ok([EAST,WEST].includes(n.extras.m01.destroyedBy));assert.ok(n.extras.m01.replacedBy.length>0);for(const name of n.extras.m01.replacedBy){const d=byName.get(name);assert.ok(d?.mesh!==undefined);assert.equal(d.extras.m01.replaces,n.name);assert.equal(d.extras.m01.showAfterEvent,n.extras.m01.destroyedBy);assert.equal(d.extras.m01.initiallyHidden,true);}}
  }}
});
test('M01 demolition IDs survive LOD changes and JSON restoration; colliders stay removed',()=>{
  for(const b of bridges)for(const events of [[],[EAST],[EAST,WEST]]){
    let expected;for(const lod of [0,1,2,0]){
      const root=objectTree(glb(fileFor(b,lod)).json),saved=JSON.parse(JSON.stringify({consumedEventIds:events}));const state=applyBridgeState(root,saved.consumedEventIds);state.hidden.sort();state.destroyed.sort();if(expected)assert.deepEqual(state,expected);else expected=state;
      assert.equal(state.hidden.length,state.destroyed.length);assert.equal(state.hidden.includes(`${b.prefix}_span_06`),events.includes(EAST));assert.equal(state.hidden.includes(`${b.prefix}_span_01`),events.includes(WEST));assert.equal(applyBridgeState(root,[]).destroyed.length,0);assert.deepEqual(saved.consumedEventIds,events);
    }
    const colliders=objectTree(glb(`${b.file}.colliders.glb`).json),state=applyBridgeState(colliders,events);assert.equal(state.activeColliders.includes(`${b.prefix}_collider_deck_span_06`),!events.includes(EAST));assert.equal(state.activeColliders.includes(`${b.prefix}_collider_deck_span_01`),!events.includes(WEST));
  }
});
test('M01 road towers remain separate, measured and damage-linked in all LODs',()=>{
  const f=feature('road_bridge_towers');for(const lod of [0,1,2]){const {json,byName}=glb(fileFor(bridges[1],lod));for(let i=1;i<=5;i++)for(const side of ['n','s']){
    const n=byName.get(`road_tower_${String(i).padStart(2,'0')}_${side}`);assert.ok(n?.mesh!==undefined);assert.equal(n.extras.m01.kind,'tower');const point=f.points[(i-1)*2+(side==='s'?1:0)];assert.equal(n.translation[0],point[0]);assert.equal(n.translation[2]+40,point[2]);const attrs=json.meshes[n.mesh].primitives.map(p=>json.accessors[p.attributes.POSITION]);const height=Math.max(...attrs.map(a=>a.max[1]))-Math.min(...attrs.map(a=>a.min[1]));assert.ok(Math.abs(height-f.heightM)<0.001);assert.equal(n.extras.m01.destroyedBy,i===1?WEST:null);
    if(lod===0){const pair=['n','s'].map(side=>byName.get(`road_tower_${String(i).padStart(2,'0')}_${side}`));const count=pair.reduce((sum,n)=>sum+json.meshes[n.mesh].primitives.reduce((s,p)=>s+json.accessors[p.indices].count/3,0),0);assert.ok(count<=12000);}
  }}
});
test('M01 binary exports contain finite positions and unit normals',()=>{
  for(const entry of manifest.files){const {json,vec}=glb(entry.file.replace(DIR,''));for(const mesh of json.meshes)for(const p of mesh.primitives){const a=json.accessors[p.attributes.POSITION],n=json.accessors[p.attributes.NORMAL];assert.equal(a.count,n.count);assert.ok(a.count>0);for(let i=0;i<a.count;i++){assert.ok(vec(p.attributes.POSITION,i).every(Number.isFinite));const length=Math.hypot(...vec(p.attributes.NORMAL,i));assert.ok(Number.isFinite(length)&&Math.abs(length-1)<0.001,`${entry.file}: invalid normal ${i}`);}}}
});
test('M01 manifest matches binary counts, current map hash and decreasing LOD budgets',()=>{
  assert.equal(manifest.mapLayout.sha256_16,createHash('sha256').update(layoutText).digest('hex').slice(0,16));assert.deepEqual(manifest.lodDistancesM,[0,400,800]);
  for(const entry of manifest.files){const {json,triangles,bytes}=glb(entry.file.replace(DIR,''));assert.equal(bytes,entry.bytes);assert.ok(bytes<6*1024*1024);assert.equal(json.meshes.reduce((s,_,i)=>s+triangles(i),0),entry.uniqueTriangles);assert.equal(json.nodes.filter(n=>n.mesh!==undefined).reduce((s,n)=>s+triangles(n.mesh),0),entry.sceneTriangles);}
  for(const b of bridges){const entries=[0,1,2].map(lod=>manifest.files.find(f=>f.file===DIR+fileFor(b,lod)));assert.ok(entries[0].intactTriangles>entries[1].intactTriangles);assert.ok(entries[1].intactTriangles>entries[2].intactTriangles);for(const entry of entries)for(const n of entry.nodes.filter(n=>new RegExp(`^${b.prefix}_span_\\d\\d$`).test(n.name)))assert.ok(n.triangles<=(b.prefix==='rail'?25000:30000));}
});
test('M01 historical uncertainty and modern geometry conflicts remain explicit',()=>{
  for(const b of bridges)for(const lod of [0,1,2]){const {byName}=glb(fileFor(b,lod));for(const name of ['portal_west','portal_old_east','span_07','span_08','span_09','support_09'])assert.equal(byName.get(`${b.prefix}_${name}`).extras.m01.appearanceCertainty,'UNCERTAIN');assert.equal(byName.get(`${b.prefix}_portal_old_east`).extras.m01.existenceIn1939,'UNCERTAIN');if(b.prefix==='road')assert.ok(byName.get('road_span_06').extras.m01.lengthConflict);}
});
