import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {M01StationArchitecture} from '../../src/render/m01-station-architecture.js';
import {route} from '../../tests/helpers/m01-route.js';

const base='cbc7de5668a1b2e4bc646b86548196a5f4f1039a';
const out=path.resolve(process.env.M01_V7_EVIDENCE??'docs/verification/m01-runtime/final-approved-deliveries-integration-v7');
assert.ok(process.env.M01_V6_CHECKOUT,'Set M01_V6_CHECKOUT to the protected detached V6 checkout');
const {M01Simulation:Baseline}=await import(pathToFileURL(path.join(process.env.M01_V6_CHECKOUT,'src/game/m01-simulation.js')));
const {M01StationArchitecture:StationBaseline}=await import(pathToFileURL(path.join(process.env.M01_V6_CHECKOUT,'src/render/m01-station-architecture.js')));
const hash=x=>createHash('sha256').update(x).digest('hex');
const allowed=new Set(['src/render/m01-station-architecture.js','src/render/first-person-weapon-fx.js','src/render/m01-view.js','src/render/m01-viewmodel.js','src/render/m01-wz29-presentation.js','src/render/three-renderer.js','src/render/m01-damage-decals.js']);
const git=(...args)=>execFileSync('git',args,{maxBuffer:30*1024*1024});
const files=git('ls-tree','-r','--name-only',base).toString().trim().split('\n').filter(p=>/^(src\/|assets\/|missions\/|research\/|tools\/assets\/)/.test(p)||['package.json','package-lock.json','playwright.config.js'].includes(p));
const protectedFiles=[];
for(const p of files){
  if(allowed.has(p))continue;
  const a=git('show',`${base}:${p}`),b=fs.readFileSync(p);assert.deepEqual(b,a,p);
  protectedFiles.push({path:p,bytes:b.length,sha256:hash(b)});
}
const changes=git('diff','--name-only',base,'--','src').toString().trim().split('\n').filter(Boolean);
assert.ok(changes.every(p=>allowed.has(p)),'No authoritative or unrelated renderer changes');
const routes=[];
for(const [seed,support]of [[19390901,false],[7,true]]){
  const a=route(seed,{support,Simulation:Baseline}),b=route(seed,{support});
  for(const field of ['checkpoints','events','outro'])assert.deepEqual(b[field],a[field],`${seed}/${field}`);
  assert.deepEqual(b.sim.snapshot(),a.sim.snapshot(),`${seed}/final snapshot`);
  assert.equal(Object.keys(b.sim.objectives).length,12);
  // The protected V6 defines 26 event IDs, including the prelude-start event.
  // Preserve the actual baseline; do not remove an event to match the task's shorthand count of 25.
  assert.deepEqual(b.sim.definition.events,a.sim.definition.events);assert.equal(b.sim.definition.events.length,26);
  const futures=[];
  for(const [id,snapshot]of Object.entries(b.checkpoints)){
    const x=new Baseline(seed),y=new M01Simulation(seed);x.restoreSnapshot(a.checkpoints[id]);y.restoreSnapshot(snapshot);
    for(let tick=0;tick<300;tick++){x.tick(.05,{});y.tick(.05,{});assert.deepEqual(y.drainEvents(),x.drainEvents());assert.deepEqual(y.snapshot(),x.snapshot(),`${seed}/${id}/${tick}`);}
    futures.push({id,schema:snapshot.schema,ticks:300,sha256:hash(JSON.stringify(y.snapshot()))});
  }
  routes.push({seed,support,objectives:b.sim.objectives,configuredEvents:b.sim.definition.events.length,consumedIds:Object.keys(b.sim.consumed),schema:b.sim.snapshot().schema,rng:b.sim.rng.state,snapshotSha256:hash(JSON.stringify(b.sim.snapshot())),eventsSha256:hash(JSON.stringify(b.events)),checkpoints:futures,equivalent:true});
}
function resource(Station,world){
  const parent=new THREE.Scene(),s=new Station(parent,world);
  const fingerprint=()=>hash(Buffer.concat([...s.maps.map(m=>Buffer.from(m.image.data)),...s.levels.flatMap(l=>Object.values(l.geometries).flatMap(g=>Object.values(g.attributes).map(a=>Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength))))]));
  const before=fingerprint(),qualities=[];
  for(const q of ['low','medium','high','low']){
    s.sync({x:-397,z:17},q);
    const d={...s.diagnostics};
    assert.equal(d.quality,q,'Pass player and quality in the production API order');
    assert.equal(d.lod,{low:2,medium:1,high:0}[q],'Near Station uses the requested quality LOD');
    assert.equal(d.triangles,d.trianglesByLod[d.lod]);
    qualities.push(d);assert.equal(fingerprint(),before);
  }
  const diag={...s.diagnostics},textureBytes=s.maps.reduce((n,m)=>n+m.image.data.byteLength,0),geometryBytes=s.levels.reduce((n,l)=>n+Object.values(l.geometries).reduce((r,g)=>r+Object.values(g.attributes).reduce((x,a)=>x+a.array.byteLength,0),0),0);
  s.dispose();s.dispose();assert.equal(parent.children.length,0);
  return {diag,textureBytes,geometryBytes,fingerprint:before,qualities};
}
const v6=resource(StationBaseline,new Baseline().world),v7=resource(M01StationArchitecture,new M01Simulation().world);
assert.deepEqual(v7.diag.anchor,v6.diag.anchor);assert.deepEqual(v7.diag.envelope,v6.diag.envelope);
assert.equal(v7.diag.volumes,5);assert.equal(v7.diag.openings,140);assert.equal(v7.diag.drawCalls,7);assert.equal(v7.diag.geometries,21);assert.equal(v7.diag.textures,10);assert.equal(v7.diag.collidersAdded,0);
assert.equal(resource(M01StationArchitecture,new M01Simulation().world).fingerprint,v7.fingerprint,'recreate is deterministic');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'INVARIANTS.json'),JSON.stringify({status:'PASS',base,testedHead:git('rev-parse','HEAD').toString().trim(),allowedRendererChanges:changes,protectedFiles,routes,station:{v6,v7},fpsMeasured:false},null,2)+'\n');
console.log(`PASS: ${protectedFiles.length} immutable files, two complete routes, CP-A..D futures, Station anchors and deterministic resources`);
