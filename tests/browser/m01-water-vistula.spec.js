import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {eyePosition} from '../../src/world/spatial.js';
import {projectToScreen} from '../../src/render/m01-demolition.js';
import {route} from '../helpers/m01-route.js';

// T42 (M01 Vistula water V1), presentation only. Two river views at 04:30 and 06:05 from the real simulation route (same fixtures as
// m01-lighting-dawn.spec.js: the first gameplay step within two minutes after the mark, else the first step at the mark). Only the
// player's position and view are moved to the west bank; no clock, event or objective is injected. The page runs live (pointer lock
// granted), is paused by releasing the lock and the SAME paused frame is screenshot twice, 1 s apart: the water region must be
// pixel-identical (the water follows the sim clock, which stops with the pause).
//  view12  west bank (x 24, z 20) looking east along the corridor between the bridges: rail and road piers, wake downstream (north, left)
//  view13  west bank looking north-east along the river: long grazing view, the sky must tint the far water
// Close-ups (06:05) from inside the river channel (the sim places the player on y = -10, water top -9.94; nothing in the sim reacts to it):
//  pier-ring  about 20 m from the rail and road piers, looking at the foam ring around rail_support_01 / road_support_01
//  pier-wake  22 m west of the downstream (north, -z) wake of rail_support_01, looking east along it
//  bank       18 m east of the wet bank and waterline fringe at x 25, looking along it
// Foam / wet-bank evidence is UNCONFOUNDED: the SAME paused page is screenshot with the foam and wet-bank terms on and then off (the
// opt-in ?debug hook window.m01WaterDebug.setDetail, presentation only). Nothing else differs, so the control region (open water, no foam,
// no wet blend) must be pixel-identical and the foam / bank regions must change.
// M01_WATER_BASELINE=1 only captures (png + diagnostics, '-before' suffix); it asserts nothing about the new module, so it can be
// run on the base commit a1554f3 for the BEFORE images.
const key='cod-guerra:checkpoint:m01:v2',baseline=process.env.M01_WATER_BASELINE==='1';
const clocks=['04:30','06:05'];
// Low quality floor. BEFORE (the previous flat material, base a1554f3) measured mean luminance 56 in the view13 06:05 water region; the
// first T42 Low measured 7.5 (near-black, std 2.7). Low must not be darker than ~the old look (10 % slack) and never near-black.
const BEFORE_LOW_MEAN=56,LOW_MEAN_FLOOR=50,NEAR_BLACK=20;
// Foam / wet-bank ON vs OFF deltas (luminance 0..255 per pixel, |dL| >= CHANGED_DL counts as changed). Declared before the first CI measurement.
const CHANGED_DL=16;
const DETAIL_MIN=Object.freeze({'pier-ring':{meanAbs:6,changed:.12},'pier-wake':{meanAbs:3,changed:.06},bank:{meanAbs:4,changed:.12}});
const first={},free={};
route(19390901,{support:true,onStep:({sim})=>{
  for(const clock of clocks){
    const at=seconds(clock);
    if(!first[clock]&&sim.battleClock>=at)first[clock]=structuredClone(sim.snapshot(false));
    if(!free[clock]&&sim.battleClock>=at&&sim.battleClock<=at+120&&!sim.scene&&!sim.mission.complete)free[clock]=structuredClone(sim.snapshot(false));
  }
}});
for(const clock of clocks)if(!first[clock])throw new Error('Missing route snapshot at '+clock);

