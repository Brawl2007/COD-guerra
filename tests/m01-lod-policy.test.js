import test from 'node:test';
import assert from 'node:assert/strict';
import {selectLodBand,selectConsumerLod,lodProfile,M01_LOD_PROFILES,advanceLodFade,createLodCounters,tallyLod,lodCounterTotals,resetLodCounters} from '../src/render/m01-lod-policy.js';
import {chooseWagonLod,M01_WAGON_LOD} from '../src/render/m01-train-wagons.js';
import {chooseYardWagonLod,M01_YARD_WAGON_LOD} from '../src/render/m01-yard-wagons.js';
import {fieldStructureLod} from '../src/render/m01-field-structures.js';
import {propKitLod} from '../src/render/m01-props-runtime.js';
import {locomotiveLOD} from '../src/render/m01-locomotive.js';
import {panzerzugLOD} from '../src/render/m01-panzerzug.js';

// Reference oracles: the pre-T43 function bodies (git show 6697956), copied verbatim with their tables.
const OLD_TRAIN={low:{near:45,mid:180,hysteresis:14},medium:{near:80,mid:300,hysteresis:18},high:{near:120,mid:420,hysteresis:24}};
const OLD_YARD={low:{near:35,mid:140,hysteresis:10},medium:{near:60,mid:220,hysteresis:14},high:{near:90,mid:300,hysteresis:18}};
function oldWagon(table,distance,quality='medium',previous=null){
  const q=table[quality]??table.medium,h=q.hysteresis;
  if(previous===0&&distance<=q.near+h)return 0;
  if(previous===1){if(distance<q.near-h)return 0;if(distance<=q.mid+h)return 1;return 2;}
  if(previous===2&&distance>=q.mid-h)return 2;
  return distance<q.near?0:distance<q.mid?1:2;
}
function oldField(distance,quality='medium',previous=null){
  const near=quality==='high'?90:quality==='low'?0:55,mid=quality==='high'?260:quality==='low'?100:180;
  if(previous===0&&near>0&&distance<near+8)return 0;
  if(previous===1&&distance>=near-8&&distance<mid+12)return 1;
  if(previous===2&&distance>=mid-12)return 2;
  return distance<near?0:distance<mid?1:2;
}
const oldProp=(distance,quality='medium')=>quality==='low'?1:distance<(quality==='high'?95:60)?0:1;
function oldRail(distance,current=null){
  if(current===0&&distance<66)return 0;
  if(current===1&&distance>=54&&distance<198)return 1;
  if(current===2&&distance>=162)return 2;
  return distance<60?0:distance<180?1:2;
}
const PRESETS=['low','medium','high','ultra',undefined],PREVIOUS=[null,0,1,2];
const sweep=[...Array.from({length:2201},(_,i)=>i*0.25),Infinity];

test('selectLodBand picks bands at exact boundaries without a previous band',()=>{
  const bands=[60,180];
  assert.equal(selectLodBand(0,bands),0);assert.equal(selectLodBand(59.999,bands),0);assert.equal(selectLodBand(60,bands),1);
  assert.equal(selectLodBand(179.999,bands),1);assert.equal(selectLodBand(180,bands),2);assert.equal(selectLodBand(1e9,bands),2);
  assert.equal(selectLodBand(5,[]),0);
});

test('selectLodBand handles NaN, negative, infinite distance and bad previous safely',()=>{
  const bands=[60,180];
  assert.equal(selectLodBand(NaN,bands),2);assert.equal(selectLodBand(NaN,bands,0),2);assert.equal(selectLodBand(-5,bands),0);assert.equal(selectLodBand(-5,bands,2),0);
  assert.equal(selectLodBand(Infinity,bands,0),2);
  for(const bad of [undefined,null,-1,3,7,1.5,NaN,'1'])assert.equal(selectLodBand(100,bands,bad),1,String(bad));
});

