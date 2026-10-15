import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {driver,toRepair} from '../helpers/m01-route.js';
import {FADE,fadeDuration,smoothstep} from '../../src/render/m01-animation-resolver.js';

// Production UI, real GLBs. The page is frozen at the exact saved clock (pause), so every pose is a pure function of
// (saved actor data, sim clock): the animation resolver must give the same blend while paused and after a reload.
// This is a state/determinism check of the resolver wiring, not a visual quality claim (captures are separate evidence).
const key='cod-guerra:checkpoint:m01:v2',snapshot=toRepair(driver()).sim.snapshot(false);

// Real control route (support pilot, same as toRepair) with two observation points, no injected state:
//  - drop: the save one tick before the player delivers the crate (test (a) presses E in the browser);
//  - death: saves 1..3 ticks after the scripted/pilot-killed MG34 gunner dies (test (b) loads each cold).
// The route is Node-only and takes a few seconds; nothing here is shipped or read by src/**.
function buildScenes(){
  const d=driver(19390901,{support:true}),{sim,step,until,walk}=d;
  step({skip:true});
  walk(-66,26);walk(-15,26);walk(-15,2);walk(16,2);step({interact:true});
  until(()=>sim.active('follow_sergeant'),120);
  walk(-15,2);walk(-15,11);walk(-147,11);walk(-50,11);walk(-44,11);
  walk(-245,9);walk(-274,9);walk(-274,21);walk(-265,21);step({interact:true});
  walk(-274,21);walk(-274,8);walk(-123,8);
  const drop=sim.snapshot(false);                    // identical to toRepair() up to here; the next step is its final interact
  step({interact:true});
  if(!sim.active('cover_repair'))throw new Error('Route did not deliver the crate');
  walk(-120,16.5);until(()=>!sim.actor('de_east_0').alive,120);
  const gunner=sim.actor('de_east_0'),death=[];
  for(let i=0;i<3;i++){step({});death.push(sim.snapshot(false));}
  return {drop,death,diedAt:gunner.diedAt};
}
const scenes=buildScenes();
async function freezeClick(page,selector){
  await page.evaluate(()=>{
    const hold=e=>{if(document.pointerLockElement?.id==='game'){
      document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();
    }};document.addEventListener('pointerlockchange',hold,true);
  });
  await page.locator(selector).click();await expect(page.locator('#pause')).toBeVisible();
}
// The menu keeps drawing the fresh mission (clock 0) behind it, so `characters.actors` is already populated before Continue loads
// the save, and those poses/actors belong to another state. m01.demolition.clock is the sim clock of the last frame the view drew
// (M01View.lastClock, set in the same synchronous render() that builds the actor list): wait until a frame was drawn at the loaded
// clock, then every read of `characters.actors` is that frame. Nothing is filtered afterwards; the poses are compared whole.
const drawnAt=(page,clock)=>page.waitForFunction(clock=>{
  const g=window.gameDiagnostics?.();return g?.clock===clock&&g.m01?.demolition?.clock===clock;
},clock);
async function open(page){
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'));
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeEnabled();
  await freezeClick(page,'#continue');
  await drawnAt(page,snapshot.clock);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.actors?.length>0);
}
const poses=d=>d.m01.characters.actors.map(({id,clip,clipTime,blend})=>({id,clip,clipTime,blend}));
const sum=blend=>blend.reduce((s,b)=>s+b.weight,0);

