import {mkdirSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {route,driver,toStationEvacuation} from '../../tests/helpers/m01-route.js';

// Capturas do roadmap final de M01 (docs/M01_FINAL_ROADMAP.md): 19 vistas em estados reais da rota de controlos.
// Fica fora da suíte normal (testDir tests/browser). Correr com:
//   npm run build && npx playwright test -c tools/verification/playwright.roadmap.config.js
// ROADMAP_OUT: pasta das capturas (por omissão test-results/m01-roadmap). ROADMAP_VIEWS: prefixos separados por
// vírgula para correr só algumas vistas (p. ex. "01,17"). Cada vista carrega tudo no menu, continua, corre três
// frames e pausa; só o jogador é reposicionado no snapshot real. Não injecta eventos, não é playtest humano nem FPS.
const key='cod-guerra:checkpoint:m01:v2';
const OUT=process.env.ROADMAP_OUT||'test-results/m01-roadmap';
const ONLY=process.env.ROADMAP_VIEWS?process.env.ROADMAP_VIEWS.split(',').map(s=>s.trim()).filter(Boolean):null;

function relocated(sim,snapshot,x,z,target,{aiming=false,crouched=false}={}){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.5)-y-1.6,Math.hypot(dx,dz));s.player.aiming=aiming;s.player.crouched=crouched;
  return s;
}
const centroid=(snapshot,pred)=>{const a=snapshot.actors.filter(pred);if(!a.length)return null;return {x:a.reduce((s,v)=>s+v.x,0)/a.length,y:a.reduce((s,v)=>s+v.y,0)/a.length+1,z:a.reduce((s,v)=>s+v.z,0)/a.length,n:a.length};};

async function openView(browser,{name,sim,snapshot,x,z,target,quality='high',aiming,crouched}){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const state=relocated(sim,snapshot,x,z,target,{aiming,crouched});
  await page.addInitScript(({key,state,quality})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);},{key,state,quality});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9&&window.gameDiagnostics().m01.wagons.loaded.length===6,null,{timeout:120000});
  await page.locator('#quality').selectOption(quality);
  const before=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames??0);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForFunction(before=>window.gameDiagnostics().m01.renderedFrames>before+2,before,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  expect(data.player.x).toBeCloseTo(x,3);expect(data.player.z).toBeCloseTo(z,3);
  await page.screenshot({path:`${OUT}/${name}.png`,style:'#pause,#menu {visibility:hidden!important}',timeout:120000});
  const c={view:name,quality:data.quality,clock:data.m01.battleClock,player:data.player,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,geometries:data.geometries,
    actors:data.m01.characters?.actors?.length,visibleActors:data.m01.characters?.actors?.filter(a=>a.lod!==null&&a.lod!==undefined).length,errors};
  await page.close();return c;
}