test('hysteresis in metres is asymmetric around the boundary adjacent to previous, both directions',()=>{
  const bands=[100,300],o={hysteresis:10};
  assert.equal(selectLodBand(105,bands,0,o),0);assert.equal(selectLodBand(109.9,bands,0,o),0);assert.equal(selectLodBand(110,bands,0,o),1);
  assert.equal(selectLodBand(105,bands,null,o),1);
  assert.equal(selectLodBand(95,bands,1,o),1);assert.equal(selectLodBand(90,bands,1,o),1);assert.equal(selectLodBand(89.9,bands,1,o),0);
  assert.equal(selectLodBand(305,bands,1,o),1);assert.equal(selectLodBand(310,bands,1,o),2);
  assert.equal(selectLodBand(295,bands,2,o),2);assert.equal(selectLodBand(290,bands,2,o),2);assert.equal(selectLodBand(289.9,bands,2,o),1);
  // a jump far past the margin never sticks to the old band
  assert.equal(selectLodBand(500,bands,0,o),2);assert.equal(selectLodBand(1,bands,2,o),0);
  assert.equal(selectLodBand(110,bands,0,{hysteresis:10,upperInclusive:true}),0);assert.equal(selectLodBand(110.1,bands,0,{hysteresis:10,upperInclusive:true}),1);
});

test('hysteresis accepts per-boundary arrays and a default 15 percent fraction',()=>{
  const bands=[60,180],o={hysteresis:[6,18]};
  assert.equal(selectLodBand(65,bands,0,o),0);assert.equal(selectLodBand(66,bands,0,o),1);assert.equal(selectLodBand(197,bands,1,o),1);assert.equal(selectLodBand(198,bands,1,o),2);assert.equal(selectLodBand(162,bands,2,o),2);assert.equal(selectLodBand(161,bands,2,o),1);
  assert.equal(selectLodBand(68.9,bands,0),0);assert.equal(selectLodBand(69,bands,0),1);assert.equal(selectLodBand(51,bands,1),1);assert.equal(selectLodBand(50.9,bands,1),0);
  assert.equal(selectLodBand(70,bands,0,{fraction:0.2}),0);
});

test('a boundary at zero carries no hysteresis and can never hold the nearest band',()=>{
  assert.equal(selectLodBand(0,[0,100],0,{hysteresis:[8,12]}),1);assert.equal(selectLodBand(3,[0,100],0,{hysteresis:[8,12]}),1);assert.equal(selectLodBand(0,[0],0,{hysteresis:6}),1);
});

test('no flicker: a stationary camera with jitter around each boundary never switches for 10 s at 60 Hz',()=>{
  for(const [consumer,preset] of Object.entries(M01_LOD_PROFILES).flatMap(([c,def])=>Object.keys(def.presets).map(p=>[c,p]))){
    const {bands,hysteresis}=lodProfile(consumer,preset);
    for(let b=0;b<bands.length;b++){
      const t=bands[b];if(!(t>0))continue;
      const margin=Array.isArray(hysteresis)?hysteresis[Math.min(b,hysteresis.length-1)]:hysteresis,jitter=margin*0.4;
      for(const start of [t-margin*0.5,t+margin*0.5]){
        let state=selectConsumerLod(consumer,start,preset,null);const first=state;let switches=0,seed=12345;
        for(let frame=0;frame<600;frame++){
          seed=(seed*1103515245+12345)&0x7fffffff;const d=start+((seed/0x7fffffff)*2-1)*jitter,next=selectConsumerLod(consumer,d,preset,state);
          if(next!==state)switches++;state=next;
        }
        assert.equal(switches,0,`${consumer}/${preset} boundary ${t} start ${start}`);assert.equal(state,first);
      }
    }
  }
  // sanity: without hysteresis the same jitter does flip
  let flips=0,s=selectLodBand(60,[60],null,{hysteresis:0});for(let i=0;i<600;i++){const n=selectLodBand(60+(i%2?-1:1)*0.5,[60],s,{hysteresis:0});if(n!==s)flips++;s=n;}
  assert.ok(flips>100);
});

