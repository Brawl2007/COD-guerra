import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';

// VII-a visual package (renderer only, QA by ?acts=1 + a schema 3 save): 1280 x 720 captures of the same four views as the INC-1 evidence (arrival, the line mid-wave,
// west along the line, the wreck aimed) on the High and Low quality tiers, and the renderer.info numbers of each (draw calls, triangles, geometries). Not a frame rate:
// SwiftShader timings are not evidence of anything. VIS_OUT = output directory, VIS_TAG = file-name prefix.
const OUT=process.env.VIS_OUT??new URL('../../docs/verification/m01-runtime/vii-a-visual-pkg1-2026-11-03/',import.meta.url).pathname,TAG=process.env.VIS_TAG??'';
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3';
const envelope=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
let scenes;
function build(){
  const sim=new M01AreaSimulation(19390901,{difficulty:'recruta'}),state={arrived:false,lastHealth:100};
  const tickUntil=(done,max=6000)=>{for(let i=0;i<max&&!done();i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}};
  tickUntil(()=>!sim.scene);
  const spawn=envelope(sim);spawn.actSave.player.angle=-Math.PI/2;spawn.actSave.player.pitch=.03;
  const p=sim.player,inView=a=>Math.abs(Math.atan2(Math.sin(Math.atan2(a.z-p.z,a.x-p.x)+Math.PI/2),Math.cos(Math.atan2(a.z-p.z,a.x-p.x)+Math.PI/2)))<.6;
  tickUntil(()=>sim.timers.wave&&sim.clock-sim.timers.wave.at>8&&sim.enemies.filter(a=>a.alive&&a.active&&!a.crouched&&inView(a)).length>=3);
  const mid=envelope(sim);Object.assign(mid.actSave.player,{crouched:false,angle:-Math.PI/2,pitch:.015});
  const west=envelope(sim);Object.assign(west.actSave.player,{crouched:false,angle:Math.PI+.06,pitch:-.03});
  const w=sim.plan.layout.points.wreck,wreck=envelope(sim);Object.assign(wreck.actSave.player,{crouched:false,angle:Math.atan2(w.z-p.z,w.x-p.x),pitch:.01,aiming:true});
  const dist=sim.enemies.filter(a=>a.alive&&a.active).map(a=>Math.round(Math.hypot(a.x-p.x,a.z-p.z)*10)/10);
  return {scenes:{spawn,mid,west,wreck},dist};
}
test.beforeAll(()=>{const built=build();scenes=built.scenes;scenes.dist=built.dist;mkdirSync(OUT,{recursive:true});});

for(const quality of (process.env.VIS_TIERS??'high,low').split(','))test(`VII-a visual captures and renderer.info, tier ${quality}`,async({browser})=>{
  test.setTimeout(900000);
  const report={quality,germanDistancesM:scenes.dist,scenes:{}};
  const only=(process.env.VIS_SCENES??'spawn,mid,west,wreck').split(','),shots=[['spawn','02-arrival'],['mid','04-line-north-midwave'],['west','05-line-west-ckm'],['wreck','05b-wreck-aimed']].filter(([n])=>only.includes(n));
  for(const [name,file] of shots){
    const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,baseURL:'http://127.0.0.1:4173/COD-guerra/'});
    await context.addInitScript(({key,save,q})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('cod-guerra:visual-quality',q);},{key:ACT_KEY,save:scenes[name],q:quality});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('?debug=1&acts=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:150000});
    await page.locator('#continue').click();
    await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north',null,{timeout:60000});
    await page.waitForTimeout(name==='spawn'?10000:Number(process.env.VIS_WAIT??3500));   // the arrival view opens with a short fade and letterbox in slow software rendering
    const samples=[];
    for(let i=0;i<8;i++){samples.push(await page.evaluate(()=>{const d=window.gameDiagnostics();return {quality:d.quality,drawCalls:d.drawCalls,triangles:d.triangles,geometries:d.geometries,textures:d.textures,dressing:d.m01.areaDressing??null};}));await page.waitForTimeout(400);}
    const med=k=>samples.map(s=>s[k]).sort((a,b)=>a-b)[0];   // the smallest of 8 frames: a frame read between two passes would double the figure
    report.scenes[name]={quality:samples[0].quality,drawCalls:med('drawCalls'),triangles:med('triangles'),geometries:med('geometries'),textures:med('textures'),dressing:samples[0].dressing,errors};
    await page.screenshot({path:`${OUT}${TAG}${file}-${quality}.png`});
    expect(errors).toEqual([]);expect(samples[0].quality).toBe(quality);
    await context.close();
  }
  writeFileSync(`${OUT}${TAG}metrics-${quality}.json`,JSON.stringify(report,null,1)+'\n');
});