test('roadmap captures',async({browser})=>{
  test.setTimeout(1800000);
  mkdirSync(OUT,{recursive:true});
  const fresh=new M01Simulation(19390901);fresh.tick(.05,{skip:true});const start=fresh.snapshot(false);
  const r=route(19390901,{support:true}),cs=r.combatSnapshots,world=fresh;
  // Bombardeamento com os Stukas no céu (04:34:xx) pelo driver real, sem eventos injectados.
  const b=driver(19390901);b.step({skip:true});b.until(()=>b.sim.renderState.stukas&&b.sim.battleClock>=seconds('04:34:20'),420);const bombing=b.sim.snapshot(false);
  const t=bombing.clock,plane=[80+Math.sin(t*.02)*250,160,240-(t%90)*4];
  const drag=toStationEvacuation(driver(19390901),{observe:true}).sim.snapshot(false);
  const dudek=drag.actors.find(a=>a.id==='leon_dudek');
  const views=[
    {name:'01-start-section-close',snapshot:start,x:-74,z:30,target:centroid(start,a=>a.alive&&a.active&&Math.hypot(a.x+66,a.z-22)<14&&!a.civilian)??{x:-66,z:22,y:1}},
    {name:'02-start-station-facade',snapshot:start,x:-330,z:0,target:{x:-399,z:35,y:4}},
    {name:'03-start-hut-objective',snapshot:start,x:-242,z:32,target:{x:-262,z:20,y:0}},
    {name:'04-start-west-portal-bridge',snapshot:start,x:-48,z:9,target:{x:-4,z:1,y:5}},
    {name:'05-start-ads-viewmodel',snapshot:start,x:-66,z:22,target:{x:-4,z:1,y:3},aiming:true},
    {name:'06-bombing-stukas',snapshot:bombing,x:-66,z:22,target:{x:plane[0],z:plane[2],y:plane[1]}},
    {name:'07-bombing-station-yard',snapshot:bombing,x:-300,z:-10,target:{x:-345,z:25,y:3}},
    {name:'08-station-drag',snapshot:drag,x:dudek.x+9,z:dudek.z+7,target:{x:dudek.x,z:dudek.z,y:dudek.y+.8}},
    {name:'09-repair-sappers',snapshot:cs.repair,x:-146,z:14,target:centroid(cs.repair,a=>a.alive&&a.active&&a.x>-135&&a.x<-100&&!a.civilian)??{x:-123,z:8,y:1}},
    {name:'10-repair-threat-lisewo-far',snapshot:cs.repairThreat,x:-120,z:16.5,target:{x:1063,z:6,y:3}},
    {name:'11-repair-threat-sappers-pinned',snapshot:cs.repairThreat,x:-140,z:20,target:centroid(cs.repairThreat,a=>a.alive&&a.active&&a.x>-135&&a.x<-100&&!a.civilian)??{x:-123,z:8,y:1}},
    {name:'12-withdrawal-deck-east',snapshot:cs.withdrawal,x:38,z:42.4,target:centroid(cs.withdrawal,a=>a.alive&&a.active&&a.group==='grp_de_spans')??{x:300,z:0,y:2}},
    {name:'13-withdrawal-platoon',snapshot:cs.withdrawal,x:38,z:42.4,target:centroid(cs.withdrawal,a=>a.alive&&a.active&&!a.civilian&&a.x>-90&&a.x<120&&String(a.group).startsWith('grp_pl'))??{x:0,z:0,y:1}},
    {name:'14-east-demolition',snapshot:cs.eastDemolition,x:38,z:42.4,target:{x:793.8,z:0,y:6}},
    {name:'15-west-demolition',snapshot:cs.westDemolition,x:-292,z:26,target:{x:-4,z:3,y:8}},
    {name:'16-roll-call',snapshot:r.outro,x:-248,z:80,target:centroid(r.outro,a=>a.alive&&a.active&&!a.civilian&&a.x<-200&&a.z>50)??{x:-262,z:70,y:1}},
    {name:'17-panzerzug-daylight',snapshot:cs.eastDemolitionOutside,x:1092,z:24,target:{x:1150,z:2.5,y:2.5}},
    {name:'18-repair-threat-low',snapshot:cs.repairThreat,x:-120,z:16.5,target:{x:1063,z:6,y:3},quality:'low'},
    {name:'19-start-section-close-low',snapshot:start,x:-74,z:30,target:centroid(start,a=>a.alive&&a.active&&Math.hypot(a.x+66,a.z-22)<14&&!a.civilian)??{x:-66,z:22,y:1},quality:'low'},
  ];
  const selected=ONLY?views.filter(v=>ONLY.some(p=>v.name.startsWith(p))):views;
  expect(selected.length).toBeGreaterThan(0);
  const out=[];
  for(const v of selected){out.push(await openView(browser,{...v,sim:world}));console.log('ROADMAP_CAPTURE '+JSON.stringify(out.at(-1)));}
  console.log('ROADMAP_TARGETS '+JSON.stringify(selected.map(v=>({name:v.name,x:v.x,z:v.z,target:v.target}))));
  expect(out.every(c=>c.errors.length===0)).toBe(true);
});
