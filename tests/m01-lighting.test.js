import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {seconds} from '../src/game/m01-simulation.js';
import {sunState,lightingModel,lightingDiagnostics,viewLightingDiagnostics,applyLighting,daylightOf,keyElevationDeg,phaseAt,
  cascadePlan,splitIntensity,CLOUD_WIND,M01_FOG_RANGE,SUN_DISTANCE,KEY_FLOOR_DEG,LIGHTING_PHASES} from '../src/render/m01-lighting.js';
import {M01Atmosphere} from '../src/render/m01-atmosphere.js';
import {WeaponLighting} from '../src/render/first-person-weapon-fx.js';

const layout=JSON.parse(readFileSync(new URL('../missions/m01-tczew/map-layout.json',import.meta.url)));
const keyframes=layout.sun.keyframes;
const CLOCKS=['04:30','04:45','05:30','06:10','07:05'];
const modelAt=battleClock=>{const s=sunState(keyframes,battleClock);return lightingModel(s.altDeg,s.azDeg);};
const modelsAtClocks=()=>CLOCKS.map(c=>modelAt(seconds(c)));
const sweep=(from=seconds('04:30'),to=seconds('07:05'),step=15)=>{const out=[];for(let t=from;t<=to;t+=step)out.push([t,modelAt(t)]);return out;};
const luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const flat=value=>typeof value==='number'?[value]:Array.isArray(value)?value.flatMap(flat):value&&typeof value==='object'?Object.values(value).flatMap(flat):[];

// The pre-extraction M01View.lighting() maths, kept verbatim as the reference.
function oldSun(keys,battleClock){
  const after=keys.findIndex(k=>seconds(k.clock)>battleClock);
  const a=keys[Math.max(0,after<0?keys.length-1:after-1)],b=keys[after<0?keys.length-1:after];
  const t=Math.max(0,Math.min(1,(battleClock-seconds(a.clock))/(seconds(b.clock)-seconds(a.clock)||1)));
  const alt=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.altitudeDeg,b.altitudeDeg,t));
  const az=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.azimuthDeg,b.azimuthDeg,t));
  return {alt,az,dir:[Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt)],
    daylight:Math.max(0,Math.min(1,(alt+.08)/.4))};
}

test('authored sun keyframes (C01) and the fog range are untouched',()=>{
  assert.equal(layout.sun.source,'C01');
  assert.deepEqual(keyframes.map(k=>[k.clock,k.altitudeDeg,k.azimuthDeg]),[
    ['04:30',-3.7,70],['04:34',-3.2,71],['04:51',-.8,74],['05:30',4.8,82],['06:10',10.6,90],['06:40',15,96],['07:05',18.6,101]]);
  assert.deepEqual({...M01_FOG_RANGE},{near:420,far:2800});
  const view=readFileSync(new URL('../src/render/m01-view.js',import.meta.url),'utf8');
  assert.match(view,/new THREE\.Fog\('#a0a7a8',M01_FOG_RANGE\.near,M01_FOG_RANGE\.far\)/);
});

test('sun interpolation is exactly the pre-extraction formula, including both clamped ends',()=>{
  const clocks=[0,seconds('04:29:59'),seconds('04:30'),seconds('04:34'),seconds('04:42:17'),seconds('04:51'),seconds('05:30'),seconds('06:10'),
    seconds('06:25:30'),seconds('06:40'),seconds('07:05'),seconds('07:05')+1,seconds('09:00'),16244.05,17100,19800,22200,25500];
  for(let t=seconds('04:30');t<=seconds('07:05');t+=61.3)clocks.push(t);
  for(const t of clocks){
    const now=sunState(keyframes,t),old=oldSun(keyframes,t);
    assert.equal(now.altRad,old.alt,'altitude '+t);assert.equal(now.azRad,old.az,'azimuth '+t);
    assert.deepEqual(now.dir,old.dir,'direction '+t);assert.equal(daylightOf(now.altRad),old.daylight,'daylight '+t);
    assert.equal(lightingModel(now.altDeg,now.azDeg).daylight,old.daylight);
  }
  assert.equal(sunState(keyframes,0).altDeg,-3.7);assert.equal(sunState(keyframes,seconds('09:00')).altDeg,18.6);
});

