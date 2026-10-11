import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {eyePosition} from '../../src/world/spatial.js';

// T09/T28 (M01 terrain war-ground V1), presentation only. The game runs live (pointer lock granted) and is paused by releasing the lock; the
// paused frame is screenshot. Only the player's position and view are moved (crouched, eye 1.08 m, pitch limit -1.25 rad, so the nearest
// ground point is ~1.14 m from the eye); no clock, event or objective is injected. The start state of the real simulation is used.
//  near-1m / mid-5m / far-50m  along the trodden ignition_line at x -100 (slant eye -> ground point 1.14 / 5 / 50 m)
//  rail-5m                     on the crest of rail_embankment_west looking along the two tracks: ballast shoulder either side
//  road-5m                     the worn cart road (road_approach_west) with its ruts
//  bank-5m                     the wet band at the west Vistula bank (x 25)
// Quality: high / medium / low load the matching texture set; the diagnostics carry the computed GPU budget (never FPS).
// A/B: the same views with ?terrain=legacy (the old single tiled soil canvas); the new ground must show more luminance variance.
// M01_TERRAIN_EVIDENCE=1 writes the screenshots and the report into docs/verification/m01-runtime/m01-terrain-war-ground-v1/.
const key='cod-guerra:checkpoint:m01:v2',EVIDENCE='docs/verification/m01-runtime/m01-terrain-war-ground-v1';
const SAVE=process.env.M01_TERRAIN_EVIDENCE==='1';
const MB=1024*1024,BUDGET={high:24*MB,medium:8*MB,low:8*MB},SAMPLERS_TODAY=2;
const CROUCH_EYE=1.08,PITCH_LIMIT=1.25;
const VIEWS=Object.freeze({
  'near-1m':{aim:[-100,8.55],angle:0,slant:CROUCH_EYE/Math.sin(PITCH_LIMIT)},
  'mid-5m':{aim:[-100,8.55],angle:0,slant:5},
  'far-50m':{aim:[-100,8.55],angle:0,slant:50},
  'rail-5m':{aim:[-106,-0.8],angle:Math.PI,slant:5},
  'road-5m':{aim:[-100,43.3],angle:0,slant:5},
  'bank-5m':{aim:[21,20],angle:0,slant:5},
});
const world=new M01Simulation(19390901).world,start=new M01Simulation(19390901).snapshot(false);
function place(view){
  const v=VIEWS[view],s=structuredClone(start),horizontal=Math.sqrt(v.slant*v.slant-CROUCH_EYE*CROUCH_EYE);
  const x=v.aim[0]-Math.cos(v.angle)*horizontal,z=v.aim[1]-Math.sin(v.angle)*horizontal,groundY=world.heightAt(v.aim[0],v.aim[1]),y=world.heightAt(x,z);
  Object.assign(s.player,{x,y,z,moveBlend:0,sprinting:false,crouched:true,aiming:false,angle:v.angle});
  // pitch from the actual eye height above the aimed ground point
  const eye=eyePosition(s.player);s.player.pitch=-Math.atan2(eye.y-groundY,horizontal);
  return {snapshot:s,eye,groundY,horizontal};
}
/** Decodes PNGs in a blank page: luminance statistics of a screen region (+ mean local 8x8 std = texture richness). */
async function stats(browser,png,region){
  const page=await browser.newPage();
  try{
    return await page.evaluate(async({b64,region})=>{
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
      const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
      const {data,width}=ctx.getImageData(0,0,bitmap.width,bitmap.height),lum=(x,y)=>{const i=(y*width+x)*4;return .2126*data[i]+.7152*data[i+1]+.0722*data[i+2];};
      let n=0,s=0,s2=0,local=0,blocks=0;
      for(let y=region.y0;y<region.y1;y++)for(let x=region.x0;x<region.x1;x++){const l=lum(x,y);n++;s+=l;s2+=l*l;}
      for(let by=region.y0;by+8<=region.y1;by+=8)for(let bx=region.x0;bx+8<=region.x1;bx+=8){
        let bs=0,bs2=0;for(let y=by;y<by+8;y++)for(let x=bx;x<bx+8;x++){const l=lum(x,y);bs+=l;bs2+=l*l;}
        const m=bs/64;local+=Math.sqrt(Math.max(0,bs2/64-m*m));blocks++;}
      const mean=s/n;return {pixels:n,mean,std:Math.sqrt(Math.max(0,s2/n-mean*mean)),localStd:local/blocks};
    },{b64:png.toString('base64'),region});
  }finally{await page.close();}
}
async function capture(browser,info,{view,quality='high',legacy=false}){
  const {snapshot}=place(view),page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
  try{
    await page.goto(`?debug=1${legacy?'&terrain=legacy':''}`);
    await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
    await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
    await page.waitForFunction(()=>{const d=window.gameDiagnostics?.();return d&&!d.paused&&d.m01.renderedFrames>=4&&Boolean(d.m01.terrain);},null,{timeout:240000});
    // Medium/High textures are fetched asynchronously: wait until the set is resident and one more frame has drawn with it.
    if(!legacy){const want={high:4,medium:4,low:1}[quality];
      await page.waitForFunction(w=>window.gameDiagnostics().m01.terrain.files.length===w,want,{timeout:120000});}
    const f0=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
    await page.waitForFunction(f=>window.gameDiagnostics().m01.renderedFrames>=f+3,f0,{timeout:60000});
    await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    await page.waitForTimeout(500);
    const data=await page.evaluate(()=>window.gameDiagnostics());
    const shot={style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000},png=await page.screenshot({...shot}),jpeg=await page.screenshot({...shot,type:'jpeg',quality:88});
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    return {png,jpeg,diagnostics:data,view,quality,legacy,info};
  }finally{await page.close();}
}
const name=c=>`m01-terrain-${c.view}-${c.quality}${c.legacy?'-legacy':''}`;
function save(c,report){
  const dir=SAVE?EVIDENCE:null;
  if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name(c)+'.jpg'),c.jpeg);}
  fs.writeFileSync(c.info.outputPath(name(c)+'.png'),c.png);
  return report;
}
// Left half of the frame below the horizon: clear of the first-person weapon (lower right) and of the sky.
const REGIONS={'near-1m':{x0:40,x1:640,y0:260,y1:700},'mid-5m':{x0:40,x1:640,y0:420,y1:700},'far-50m':{x0:40,x1:640,y0:430,y1:700},'rail-5m':{x0:40,x1:640,y0:380,y1:700},'road-5m':{x0:40,x1:640,y0:420,y1:700},'bank-5m':{x0:40,x1:640,y0:380,y1:700}};
const results={};
function checkDiagnostics(c){
  const t=c.diagnostics.m01.terrain;
  expect(t.material).toBe('m01-terrain-macro-v1');expect(t.quality).toBe(c.quality);expect(t.tier).toBe(c.quality);
  expect(t.failures).toEqual([]);expect(t.samplers-SAMPLERS_TODAY,'extra samplers vs the single-texture ground (map+bump)').toBeLessThanOrEqual(4);
  expect(t.gpuBytes,`terrain texture GPU bytes incl. mips (${t.gpuBytes})`).toBeLessThanOrEqual(BUDGET[c.quality]);
  expect(t.lowDetail).toBe(c.quality==='low'?1:0);
  return t;
}

