import test from 'node:test';
import assert from 'node:assert/strict';
import {selectConsumerLod,selectLodBand,lodProfile,M01_LOD_PROFILES} from '../src/render/m01-lod-policy.js';
import {chooseVegetationTier,chooseVegetationLod,chooseShrubLod,M01_VEGETATION_LOD} from '../src/render/m01-vegetation-runtime.js';
import {M01BridgeLOD,M01_BRIDGE_LOD_BANDS} from '../src/render/m01-bridge-lod.js';

// Reference oracles: the pre-slice-3 function bodies, copied verbatim (q comes from the shipped M01_VEGETATION_LOD table, checked below).
function oldTier(distance,quality='medium',previous=null){const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium;
 if(previous===3&&distance>=116)return 3;if(distance>=120)return 3;
 const boundaries=[q.near,q.lod1,120];if(previous!==null&&previous<3){const lo=previous?boundaries[previous-1]-4:0,hi=boundaries[previous]+4;if(distance>=lo&&distance<Math.min(hi,120))return previous;}
 return distance<q.near?0:distance<q.lod1?1:2;
}
function oldLod(distance,quality='medium',previous=null){const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium;if(previous==='far'&&distance>=116)return 'far';if(distance>=120)return 'far';if(previous==='near'&&distance<q.near+4)return 'near';if(previous==='mid'&&distance>=q.near-4)return 'mid';return distance<q.near?'near':'mid';}
function oldShrub(distance,quality='medium'){const q=M01_VEGETATION_LOD[quality]??M01_VEGETATION_LOD.medium;return distance<q.shrubNear?'near':distance<q.shrubMid?'mid':'culled';}
const B=M01_BRIDGE_LOD_BANDS;
function oldBridgeLevel(old,distance){
  if(old===undefined)return distance<400?0:distance<800?1:2;
  if(old===0)return distance>=B.farEnter?2:distance>=B.mediumEnter?1:0;
  if(old===1)return distance>=B.farEnter?2:distance<B.mediumExit?0:1;
  return distance<B.mediumExit?0:distance<B.farExit?1:2;
}
class OldBridgeLOD{
 constructor(){this.levels=new Map();this.parts=new Map();this.transitions=0;}
 select(id,distance,{visible=true,impostorReady=false,damaged=false,authorityLOD=2}={}){
  let old=this.levels.get(id),level;
  if(damaged)level=authorityLOD;
  else if(old===undefined)level=distance<400?0:distance<800?1:2;
  else if(old===0)level=distance>=B.farEnter?2:distance>=B.mediumEnter?1:0;
  else if(old===1)level=distance>=B.farEnter?2:distance<B.mediumExit?0:1;
  else level=distance<B.mediumExit?0:distance<B.farExit?1:2;
  const previous=this.parts.get(id),wasCard=previous?.impostor??false,impostor=visible&&!damaged&&impostorReady&&level===2&&(distance>824||wasCard&&distance>=776||old===undefined&&distance>800);
  if(old!==undefined&&(level!==old||impostor!==wasCard))this.transitions++;
  this.levels.set(id,level);const record=previous??{};record.level=level;record.impostor=impostor;record.visible=visible;record.distance=distance;record.damaged=damaged;this.parts.set(id,record);return level;
 }
}
const PRESETS=['low','medium','high','ultra',undefined,'bogus'];
const sweep=[];for(let d=0;d<=900;d+=.25)sweep.push(d);
const EDGE=[-50,-.001,NaN,Infinity,-Infinity,undefined,null,'60','abc'];
const TIER_PREV=[null,undefined,0,1,2,3,4,-1,1.5,NaN];
const LOD_PREV=[null,undefined,'near','mid','far','bogus'];
const same=(a,b,msg)=>assert.ok(Object.is(a,b),`${msg}: ${a} !== ${b}`);

test('vegetation profiles stay in sync with M01_VEGETATION_LOD',()=>{
  for(const q of ['low','medium','high']){
    const v=M01_VEGETATION_LOD[q];
    assert.deepEqual(lodProfile('vegetationTrees',q).bands,[v.near,v.lod1,v.mid]);
    assert.deepEqual(lodProfile('vegetationLod',q).bands,[v.near,v.mid]);
    assert.deepEqual(lodProfile('vegetationShrubs',q).bands,[v.shrubNear,v.shrubMid]);
    assert.equal(lodProfile('vegetationTrees',q).hysteresis,v.hysteresis);assert.equal(lodProfile('vegetationLod',q).hysteresis,v.hysteresis);
  }
  assert.equal(lodProfile('vegetationTrees','nope'),lodProfile('vegetationTrees','medium'));
  assert.ok(Object.isFrozen(M01_LOD_PROFILES.bridgeParts)&&Object.isFrozen(lodProfile('bridgeParts','low').hysteresis)&&Object.isFrozen(lodProfile('vegetationTrees','low').upperHysteresis));
});
test('bridge profile mirrors M01_BRIDGE_LOD_BANDS',()=>{
  const p=lodProfile('bridgeParts','medium'),[b0,b1]=p.bands,[h0,h1]=p.hysteresis;
  assert.deepEqual([b0+h0,b0-h0,b1+h1,b1-h1],[B.mediumEnter,B.mediumExit,B.farEnter,B.farExit]);
  assert.equal(lodProfile('bridgeParts','low').bands[1],800);
});

