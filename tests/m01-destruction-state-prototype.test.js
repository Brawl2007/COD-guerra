import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld,demoWorld,houseHit,wreckEvent,applyEvent,saveWorld,restoreWorld,
  materialize,canonicalJSON,LIMITS } from '../tools/verification/m01-destruction-state-prototype.mjs';

const clone=v=>JSON.parse(JSON.stringify(v));
const hit=()=>applyEvent(demoWorld(),houseHit()).world;
const event=(id,at,operations)=>({id:`m01_${id}`,missionId:'m01',at,operations});

test('destroy/save/restore preserves canonical bytes and composed results',()=>{
  const w=hit(),text=saveWorld(w),r=restoreWorld(text);
  assert.equal(saveWorld(r),text);
  assert.equal(r.objects.m01_house_04.parts.wall_east.structuralState,'destroyed');
  assert.equal(r.objects.m01_house_04.parts.roof.structuralState,'partial_collapse');
  assert.equal(r.objects.m01_house_04.parts.door_front.structuralState,'intact');
  assert.equal(r.objects.m01_house_04.fire.state,'active');
  assert.equal(Object.keys(r.craters).length,1);assert.equal(Object.keys(r.debris).length,1);
});

test('double restore is byte identical and duplicate historical event emits nothing',()=>{
  const a=applyEvent(hit(),wreckEvent()).world,b=saveWorld(a),c=saveWorld(restoreWorld(b));
  assert.equal(b,c);const d=restoreWorld(c),again=applyEvent(d,houseHit());
  assert.equal(again.applied,false);assert.equal(again.world,d);assert.equal(saveWorld(again.world),b);
});

test('same consumed ID with altered result is rejected after restore',()=>{
  const w=restoreWorld(saveWorld(hit())),before=saveWorld(w),e=houseHit();
  e.operations[0].coverState='full';
  assert.throws(()=>applyEvent(w,e),/conflicting duplicate/);assert.equal(saveWorld(w),before);
});

test('restore rejects altered state, missing crater, changed event and duplicate receipt',()=>{
  const raw=JSON.parse(saveWorld(hit()));
  for(const mutate of [s=>s.objects.m01_house_04.parts.wall_east.structuralState='intact',
    s=>s.craters={},s=>s.events[0].operations[0].traversalState='blocked',
    s=>s.events.push(clone(s.events[0]))]){
    const bad=clone(raw);mutate(bad);assert.throws(()=>restoreWorld(JSON.stringify(bad)));
  }
  assert.equal(saveWorld(restoreWorld(JSON.stringify(raw))),canonicalJSON(raw));
});

test('restore rejects unknown format, foreign mission, non-finite and unsafe object data',()=>{
  const raw=JSON.parse(saveWorld(hit()));
  const version=clone(raw);version.format='destruction-prototype/v2';assert.throws(()=>restoreWorld(JSON.stringify(version)),/unsupported/);
  const foreign=clone(raw);foreign.events[0].missionId='m02';assert.throws(()=>restoreWorld(JSON.stringify(foreign)),/foreign/);
  assert.throws(()=>restoreWorld(saveWorld(hit()).replace('"clock":10','"clock":1e999')),/non-finite/);
  const unsafe=saveWorld(hit()).replace('"clock":10','"__proto__":{},"clock":10');assert.throws(()=>restoreWorld(unsafe),/forbidden/);
  assert.throws(()=>restoreWorld('x'.repeat(LIMITS.bytes+1)),/size/);
});

test('restore accepts JSON key order changes and reconstructs an immutable store',()=>{
  const w=hit(),raw=JSON.parse(saveWorld(w)),reordered=Object.fromEntries(Object.entries(raw).reverse());
  const r=restoreWorld(JSON.stringify(reordered));assert.equal(saveWorld(r),saveWorld(w));
  assert.throws(()=>r.objects.m01_house_04.parts.wall_east.structuralState='intact',TypeError);
});

test('a bad last operation rolls back all prior operations and event receipt',()=>{
  const w=demoWorld(),before=saveWorld(w),e=houseHit();
  e.operations.push({type:'part',targetId:'m01_house_04',partId:'missing',structuralState:'destroyed',collisionState:'none',coverState:'none',traversalState:'open'});
  assert.throws(()=>applyEvent(w,e),/unknown part/);assert.equal(saveWorld(w),before);
  assert.equal(w.events.length,0);assert.equal(Object.keys(w.craters).length,0);
});

test('reserved part names cannot resolve inherited JavaScript properties',()=>{
  const w=demoWorld(),e=houseHit();e.operations[0].partId='constructor';
  assert.throws(()=>applyEvent(w,e),/stable ID/);
  const config={missionId:'m01',seed:1,catalogVersion:'v1',catalog:clone(w.catalog)};
  config.catalog[0].parts[0].id='constructor';assert.throws(()=>createWorld(config),/stable ID/);
});
