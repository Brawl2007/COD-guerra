import test from 'node:test';
import * as THREE from 'three';
import {TczewWorld} from '../src/world/tczew-world.js';
import assert from 'node:assert/strict';
import {selectConsumerLod,lodProfile,M01_LOD_PROFILES,M01_VEGETATION_LOD_THRESHOLDS} from '../src/render/m01-lod-policy.js';
import {M01VegetationRuntime,chooseVegetationTier,chooseVegetationLod,chooseShrubLod,M01_VEGETATION_LOD} from '../src/render/m01-vegetation-runtime.js';
import {M01BridgeLOD,M01_BRIDGE_LOD_BANDS} from '../src/render/m01-bridge-lod.js';

// Reference oracles: the pre-slice-3 function bodies (git show 4ffc2db:src/render/m01-vegetation-runtime.js), verbatim, with their original table.
const OLD_LOD=Object.freeze(Object.fromEntries([['low',20,55,42],['medium',35,75,65],['high',50,90,90]].map(([n,near,lod1,shrubMid])=>[n,{near,lod1,mid:120,hysteresis:4,shrubNear:shrubMid*.5,shrubMid}])));
function oldTier(distance,quality='medium',previous=null){const q=OLD_LOD[quality]??OLD_LOD.medium;
 if(previous===3&&distance>=116)return 3;if(distance>=120)return 3;
 const boundaries=[q.near,q.lod1,120];if(previous!==null&&previous<3){const lo=previous?boundaries[previous-1]-4:0,hi=boundaries[previous]+4;if(distance>=lo&&distance<Math.min(hi,120))return previous;}
 return distance<q.near?0:distance<q.lod1?1:2;
}
function oldLod(distance,quality='medium',previous=null){const q=OLD_LOD[quality]??OLD_LOD.medium;if(previous==='far'&&distance>=116)return 'far';if(distance>=120)return 'far';if(previous==='near'&&distance<q.near+4)return 'near';if(previous==='mid'&&distance>=q.near-4)return 'mid';return distance<q.near?'near':'mid';}
function oldShrub(distance,quality='medium'){const q=OLD_LOD[quality]??OLD_LOD.medium;return distance<q.shrubNear?'near':distance<q.shrubMid?'mid':'culled';}
const sweep=(fn)=>{for(let d=0;d<=200;d+=.25)fn(d);};
const QUALITIES=['low','medium','high','ultra',undefined];

test('vegetation threshold table keeps its previous values and is shared with the policy',()=>{
  for(const [name,q] of Object.entries(OLD_LOD)){const v=M01_VEGETATION_LOD[name];for(const k of ['near','lod1','mid','hysteresis','shrubNear','shrubMid'])assert.equal(v[k],q[k],`${name}.${k}`);}
  assert.deepEqual(Object.keys(M01_VEGETATION_LOD),['low','medium','high']);
  assert.deepEqual(M01_LOD_PROFILES.vegetationTrees.presets.medium.bands,[35,75,120]);
  assert.deepEqual(M01_LOD_PROFILES.vegetationShrubs.presets.high.bands,[45,90]);
  assert.ok(Object.isFrozen(M01_VEGETATION_LOD_THRESHOLDS)&&Object.isFrozen(lodProfile('vegetationTrees','low')));
});

test('chooseVegetationTier equals the pre-T43 function for every previous value and distance 0..200 step 0.25',()=>{
  let n=0;for(const quality of QUALITIES)for(const previous of [null,undefined,0,1,2,3,-1,4])sweep(d=>{n++;assert.equal(chooseVegetationTier(d,quality,previous),oldTier(d,quality,previous),`q=${quality} prev=${previous} d=${d}`);});
  assert.ok(n>10000);
  for(const quality of ['low','medium','high']){assert.equal(chooseVegetationTier(120,quality,2),3);assert.equal(chooseVegetationTier(116,quality,3),3);assert.equal(chooseVegetationTier(115.9,quality,3),2);assert.equal(chooseVegetationTier(121,quality,2),3);}
});

test('chooseVegetationLod equals the pre-T43 function for every previous value and distance 0..200 step 0.25',()=>{
  for(const quality of QUALITIES)for(const previous of [null,undefined,'near','mid','far','culled','x'])sweep(d=>assert.equal(chooseVegetationLod(d,quality,previous),oldLod(d,quality,previous),`q=${quality} prev=${previous} d=${d}`));
});

