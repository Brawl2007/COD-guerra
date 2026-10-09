import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {seconds} from '../../src/game/m01-simulation.js';
import {route} from '../helpers/m01-route.js';

// T16 V1 (dawn lighting). Five real continuations at the five phase clocks, high quality, plus one Low continuation.
// Snapshots come from the real simulation route (no clock, event or objective injection); only the player's yaw/pitch of the
// injected checkpoint is turned towards the sun so the screenshots show the sky glow and the lit/shadowed ground.
// M01_BASELINE_CAPTURE=1 only captures (screenshots + diagnostics); it never imports the new lighting module nor asserts
// new fields, so it can be run on the base commit for the BEFORE images.
const key='cod-guerra:checkpoint:m01:v2',baseline=process.env.M01_BASELINE_CAPTURE==='1';
const phases=[['04:30','blue-hour'],['04:45','first-light'],['05:30','golden'],['06:10','morning'],['07:05','day']];
const keyframes=JSON.parse(readFileSync(new URL('../../missions/m01-tczew/map-layout.json',import.meta.url))).sun.keyframes;

// A gameplay (no cutscene, mission not complete) step soon after the mark is preferred; otherwise the first step at the mark is used.
// 07:05 only exists as the start of the roll-call scene: the west-blast scene jumps the battle clock from 06:45 straight to it.
const first={},free={};
route(19390901,{support:true,onStep:({sim})=>{
  for(const [clock] of phases){
    const at=seconds(clock);
    if(!first[clock]&&sim.battleClock>=at)first[clock]=structuredClone(sim.snapshot(false));
    if(!free[clock]&&sim.battleClock>=at&&sim.battleClock<=at+120&&!sim.scene&&!sim.mission.complete)free[clock]=structuredClone(sim.snapshot(false));
  }
}});
for(const [clock] of phases)if(!first[clock])throw new Error('Missing route snapshot at '+clock);

function sunAzimuthDeg(battleClock){
  const after=keyframes.findIndex(k=>seconds(k.clock)>battleClock);
  const a=keyframes[Math.max(0,after<0?keyframes.length-1:after-1)],b=keyframes[after<0?keyframes.length-1:after];
  const t=Math.max(0,Math.min(1,(battleClock-seconds(a.clock))/(seconds(b.clock)-seconds(a.clock)||1)));
  return a.azimuthDeg+(b.azimuthDeg-a.azimuthDeg)*t;
}
// view: 'sun' (default) faces the sun; 'zenith' looks straight up (where the old sphere UVs pinched into a star);
// 'west-seam' looks at the sphere-UV seam of the old sky dome (direction -x, raised), where clouds used to show a line.
function aimed(snapshot,view){
  const s=structuredClone(snapshot),az=sunAzimuthDeg(s.battleClock)*Math.PI/180;
  if(view==='zenith'){s.player.angle=Math.atan2(-Math.cos(az),Math.sin(az));s.player.pitch=1.45;}
  else if(view==='west-seam'){s.player.angle=Math.PI;s.player.pitch=.42;}
  else{s.player.angle=Math.atan2(-Math.cos(az),Math.sin(az))+.38;s.player.pitch=.07;}   // the sun sits in the left third of the view
  s.player.aiming=false;return s;
}

const results={};
async function capture(browser,info,{clock,quality,view='sun'}){
  const snapshot=aimed(free[clock]??first[clock],view),page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot,quality})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,snapshot,quality});
  try{
    await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:180000});
    await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
    // Do not wait on a particular cutscene/gameplay state: the game runs once the pointer lock is granted and frames render.
    await page.waitForFunction(()=>{const d=window.gameDiagnostics?.();return d&&!d.paused&&d.m01.renderedFrames>=4;},null,{timeout:240000});
    await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
    const data=await page.evaluate(()=>window.gameDiagnostics());
    const name=`m01-lighting-${clock.replace(':','')}-${quality}${view==='sun'?'':'-'+view}${baseline?'-before':''}.png`;
    await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu{visibility:hidden!important}',timeout:120000});
    const summary={clock,quality:data.quality,view,pitch:snapshot.player.pitch,angle:snapshot.player.angle,battleClock:data.m01.battleClock,scene:data.scene,renderedFrames:data.m01.renderedFrames,
      lighting:data.m01.lighting??null,weaponLighting:data.m01.weaponLighting??null,drawCalls:data.drawCalls,triangles:data.triangles,snapshotScene:Boolean(free[clock])?'gameplay':'first-step'};
    await info.attach(name+'.json',{body:JSON.stringify(summary,null,2),contentType:'application/json'});
    expect(errors).toEqual([]);expect(failed).toEqual([]);
    return summary;
  }finally{await page.close();}
}

