import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import * as THREE from 'three';
import {sunState,lightingModel,LIGHTING_PHASES,PHASE_ALTITUDES} from '../src/render/m01-lighting.js';
import {seconds} from '../src/game/m01-simulation.js';
import {GRADING_PHASES,CONTRAST_PIVOT,VIGNETTE_MAX,VIGNETTE_INNER,VIGNETTE_OUTER,gradeAt,gradeColor,gradingQuality,gradingUniforms,vignetteFactor,M01Grading} from '../src/render/m01-grading.js';

const layout=JSON.parse(readFileSync(new URL('../missions/m01-tczew/map-layout.json',import.meta.url)));
const modelAtSeconds=t=>{const s=sunState(layout.sun.keyframes,t);return lightingModel(s.altDeg,s.azDeg);};
const modelAt=c=>modelAtSeconds(seconds(c));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/render/m01-grading.js'),view=read('src/render/m01-view.js'),renderer=read('src/render/three-renderer.js');
const luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
const flat=u=>[...u.shadow,...u.highlight,...u.gain,u.contrast,u.lift,u.saturation,u.vignette.strength];

test('grading is a pure function of (lighting model, quality): same input => identical uniforms; Low has none',()=>{
  const a=gradingUniforms(modelAt('05:30'),'high'),b=gradingUniforms(modelAt('05:30'),'high');
  assert.deepEqual(a,b);
  assert.deepEqual(gradingUniforms(modelAt('05:30'),'medium').shadow,a.shadow);   // the grade does not depend on the preset; only the AO does
  assert.equal(gradingUniforms(modelAt('05:30'),'low'),null);
  assert.equal(gradingUniforms(modelAt('05:30'),undefined),null);
  assert.equal(gradingUniforms(null,'high'),null);
  // frozen model in, nothing mutated, and the result carries no clock or random number of its own
  const m=modelAt('06:05'),before=JSON.stringify(m);gradingUniforms(m,'medium');assert.equal(JSON.stringify(m),before);
  assert.doesNotMatch(source,/performance\.now|Date\.now|Math\.random|new Date/);
});

test('04:30, 05:30 and 06:05 give distinct, plausible curves (cool blue hour, warm golden dawn, morning in between)',()=>{
  const u={'04:30':gradingUniforms(modelAt('04:30'),'high'),'05:30':gradingUniforms(modelAt('05:30'),'high'),'06:05':gradingUniforms(modelAt('06:05'),'high')};
  assert.equal(u['04:30'].phase,'blue-hour');assert.equal(u['05:30'].phase,'golden');assert.equal(u['06:05'].phase,'morning');
  assert.notDeepEqual(u['04:30'].shadow,u['05:30'].shadow);assert.notDeepEqual(u['05:30'].highlight,u['06:05'].highlight);assert.notDeepEqual(flat(u['04:30']),flat(u['06:05']));
  // blue hour: shadows lean blue, highlights are not yet warm, colours subdued
  assert.ok(u['04:30'].shadow[2]>u['04:30'].shadow[0]+.02,'cool shadows at 04:30');
  assert.ok(u['04:30'].gain[2]>u['04:30'].gain[0],'blue-leaning white balance at 04:30');
  assert.ok(u['04:30'].saturation<.95);
  // golden hour: warm highlights, richer colour
  assert.ok(u['05:30'].highlight[0]>u['05:30'].highlight[2]+.03,'warm highlights at 05:30');
  assert.ok(u['05:30'].gain[0]>u['05:30'].gain[2]);assert.ok(u['05:30'].saturation>1);
  // the morning relaxes towards neutral: weaker highlight warmth and tamer saturation than the golden hour, richer than the blue hour
  assert.ok(u['06:05'].highlight[0]-u['06:05'].highlight[2]<u['05:30'].highlight[0]-u['05:30'].highlight[2]);
  assert.ok(u['06:05'].saturation>u['04:30'].saturation&&u['06:05'].saturation<u['05:30'].saturation+.05);
  // the vignette softens as the light comes up
  assert.ok(u['04:30'].vignette.strength>u['06:05'].vignette.strength);
});

test('transitions are continuous: no step in any grade term between consecutive sim seconds from 04:30 to 07:05',()=>{
  let prev=null,worst=0,steps=0;
  for(let t=seconds('04:30');t<=seconds('07:05');t+=1){
    const f=flat(gradingUniforms(modelAtSeconds(t),'high'));
    if(prev)for(let i=0;i<f.length;i++){worst=Math.max(worst,Math.abs(f[i]-prev[i]));}
    prev=f;steps++;
  }
  assert.ok(steps>9000,'every sim second of the mission window is sampled');
  assert.ok(worst<2e-4,`largest per-second step ${worst}`);
});

