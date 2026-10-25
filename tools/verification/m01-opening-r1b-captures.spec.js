import {mkdirSync,writeFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {M01Simulation,seconds,clockText} from '../../src/game/m01-simulation.js';
import {openingPilot} from './m01-opening-pilot.mjs';

// R1-b (the opening 04:30-04:34): captures in the game itself, from the player's own place. A pilot of the real simulation (the `tourist` of tools/verification/m01-opening-pilot.mjs: the intro watched,
// the section looked at from the post, the sappers' camp, the forward post and the planes) is run in Node and a REAL snapshot is taken the first time the battle clock reaches each time of the list;
// each snapshot is loaded in the built game (the player exactly where and looking where the pilot was, nothing relocated), three frames are rendered, the game is paused and the page is captured.
// Besides the pixels, each capture records what the game itself reports: the clip every actor in the frame plays (gameDiagnostics().m01.characters.actors), the subtitle, the player and the clock.
// Not part of `npm run test:browser`; not a playtest; SwiftShader, so pixels and never FPS. Run (after `npm run build`):
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium OPENING_OUT=<dir> npx playwright test -c tools/verification/playwright.opening-r1b.config.js
// OPENING_TIMES: comma-separated battle clocks (default the list below); OPENING_QUALITY: high (default), medium or low; OPENING_SEED; OPENING_PILOT (default tourist).
const key='cod-guerra:checkpoint:m01:v2';
const OUT=process.env.OPENING_OUT||'test-results/m01-opening-r1b';
const TIMES=(process.env.OPENING_TIMES||'04:30:10,04:30:20,04:31:00,04:32:00,04:32:30,04:33:20,04:33:40,04:34:20').split(',').map(s=>s.trim()).filter(Boolean);
const QUALITY=process.env.OPENING_QUALITY||'high',SEED=Number(process.env.OPENING_SEED||19390901),PILOT=process.env.OPENING_PILOT||'tourist';
const HALF=51.3*Math.PI/180;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

async function openView(browser,{name,snapshot}){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({key,state,quality})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,state:snapshot,quality:QUALITY});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9&&window.gameDiagnostics().m01.wagons.loaded.length===6,null,{timeout:180000});
  await page.locator('#quality').selectOption(QUALITY);
  const before=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames??0);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:180000});
  await page.waitForFunction(before=>window.gameDiagnostics().m01.renderedFrames>before+2,before,{timeout:180000});
  // The HUD fades in for 0.8 s of game time after "continue" (m01-hud.js resumeFade): wait until that black is gone, then pause.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return (d.m01?.hudPresentation?.fade??d.hudPresentation?.fade??0)===0;},null,{timeout:180000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  const hud=await page.evaluate(()=>({objective:document.querySelector('#objective-text')?.textContent??'',status:document.querySelector('#objective-status')?.textContent??'',subtitle:document.querySelector('#subtitle')?.textContent??''}));
  await page.screenshot({path:`${OUT}/${name}.png`,style:'#pause,#menu {visibility:hidden!important}',timeout:180000});
  const p=data.player;
  const inFrame=(data.m01.characters?.actors??[]).map(a=>{
    const actor=data.m01.animationPresentation?.actors?.find(x=>x.id===a.id);return {id:a.id,clip:a.clip,lod:a.lod,t:+(a.clipTime??0).toFixed(2),...(actor?{}:{})};
  });
  await page.close();
  return {view:name,quality:data.quality,clock:+data.clock.toFixed(2),battle:clockText(data.m01.battleClock),scene:data.m01.scene,player:{x:+p.x.toFixed(2),z:+p.z.toFixed(2),angle:+p.angle.toFixed(3),pitch:+p.pitch.toFixed(3)},
    clips:inFrame,hud,errors};
}

test('opening R1-b captures',async({browser})=>{
  test.setTimeout(3600000);
  mkdirSync(OUT,{recursive:true});
  const sim=new M01Simulation(SEED),snaps={},pending=[...TIMES];
  openingPilot(sim,PILOT,s=>{
    while(pending.length&&s.battleClock>=seconds(pending[0])){const t=pending.shift();snaps[t]=s.snapshot(false);}
  });
  const out=[];
  for(const [i,t] of TIMES.entries()){
    const snap=snaps[t];expect(snap,`a snapshot at ${t}`).toBeTruthy();
    const name=`${String(i+1).padStart(2,'0')}-${t.replace(/:/g,'')}`;
    // who is in the frame according to the snapshot: Polish soldiers within 120 m inside the horizontal field of view (the game's own clips are matched by id in captures.json)
    const pl=snap.player,inView=snap.actors.filter(a=>a.team==='ally'&&a.alive&&a.active&&!a.carriedBy&&Math.hypot(a.x-pl.x,a.z-pl.z)<=120&&Math.abs(wrap(Math.atan2(a.z-pl.z,a.x-pl.x)-pl.angle))<HALF).map(a=>a.id);
    const c=await openView(browser,{name,snapshot:snap});c.inFrame=c.clips.filter(x=>inView.includes(x.id));
    out.push(c);console.log('OPENING_CAPTURE '+JSON.stringify({view:c.view,battle:c.battle,player:c.player,frame:c.inFrame.map(x=>`${x.id}:${x.clip}`)}));
  }
  writeFileSync(`${OUT}/captures.json`,JSON.stringify({seed:SEED,pilot:PILOT,quality:QUALITY,views:out},null,2)+'\n');
  expect(out.every(c=>c.errors.length===0)).toBe(true);
});