test('crossing the boundary by the margin switches once, and walking back needs the margin again',()=>{
  const bands=[100],o={hysteresis:8};let band=0,switches=[];
  const walk=[...Array.from({length:30},(_,i)=>90+i),...Array.from({length:30},(_,i)=>120-i)];
  for(const d of walk){const n=selectLodBand(d,bands,band,o);if(n!==band)switches.push([d,n]);band=n;}
  assert.deepEqual(switches,[[108,1],[91,0]]);
});

test('fade state is deterministic, idempotent and driven only by the supplied clock',()=>{
  const run=()=>{let s=null;const out=[];for(const [target,clock] of [[0,10],[0,10.1],[1,10.2],[1,10.2],[1,10.3],[1,10.4],[1,10.5],[1,10.6],[2,10.7],[2,10.8],[2,11.2]]){s=advanceLodFade(s,target,clock);out.push(s);}return out;};
  assert.deepEqual(run(),run());
  let s=advanceLodFade(null,0,5);assert.deepEqual({from:s.from,to:s.to,startedAt:s.startedAt,progress:s.progress,done:s.done},{from:0,to:0,startedAt:5,progress:1,done:true});
  s=advanceLodFade(s,1,6);assert.deepEqual({from:s.from,to:s.to,startedAt:s.startedAt,progress:s.progress,done:s.done},{from:0,to:1,startedAt:6,progress:0,done:false});
  assert.deepEqual(advanceLodFade(s,1,6),s);
  const mid=advanceLodFade(s,1,6.15);assert.ok(Math.abs(mid.progress-0.5)<1e-9);assert.ok(Math.abs(mid.value-0.5)<1e-9);assert.equal(mid.done,false);assert.deepEqual(advanceLodFade(mid,1,6.15),mid);
  const end=advanceLodFade(mid,1,6.31);assert.equal(end.progress,1);assert.equal(end.done,true);assert.equal(end.value,1);assert.equal(advanceLodFade(end,1,99).progress,1);
  const slow=advanceLodFade(advanceLodFade(null,0,0,1),1,0,1);assert.equal(advanceLodFade(slow,1,0.25,1).progress,0.25);
  const retarget=advanceLodFade(mid,2,6.15);assert.ok(Math.abs(retarget.from-0.5)<1e-9);assert.equal(retarget.to,2);assert.equal(retarget.progress,0);assert.equal(retarget.startedAt,6.15);
});

test('fade snaps when the clock goes backwards or the duration is invalid, and ignores non-finite clocks',()=>{
  let s=advanceLodFade(advanceLodFade(null,0,100),1,100.1);
  const snapped=advanceLodFade(s,1,3);assert.deepEqual({from:snapped.from,to:snapped.to,startedAt:snapped.startedAt,progress:snapped.progress,done:snapped.done},{from:1,to:1,startedAt:3,progress:1,done:true});
  assert.ok(Math.abs(advanceLodFade(advanceLodFade(snapped,0,3.1),0,3.2).progress-1/3)<1e-9);
  assert.equal(advanceLodFade(s,2,200,0).done,true);assert.equal(advanceLodFade(s,2,200,-1).value,2);
  assert.equal(advanceLodFade(s,2,NaN),s);assert.equal(advanceLodFade(null,1,NaN).done,true);
});

test('lod counters tally per preset band counts',()=>{
  const c=createLodCounters();tallyLod(c,'low',0);tallyLod(c,'low',2);tallyLod(c,'low',2);tallyLod(c,'high',1);
  assert.deepEqual(lodCounterTotals(c,'low'),[1,0,2]);assert.deepEqual(lodCounterTotals(c,'high'),[0,1]);assert.deepEqual(lodCounterTotals(c,'medium'),[]);
  assert.deepEqual(lodCounterTotals(resetLodCounters(c),'low'),[]);
});