test('anchors turn on the T16 phases: one grade per lighting phase plus the sub-mission night, exact at the anchor, clamped beyond',()=>{
  for(const id of LIGHTING_PHASES)assert.ok(GRADING_PHASES.includes(id),id);
  assert.deepEqual([...GRADING_PHASES],['night',...LIGHTING_PHASES]);
  const alts=Object.values(PHASE_ALTITUDES);assert.deepEqual(alts,[...alts].sort((a,b)=>a-b));
  for(const id of LIGHTING_PHASES){
    const g=gradeAt(PHASE_ALTITUDES[id]);assert.ok(g.saturation>0&&g.contrast>=1,id);
  }
  assert.deepEqual(gradeAt(-30),gradeAt(-9));assert.deepEqual(gradeAt(40),gradeAt(PHASE_ALTITUDES.day));
  // the authored sun never goes below the blue hour, so the night anchor is only a clamp floor for the model
  assert.ok(layout.sun.keyframes.every(k=>k.altitudeDeg>=PHASE_ALTITUDES['blue-hour']));
  // day is the closest to neutral
  const day=gradeAt(PHASE_ALTITUDES.day),night=gradeAt(-9);
  assert.ok(Math.abs(day.saturation-1)<Math.abs(night.saturation-1)&&day.vignette<night.vignette);
});

test('the grade tints, it does not change exposure: weighted gain 1, black and white fixed, no crushed blacks, no clipped whites added',()=>{
  const ramp=Array.from({length:21},(_,i)=>i/20);
  for(const id of GRADING_PHASES){
    const g=gradeAt(id==='night'?-9:PHASE_ALTITUDES[id]);
    const wg=luma(g.gain);assert.ok(Math.abs(wg-1)<.015,`${id} weighted gain ${wg}`);
    // grey ramp: mean luma within 3 % and no value darker than 0.92x its input (blacks are lifted, never crushed)
    let sumIn=0,sumOut=0;
    for(const v of ramp){
      const out=gradeColor([v,v,v],g),lo=luma(out);sumIn+=v;sumOut+=lo;
      if(v>=.05)assert.ok(lo>=v*.92,`${id} v=${v} -> ${lo}`);
      assert.ok(out.every(c=>c>=0&&c<=1));
    }
    assert.ok(Math.abs(sumOut/sumIn-1)<.03,`${id} mean ratio ${sumOut/sumIn}`);
    // black stays black (lifted by <= 1.5/255 + tint), white does not get brighter than 1 and its luma does not fall by more than 3 %
    const black=gradeColor([0,0,0],g),white=gradeColor([1,1,1],g);
    assert.ok(luma(black)>=0&&luma(black)<=.02,`${id} black ${luma(black)}`);
    assert.ok(luma(white)<=1&&luma(white)>=.97,`${id} white ${luma(white)}`);
    // monotone on greys: a brighter input never grades darker
    let last=-1;for(const v of ramp){const l=luma(gradeColor([v,v,v],g));assert.ok(l>=last-1e-9,`${id} monotone at ${v}`);last=l;}
    // the curve keeps its pivot
    const mid=gradeColor([CONTRAST_PIVOT,CONTRAST_PIVOT,CONTRAST_PIVOT],{...g,shadow:[0,0,0],highlight:[0,0,0],gain:[1,1,1],lift:0});
    assert.ok(mid.every(c=>Math.abs(c-CONTRAST_PIVOT)<1e-9),id);
  }
});

test('vignette: soft, exactly 1 in the middle of the frame, darkening at the corner stays at or below 25 %',()=>{
  for(let r=0;r<=VIGNETTE_INNER;r+=.02)assert.equal(vignetteFactor(r,.2),1);
  let prev=1;for(let r=0;r<=1.0001;r+=.02){const f=vignetteFactor(r,.2);assert.ok(f<=prev+1e-12);prev=f;}
  assert.ok(Math.abs(vignetteFactor(VIGNETTE_OUTER,.2)-.8)<1e-12);
  // aspect-corrected radius: left/right edge midpoints of a 16:9 frame are at r~0.87, top/bottom at ~0.49
  const a=16/9,edgeX=a/Math.hypot(a,1),edgeY=1/Math.hypot(a,1);
  for(const id of GRADING_PHASES){
    const s=gradeAt(id==='night'?-9:PHASE_ALTITUDES[id]).vignette;
    assert.ok(s>0&&s<=VIGNETTE_MAX,`${id} ${s}`);
    assert.ok(1-vignetteFactor(1,s)<=.25+1e-12);assert.ok(1-vignetteFactor(edgeX,s)<1-vignetteFactor(1,s));assert.ok(1-vignetteFactor(edgeY,s)<.01);
  }
  assert.equal(VIGNETTE_MAX,.25);
});

