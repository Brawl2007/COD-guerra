import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {visualNoise} from '../src/render/m01-atmosphere.js';
import {M01_FX_PROFILES,M01_IMPACT_PROFILES,battlefieldBlastKind,battlefieldProfile,fxDistanceBand,fxLayerCount,easedLife,staggeredLife,impactProfile} from '../src/render/m01-battlefield-fx-profile.js';

const view=()=>readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
const atmosphere=()=>readFileSync(new URL('../src/render/m01-atmosphere.js',import.meta.url),'utf8');

test('V3 visual RNG and lifecycle curves are deterministic and gameplay RNG stays untouched',()=>{
  for(const seed of [0,1,19390901,0xffffffff]){
    const a=Array.from({length:96},(_,i)=>visualNoise(seed,i)),b=Array.from({length:96},(_,i)=>visualNoise(seed,i));
    assert.deepEqual(a,b);assert.ok(a.every(n=>n>=0&&n<1));
  }
  const sim=new M01Simulation(19390901),rng=sim.rng.state,snapshot=sim.snapshot(false);
  for(const [id,aerial] of [['m01_grenade_0',false],['station_bomb',true],['east_demolition',false]]){
    const p=battlefieldProfile(id,aerial);for(let i=0;i<32;i++)staggeredLife(i*.05,p.smokeStart,p.smokeEnd,visualNoise(99,i),.38);
  }
  for(const m of Object.keys(M01_IMPACT_PROFILES))impactProfile(m);
  assert.equal(sim.rng.state,rng);assert.deepEqual(sim.snapshot(false),snapshot);
});

test('blast categories remain explicit rather than scale-only aliases',()=>{
  assert.equal(battlefieldBlastKind('m01_grenade_2',false),'small');
  assert.equal(battlefieldBlastKind('station_bomb',true),'bombing');
  assert.equal(battlefieldBlastKind('raid_0530',true),'bombing');
  assert.equal(battlefieldBlastKind('east_demolition',false),'demolition');
  assert.equal(battlefieldBlastKind('west_demolition',false),'demolition');
  assert.notDeepEqual(M01_FX_PROFILES.small,M01_FX_PROFILES.bombing);
  assert.notDeepEqual(M01_FX_PROFILES.bombing,M01_FX_PROFILES.demolition);
  assert.ok(M01_FX_PROFILES.small.smokeEnd<M01_FX_PROFILES.bombing.smokeEnd);
  assert.ok(M01_FX_PROFILES.bombing.smokeEnd<M01_FX_PROFILES.demolition.smokeEnd);
  assert.ok(M01_FX_PROFILES.small.dustReach<M01_FX_PROFILES.demolition.dustReach);
});

test('distance and quality reduce secondary density without turning effects off',()=>{
  assert.deepEqual([fxDistanceBand(20),fxDistanceBand(150),fxDistanceBand(700)],['near','mid','far']);
  for(const profile of Object.values(M01_FX_PROFILES))for(const layer of ['flash','core','fire','dust','smoke','shard']){
    const base=profile.counts[layer];
    const lowFar=fxLayerCount(base,'low',700),medium=fxLayerCount(base,'medium',150),highNear=fxLayerCount(base,'high',20);
    assert.ok(lowFar>=1);assert.ok(lowFar<=medium);assert.ok(medium<=highNear);
  }
});

test('fade curves stagger endings and never exceed normalized bounds',()=>{
  for(let t=-.5;t<8;t+=.025){const v=easedLife(t,.2,5.7);assert.ok(v>=0&&v<=1);}
  const endings=new Set();
  for(let i=0;i<20;i++){const s=staggeredLife(1,.2,5.7,i/19,.38);endings.add(s.end.toFixed(4));}
  assert.ok(endings.size>15,'particles should not share one simultaneous ending');
});

test('impact materials have distinct bounded presentation families',()=>{
  const earth=impactProfile('earth'),stone=impactProfile('stone'),wood=impactProfile('wood'),metal=impactProfile('metal');
  assert.ok(earth.dust>stone.dust);assert.ok(stone.chips>earth.chips);assert.ok(wood.chips>stone.chips);
  assert.ok(wood.elongation>1);assert.ok(metal.sparks>0);assert.equal(metal.dust,0);assert.equal(metal.chips,0);
  assert.equal(impactProfile('not-a-material'),earth);
});

test('approved battlefield pool limits and one-light budget remain byte-explicit',()=>{
  const source=view();
  for(const token of ['bursts:16','flash:16','core:48','fire:96','smoke:128','dust:128','shards:96','lights:1'])assert.match(source,new RegExp(token.replace(':','\\s*:\\s*')));
  assert.match(source,/if\(index>=batch\.instanceMatrix\.count\)return|if\(index>=batch\.instanceMatrix\.count\|\|opacity<=\.004\)return/);
  assert.match(source,/shardCount<M01_BATTLEFIELD_FX_LIMITS\.shards/);
  assert.match(source,/Math\.min\(5,strongest\.intensity\)/);
  assert.doesNotMatch(source,/new THREE\.PointLight[\s\S]*new THREE\.PointLight/);
});

test('pause/reset/dispose paths keep presentation pools non-authoritative and cleanable',()=>{
  const source=view(),atm=atmosphere();
  assert.match(source,/if\(previous&&Object\.keys\(frame\)\.every\(k=>frame\[k\]===previous\[k\]\)\)return/);
  assert.match(source,/resetEffects\(\)[\s\S]*this\.impacts=\[\];this\.bursts=\[\]/);
  assert.match(source,/resetEffects\(\)[\s\S]*this\.battlefieldShards\.count=0;this\.explosionLight\.visible=false/);
  assert.match(source,/resetEffects\(\)[\s\S]*battlefieldFxMeta/);
  assert.match(atm,/dispose\(\)[\s\S]*this\.dustMaterial\.dispose\(\)[\s\S]*this\.dustTexture\.dispose\(\)/);
  assert.doesNotMatch(source,/sim\.rng|\.rng\.next|Math\.random\s*\(/);
});

test('demolition authority and saved state are unchanged by all V3 profile sampling',()=>{
  const a=new M01Simulation(19390901),b=new M01Simulation(19390901);
  for(let tick=0;tick<520;tick++){
    const controls=tick===0?{skip:true}:tick%47===0?{lookX:1.5}:{};
    a.tick(.05,controls);
    const p=M01_FX_PROFILES[tick%3===0?'small':tick%3===1?'bombing':'demolition'];
    for(let j=0;j<12;j++){fxLayerCount(p.counts.smoke,tick%2?'low':'high',j*80);staggeredLife((tick%180)*.03,p.smokeStart,p.smokeEnd,visualNoise(tick,j),.38);}
    b.tick(.05,controls);
  }
  assert.deepEqual(a.snapshot(false),b.snapshot(false));
});