test('chooseVegetationTier equals the pre-policy function over 0-900 m x preset x previous (+edge distances)',()=>{
  for(const q of PRESETS)for(const p of TIER_PREV)for(const d of sweep)same(chooseVegetationTier(d,q,p),oldTier(d,q,p),`tier ${q} ${p} ${d}`);
  for(const q of PRESETS)for(const p of TIER_PREV)for(const d of EDGE)same(chooseVegetationTier(d,q,p),oldTier(d,q,p),`tier edge ${q} ${p} ${String(d)}`);
  same(chooseVegetationTier(),oldTier());same(chooseVegetationTier(50),oldTier(50));
});
test('chooseVegetationLod equals the pre-policy function over 0-900 m x preset x previous (+edge distances)',()=>{
  for(const q of PRESETS)for(const p of LOD_PREV)for(const d of sweep)same(chooseVegetationLod(d,q,p),oldLod(d,q,p),`lod ${q} ${p} ${d}`);
  for(const q of PRESETS)for(const p of LOD_PREV)for(const d of EDGE)same(chooseVegetationLod(d,q,p),oldLod(d,q,p),`lod edge ${q} ${p} ${String(d)}`);
  same(chooseVegetationLod(),oldLod());
});
test('chooseShrubLod equals the pre-policy function over 0-900 m x preset (+edge distances)',()=>{
  for(const q of PRESETS)for(const d of [...sweep,...EDGE])same(chooseShrubLod(d,q),oldShrub(d,q),`shrub ${q} ${String(d)}`);
  same(chooseShrubLod(),oldShrub());
});
test('vegetation forward/backward sweeps with carried previous match the oracles step by step',()=>{
  const up=sweep,down=[...sweep].reverse();
  for(const q of ['low','medium','high'])for(const path of [up,down,[...up,...down,...up]]){
    let t=null,tn=null,l=null,ln=null;
    for(const d of path){t=oldTier(d,q,t);tn=chooseVegetationTier(d,q,tn);same(tn,t,`tier sweep ${q} ${d}`);l=oldLod(d,q,l);ln=chooseVegetationLod(d,q,ln);same(ln,l,`lod sweep ${q} ${d}`);}
  }
});

test('bridge level selection equals the pre-policy cascade over 0-900 m x every previous level',()=>{
  for(const old of [undefined,0,1,2,3,-1,null])for(const d of [...sweep,...EDGE.filter(v=>typeof v!=='string')]){
    const l=new M01BridgeLOD();l.syncWorld({revision:0});if(old!==undefined)l.levels.set('p',old);
    same(l.select('p',d),oldBridgeLevel(old,d),`bridge old=${old} d=${String(d)}`);
  }
});
test('M01BridgeLOD class (levels, impostors, transitions) equals the pre-policy class on sweeps',()=>{
  const paths=[sweep,[...sweep].reverse(),[...sweep,...[...sweep].reverse(),...sweep],[390,413,411,825,823,801,799,777,775,812,389,387,430,820,780]];
  for(const path of paths)for(const impostorReady of [false,true])for(const visible of [true,false]){
    const a=new M01BridgeLOD(),b=new OldBridgeLOD();a.syncWorld({revision:1});
    for(const d of path){same(a.select('x',d,{impostorReady,visible}),b.select('x',d,{impostorReady,visible}),`bridge class d=${d}`);assert.equal(a.parts.get('x').impostor,b.parts.get('x').impostor);}
    assert.equal(a.transitions,b.transitions);
  }
  const a=new M01BridgeLOD(),b=new OldBridgeLOD();a.syncWorld({revision:1});
  for(const [d,o] of [[500,{}],[500,{damaged:true,authorityLOD:2}],[300,{damaged:true,authorityLOD:1}],[300,{}],[900,{impostorReady:true}],[900,{damaged:true,authorityLOD:3}],[900,{}],[NaN,{}]])assert.equal(a.select('d',d,o),b.select('d',d,o));
  assert.equal(a.transitions,b.transitions);
});

test('policy extensions are inert for consumers that do not opt in',()=>{
  assert.equal(selectLodBand(805,[400,800],1,{hysteresis:[12,24]}),1);
  assert.equal(selectLodBand(805,[400,800],0,{hysteresis:[12,24]}),2);
  assert.equal(selectLodBand(805,[400,800],0,{hysteresis:[12,24],directional:true}),1);
  assert.equal(selectLodBand(NaN,[400,800],1,{hysteresis:[12,24]}),2);
  assert.equal(selectLodBand(NaN,[400,800],1,{hysteresis:[12,24],directional:true}),1);
  assert.equal(selectLodBand(121,[35,75,120],2,{hysteresis:4}),2);
  assert.equal(selectLodBand(121,[35,75,120],2,{hysteresis:4,upperHysteresis:[4,4,0]}),3);
});