test('the five phase clocks give distinct sky, light, fog and exposure values',()=>{
  const models=modelsAtClocks();
  assert.deepEqual(models.map(m=>m.phase),['blue-hour','first-light','golden','morning','day']);
  assert.deepEqual(LIGHTING_PHASES,['blue-hour','first-light','golden','morning','day']);
  assert.deepEqual(CLOCKS.map(c=>phaseAt(sunState(keyframes,seconds(c)).altDeg)),models.map(m=>m.phase));
  const unique=(name,pick)=>assert.equal(new Set(models.map(m=>JSON.stringify(pick(m)))).size,5,name+' must differ at every clock');
  unique('sun altitude',m=>m.altDeg);unique('exposure',m=>m.exposure);unique('daylight',m=>m.daylight);
  unique('sky zenith',m=>m.sky.zenith);unique('sky horizon',m=>m.sky.horizon);unique('halo',m=>m.sky.halo);unique('glow',m=>m.sky.glow);
  unique('fog colour',m=>m.fog.color);unique('hemisphere sky',m=>m.hemi.color);unique('hemisphere ground',m=>m.hemi.groundColor);
  unique('hemisphere intensity',m=>m.hemi.intensity);unique('sun colour',m=>m.sun.color);unique('sun intensity',m=>m.sun.intensity);
  unique('key direction',m=>m.sun.keyDir);
  // Sunrise warmth lives in colour, not in exposure: the first-light key is warmer (redder) than the blue-hour key.
  assert.ok(models[1].sun.color[0]/models[1].sun.color[2]>models[0].sun.color[0]/models[0].sun.color[2]);
  assert.ok(models[2].sun.color[0]/models[2].sun.color[2]>models[4].sun.color[0]/models[4].sun.color[2]*.9);
  // The sky disc only exists once the sun is up.
  assert.equal(models[0].sky.discStrength,0);assert.ok(models[1].sky.discStrength<.01);assert.ok(models[2].sky.discStrength>.5);assert.equal(models[4].sky.discStrength,1);
});

test('the directional light casts shadows from 04:30 as a positive-elevation twilight key with the real azimuth',()=>{
  for(const [t,m] of sweep()){
    assert.equal(m.shadows,true,'shadow switch must not toggle at sunrise (no recompile): '+t);
    assert.ok(m.sun.keyElevDeg>=KEY_FLOOR_DEG&&m.sun.keyDir[1]>0,'key above the horizon '+t);
    assert.ok(m.sun.keyElevDeg>=m.altDeg-1e-9);
    // Azimuth of the light equals the real sun azimuth (direction.xz is parallel to the true direction.xz).
    const real=sunState(keyframes,t).dir;
    assert.ok(Math.abs(Math.atan2(m.sun.keyDir[0],-m.sun.keyDir[2])-Math.atan2(real[0],-real[2]))<1e-9);
    assert.ok(Math.abs(Math.hypot(...m.sun.keyDir)-1)<1e-12);
  }
  const first=modelAt(seconds('04:30'));
  assert.ok(first.altDeg<0,'the real sun is still below the horizon at 04:30');
  assert.ok(first.sun.keyElevDeg>10&&first.sun.intensity>.5,'but the twilight key is a real, low-intensity light');
  assert.equal(modelAt(seconds('07:05')).sun.keyElevDeg,18.6);   // once the sun is high the real direction is used
  assert.equal(keyElevationDeg(40),40);assert.equal(keyElevationDeg(-20),KEY_FLOOR_DEG+.25*(-20+3.7));
});