for(const view of ['near-1m','mid-5m','far-50m','rail-5m','road-5m','bank-5m'])test(`${view}: war ground (high) vs the legacy single soil texture`,async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const c=await capture(browser,info,{view}),t=checkDiagnostics(c);
  expect(t.textures).toBe(5);expect(t.mask).toEqual({width:2048,height:640});expect(t.files).toHaveLength(4);
  const l=['bank-5m','rail-5m','road-5m'].includes(view)?null:await capture(browser,info,{view,legacy:true});
  const s=await stats(browser,c.png,REGIONS[view]),ls=l?await stats(browser,l.png,REGIONS[view]):null;
  results[view]={terrain:t,drawCalls:c.diagnostics.drawCalls,triangles:c.diagnostics.triangles,stats:s,legacyStats:ls,legacyTerrain:l?.diagnostics.m01.terrain??null,legacyDrawCalls:l?.diagnostics.drawCalls??null};
  save(c,results[view]);if(l)save(l,null);
  if(SAVE)fs.writeFileSync(path.join(EVIDENCE,`m01-terrain-${view}-report.json`),JSON.stringify(results[view],null,2));
  await info.attach(`${view}.json`,{body:JSON.stringify(results[view],null,2),contentType:'application/json'});
  expect(s.pixels).toBeGreaterThan(50000);
  expect(s.std,`not a flat colour (${JSON.stringify(s)})`).toBeGreaterThan(3);
  if(ls){
    expect(s.std,`ground luminance variance > legacy (${JSON.stringify({new:s,old:ls})})`).toBeGreaterThan(ls.std);
    expect(s.localStd,`ground local texture richness > legacy (${JSON.stringify({new:s,old:ls})})`).toBeGreaterThan(ls.localStd);
    expect(c.diagnostics.drawCalls,'no extra draw calls vs legacy ground').toBeLessThanOrEqual(l.diagnostics.drawCalls);
  }
});

for(const quality of ['medium','low'])test(`${quality}: tier texture set, budget and look at 5 m`,async({browser},info)=>{
  test.setTimeout(process.env.CI?900000:600000);
  const c=await capture(browser,info,{view:'mid-5m',quality}),t=checkDiagnostics(c);
  const s=await stats(browser,c.png,REGIONS['mid-5m']);
  results[`mid-5m-${quality}`]={terrain:t,drawCalls:c.diagnostics.drawCalls,triangles:c.diagnostics.triangles,stats:s};
  save(c,null);
  if(SAVE)fs.writeFileSync(path.join(EVIDENCE,`m01-terrain-mid-5m-${quality}-report.json`),JSON.stringify(results[`mid-5m-${quality}`],null,2));
  await info.attach(`mid-5m-${quality}.json`,{body:JSON.stringify(results[`mid-5m-${quality}`],null,2),contentType:'application/json'});
  if(quality==='medium'){expect(t.textures).toBe(5);expect(t.mask).toEqual({width:1024,height:320});expect(t.files).toHaveLength(4);}
  else{expect(t.textures).toBe(2);expect(t.files).toEqual(['terrain-detail-a-512.png']);expect(t.mask).toEqual({width:1024,height:320});}
  expect(s.std).toBeGreaterThan(3);
});