test('chooseShrubLod with previous=null equals the old function; hysteresis is new and 15% by default',()=>{
  for(const quality of QUALITIES){sweep(d=>assert.equal(chooseShrubLod(d,quality),oldShrub(d,quality)));sweep(d=>assert.equal(chooseShrubLod(d,quality,null),oldShrub(d,quality)));}
  // medium: near 32.5 m, mid 65 m, margins 4.875 / 9.75 m.
  assert.equal(chooseShrubLod(34,'medium','near'),'near');assert.equal(chooseShrubLod(34,'medium','mid'),'mid');assert.equal(chooseShrubLod(34,'medium'),'mid');
  assert.equal(chooseShrubLod(37.3,'medium','near'),'near');assert.equal(chooseShrubLod(37.4,'medium','near'),'mid');
  assert.equal(chooseShrubLod(27.7,'medium','mid'),'mid');assert.equal(chooseShrubLod(27.6,'medium','mid'),'near');
  assert.equal(chooseShrubLod(70,'medium','mid'),'mid');assert.equal(chooseShrubLod(70,'medium','culled'),'culled');assert.equal(chooseShrubLod(70,'medium'),'culled');
  assert.equal(chooseShrubLod(74.7,'medium','mid'),'mid');assert.equal(chooseShrubLod(74.8,'medium','mid'),'culled');
  assert.equal(chooseShrubLod(55.3,'medium','culled'),'culled');assert.equal(chooseShrubLod(55.2,'medium','culled'),'mid');
  assert.equal(chooseShrubLod(5,'medium','culled'),'near');assert.equal(chooseShrubLod(500,'medium','near'),'culled');
});

test('static camera over 10 s of 60 Hz frames never flickers; jitter inside the margin never toggles',()=>{
  for(const fn of [(d,p)=>chooseVegetationTier(d,'medium',p),(d,p)=>chooseVegetationLod(d,'medium',p),(d,p)=>chooseShrubLod(d,'medium',p)])
    for(const base of [10,20,31,32.5,34,35,36,40,65,70,74,75,76,100,116,118,120,125]){let prev=null,changes=0;for(let f=0;f<600;f++){const jitter=Math.sin(f*1.7)*1.5,out=fn(base+jitter,prev);if(prev!==null&&out!==prev)changes++;prev=out;}assert.equal(changes,0,`base ${base} changed ${changes}`);}
});

test('selectConsumerLod pairs lowHysteresis only on the nearer side',()=>{
  const p=lodProfile('vegetationTrees','medium');assert.deepEqual(p.hysteresis,[4,4,0]);assert.equal(p.lowHysteresis,4);
  assert.equal(selectConsumerLod('vegetationTrees',119.9,'medium',3),3);assert.equal(selectConsumerLod('vegetationTrees',119.9,'medium',2),2);assert.equal(selectConsumerLod('vegetationTrees',120,'medium',2),3);
  // Other consumers unaffected by the new option.
  assert.equal(lodProfile('props','medium').lowHysteresis,undefined);
});

// Bridge: first selection (no previous) delegates to the shared policy and must equal the old 400/800 comparison.
test('bridge LOD first selection equals the old comparison; stepwise transitions are unchanged',()=>{
  const oldFresh=d=>d<400?0:d<800?1:2;
  const B=M01_BRIDGE_LOD_BANDS;
  const oldStep=(old,d)=>old===0?(d>=B.farEnter?2:d>=B.mediumEnter?1:0):old===1?(d>=B.farEnter?2:d<B.mediumExit?0:1):(d<B.mediumExit?0:d<B.farExit?1:2);
  for(let d=0;d<=1200;d+=.25){assert.equal(new M01BridgeLOD().select('a',d),oldFresh(d),`fresh d=${d}`);for(const old of [0,1,2]){const lod=new M01BridgeLOD();lod.levels.set('a',old);assert.equal(lod.select('a',d),oldStep(old,d),`old=${old} d=${d}`);}}
  assert.equal(new M01BridgeLOD().select('a',NaN),2);
  const lod=new M01BridgeLOD();lod.levels.set('a',0);assert.equal(lod.select('a',810),1,'0->1 only; far requires 824 m');
});

test('runtime sync stores the previous shrub lod and a static camera produces no change across repeated syncs',()=>{
  const r=new M01VegetationRuntime(new THREE.Group(),new TczewWorld()),shrub=r.shrubDescriptors.find(s=>s.lod!=='culled');
  assert.ok(shrub);
  const snap=()=>JSON.stringify([r.shrubLod,r.tiers,r.lod,r.shrubDescriptors.map(s=>s.lod),r.treeDescriptors.map(t=>t.kitTier)]);
  const player={x:shrub.x+20,z:shrub.z};r.sync(r.world,'medium',player,0);const first=snap();
  for(let f=1;f<=600;f++)r.sync(r.world,'medium',player,f/60);
  assert.equal(snap(),first,'10 s static camera');
  // Walk the camera across the shrub near/mid threshold (32.5 m) and back inside the 4.875 m margin: lod holds while the descriptor remembers it.
  r.sync(r.world,'medium',{x:shrub.x+30,z:shrub.z},1);assert.equal(shrub.lod,'near');
  r.sync(r.world,'medium',{x:shrub.x+34,z:shrub.z},2);assert.equal(shrub.lod,'near','held by hysteresis');
  r.sync(r.world,'medium',{x:shrub.x+38,z:shrub.z},3);assert.equal(shrub.lod,'mid');
  r.sync(r.world,'medium',{x:shrub.x+34,z:shrub.z},4);assert.equal(shrub.lod,'mid','held by hysteresis');
  r.dispose?.();
});