test('daylight, light intensities and exposure follow the expected monotone trend over the mission',()=>{
  const list=sweep(seconds('04:30'),seconds('07:05'),7);
  for(let i=1;i<list.length;i++){
    const [,p]=list[i-1],[,c]=list[i];
    assert.ok(c.altDeg>=p.altDeg&&c.daylight>=p.daylight,'sun and daylight rise');
    assert.ok(c.exposure<=p.exposure+1e-12,'exposure only falls as the day brightens (compensation)');
    assert.ok(c.sun.intensity>=p.sun.intensity-1e-12&&c.hemi.intensity>=p.hemi.intensity-1e-12);
    assert.ok(c.sun.keyElevDeg>=p.sun.keyElevDeg-1e-12);
    assert.ok(luma(c.sky.zenith)>=luma(p.sky.zenith)-1e-12&&luma(c.fog.color)>=luma(p.fog.color)-1e-12,'sky and fog brighten');
  }
  const models=modelsAtClocks();
  for(let i=1;i<5;i++){
    assert.ok(models[i].exposure<models[i-1].exposure,'strictly lower exposure at each later clock');
    assert.ok(models[i].daylight>models[i-1].daylight&&models[i].sun.intensity>models[i-1].sun.intensity&&models[i].hemi.intensity>models[i-1].hemi.intensity);
  }
  // Readable, not dark: the exposure range is bounded so no phase is blown out or crushed relative to the old constant 1.08.
  for(const m of models)assert.ok(m.exposure>=1.05&&m.exposure<=1.35);
  // Fog follows the sky's horizon colour so fogged geometry meets the sky.
  for(const m of models)assert.deepEqual(m.fog.color,m.sky.horizon);
  // The 07:05 look is the previous day look: same sun colour and fog colour, hemisphere intensity 1.82, exposure 1.08.
  const day=models[4],c=hex=>new THREE.Color(hex).toArray().slice(0,3);
  assert.ok(day.fog.color.every((v,i)=>Math.abs(v-c('#a8b2b0')[i])<1e-3));assert.ok(day.sun.color.every((v,i)=>Math.abs(v-c('#ffe0b0')[i])<1e-3));
  assert.equal(day.hemi.intensity,1.82);assert.equal(day.exposure,1.08);
});