test('production UI: every visible soldier carries a valid clip blend, and pause and reload keep the pose identical',async({page},info)=>{
  test.setTimeout(process.env.CI?180000:120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  const frozen=await page.evaluate(()=>window.gameDiagnostics()),first=poses(frozen);
  expect(frozen.clock).toBe(snapshot.clock);expect(frozen.m01.demolition.clock,'actor list comes from a frame drawn at the saved clock, not a stale menu frame').toBe(snapshot.clock);
  expect(first.length).toBeGreaterThan(0);
  for(const a of first){
    expect(Array.isArray(a.blend),a.id).toBe(true);expect(a.blend.length,a.id).toBeGreaterThanOrEqual(1);
    expect(Math.abs(sum(a.blend)-1),`${a.id} weights sum to one`).toBeLessThan(1e-6);
    expect(a.blend.some(b=>b.clip===a.clip),`${a.id} blend contains its target clip`).toBe(true);
    expect(a.blend.every(b=>Number.isFinite(b.weight)&&b.weight>=0&&b.weight<=1+1e-9&&Number.isFinite(b.time)&&b.time>=0),a.id).toBe(true);
  }
  // Pause: the clock stops and the renderer keeps drawing; nothing may advance.
  await page.waitForTimeout(300);
  const later=await page.evaluate(()=>window.gameDiagnostics());
  expect(later.clock).toBe(frozen.clock);expect(poses(later)).toEqual(first);
  await page.screenshot({path:info.outputPath('anim-resolver-paused.jpg'),type:'jpeg',quality:80});
  // Pause freeze, pixel level: two captures of the 3D canvas 300 ms apart (the #pause menu is hidden, it is not part of the scene).
  // Playwright waits for stable frames itself, so the 300 ms are an explicit wall-clock gap between the two reads.
  const box=await page.locator('#game').boundingBox();
  const shot=()=>page.screenshot({type:'png',clip:box,animations:'disabled',style:'#pause {visibility:hidden !important;}'});
  const pixA=await shot();await page.waitForTimeout(300);const pixB=await shot();
  const clockB=(await page.evaluate(()=>window.gameDiagnostics())).clock;
  writeFileSync(info.outputPath('anim-resolver-paused-a.png'),pixA);writeFileSync(info.outputPath('anim-resolver-paused-b.png'),pixB);
  let differing=0,total=0,identical=pixA.equals(pixB);
  if(!identical)({differing,total}=await page.evaluate(async([a,b])=>{
    const decode=async s=>{const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0)),bmp=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
      const ctx=new OffscreenCanvas(bmp.width,bmp.height).getContext('2d');ctx.drawImage(bmp,0,0);return ctx.getImageData(0,0,bmp.width,bmp.height);};
    const x=await decode(a),y=await decode(b);let n=0;
    for(let i=0;i<x.data.length;i+=4)if(x.data[i]!==y.data[i]||x.data[i+1]!==y.data[i+1]||x.data[i+2]!==y.data[i+2])n++;
    return {differing:n,total:x.width*x.height};
  },[pixA.toString('base64'),pixB.toString('base64')]));
  await info.attach('anim-resolver-paused-a',{path:info.outputPath('anim-resolver-paused-a.png'),contentType:'image/png'});
  await info.attach('anim-resolver-paused-b',{path:info.outputPath('anim-resolver-paused-b.png'),contentType:'image/png'});
  await info.attach('anim-resolver-pause-pixels',{body:JSON.stringify({kind:'pause freeze, two #game captures 300 ms apart (state determinism / presentation evidence, not a visual quality claim)',
    clip:box,bytes:[pixA.length,pixB.length],byteIdentical:identical,differingPixels:differing,totalPixels:total||null,clock:[frozen.clock,clockB]}),contentType:'application/json'});
  expect(clockB).toBe(frozen.clock);expect(differing,'pixels that changed while paused').toBe(0);
  // Reload: a fresh renderer with no history rebuilds the same pose from the saved actors and the saved clock.
  await page.reload();
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'));
  await freezeClick(page,'#continue');
  await drawnAt(page,snapshot.clock);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.actors?.length>0);
  const reloaded=await page.evaluate(()=>window.gameDiagnostics());
  expect(reloaded.clock).toBe(frozen.clock);expect(reloaded.m01.demolition.clock,'reloaded actor list comes from a frame drawn at the saved clock').toBe(snapshot.clock);
  expect(poses(reloaded)).toEqual(first);
  expect(errors).toEqual([]);
  await info.attach('anim-resolver-pose',{body:JSON.stringify({kind:'production UI, paused at the saved clock; state determinism of the animation resolver (not a visual quality claim)',clock:frozen.clock,actors:first.length,blended:first.filter(a=>a.blend.length>1).length,poses:first}),contentType:'application/json'});
});

// ---------------------------------------------------------------------------------------------------------------------
// (a) Posture fade, live path. The page gets a virtual frame clock (requestAnimationFrame callbacks receive 1/30 s per
// frame, whatever the host speed) so a slow software-GL frame cannot skip the 0.3 s fade; Game.loop is unchanged and
// the simulation is stepped by the real game loop. The player presses E to deliver the crate, which makes the sappers
// crouch (postureSince = sim clock). A sampler reads window.gameDiagnostics() after every game frame and takes canvas
// snapshots of the first sapper that is mid-fade. Everything is presentation-side; no src hook was added.
const FRAME=1000/30,SPAN=4;
function installSampler({frame,span,prefer}){
  const raf=window.requestAnimationFrame.bind(window);let virtual=0;
  const S=window.__animLive={frames:[],shots:[],focus:null,mid:false,end:false,done:false,first:null,last:null,maxSumError:0,wall:[]};
  const after=()=>{
    if(S.done)return;
    let g;try{g=window.gameDiagnostics?.();}catch{return;}
    const actors=g?.m01?.characters?.actors;
    if(!actors||g.paused||document.pointerLockElement?.id!=='game'||S.last===g.clock)return;
    S.last=g.clock;S.first??=g.clock;S.wall.push(Math.round(performance.now()));
    const fading=[];
    for(const a of actors){
      S.maxSumError=Math.max(S.maxSumError,Math.abs(a.blend.reduce((s,b)=>s+b.weight,0)-1));
      if(a.blend.length>1)fading.push({id:a.id,clip:a.clip,blend:a.blend.map(({clip,weight,time})=>({clip,weight,time}))});
    }
    S.frames.push({clock:g.clock,actors:actors.length,fading});
    const grab=tag=>{try{S.shots.push({tag,clock:g.clock,id:S.focus,url:document.getElementById('game').toDataURL('image/jpeg',.85)});}catch(e){S.shotError=String(e);}};
    if(!S.focus&&fading.length){S.focus=(fading.find(f=>prefer.includes(f.id))??fading[0]).id;grab('start');}
    else if(S.focus){
      const a=actors.find(x=>x.id===S.focus),target=a?.blend.find(b=>b.clip===a.clip)?.weight??0;
      if(a&&a.blend.length>1&&target>=.5&&!S.mid){S.mid=true;grab('mid');}
      if(a&&a.blend.length===1&&S.mid&&!S.end){S.end=true;grab('end');S.done=true;}
    }
    if(g.clock-S.first>=span)S.done=true;
  };
  window.requestAnimationFrame=cb=>raf(()=>{virtual+=frame;cb(virtual);after();});
}

