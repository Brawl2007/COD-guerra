import test from 'node:test';
import assert from 'node:assert/strict';
import {buildYardWagonFitReport,inspectGlb,analyseYard,INTACT_FILES,DAMAGE_FILES} from '../tools/verify-m01-yard-wagon-fit.mjs';

const near=(a,b,eps=1e-5)=>Math.abs(a-b)<=eps;

test('real intact/damage GLBs keep rail-top root and wheel pivots without scale compensation',()=>{
  const report=buildYardWagonFitReport();
  assert.equal(report.verificationOk,true,report.errors.join('\n'));
  assert.equal(report.assets.length,18);
  assert.deepEqual(report.contract.scale,[1,1,1]);
  assert.match(report.contract.pivot,/topo do carril/i);
  for(const asset of report.assets){
    assert.deepEqual(asset.rootTranslation,[0,0,0],asset.file);
    assert.deepEqual(asset.wheelsets.map(w=>w.translation),[[0,.5,-2],[0,.5,2]],asset.file);
  }
  assert.equal(INTACT_FILES.length,6);
  assert.equal(DAMAGE_FILES.length,12);
});

test('LOD0 measurements come from the real GLBs and retain the expected wheel support geometry',()=>{
  const covered=inspectGlb('assets/models/provisional/m01-wagons/m01_wagon_covered_lod0.glb');
  const open=inspectGlb('assets/models/provisional/m01-wagons/m01_wagon_open_lod0.glb');
  assert.ok(near(covered.size[2],9.1));assert.ok(near(open.size[2],9.1));
  assert.ok(near(covered.size[0],3.18));assert.ok(near(open.size[0],3.0));
  assert.ok(near(covered.bounds.max[1],3.85));assert.ok(near(open.bounds.max[1],2.84));
  for(const wagon of [covered,open])for(const wheel of wagon.wheelsets){
    assert.ok(near(wheel.geometricBottomY,-.035),`${wagon.file}: wheel bottom ${wheel.geometricBottomY}`);
    assert.ok(near(wheel.geometricTopY,1.035),`${wagon.file}: wheel top ${wheel.geometricTopY}`);
  }
});

test('damage variants retain the same root/wheel contract while visual damage may extend the bbox',()=>{
  const covered=inspectGlb('assets/models/provisional/m01-wagon-damage/m01_wagon_covered_damaged_lod0.glb');
  const open=inspectGlb('assets/models/provisional/m01-wagon-damage/m01_wagon_open_damaged_lod0.glb');
  assert.ok(near(covered.size[2],9.1));assert.ok(near(open.size[2],9.1));
  assert.ok(covered.bounds.max[0]>1.9,'covered damaged door/debris should remain visual bbox only');
  assert.ok(open.bounds.max[0]>1.9,'open damaged planks/debris should remain visual bbox only');
  assert.deepEqual(covered.wheelsets.map(w=>w.translation),[[0,.5,-2],[0,.5,2]]);
  assert.deepEqual(open.wheelsets.map(w=>w.translation),[[0,.5,-2],[0,.5,2]]);
});

test('map geometry fixes yard yaw at zero: cover nodes sit on +X broadside and along local +Z',()=>{
  const yard=analyseYard();
  assert.equal(yard.orientationEvidence.yawRad,0);
  assert.equal(yard.orientationEvidence.yawDeg,0);
  assert.deepEqual(yard.orientationEvidence.pairedCoverDeltas,[[2,0,3],[2,0,3]]);
  assert.deepEqual(yard.orientationEvidence.pairedCoverNormals,[[1,0,0],[1,0,0]]);
  assert.deepEqual(yard.points.map(p=>p.proposedTransform),[
    {position:[-320,0,-6],rotationY:0,scale:[1,1,1]},
    {position:[-340,0,8],rotationY:0,scale:[1,1,1]},
    {position:[-352,0,8],rotationY:0,scale:[1,1,1]},
  ]);
  assert.equal(yard.points[2].cover,null);
});

test('current VEHICLE cover semantics remain non-solid and no collision is inferred from GLB damage',()=>{
  const yard=analyseYard();
  assert.equal(yard.collision.vehicleCoverNodesPresent,true);
  assert.equal(yard.collision.vehicleCoverNodesAreSolid,false);
  assert.equal(yard.collision.vehicleCoverNodesAreObstacles,false);
});

test('authored y=0 is vertically incompatible with the current terrain/support and blocks integration',()=>{
  const report=buildYardWagonFitReport();
  const p=report.yard.points;
  assert.equal(report.integrationReady,false);
  assert.ok(p[0].terrainSpreadM>1.1);
  assert.ok(p[0].maxSupportGapM>1.1);
  assert.equal(p[1].centerTerrainY,-3);
  assert.equal(p[1].terrainSpreadM,0);
  assert.equal(p[1].maxSupportGapM,3);
  assert.equal(p[2].centerTerrainY,-3);
  assert.equal(p[2].terrainSpreadM,0);
  assert.equal(p[2].maxSupportGapM,3);
  assert.deepEqual(report.verticalBlockers.map(x=>x.id),['yard_wagon_1','yard_wagon_2','yard_wagon_3']);
});

test('fit report does not choose wagon type or station_wagon_fire target/state',()=>{
  const report=buildYardWagonFitReport();
  assert.equal(report.yard.points.length,3);
  for(const p of report.yard.points){
    assert.equal(p.assetType,null);
    assert.equal(p.damageState,null);
    assert.ok(p.sourcePoint[0]<0,'yard verifier must not include train 963');
  }
});