test('every model value is finite and in range for any clock, including outside the mission',()=>{
  const clocks=[-1e5,-1,0,seconds('04:29:59'),...sweep(0,seconds('09:00'),97).map(([t])=>t),seconds('09:00'),1e6];
  for(const t of clocks){
    const m=modelAt(t);
    for(const v of flat(m))assert.ok(Number.isFinite(v),`${t}: ${v}`);
    for(const group of [m.sky.zenith,m.sky.horizon,m.sky.halo,m.sky.disc,m.fog.color,m.hemi.color,m.hemi.groundColor,m.sun.color])
      assert.ok(group.length===3&&group.every(v=>v>=0&&v<=1.0001));
    assert.ok(m.daylight>=0&&m.daylight<=1&&m.exposure>0&&m.sun.intensity>0&&m.hemi.intensity>0&&m.sky.discStrength>=0&&m.sky.discStrength<=1);
    assert.ok(LIGHTING_PHASES.includes(m.phase));
  }
  const d=lightingDiagnostics(modelAt(seconds('05:30')),{battleClock:19800,shadowMap:true,updates:3});
  assert.equal(JSON.stringify(d),JSON.stringify(structuredClone(d)));
  for(const v of flat(d))assert.ok(Number.isFinite(v));
  assert.match(d.fogColor,/^#[0-9a-f]{6}$/);assert.equal(d.phase,'golden');assert.equal(d.shadows,true);
  assert.equal(lightingDiagnostics(modelAt(seconds('05:30')),{shadowMap:false}).shadows,false,'Low reports no effective shadows');
  assert.ok(Number.isFinite(CLOUD_WIND.x)&&Number.isFinite(CLOUD_WIND.z)&&Math.hypot(CLOUD_WIND.x,CLOUD_WIND.z)>0);
  assert.ok(Math.hypot(CLOUD_WIND.x,CLOUD_WIND.z)<.01,'a drift, not a rush');
});

function fakeView(shadowMap=true){
  const calls=[];
  return {calls,sun:new THREE.DirectionalLight('#ffffff',1),skyLight:new THREE.HemisphereLight('#ffffff','#000000',1),
    scene:Object.assign(new THREE.Scene(),{fog:new THREE.Fog('#a0a7a8',M01_FOG_RANGE.near,M01_FOG_RANGE.far)}),
    engine:{toneMappingExposure:1.15,shadowMap:{enabled:shadowMap}},atmosphere:{lighting:(...args)=>calls.push(args)}};
}
const fakeSim=(clock,player={x:10,y:2,z:-30})=>({battleClock:seconds(clock),clock:123.5,player,world:{layout}});

test('applier drives the lights, fog, exposure and sky from the model without touching fog range or Low shadow cost',()=>{
  for(const [clock,phase] of [['04:30','blue-hour'],['05:30','golden'],['07:05','day']]){
    const view=fakeView(true),sim=fakeSim(clock),m=applyLighting(view,sim),p=sim.player;
    assert.equal(m.phase,phase);assert.equal(view.lightingModel,m);
    const offset=view.sun.position.clone().sub(view.sun.target.position);
    assert.ok(view.sun.target.position.equals(new THREE.Vector3(p.x,p.y,p.z)));
    assert.ok(Math.abs(offset.length()-SUN_DISTANCE)<1e-9&&offset.y>0,'light sits above the horizon at the twilight-key direction');
    assert.ok(Math.abs(offset.y/SUN_DISTANCE-m.sun.keyDir[1])<1e-9);
    assert.equal(view.sun.castShadow,true);assert.equal(view.sun.intensity,m.sun.intensity);
    assert.equal(view.skyLight.intensity,m.hemi.intensity);assert.equal(view.engine.toneMappingExposure,m.exposure);
    assert.equal(view.daylight,m.daylight);assert.ok(view.scene.fog.color.equals(view.scene.background));
    assert.equal(view.scene.fog.near,420);assert.equal(view.scene.fog.far,2800);
    assert.equal(view.calls.length,1);assert.equal(view.calls[0][0],p);assert.equal(view.calls[0][1],m);assert.equal(view.calls[0][2],123.5);
    const d=viewLightingDiagnostics(view);assert.equal(d.phase,phase);assert.equal(d.shadows,true);assert.equal(d.shadowMap,true);assert.equal(d.updates,1);
    assert.equal(d.exposure,+m.exposure.toFixed(3));assert.equal(d.battleClock,seconds(clock));
  }
  // Low: the quality preset keeps the shadow map disabled; the light's own flag is constant, so no recompile and no shadow pass.
  const low=fakeView(false);applyLighting(low,fakeSim('04:30'));
  assert.equal(low.sun.castShadow,true);const d=viewLightingDiagnostics(low);assert.equal(d.shadows,false);assert.equal(d.shadowsModel,true);
  assert.equal(viewLightingDiagnostics({}),null);
  // Two frames in a row never allocate new lights or reassign fog.
  const view=fakeView(true),fog=view.scene.fog;applyLighting(view,fakeSim('05:30'));const bg=view.scene.background;applyLighting(view,fakeSim('05:31'));
  assert.equal(view.scene.fog,fog);assert.equal(view.scene.background,bg);assert.equal(viewLightingDiagnostics(view).updates,2);
});

test('weapon lighting inherits the twilight key: the weapon key is lit from above the hands at 04:30 and warms by 05:30',()=>{
  const scene=new THREE.Scene(),weapon=new WeaponLighting(scene),camera=new THREE.PerspectiveCamera(70,16/9,.05,100);
  try{
    const states=[];
    for(const clock of ['04:30','05:30','07:05']){
      const view=fakeView(true);applyLighting(view,fakeSim(clock));camera.lookAt(1,0,0);
      states.push({s:weapon.sync({sky:view.skyLight,sun:view.sun,camera,daylight:view.daylight,pitch:0}),key:weapon.key.color.clone(),view});
    }
    for(const {s} of states){assert.ok(s.keyDirection[1]>=.28&&s.fill>=1.6&&s.fill<=2.6&&s.key>=.55&&s.key<=2);}
    assert.ok(states[0].s.environment<states[2].s.environment,'weapon environment follows daylight');
    assert.ok(states[0].key.b/states[0].key.r>states[1].key.b/states[1].key.r,'sunrise key is warmer than the blue-hour key');
  }finally{weapon.dispose();}
});

test('sky shader: colours come from the model uniforms, clouds project from direction (no sphere UV seam, no zenith pinch)',()=>{
  const original=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
  const scene=new THREE.Scene(),atmosphere=new M01Atmosphere(scene);
  try{
    const {vertexShader:vs,fragmentShader:fs,uniforms}=atmosphere.skyMaterial;
    assert.ok(!/\buv\b/.test(vs)&&!/vCloudUv/.test(vs+fs),'no sphere UV is read or interpolated');
    assert.match(fs,/d\.xz\*cloudShape/);assert.match(fs,/cloudShape=1\.0\/\(max\(d\.y,0\.0\)\+\.32\)/);
    assert.match(fs,/cloudWind\*time/);assert.match(fs,/dot\(viewAz,sunAz\)/);
    for(const name of ['skyZenith','skyHorizon','skyHalo','skyDisc','skyGlow','discStrength','sunDirection','cloudWind'])assert.ok(name in uniforms,name);
    assert.equal(uniforms.cloudWind.value.x,CLOUD_WIND.x);assert.equal(uniforms.cloudWind.value.y,CLOUD_WIND.z);
    // The denominator stays positive everywhere (y+k with k>0), so there is no singularity to pinch at the zenith.
    const k=Number(/\+\.(\d+)\)/.exec(fs.match(/cloudShape=[^;]+;/)[0])[1])/100;assert.ok(k>=.1);
    const player={x:5,y:1,z:-9},seen=[];
    for(const clock of CLOCKS){
      const m=modelAt(seconds(clock));atmosphere.lighting(player,m,321);
      const u=uniforms;
      assert.ok(u.skyZenith.value.equals(new THREE.Color().setRGB(...m.sky.zenith)));assert.ok(u.skyHorizon.value.equals(new THREE.Color().setRGB(...m.sky.horizon)));
      assert.ok(Math.abs(u.sunDirection.value.y-m.sky.sunDir[1])<1e-6&&u.time.value===321&&u.skyGlow.value===m.sky.glow);
      assert.ok(atmosphere.material.uniforms.fogColor.value.equals(new THREE.Color().setRGB(...m.fog.color)),'puffs fade into the fog colour');
      seen.push(u.skyHorizon.value.getHex());
    }
    assert.equal(new Set(seen).size,5);assert.ok(atmosphere.sky.position.equals(new THREE.Vector3(5,1,-9)));
  }finally{atmosphere.dispose();globalThis.document=original;}
  assert.equal(scene.children.length,0);
});