for(const [clock,phase] of phases)test(`${clock} ${phase}: continuation at high quality renders the phase lighting`,async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const summary=results[clock]=await capture(browser,info,{clock,quality:'high'});
  expect(summary.quality).toBe('high');
  if(baseline)return;
  const light=summary.lighting;expect(light).toBeTruthy();
  const {sunState,lightingModel}=await import('../../src/render/m01-lighting.js');
  // Exact agreement with the pure model at the very battle clock the page reached.
  const sun=sunState(keyframes,summary.battleClock),model=lightingModel(sun.altDeg,sun.azDeg);
  expect(light.phase).toBe(phase);expect(model.phase).toBe(phase);
  expect(light.sunAltDeg).toBeCloseTo(sun.altDeg,2);expect(light.sunAzDeg).toBeCloseTo(sun.azDeg,2);
  expect(light.exposure).toBeCloseTo(model.exposure,2);expect(light.keyElevDeg).toBeCloseTo(model.sun.keyElevDeg,2);
  expect(light.fog).toEqual({near:420,far:2800});
  expect(light.shadowMap).toBe(true);expect(light.shadowsModel).toBe(true);expect(light.shadows).toBe(true);expect(light.cascades).toBe(2);   // casting from 04:30 on Medium/High
  expect(light.updates).toBeGreaterThan(0);
  for(const field of ['sunAltDeg','sunAzDeg','keyElevDeg','daylight','exposure','sunIntensity','hemiIntensity','glow','discStrength'])expect(Number.isFinite(light[field])).toBe(true);
});

test('Low quality keeps shadows off at the earliest clock (no new cost)',async({browser},info)=>{
  test.setTimeout(process.env.CI?420000:300000);
  const summary=await capture(browser,info,{clock:'04:30',quality:'low'});
  expect(summary.quality).toBe('low');
  if(baseline)return;
  expect(summary.lighting.phase).toBe('blue-hour');expect(summary.lighting.shadowsModel).toBe(true);
  expect(summary.lighting.shadowMap).toBe(false);expect(summary.lighting.shadows).toBe(false);expect(summary.lighting.cascades).toBe(1);
});

test('07:05 sky looking straight up and at the old UV seam renders without page errors',async({browser},info)=>{
  test.setTimeout(process.env.CI?600000:420000);
  for(const view of ['zenith','west-seam']){
    const summary=await capture(browser,info,{clock:'07:05',quality:'high',view});
    expect(summary.quality).toBe('high');
    if(!baseline){expect(summary.lighting.phase).toBe('day');expect(summary.pitch).toBeGreaterThan(.4);}
  }
});

test('the five phase clocks have distinct, ordered lighting counters',async({},info)=>{
  const list=phases.map(([clock])=>results[clock]).filter(Boolean);
  await info.attach('lighting-counters.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});
  if(baseline)return;
  expect(list).toHaveLength(5);
  const l=list.map(r=>r.lighting);
  for(const field of ['phase','sunAltDeg','exposure','fogColor','sunColor','skyZenith','skyHalo','sunIntensity','hemiIntensity'])
    expect(new Set(l.map(x=>x[field])).size,field).toBe(5);
  for(let i=1;i<5;i++){
    expect(l[i].sunAltDeg).toBeGreaterThan(l[i-1].sunAltDeg);expect(l[i].exposure).toBeLessThan(l[i-1].exposure);
    expect(l[i].sunIntensity).toBeGreaterThan(l[i-1].sunIntensity);expect(l[i].hemiIntensity).toBeGreaterThan(l[i-1].hemiIntensity);
    expect(l[i].daylight).toBeGreaterThan(l[i-1].daylight);
  }
});