test('production UI, live: sappers cross-fade into the crouched work pose with exactly smoothstep weights, sampled every frame',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:180000);
  const t0=Date.now(),phase={};
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(installSampler,{frame:FRAME,span:SPAN,prefer:['pawel_krawiec','sapper_2','sapper_3']});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:scenes.drop});
  await page.goto('?debug=1&visual-verify=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'));
  await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeEnabled();
  phase.loadMs=Date.now()-t0;
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');
  const sampling=Date.now();
  // The route stands one tick before delivering the crate; E is the same key the real route sends as `interact`.
  for(let attempt=0;attempt<3;attempt++){
    await page.keyboard.press('KeyE',{delay:40});
    const seen=await page.waitForFunction(()=>window.__animLive.focus||window.__animLive.last-window.__animLive.first>1,null,{timeout:20000}).then(()=>true,()=>false);
    if(seen&&await page.evaluate(()=>window.__animLive.focus))break;
  }
  await page.waitForFunction(()=>window.__animLive.done,null,{timeout:150000}).catch(()=>{});
  phase.samplingMs=Date.now()-sampling;
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const live=await page.evaluate(()=>({...window.__animLive,shots:window.__animLive.shots.map(({url,...rest})=>({...rest,url}))}));
  const state=await page.evaluate(()=>window.gameVerificationState());
  const since=Object.fromEntries(state.snapshot.actors.map(a=>[a.id,{postureSince:a.postureSince,posture:a.posture,crouched:a.crouched}]));
  // Weights of every two-layer posture fade must equal smoothstep((clock-postureSince)/0.3); only those whose clips really change
  // posture (fadeDuration == FADE.posture) and whose sim stamp lies inside the fade are comparable.
  const checks=[];
  for(const f of live.frames)for(const a of f.fading){
    if(a.blend.length!==2)continue;
    const to=a.blend.find(b=>b.clip===a.clip),from=a.blend.find(b=>b!==to);
    if(!to||!from||fadeDuration(from.clip,to.clip)!==FADE.posture)continue;
    const stamp=since[a.id]?.postureSince;
    if(!(stamp>0)||f.clock<stamp-1e-6||f.clock-stamp>=FADE.posture)continue;
    const expected=smoothstep((f.clock-stamp)/FADE.posture);
    checks.push({id:a.id,clock:f.clock,sinceStamp:+(f.clock-stamp).toFixed(4),from:from.clip,to:to.clip,weight:to.weight,expected,error:Math.abs(to.weight-expected)});
  }
  const shots=[];
  for(const sh of live.shots){
    const file=info.outputPath(`anim-live-posture-${sh.tag}.jpg`);writeFileSync(file,Buffer.from(sh.url.split(',')[1],'base64'));
    await info.attach(`anim-live-posture-${sh.tag}`,{path:file,contentType:'image/jpeg'});shots.push({tag:sh.tag,id:sh.id,clock:sh.clock,file});
  }
  const report={kind:'live posture cross-fade of the production renderer, sim stepped by the real game loop under a virtual 1/30 s frame clock (state determinism / presentation evidence, not a visual quality claim)',
    path:'retarget() + transitionStamp(): posture stamp from the simulation, no wall clock',
    frameSeconds:FRAME/1000,dropClock:scenes.drop.clock,framesSampled:live.frames.length,firstClock:live.first,lastClock:live.last,focus:live.focus,
    maxSumError:live.maxSumError,shotError:live.shotError??null,shots,phaseMs:phase,wallPerFrameMs:live.wall.slice(1).map((w,i)=>w-live.wall[i]),
    postureSince:Object.fromEntries(Object.entries(since).filter(([id])=>['pawel_krawiec','sapper_2','sapper_3'].includes(id))),
    comparedAgainstSmoothstep:checks.length,maxWeightError:checks.reduce((m,c)=>Math.max(m,c.error),0),
    framesWithFadingActors:live.frames.filter(f=>f.fading.length).map(f=>({clock:f.clock,fading:f.fading})),checks};
  await info.attach('anim-live-posture-blend',{body:JSON.stringify(report),contentType:'application/json'});
  expect(errors).toEqual([]);
  expect(live.maxSumError,'weights sum to one in every sampled frame').toBeLessThan(1e-6);
  expect(live.focus,'a sapper must be seen mid cross-fade').not.toBeNull();
  expect(checks.length,'frames compared against smoothstep((clock-postureSince)/0.3)').toBeGreaterThanOrEqual(2);
  for(const c of checks)expect(c.error,`${c.id} at ${c.clock}`).toBeLessThan(1e-3);
  expect(shots.map(s=>s.tag)).toContain('start');
});

