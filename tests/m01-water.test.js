import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {sunState,lightingModel,CLOUD_WIND} from '../src/render/m01-lighting.js';
import {seconds} from '../src/game/m01-simulation.js';
import {fresnel,skyReflection,flowOffset,pierFoamMask,bankWetness,waterQuality,waterUniforms,bankFoamFringe,bankFoamWidth,LOW_TINT,BANK_FOAM_WIDTH,PIERS,WATER_CHANNEL,FLOW_SPEED,F0} from '../src/render/m01-water.js';

const layout=JSON.parse(readFileSync(new URL('../missions/m01-tczew/map-layout.json',import.meta.url)));
const manifest=JSON.parse(readFileSync(new URL('../assets/models/provisional/m01/bridges.manifest.json',import.meta.url)));
const modelAt=c=>{const s=sunState(layout.sun.keyframes,seconds(c));return lightingModel(s.altDeg,s.azDeg);};
const source=readFileSync(new URL('../src/render/m01-water.js',import.meta.url),'utf8');

test('channel constants match the map data (vistula_channel flowDirection and extent)',()=>{
  const find=o=>{if(!o||typeof o!=='object')return null;if(o.id==='vistula_channel')return o;for(const v of Object.values(o)){const r=find(v);if(r)return r;}return null;};
  const c=find(layout);assert.ok(c,'vistula_channel in map-layout');
  assert.deepEqual([...c.flowDirection],[...WATER_CHANNEL.flowDirection]);
  const xs=c.polygon.map(p=>p[0]??p.x);assert.equal(Math.min(...xs),WATER_CHANNEL.x0);assert.equal(Math.max(...xs),WATER_CHANNEL.x1);
});
test('piers are the manifest supports standing inside the channel',()=>{
  const found=new Map();
  for(const f of manifest.files)for(const n of f.nodes??[])if(/support_\d\d$/.test(n.name)&&n.pivot[0]>WATER_CHANNEL.x0&&n.pivot[0]<WATER_CHANNEL.x1){
    const tz=f.placement?.translation?.[2]??0;found.set(n.name,[n.pivot[0],n.pivot[2]+tz]);
  }
  assert.deepEqual([...found.keys()].sort(),PIERS.map(p=>p.id).sort());
  for(const p of PIERS)assert.deepEqual(found.get(p.id),[p.x,p.z]);
});
test('same clock => identical uniforms; different clock changes flow only',()=>{
  const m=modelAt('04:30'),a=waterUniforms(m,1234.5,'high'),b=waterUniforms(m,1234.5,'high'),c=waterUniforms(m,1240,'high');
  assert.deepEqual(a,b);assert.notDeepEqual(a.flow,c.flow);assert.deepEqual(a.zenith,c.zenith);
  assert.notDeepEqual(waterUniforms(modelAt('04:30'),10,'high').zenith,waterUniforms(modelAt('06:05'),10,'high').zenith);
});
test('fresnel grows monotonically from steep to grazing views',()=>{
  let prev=-1;for(let c=1;c>=0;c-=.05){const f=fresnel(c);assert.ok(f>=prev);prev=f;}
  assert.ok(Math.abs(fresnel(1)-F0)<1e-9);assert.ok(fresnel(.05)>.5);assert.equal(fresnel(0),1);
});
test('sky reflection: grazing ray is the horizon colour, steep ray the zenith; sun halo adds light',()=>{
  const sky=modelAt('06:05').sky;
  const near=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-9));
  near(skyReflection(sky,0,0),sky.horizon);near(skyReflection(sky,1,0),sky.zenith);
  const lum=c=>c[0]+c[1]+c[2];assert.ok(lum(skyReflection(sky,.1,1))>lum(skyReflection(sky,.1,0)));
  // grazing view: water colour is pulled toward the sky; steep view stays near the dark body colour
  const body=waterUniforms(modelAt('06:05'),0,'high').body,graze=fresnel(.08),steep=fresnel(.95);
  const mix=(f)=>skyReflection(sky,.1,0).map((s,i)=>body[i]+(s-body[i])*f);
  assert.ok(lum(mix(graze))>lum(mix(steep))*2);
});
test('flow advances toward -z (flowDirection north) with the sim clock and follows the T16 wind',()=>{
  const a=flowOffset(0),b=flowOffset(10),c=flowOffset(20);
  assert.ok(b.z<a.z&&c.z<b.z);
  assert.ok(Math.abs((a.z-b.z)-(b.z-c.z))<1e-9);
  assert.ok(Math.abs(b.z-(-FLOW_SPEED*10+CLOUD_WIND.z*600*10))<1e-9);
  assert.ok(b.x>a.x,'wind drift from CLOUD_WIND.x');
  assert.deepEqual(flowOffset(7.25),flowOffset(7.25));
});
test('pier foam: present around the known piers (and wake downstream), zero mid-channel far from them',()=>{
  const p=PIERS[0];
  assert.ok(pierFoamMask(p.x+p.hx,p.z)>0.3,'ring at the rail pier');
  assert.ok(pierFoamMask(PIERS[1].x,PIERS[1].z-PIERS[1].hz*1.2)>0,'road pier ring');
  assert.ok(pierFoamMask(p.x,p.z-p.hz-12)>0,'wake downstream (-z)');
  assert.equal(pierFoamMask(p.x,p.z+p.hz+30),0,'nothing upstream');
  assert.equal(pierFoamMask(80,1500),0);assert.equal(pierFoamMask(210,-800),0);assert.equal(pierFoamMask(p.x+40,p.z),0);
});
test('bank wetness: wet at x~25 and x~265, dry mid-channel, symmetric and monotone',()=>{
  assert.equal(bankWetness(25),1);assert.equal(bankWetness(265),1);assert.equal(bankWetness(145),0);
  assert.ok(bankWetness(27)>.9);assert.ok(bankWetness(263)>.9);
  assert.equal(bankWetness(60),bankWetness(230));
  for(let x=25;x<44;x+=1)assert.ok(bankWetness(x+1)<=bankWetness(x));
});
test('quality: Low has no reflection term; no planar reflection, render target or extra pass at any quality',()=>{
  const m=modelAt('05:30');
  assert.equal(waterUniforms(m,5,'low').reflect,0);assert.equal(waterUniforms(m,5,'medium').reflect,1);assert.equal(waterUniforms(m,5,'high').reflect,1);
  assert.ok(waterQuality('low').octaves<waterQuality('medium').octaves&&waterQuality('medium').octaves<waterQuality('high').octaves);
  for(const q of ['low','medium','high']){const w=waterQuality(q);assert.equal(w.planar,false);assert.equal(w.renderTargets,0);assert.equal(w.extraPasses,0);}
  assert.doesNotMatch(source,/WebGLRenderTarget|Reflector|CubeCamera|renderer\.render\(/);
});
test('view wiring: only the river mesh uses the water material; game/world/core never import the module',()=>{
  const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
  assert.match(view,/this\.mesh\('box','water',\[145,-9\.94,0\],\[240,\.08,6500\]\)/);
  assert.match(view,/new M01Water\(\(\)=>\{this\.lastFrame=null;\}\)/);assert.match(view,/this\.water\.sync\(this\.lightingModel,sim\.clock,/);
  const walk=d=>readdirSync(d).flatMap(n=>{const p=d+'/'+n;return statSync(p).isDirectory()?walk(p):[p];});
  for(const dir of ['src/game','src/world','src/core'])for(const f of walk(new URL('../'+dir,import.meta.url).pathname))
    if(f.endsWith('.js'))assert.doesNotMatch(readFileSync(f,'utf8'),/m01-water/,f);
});

test('Low body tint: a constant horizon-colour term replaces the reflection (no near-black oil slick), absent at Medium/High',()=>{
  for(const c of ['04:30','05:30','06:05']){
    const m=modelAt(c),low=waterUniforms(m,5,'low'),med=waterUniforms(m,5,'medium'),high=waterUniforms(m,5,'high');
    assert.equal(low.reflect,0);assert.equal(low.tint,LOW_TINT);assert.equal(med.tint,0);assert.equal(high.tint,0);
    // the tinted body (linear) lifts a dark 0.02 body well above itself: at least a quarter of the horizon luminance is added
    const lum=v=>.2126*v[0]+.7152*v[1]+.0722*v[2],tinted=low.body.map((b,i)=>b+(low.horizon[i]-b)*low.tint);
    assert.ok(lum(tinted)>=lum(low.body)+.2*lum(low.horizon),c);
  }
  assert.ok(LOW_TINT>=.2&&LOW_TINT<=.4);
  assert.match(source,/uWaterHorizon,uWaterTint/);   // the shader mixes it in
});
test('foam readable: full-strength ring at each pier footprint, wake streaks downstream (-z) of rail_support_01 and road_support_01',()=>{
  for(const p of PIERS){
    assert.equal(pierFoamMask(p.x+p.hx,p.z),1,p.id+' ring at the waterline');
    assert.ok(pierFoamMask(p.x,p.z-p.hz*1.4)>=.5,p.id+' ring at the nose');
    for(const down of [12,25,40])assert.ok(pierFoamMask(p.x,p.z-p.hz-down)>0,p.id+' wake '+down+' m downstream');
    assert.equal(pierFoamMask(p.x,p.z+p.hz+25),0,p.id+' nothing upstream (+z)');
  }
  assert.ok(pierFoamMask(PIERS[0].x,PIERS[0].z-PIERS[0].hz-12)>pierFoamMask(PIERS[0].x,PIERS[0].z-PIERS[0].hz-40),'wake fades downstream');
});
test('bank foam fringe: on the bank line at x 25 and 265, gone past the fringe, deterministic in the sim clock',()=>{
  for(const clock of [0,3,17.5,300]){
    for(const z of [-100,0,40,200]){
      assert.equal(bankFoamFringe(25,z,clock),1);assert.equal(bankFoamFringe(265,z,clock),1);
      assert.equal(bankFoamFringe(145,z,clock),0);assert.equal(bankFoamFringe(25+BANK_FOAM_WIDTH+2.9,z,clock),0);
      assert.ok(bankFoamWidth(clock,z)>=2&&bankFoamWidth(clock,z)<=4);
    }
  }
  assert.equal(bankFoamFringe(26,10,4),bankFoamFringe(26,10,4));
  assert.notEqual(bankFoamWidth(0,0),bankFoamWidth(4,0));
});
test('test-only A/B hook is opt-in (?debug) and only toggles the foam/wet detail uniform',()=>{
  assert.match(source,/has\('debug'\)\)\s*\n?\s*window\.m01WaterDebug=\{setDetail/);
  assert.match(source,/uWaterDetail/);assert.doesNotMatch(source,/uWaterDetail\.value=[^;]*sim|fetch\(/);
});