test('shadow cascades: Low has one (no extra light), Medium/High two with the key intensity split, not doubled',()=>{
  assert.equal(cascadePlan('low').cascades,1);assert.equal(cascadePlan(undefined).cascades,1);
  assert.equal(cascadePlan('medium').cascades,2);assert.equal(cascadePlan('high').cascades,2);
  assert.equal(cascadePlan('high').nearMap,2048);assert.ok(cascadePlan('high').nearHalf<cascadePlan('high').wideHalf);
  for(const q of ['medium','high'])for(const clock of CLOCKS){
    const view=Object.assign(fakeView(true),{owner:{quality:q},sunNear:new THREE.DirectionalLight('#fff',0)});
    const sim=fakeSim(clock),m=applyLighting(view,sim),p=sim.player;
    assert.equal(view.sunNear.visible,true);assert.equal(view.sunNear.castShadow,true);
    assert.ok(Math.abs(view.sun.intensity+view.sunNear.intensity-m.sun.intensity)<1e-12,'total key unchanged');
    assert.ok(view.sunNear.intensity>0&&view.sun.intensity>0);
    assert.ok(view.sunNear.position.equals(view.sun.position)&&view.sunNear.target.position.equals(new THREE.Vector3(p.x,p.y,p.z)),'near cascade follows the player');
    assert.equal(view.sunNear.shadow.mapSize.x,cascadePlan(q).nearMap);
    const d=viewLightingDiagnostics(view);assert.equal(d.cascades,2);
  }
  const low=Object.assign(fakeView(false),{owner:{quality:'low'},sunNear:new THREE.DirectionalLight('#fff',0)});
  const m=applyLighting(low,fakeSim('05:30'));
  assert.equal(low.sunNear.visible,false);assert.equal(low.sun.intensity,m.sun.intensity);assert.equal(viewLightingDiagnostics(low).cascades,1);
  assert.deepEqual(splitIntensity(2,cascadePlan('low')),[2,0]);
});