// ---------------------------------------------------------------------------------------------------------------------
// (b) Death fade, cold-load path. The MG34 gunner de_east_0 dies at a known sim time; three saves taken 0.05/0.10/0.15 s later
// (inside the 0.2 s death fade) are loaded paused by a fresh renderer with no history, which has to rebuild the fade from
// actor.diedAt alone. The gunner is far from the player (~1.2 km), so the screenshot only shows the scene; the numbers are the evidence.
test('production UI, cold load: the MG34 gunner death cross-fades into fallen from the saved diedAt',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const rows=[],start=Date.now();
  for(const [i,snap] of scenes.death.entries()){
    await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot:snap});
    if(i===0)await page.goto('?debug=1');else await page.reload();
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.characters?.loaded.includes('pl:2'));
    await expect(page.locator('#error')).toBeHidden();await expect(page.locator('#continue')).toBeEnabled();
    await freezeClick(page,'#continue');
    await drawnAt(page,snap.clock); // not the menu frame of the fresh mission: the fade has to be read from the frame drawn at the save
    const rendered=await page.waitForFunction(()=>window.gameDiagnostics().m01.characters.actors?.some(a=>a.id==='de_east_0'),null,{timeout:30000}).then(()=>true,()=>false);
    const d=await page.evaluate(()=>window.gameDiagnostics()),a=d.m01.characters.actors?.find(x=>x.id==='de_east_0');
    const age=snap.clock-scenes.diedAt,row={tick:i+1,clock:d.clock,saveClock:snap.clock,age,rendered,clip:a?.clip??null,blend:a?.blend??null,wallMs:Date.now()-start,
      expectedFallenWeight:smoothstep(age/FADE.death),expectedFallenTime:age};
    if(a){
      const file=info.outputPath(`anim-death-${i+1}.jpg`);
      await page.screenshot({path:file,type:'jpeg',quality:80,style:'#pause {visibility:hidden !important;}'});
      await info.attach(`anim-death-${i+1}`,{path:file,contentType:'image/jpeg'});row.screenshot=file;
    }
    rows.push(row);
  }
  await info.attach('anim-death-blend',{body:JSON.stringify({kind:'cold-load death cross-fade of the production renderer (derive() from actor.diedAt); state determinism / presentation evidence, not a visual quality claim. The gunner is ~1.2 km from the camera.',
    path:'derive(): fresh blend record rebuilt from simulation data',diedAt:scenes.diedAt,fadeSeconds:FADE.death,rows,sceneNote:rows.some(r=>!r.rendered)?'de_east_0 not in the rendered actor list for at least one save':'de_east_0 rendered in all saves'}),contentType:'application/json'});
  expect(errors).toEqual([]);
  for(const r of rows){
    expect(r.clock).toBe(r.saveClock);
    if(!r.rendered)continue; // absence is reported, not failed; presence has to be exact
    expect(Math.abs(r.blend.reduce((s,b)=>s+b.weight,0)-1),`tick ${r.tick} weights sum to one`).toBeLessThan(1e-6);
    expect(r.clip).toBe('fallen');
    const fallen=r.blend.find(b=>b.clip==='fallen'),other=r.blend.filter(b=>b.clip!=='fallen');
    expect(other.length,`tick ${r.tick} keeps the pre-death clip while fading`).toBe(1);
    expect(fallen.weight).toBeGreaterThan(0);expect(fallen.weight).toBeLessThan(1);
    expect(fallen.weight,`tick ${r.tick} fallen weight`).toBeCloseTo(r.expectedFallenWeight,6);
    expect(fallen.time,`tick ${r.tick} fallen clip time`).toBeCloseTo(r.expectedFallenTime,6);
  }
  expect(rows.some(r=>r.rendered),'de_east_0 should be among the rendered actors').toBe(true);
});