test('profile tables are frozen and encode the shipped thresholds',()=>{
  assert.ok(Object.isFrozen(M01_LOD_PROFILES)&&Object.isFrozen(M01_LOD_PROFILES.props.presets.low)&&Object.isFrozen(lodProfile('locomotive','high').bands));
  assert.deepEqual(M01_WAGON_LOD,OLD_TRAIN);assert.deepEqual(M01_YARD_WAGON_LOD,OLD_YARD);
  assert.throws(()=>lodProfile('nope'));assert.equal(lodProfile('props','weird'),lodProfile('props','medium'));
});

// m01-train-wagons.js is provenance-locked (tests/m01-train-consist-polish.test.js), so it keeps its own
// selector; the trainWagons profile must stay equivalent to it until that lock is lifted.
test('trainWagons profile equals the shipped train wagon selector over distance x preset x previous',()=>{
  for(const q of PRESETS)for(const p of PREVIOUS)for(const d of sweep){assert.equal(chooseWagonLod(d,q,p),oldWagon(OLD_TRAIN,d,q,p),`${q} ${p} ${d}`);assert.equal(selectConsumerLod('trainWagons',d,q,p),chooseWagonLod(d,q,p),`profile ${q} ${p} ${d}`);}
  assert.equal(chooseWagonLod(),oldWagon(OLD_TRAIN,undefined));
});
test('yard wagon wrapper equals the pre-policy function over distance x preset x previous',()=>{
  for(const q of PRESETS)for(const p of PREVIOUS)for(const d of sweep)assert.equal(chooseYardWagonLod(d,q,p),oldWagon(OLD_YARD,d,q,p),`${q} ${p} ${d}`);
});
test('field structure wrapper equals the pre-policy function over distance x preset x previous',()=>{
  for(const q of PRESETS)for(const p of PREVIOUS)for(const d of sweep)assert.equal(fieldStructureLod(d,q,p),oldField(d,q,p),`${q} ${p} ${d}`);
});
test('locomotive and panzerzug wrappers equal the pre-policy function over distance x previous',()=>{
  for(const p of PREVIOUS)for(const d of sweep){assert.equal(locomotiveLOD(d,p),oldRail(d,p),`loco ${p} ${d}`);assert.equal(panzerzugLOD(d,p),oldRail(d,p),`pz ${p} ${d}`);}
});
test('non-finite distances keep the pre-policy result in every wrapper',()=>{
  for(const p of PREVIOUS){
    assert.equal(chooseWagonLod(NaN,'medium',p),oldWagon(OLD_TRAIN,NaN,'medium',p));assert.equal(chooseYardWagonLod(NaN,'high',p),oldWagon(OLD_YARD,NaN,'high',p));
    assert.equal(fieldStructureLod(NaN,'medium',p),oldField(NaN,'medium',p));assert.equal(locomotiveLOD(NaN,p),oldRail(NaN,p));assert.equal(panzerzugLOD(NaN,p),oldRail(NaN,p));
  }
  assert.equal(propKitLod(NaN,'medium'),oldProp(NaN,'medium'));
});
test('prop kit LOD without previous equals the pre-policy function; previous adds hysteresis only',()=>{
  for(const q of PRESETS)for(const d of sweep){assert.equal(propKitLod(d,q),oldProp(d,q),`${q} ${d}`);assert.equal(propKitLod(d,q,null),oldProp(d,q));}
  assert.equal(propKitLod(0,'low',0),1);assert.equal(propKitLod(10,'high'),0);
  assert.equal(propKitLod(63,'medium',0),0);assert.equal(propKitLod(66,'medium',0),1);assert.equal(propKitLod(57,'medium',1),1);assert.equal(propKitLod(53.9,'medium',1),0);
  assert.equal(propKitLod(98,'high',0),0);assert.equal(propKitLod(103,'high',0),1);
});
