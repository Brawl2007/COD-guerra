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

test('visible hit and unloaded/off-camera hit reach the same logical world',()=>{
  let visible=demoWorld(),unloaded=demoWorld();
  const oldView=materialize(visible,'m01_house_04','HIGH');
  assert.equal(oldView.authoritative.parts.wall_east.structuralState,'intact');
  visible=applyEvent(visible,houseHit()).world;unloaded=applyEvent(unloaded,houseHit()).world;
  assert.equal(saveWorld(visible),saveWorld(unloaded));
  assert.deepEqual(materialize(visible,'m01_house_04'),materialize(unloaded,'m01_house_04'));
});

test('LOW/MEDIUM/HIGH vary only presentation while gameplay and save stay identical',()=>{
  const states=[],views=[];
  for(const q of ['LOW','MEDIUM','HIGH']){
    const w=hit(),before=saveWorld(w),view=materialize(w,'m01_house_04',q);
    assert.equal(saveWorld(w),before);states.push(before);views.push(view);
  }
  assert.ok(states.every(s=>s===states[0]));
  assert.deepEqual(views[0].authoritative,views[1].authoritative);
  assert.deepEqual(views[1].authoritative,views[2].authoritative);
  assert.deepEqual(views.map(v=>v.presentation.temporaryFragmentBudget),[4,12,24]);
  assert.deepEqual(views.map(v=>v.presentation.smokeDensity),[1,2,3]);
});

test('approaching ten minutes later loads damage directly without creating an event',()=>{
  let w=hit();
  // Authoritative time advances through an unrelated event, not through view loading.
  w=applyEvent(w,event('later_truck_disabled',610,[{type:'vehicle',targetId:'m01_vehicle_truck_02',mobility:'disabled',crew:'present'}])).world;
  const restored=restoreWorld(saveWorld(w)),before=saveWorld(restored),view=materialize(restored,'m01_house_04','HIGH');
  assert.equal(view.presentation.variants.wall_east,'destroyed');assert.equal(view.presentation.variants.roof,'partial_collapse');
  assert.equal(view.authoritative.fire.ignitedAt,10);assert.equal(restored.events.length,2);
  assert.equal(saveWorld(restored),before);assert.equal('blast' in view,false);
});

test('unload/reload cycles cannot resurrect wall, crater, rubble or fire',()=>{
  const w=hit(),before=saveWorld(w);let a=materialize(w,'m01_house_04');
  for(let i=0;i<20;i++){
    a=null;a=materialize(w,'m01_house_04',i%2?'HIGH':'LOW');
    assert.equal(a.authoritative.parts.wall_east.collisionState,'none');
    assert.equal(a.authoritative.debris[0].coverState,'low');assert.equal(a.authoritative.craters[0].affectsMovement,true);
    assert.equal(a.presentation.fireEmitter,true);
  }
  assert.equal(saveWorld(w),before);
});

test('materialization returns detached data and cannot change simulation through a view',()=>{
  const w=hit(),before=saveWorld(w),v=materialize(w,'m01_house_04');
  v.authoritative.parts.wall_east.structuralState='intact';v.authoritative.craters.length=0;
  v.authoritative.fire.state='extinguished';v.presentation.variants.wall_east='intact';
  assert.equal(saveWorld(w),before);assert.equal(materialize(w,'m01_house_04').presentation.variants.wall_east,'destroyed');
});

test('composed building parts retain intact door independently of walls and roof',()=>{
  const parts=materialize(hit(),'m01_house_04').authoritative.parts;
  assert.equal(parts.wall_east.structuralState,'destroyed');assert.equal(parts.roof.structuralState,'partial_collapse');
  assert.equal(parts.window_01.structuralState,'destroyed');assert.equal(parts.window_02.structuralState,'destroyed');
  assert.equal(parts.door_front.structuralState,'intact');assert.equal(parts.door_front.collisionState,'solid');
});

test('wall collapse removes old cover and creates persistent rubble cover atomically',()=>{
  const before=demoWorld();assert.equal(before.objects.m01_house_04.parts.wall_east.coverState,'full');
  const w=applyEvent(before,houseHit()).world,view=materialize(w,'m01_house_04').authoritative;
  assert.equal(view.parts.wall_east.coverState,'none');assert.equal(view.parts.wall_east.traversalState,'open');
  assert.equal(view.debris.length,1);assert.equal(view.debris[0].coverState,'low');assert.equal(view.debris[0].traversalState,'restricted');
  assert.deepEqual(materialize(restoreWorld(saveWorld(w)),'m01_house_04').authoritative,view);
});

test('wreck blocks a road and retains cover/fire after restore without VehicleController',()=>{
  const w=applyEvent(demoWorld(),wreckEvent()).world,r=restoreWorld(saveWorld(w));
  const view=materialize(r,'m01_vehicle_truck_02','LOW');
  assert.equal(view.authoritative.vehicle.mobility,'wreck');assert.equal(view.authoritative.vehicle.crew,'abandoned');
  assert.equal(view.authoritative.parts.hull.collisionState,'solid');assert.equal(view.authoritative.parts.hull.coverState,'full');
  assert.equal(view.authoritative.parts.hull.traversalState,'blocked');assert.equal(view.authoritative.fire.damageClass,'none');
  assert.equal(view.presentation.fireEmitter,true);
});

test('extinguishing changes fire and smoke but preserves structural destruction and ignition source',()=>{
  const w=applyEvent(hit(),event('house_fire_extinguished',620,[{type:'extinguish',targetId:'m01_house_04'}])).world;
  const r=restoreWorld(saveWorld(w)),view=materialize(r,'m01_house_04','HIGH');
  assert.equal(view.authoritative.fire.state,'extinguished');assert.equal(view.authoritative.fire.ignitedAt,10);
  assert.equal(view.authoritative.fire.extinguishedAt,620);assert.equal(view.authoritative.fire.sourceEventId,houseHit().id);
  assert.equal(view.presentation.fireEmitter,false);assert.equal(view.presentation.smokeDensity,0);
  assert.equal(view.presentation.variants.wall_east,'destroyed');
});