test('quality policy: Low builds nothing; Medium/High are ONE pass, ONE colour target and its depth texture, AO inline',()=>{
  const low=gradingQuality('low');
  assert.deepEqual([low.enabled,low.passes,low.renderTargets,low.depthTextures,low.samples,low.aoTaps],[false,0,0,0,0,0]);
  for(const q of [undefined,null,'ultra'])assert.equal(gradingQuality(q).enabled,false);
  for(const q of ['medium','high']){
    const p=gradingQuality(q);
    assert.equal(p.enabled,true);assert.ok(p.passes<=1&&p.passes===1);assert.ok(p.renderTargets<=1&&p.renderTargets===1);assert.equal(p.depthTextures,1);
    assert.equal(p.samples,4,'multisampled like the canvas');assert.ok(p.aoTaps>=6&&p.aoTaps<=16,'cheap AO');assert.ok(p.aoStrength>0&&p.aoStrength<=.7);
  }
  assert.ok(gradingQuality('high').aoTaps>gradingQuality('medium').aoTaps);
  const m=gradingUniforms(modelAt('05:30'),'medium'),h=gradingUniforms(modelAt('05:30'),'high');
  assert.equal(m.ao.taps,8);assert.equal(h.ao.taps,12);assert.ok(m.ao.fadeEnd<=100);
});

// A GPU-free engine double: records what the module asks of the renderer.
const fakeEngine=(w=1280,h=720)=>({size:[w,h],targets:[],renders:0,getDrawingBufferSize(v){return v.set(this.size[0],this.size[1]);},setRenderTarget(t){this.targets.push(t);},render(){this.renders++;}});
const fakeCamera={projectionMatrix:new THREE.Matrix4(),near:.05,far:7500};

test('Low: no render target, no pass, no material, no allocation, ever',()=>{
  const g=new M01Grading(),e=fakeEngine();
  for(let i=0;i<5;i++)assert.equal(g.begin(e,'low',modelAt('05:30'),fakeCamera),null);
  const d=g.diagnostics;
  assert.deepEqual([d.enabled,d.active,d.passes,d.renderTargets,d.depthTextures,d.samples,d.allocations,d.frames,d.aoTaps],[false,false,0,0,0,0,0,0,0]);
  assert.equal(g.target,null);assert.equal(g.material,null);assert.equal(e.renders,0);assert.deepEqual(e.targets,[]);
  assert.equal(d.uniforms,null);
  g.dispose();
});

test('Medium/High: one target (half-float, MSAA, depth texture), one composite pass per frame, resized with the canvas, freed when going back to Low',()=>{
  const g=new M01Grading(),e=fakeEngine(),m=modelAt('05:30');
  const t=g.begin(e,'medium',m,fakeCamera);
  assert.ok(t instanceof THREE.WebGLRenderTarget);
  assert.equal(t.samples,4);assert.equal(t.texture.type,THREE.HalfFloatType);assert.equal(t.texture.colorSpace,THREE.SRGBColorSpace);
  assert.ok(t.depthBuffer&&t.depthTexture instanceof THREE.DepthTexture);assert.equal(t.isXRRenderTarget,true);
  assert.deepEqual([t.width,t.height],[1280,720]);
  assert.equal(g.begin(e,'medium',m,fakeCamera),t,'same target while the size does not change');
  let d=g.diagnostics;assert.equal(d.renderTargets,1);assert.equal(d.allocations,1);assert.equal(d.passes,0,'no composite yet');
  g.composite(e);d=g.diagnostics;assert.equal(e.renders,1);assert.equal(d.passes,1);assert.equal(d.frames,1);assert.equal(d.active,true);assert.equal(d.aoTaps,8);
  assert.equal(e.targets.at(-1),null,'composite draws to the canvas');
  // resize: same object, new size, no second target
  e.size=[1600,900];assert.equal(g.begin(e,'medium',m,fakeCamera),t);assert.deepEqual([t.width,t.height],[1600,900]);assert.equal(t.depthTexture,g.depth,'the depth texture follows the target (three resizes it on setup)');
  assert.equal(g.diagnostics.resizes,1);assert.equal(g.diagnostics.allocations,1);assert.deepEqual(g.diagnostics.size,[1600,900]);
  // High keeps the single target and adds taps only
  assert.equal(g.begin(e,'high',m,fakeCamera),t);g.composite(e);assert.equal(g.diagnostics.aoTaps,12);assert.equal(g.diagnostics.renderTargets,1);
  // back to Low: everything released
  assert.equal(g.begin(e,'low',m,fakeCamera),null);d=g.diagnostics;
  assert.deepEqual([d.renderTargets,d.depthTextures,d.passes,d.active],[0,0,0,false]);assert.equal(g.target,null);
  // and Medium again allocates exactly one new target
  const t2=g.begin(e,'medium',m,fakeCamera);assert.notEqual(t2,t);assert.equal(g.diagnostics.allocations,2);
  // no lighting model yet: nothing is drawn through the pass
  assert.equal(new M01Grading().begin(e,'high',null,fakeCamera),null);
  g.dispose();assert.equal(g.target,null);assert.equal(g.material,null);assert.equal(g.disposed,true);
});

