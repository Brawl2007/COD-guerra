import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import {M01Simulation} from '../src/game/m01-simulation.js';
import {M01_PORTAL_DETAIL_LAYOUTS,portalDetailDescriptors,bridgeMaterialSlot} from '../src/render/m01-bridge-portal-polish.js';

const root=new URL('../',import.meta.url),read=path=>fs.readFileSync(new URL(path,root));
const blobSha=buf=>createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const GLBS={
  'assets/models/provisional/m01/portal_lisewo_1912.glb':'84c66b7cd542ad3b608d97a6f5adf86af82b7da9',
  'assets/models/provisional/m01/portal_lisewo_1912.lod1.glb':'7b94f99362aaf8d448fe2bddddce33c0aac56aa2',
  'assets/models/provisional/m01/portal_lisewo_1912.lod2.glb':'bb1f9acbc94ae7e2b6d50b38ac0ee6d72a987005',
  'assets/models/provisional/m01/portal_lisewo_1912.colliders.glb':'c509768900e4a214cec8d48676aa91a4191fb35a',
  'assets/models/provisional/m01/bridge-colliders.json':'df8f3b19df6dbbd379935c13987eefacc015a55c'
};
function glb(path){
  const buf=read(path),len=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+len).toString('utf8'));
  const meshes=json.meshes??[],nodes=json.nodes??[],materials=(json.materials??[]).map(m=>m.name);
  const prims=meshes.flatMap(m=>m.primitives??[]);
  return {buf,json,meshes,nodes,materials,prims,
    triangles:prims.reduce((n,p)=>n+(json.accessors[p.indices]?.count??0)/3,0),
    hasNormals:prims.every(p=>p.attributes.NORMAL!==undefined),
    hasUvs:prims.every(p=>p.attributes.TEXCOORD_0!==undefined),
    textures:(json.textures??[]).length,images:(json.images??[]).length};
}

test('Lisewo portal GLBs and collider authority remain byte-identical to approved production base',()=>{
  for(const [path,sha] of Object.entries(GLBS))assert.equal(blobSha(read(path)),sha,path);
});

test('portal macro placement, LOD budgets and documented uncertainty remain unchanged',()=>{
  const entries=manifest.files.filter(f=>f.file.includes('portal_lisewo_1912')&&typeof f.lod==='number').sort((a,b)=>a.lod-b.lod);
  assert.deepEqual(entries.map(e=>e.placement.translation),[[1049.2,0,20],[1049.2,0,20],[1049.2,0,20]]);
  assert.deepEqual(entries.map(e=>e.intactTriangles),[1996,764,524]);
  assert.deepEqual(entries.map(e=>e.drawCallsIntact),[7,6,6]);
  for(const e of entries){
    const portal=e.nodes.find(n=>n.name==='portal_lisewo_1912');assert.ok(portal);assert.deepEqual(portal.pivot,[0,0,0]);assert.equal(portal.destroyedBy,null);
    assert.ok(e.uncertainAppearance.includes('portal_lisewo_1912'));
  }
});

test('portal binaries keep normals/UVs/material slots without adding texture assets',()=>{
  const audit={};
  for(const file of ['portal_lisewo_1912.glb','portal_lisewo_1912.lod1.glb','portal_lisewo_1912.lod2.glb']){
    const a=glb('assets/models/provisional/m01/'+file);
    assert.equal(a.hasNormals,true);assert.equal(a.hasUvs,true);
    assert.equal(a.textures,0);assert.equal(a.images,0);
    assert.ok(a.materials.includes('brick_red'));assert.ok(a.materials.includes('stone_masonry'));assert.ok(a.materials.includes('gate_timber_iron'));
    audit[file]={meshes:a.meshes.length,materials:a.materials,textures:a.textures,triangles:a.triangles,nodes:a.nodes.length,hasNormals:a.hasNormals,hasUvs:a.hasUvs};
  }
  console.log('M01_PORTAL_ASSET_AUDIT '+JSON.stringify(audit));
});

test('microdetail stays inside approved portal macro envelopes and scales by quality',()=>{
  for(const [name,layout] of Object.entries(M01_PORTAL_DETAIL_LAYOUTS)){
    const d=portalDetailDescriptors(name);assert.ok(d);
    for(const box of [...d.mediumBoxes,...d.highBoxes]){
      const [x,,z]=box.p,[sx,,sz]=box.size;
      assert.ok(x-sx/2>=layout.x-layout.thickness/2-.12&&x+sx/2<=layout.x+layout.thickness/2+.12,name);
      assert.ok(z-sz/2>=-layout.halfWidth-.4&&z+sz/2<=layout.halfWidth+.4,name);
    }
    for(const ring of d.mediumRings){assert.ok(layout.towers.some(t=>Math.abs(t.z-ring.p[2])<1e-9));}
    assert.ok(d.mediumBoxes.length+d.mediumRings.length>0);assert.ok(d.highBoxes.length>0);
  }
});

test('portal material/detail lookup cannot consume gameplay RNG or mutate save/colliders',()=>{
  const sim=new M01Simulation(19390901),rng=sim.rng.state,snapshot=sim.snapshot(false),obstacles=JSON.stringify(sim.world.obstacles);
  for(const name of Object.keys(M01_PORTAL_DETAIL_LAYOUTS))portalDetailDescriptors(name);
  for(const m of ['brick_red','stone_masonry','gate_timber_iron','steel_painted','unknown_legacy_material'])bridgeMaterialSlot(m,true);
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),snapshot);assert.equal(JSON.stringify(sim.world.obstacles),obstacles);
});

test('known bridge materials map predictably while unknown material preserves GLB fallback',()=>{
  assert.equal(bridgeMaterialSlot('brick_red',true),'bridgeBrick');
  assert.equal(bridgeMaterialSlot('stone_masonry',true),'bridgeStone');
  assert.equal(bridgeMaterialSlot('gate_timber_iron',true),'bridgeGate');
  assert.equal(bridgeMaterialSlot('brick_red',false),'brick');
  assert.equal(bridgeMaterialSlot('unknown_legacy_material',true),null);
});