const FOV=70,WIDTH=1280,HEIGHT=720,FOCAL=(HEIGHT/2)/Math.tan(FOV*Math.PI/360),WATER_Y=-9.94;
const world=new M01Simulation(19390901).world;
const VIEWS=({
  view12:{x:24,z:20,aim:{x:150,y:-9,z:20},lift:0,
    water:[[60,WATER_Y,-5],[60,WATER_Y,-60],[225,WATER_Y,-5],[225,WATER_Y,-60]],
    wake:[[140.9,WATER_Y,-14],[140.9,WATER_Y,-34]],control:[[205,WATER_Y,-14],[205,WATER_Y,-34]]},
  view13:{x:30,z:20,aim:{x:110,y:-9.94,z:-300},lift:0,
    water:[[45,WATER_Y,-70],[45,WATER_Y,-260],[200,WATER_Y,-70],[200,WATER_Y,-260]],
    // the bank wall fills the left of this frame and the rifle the lower right: measure only the open water between them (below the horizon at y~357, above the weapon)
    box:{x0:520,x1:1280,y0:366,y1:466}}
});
const CLOSEUPS=Object.freeze({
  'pier-ring':{x:126,z:24,aim:{x:141,y:-9.94,z:-4},lift:0,
    detail:[[133,WATER_Y,9],[149,WATER_Y,9],[133,WATER_Y,20],[149,WATER_Y,20]],
    control:[[190,WATER_Y,-5],[230,WATER_Y,-5],[190,WATER_Y,-30],[230,WATER_Y,-30]]},
  'pier-wake':{x:122,z:-28,aim:{x:141,y:-9.94,z:-34},lift:0,
    detail:[[134,WATER_Y,-22],[148,WATER_Y,-22],[134,WATER_Y,-45],[148,WATER_Y,-45]],
    control:[[175,WATER_Y,-26],[200,WATER_Y,-26],[175,WATER_Y,-42],[200,WATER_Y,-42]]},
  bank:{x:52,z:18,aim:{x:27,y:-9.94,z:-6},lift:0,
    detail:[[26,WATER_Y,-5],[38,WATER_Y,-5],[26,WATER_Y,-25],[38,WATER_Y,-25]],
    control:[[41,WATER_Y,-4],[46,WATER_Y,-4],[41,WATER_Y,-16],[46,WATER_Y,-16]]}
});
Object.assign(VIEWS,CLOSEUPS);
function place(snapshot,view){
  const s=structuredClone(snapshot),y=world.heightAt(view.x,view.z);
  Object.assign(s.player,{x:view.x,y,z:view.z,moveBlend:0,sprinting:false,crouched:false,aiming:false});
  const eye=eyePosition(s.player),dx=view.aim.x-eye.x,dy=view.aim.y-eye.y,dz=view.aim.z-eye.z;
  s.player.angle=Math.atan2(dz,dx);s.player.pitch=Math.atan2(dy,Math.hypot(dx,dz))-Math.atan(view.lift/FOCAL);return s;
}
// Bounding box (CSS px) of the projected world points, clipped to the viewport; a point behind the camera fails the proof.
function regionOf(camera,points,pad=[0,0]){
  const p=points.map(([x,y,z])=>({point:[x,y,z],...projectToScreen(camera,{x,y,z})}));
  for(const q of p)expect(q.behind,`${q.point} is in front of the camera`).toBe(false);
  const xs=p.map(q=>q.x),ys=p.map(q=>q.y);
  return {x0:Math.max(0,Math.floor(Math.min(...xs)-pad[0])),x1:Math.min(camera.width,Math.ceil(Math.max(...xs)+pad[0])),
    y0:Math.max(0,Math.floor(Math.min(...ys)-pad[1])),y1:Math.min(camera.height,Math.ceil(Math.max(...ys)+pad[1])),
    projected:p.map(q=>({point:q.point,x:+q.x.toFixed(1),y:+q.y.toFixed(1)}))};
}
/** Decodes PNGs in a blank page (no extra dependency): luminance statistics per region, rows split in thirds, and the A/B difference. */
async function analyze(browser,{a,b,regions,dlMin=CHANGED_DL}){
  const page=await browser.newPage();
  try{
    return await page.evaluate(async({a,b,regions,dlMin})=>{
      const decode=async b64=>{
        const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{colorSpaceConversion:'none'});
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);
        return ctx.getImageData(0,0,bitmap.width,bitmap.height);
      };
      const A=await decode(a),B=b?await decode(b):null,out={width:A.width,height:A.height};
      const lum=(d,i)=>.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      for(const [name,r] of Object.entries(regions)){
        const w=A.width,n=(r.x1-r.x0)*(r.y1-r.y0),thirds=[0,0,0],thirdN=[0,0,0],rgb=[0,0,0];let sum=0,sum2=0,maxDiff=0,bright=0,absSum=0,changed=0;
        for(let y=r.y0;y<r.y1;y++)for(let x=r.x0;x<r.x1;x++){
          const i=(y*w+x)*4,l=lum(A.data,i),t=Math.min(2,Math.floor((y-r.y0)/(r.y1-r.y0)*3));
          sum+=l;sum2+=l*l;thirds[t]+=l;thirdN[t]++;for(let k=0;k<3;k++)rgb[k]+=A.data[i+k];if(l>120)bright++;
          if(B){
            for(let k=0;k<3;k++)maxDiff=Math.max(maxDiff,Math.abs(A.data[i+k]-B.data[i+k]));
            const dl=Math.abs(l-lum(B.data,i));absSum+=dl;if(dl>=dlMin)changed++;
          }
        }
        const mean=sum/n;
        out[name]={pixels:n,mean,std:Math.sqrt(Math.max(0,sum2/n-mean*mean)),rgb:rgb.map(v=>v/n),thirds:thirds.map((v,i)=>v/Math.max(1,thirdN[i])),brightFraction:bright/n,maxDiff:B?maxDiff:null,meanAbs:B?absSum/n:null,changed:B?changed/n:null};
      }
      return out;
    },{a:a.toString('base64'),b:b?b.toString('base64'):null,regions,dlMin});
  }finally{await page.close();}
}
const results={};
async function capture(browser,info,{clock,view,quality='high'}){
  const snapshot=place(free[clock]??first[clock],VIEWS[view]),page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
  try{
    await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
    await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
    await page.waitForFunction(()=>{const d=window.gameDiagnostics?.();return d&&!d.paused&&d.m01.renderedFrames>=4;},null,{timeout:240000});
    await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    const data=await page.evaluate(()=>window.gameDiagnostics());
    const name=`m01-water-${view}-${clock.replace(':','')}-${quality}${baseline?'-before':''}`,shot={path:undefined,style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000};
    const a=await page.screenshot({...shot,path:info.outputPath(name+'.png')});
    await page.waitForTimeout(1000);
    const later=await page.evaluate(()=>window.gameDiagnostics()),b=await page.screenshot(shot);
    let off=null;
    if(VIEWS[view].detail&&!baseline){
      // same paused page, same sim state: only the foam and wet-bank terms are switched off, then wait for fresh rendered frames
      const f0=later.m01.renderedFrames;
      await page.evaluate(()=>window.m01WaterDebug.setDetail(false));
      await page.waitForFunction(f=>window.gameDiagnostics().m01.renderedFrames>=f+3,f0,{timeout:60000});
      const offDiag=await page.evaluate(()=>window.gameDiagnostics());
      expect(offDiag.m01.water.detail,'detail switched off').toBe(0);expect(offDiag.clock,'sim clock unchanged by the toggle').toBe(later.clock);
      off=await page.screenshot({...shot,path:info.outputPath(name+'-detail-off.png')});
    }
    const summary={name,clock,view,quality:data.quality,battleClock:data.m01.battleClock,scene:data.scene,paused:data.paused,pausedLater:later.paused,
      simClock:data.clock,simClockLater:later.clock,player:data.player,water:data.m01.water??null,lighting:data.m01.lighting??null,drawCalls:data.drawCalls,triangles:data.triangles,
      snapshotScene:Boolean(free[clock])?'gameplay':'first-step'};
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    return {summary,a,b,off,camera:data.m01.demolition?.camera,info,name};
  }finally{await page.close();}
}
async function measure(browser,info,c,view){
  const v=VIEWS[view],camera=c.camera;
  const regions={};
  if(v.water)regions.water=regionOf(camera,v.water);
  if(v.box)Object.assign(regions.water,v.box);
  if(v.wake){regions.wake=regionOf(camera,v.wake,[24,10]);regions.control=regionOf(camera,v.control,[24,10]);}
  if(v.detail){regions.detail=regionOf(camera,v.detail,[24,10]);regions.control=regionOf(camera,v.control,[24,10]);}
  const stats=await analyze(browser,{a:c.a,b:c.b,regions});
  if(c.off)stats.detailAB=await analyze(browser,{a:c.a,b:c.off,regions});
  const report={...c.summary,regions:Object.fromEntries(Object.entries(regions).map(([k,r])=>[k,{x0:r.x0,y0:r.y0,x1:r.x1,y1:r.y1,projected:r.projected}])),stats};
  fs.writeFileSync(info.outputPath(c.name+'-diagnostics.json'),JSON.stringify(report,null,2));
  await info.attach(c.name+'.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
  return report;
}

for(const view of ['view12','view13'])for(const clock of clocks)test(`${view} ${clock}: Vistula from the west bank (high)`,async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const c=await capture(browser,info,{clock,view}),r=results[`${view}-${clock}`]=await measure(browser,info,c,view);
  if(baseline)return;
  expect(r.quality).toBe('high');expect(r.paused).toBe(true);expect(r.pausedLater).toBe(true);expect(r.simClockLater).toBe(r.simClock);
  const w=r.water;expect(w&&w.active,'water diagnostics').toBeTruthy();
  expect(w.reflect).toBe(1);expect(w.octaves).toBe(3);expect(w.planar).toBe(false);expect(w.renderTargets).toBe(0);
  expect(w.time).toBe(r.simClock);expect(w.flow[1]).toBeLessThan(0);   // the flow offset has advanced toward -z
  const s=r.stats.water;
  expect(s.maxDiff,'two paused frames are pixel-identical in the water region').toBe(0);
  expect(s.std,`the water region is not a flat colour (${JSON.stringify(s)})`).toBeGreaterThan(2.5);
  if(view==='view13')expect(s.thirds[0],`far (top) water is lighter than near water: sky tint at grazing angles (${JSON.stringify(s.thirds)})`).toBeGreaterThan(s.thirds[2]*1.1);
});