test('uniform values reach the shader and follow the lighting model; pause = same model = same uniforms',()=>{
  const g=new M01Grading(),e=fakeEngine(),cam={projectionMatrix:new THREE.Matrix4().makePerspective(-1,1,.5625,-.5625,.05,7500),near:.05,far:7500};
  g.begin(e,'high',modelAt('04:30'),cam);const a=structuredClone(g.diagnostics.uniforms);
  const u=g.uniforms;assert.deepEqual(u.uShadow.value.toArray(),a.shadow);assert.equal(u.uContrast.value,a.contrast);assert.equal(u.uVignette.value,a.vignette.strength);
  assert.equal(u.uAoStrength.value,a.ao.strength);assert.deepEqual(u.uClip.value.toArray(),[.05,7500]);assert.ok(u.uProj.value.x>0&&u.uProj.value.y>0);
  g.begin(e,'high',modelAt('04:30'),cam);assert.deepEqual(g.diagnostics.uniforms,a,'same model => same uniforms (a paused game keeps the same battle clock)');
  g.begin(e,'high',modelAt('06:05'),cam);assert.notDeepEqual(g.diagnostics.uniforms,a);
  // per-term toggles zero the term, never the others
  g.debug.vignette=false;g.begin(e,'high',modelAt('06:05'),cam);assert.equal(u.uVignette.value,0);assert.ok(u.uAoStrength.value>0&&u.uGradeOn.value===1);
  g.debug.ao=false;g.debug.grade=false;g.begin(e,'high',modelAt('06:05'),cam);assert.deepEqual([u.uAoStrength.value,u.uGradeOn.value],[0,0]);
  g.debug.bypass=true;assert.equal(g.begin(e,'high',modelAt('06:05'),cam),null,'bypass draws the scene straight to the canvas');
  g.dispose();
});