test('Low quality: no reflection term, same water, no extra cost',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const c=await capture(browser,info,{clock:'06:05',view:'view13',quality:'low'}),r=await measure(browser,info,c,'view13');
  if(baseline)return;
  expect(r.quality).toBe('low');expect(r.water.reflect).toBe(0);expect(r.water.octaves).toBe(1);expect(r.water.planar).toBe(false);expect(r.water.renderTargets).toBe(0);
  expect(r.stats.water.maxDiff).toBe(0);
  const m=r.stats.water.mean;
  expect(m,`Low water is not near-black (mean ${m.toFixed(1)}, std ${r.stats.water.std.toFixed(1)})`).toBeGreaterThan(NEAR_BLACK);
  expect(m,`Low water is at least the BEFORE look (${BEFORE_LOW_MEAN}, floor ${LOW_MEAN_FLOOR}); mean ${m.toFixed(1)}`).toBeGreaterThanOrEqual(LOW_MEAN_FLOOR);
  expect(r.water.tint,'Low body tint term').toBeGreaterThan(0);
});

for(const view of Object.keys(CLOSEUPS))test(`close-up ${view} 06:05: foam / wet bank on vs off (same paused frame)`,async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  const c=await capture(browser,info,{clock:'06:05',view}),r=await measure(browser,info,c,view);
  if(baseline)return;
  expect(r.quality).toBe('high');expect(r.paused).toBe(true);expect(r.pausedLater).toBe(true);expect(r.water.detail).toBe(1);
  const ab=r.stats.detailAB,want=DETAIL_MIN[view];
  expect(ab.control.maxDiff,`control water (no foam, no wet blend) is pixel-identical with the terms on and off (${JSON.stringify(ab.control)})`).toBe(0);
  expect(ab.detail.meanAbs,`foam/wet region changes (${JSON.stringify(ab.detail)})`).toBeGreaterThanOrEqual(want.meanAbs);
  expect(ab.detail.changed,`foam/wet region changed fraction (${JSON.stringify(ab.detail)})`).toBeGreaterThanOrEqual(want.changed);
});

test('the water follows the sky model: 04:30 and 06:05 differ, sun phase changes the colour',async({},info)=>{
  const a=results['view13-04:30'],b=results['view13-06:05'];
  await info.attach('water-summary.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
  if(baseline)return;
  expect(a&&b).toBeTruthy();
  const d=Math.max(...a.stats.water.rgb.map((v,i)=>Math.abs(v-b.stats.water.rgb[i])));
  expect(d,'mean water colour changes between the two hours').toBeGreaterThan(3);
  expect(a.water.time).not.toBe(b.water.time);
});