test('wiring: Low keeps the exact statements, the weapon is drawn after the composite and never into the target, tone mapping untouched',()=>{
  // M01View.render
  assert.match(view,/const post=this\.grading\.begin\(this\.engine,this\.owner\.quality,this\.lightingModel,this\.camera\);/);
  assert.match(view,/this\.engine\.info\.autoReset=false;this\.engine\.info\.reset\(\);\s*\n\s*if\(post\)this\.drawGraded\(post\);else this\.engine\.clear\(\);\s*\n\s*if\(!post\)this\.engine\.render\(this\.scene,this\.camera\);/);
  assert.match(view,/drawGraded\(post\)\{\s*\n\s*const e=this\.engine;\s*\n\s*try\{e\.setRenderTarget\(post\);e\.clear\(\);e\.render\(this\.scene,this\.camera\);\}\s*\n\s*finally\{e\.setRenderTarget\(null\);\}\s*\n\s*this\.grading\.composite\(e\);/);
  const block=view.slice(view.indexOf('const post=this.grading.begin'),view.indexOf('this.engine.clearDepth();this.engine.render(this.weaponScene,this.weaponCamera);'));
  assert.ok(block.length>0&&!/weaponScene|weaponCamera/.test(block),'the weapon scene is not part of the graded target');
  const drawn=view.slice(view.indexOf('drawGraded(post){'),view.indexOf('get diagnostics()'));
  assert.ok(drawn.length>0&&!/weaponScene|weaponCamera/.test(drawn),'nor of the graded draw');
  assert.match(view,/this\.engine\.clearDepth\(\);this\.engine\.render\(this\.weaponScene,this\.weaponCamera\);this\.engine\.toneMappingExposure=1\.15;/);
  assert.match(view,/grading:this\.grading\.stateKey,waterDetail:this\.water\.detail\}/);assert.match(view,/grading:this\.grading\.diagnostics,/);assert.match(view,/this\.grading\.dispose\(\);/);
  // the renderer: ACES, exposure 1.15 and autoClear=false exactly as before; no grading code in it
  assert.match(renderer,/this\.engine\.toneMapping=THREE\.ACESFilmicToneMapping;this\.engine\.toneMappingExposure=1\.15;/);
  assert.match(renderer,/this\.engine\.autoClear=false;/);assert.doesNotMatch(renderer,/m01-grading|setRenderTarget/);
  // the module never touches tone mapping, exposure or autoClear
  assert.doesNotMatch(source,/\.toneMapping\s*=[^=]|toneMappingExposure\s*=[^=]|autoClear\s*=[^=]/);
  assert.doesNotMatch(source,/performance\.now|Date\.now|Math\.random/);
  // never read by the simulation
  const walk=d=>readdirSync(d).flatMap(n=>{const p=d+'/'+n;return statSync(p).isDirectory()?walk(p):[p];});
  for(const dir of ['src/game','src/world','src/core'])for(const f of walk(new URL('../'+dir,import.meta.url).pathname))
    if(f.endsWith('.js'))assert.doesNotMatch(readFileSync(f,'utf8'),/m01-grading/,f);
  // the water module is out of scope
  assert.doesNotMatch(source,/m01-water/);
});

test('three.js pin: the isXRRenderTarget tone-mapping / output-colour-space branches this pass relies on are still there',()=>{
  const pkg=JSON.parse(read('package.json'));assert.equal(pkg.dependencies.three,'0.186.1','three is pinned exactly');
  const three=readFileSync(new URL('../node_modules/three/build/three.module.js',import.meta.url),'utf8');
  assert.equal(JSON.parse(readFileSync(new URL('../node_modules/three/package.json',import.meta.url),'utf8')).version,'0.186.1');
  assert.match(three,/if \( currentRenderTarget === null \|\| currentRenderTarget\.isXRRenderTarget === true \) \{\s*toneMapping = renderer\.toneMapping;/);
  assert.match(three,/outputColorSpace: \( currentRenderTarget === null \) \? renderer\.outputColorSpace : \( currentRenderTarget\.isXRRenderTarget === true \? currentRenderTarget\.texture\.colorSpace : ColorManagement\.workingColorSpace \)/);
  assert.match(three,/const colorSpace = \( _currentRenderTarget === null \) \? _this\.outputColorSpace : \( _currentRenderTarget\.isXRRenderTarget === true \? _currentRenderTarget\.texture\.colorSpace : ColorManagement\.workingColorSpace \);/);
  assert.match(three,/newRenderTarget\.isXRRenderTarget = true;/);
});

test('test-only A/B hook is opt-in (?debug) and only toggles bypass / grade / vignette / ao',()=>{
  const had={w:Object.getOwnPropertyDescriptor(globalThis,'window'),l:Object.getOwnPropertyDescriptor(globalThis,'location')};
  try{
    const win={};Object.defineProperty(globalThis,'window',{value:win,configurable:true,writable:true});
    Object.defineProperty(globalThis,'location',{value:{search:''},configurable:true,writable:true});
    new M01Grading();assert.equal(win.m01GradingDebug,undefined);
    globalThis.location={search:'?debug=1'};
    const g=new M01Grading();assert.equal(g.stateKey,'0111');
    assert.deepEqual(win.m01GradingDebug.get(),{bypass:false,grade:true,vignette:true,ao:true});
    win.m01GradingDebug.set({vignette:false,ao:0,bogus:true});assert.deepEqual(g.debug,{bypass:false,grade:true,vignette:false,ao:false});assert.equal(g.stateKey,'0100');
    win.m01GradingDebug.set({bypass:true});assert.equal(g.stateKey,'1100');assert.equal(g.diagnostics.bypass,true);
  }finally{
    for(const [k,d] of [['window',had.w],['location',had.l]])d?Object.defineProperty(globalThis,k,d):delete globalThis[k];
  }
});
