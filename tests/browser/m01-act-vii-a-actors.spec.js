import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';

// VII-a actor priority (renderer only, QA by ?acts=1 + a schema 3 save): the second echelon 25 s in, seen from the trench post, on each quality tier. Counts the live Germans
// of the simulation (read in the page, ?visual-verify), those in the player's view, and those the renderer drew as skinned bodies (gameDiagnostics().m01.characters.actors).
// A presentation check, not a frame rate. VIS_OUT = output directory, VIS_TAG = file-name suffix ('-before' on the code without the priority rule).
const OUT=process.env.VIS_OUT??new URL('../../docs/verification/m01-runtime/vii-a-visual-pkg1-2026-11-03/',import.meta.url).pathname,TAG=process.env.VIS_TAG??'';
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3';
let saves;
test.beforeAll(()=>{
  const sim=new M01AreaSimulation(19390901,{difficulty:'recruta'}),state={arrived:false,lastHealth:100};
  const tickUntil=(done,max=9000)=>{for(let i=0;i<max&&!done();i++){sim.tick(ACT_TICK,actControls(sim,'passive',state));sim.drainEvents();}};
  tickUntil(()=>!sim.scene);
  tickUntil(()=>sim.timers.wave&&sim.timers.wave.ech===1&&sim.clock-sim.timers.wave.echs[1].at>25);
  const pack=()=>{const p=sim.player;Object.assign(p,{crouched:false,angle:-Math.PI/2,pitch:.015});return {schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()};};
  const parapet=pack();   // 25 s into the second echelon, at the trench post
  // QA stress: 62 s into the second echelon, the player 80 m forward of the parapet (a snapshot edit, not a route): 6 live and 9 fallen Germans and 9 Poles lie within 100 m (24 candidates against a Low budget of 18).
  tickUntil(()=>sim.clock-sim.timers.wave.echs[1].at>62);
  const forward=pack();forward.actSave.player.z-=80;
  saves={parapet,forward};
  mkdirSync(OUT,{recursive:true});
});

test('second echelon: Germans drawn as bodies on Low, Medium and High, from the parapet and 80 m forward',async({browser})=>{
  test.setTimeout(900000);
  const report={scenes:{}};
  for(const scene of ['parapet','forward'])for(const quality of (process.env.VIS_TIERS??'low,medium,high').split(',')){
    const save=saves[scene],tiers=report.scenes[scene]??={};
    const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,baseURL:'http://127.0.0.1:4173/COD-guerra/'});
    await context.addInitScript(({key,s,q})=>{localStorage.setItem(key,JSON.stringify(s));localStorage.setItem('cod-guerra:visual-quality',q);},{key:ACT_KEY,s:save,q:quality});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('?debug=1&acts=1&visual-verify=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:150000});
    await page.locator('#continue').click();
    await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_a_north',null,{timeout:60000});
    await page.waitForFunction(()=>window.gameDiagnostics().m01.characters?.actors?.some(a=>/^(pl|de)_np_/.test(a.id)),null,{timeout:120000});   // the area's own cast (High loads its bodies slowly: do not read the previous act's stats)
    await page.waitForTimeout(3500);
    // The simulation state and the renderer's diagnostics are read in the same evaluate (no frame between them): live Germans, those in the view cone (60 degrees either side), those drawn as bodies.
    const d=await page.evaluate(()=>{
      const g=window.gameDiagnostics(),c=g.m01.characters,s=window.gameVerificationState().snapshot,p=s.player,cos=Math.cos(p.angle),sin=Math.sin(p.angle);
      const live=s.actors.filter(a=>a.team==='enemy'&&a.alive&&a.active),dist=a=>Math.hypot(a.x-p.x,a.z-p.z),view=a=>(a.x-p.x)*cos+(a.z-p.z)*sin>=.5*dist(a);
      return {quality:g.quality,limit:c.limit,drawn:c.actors.map(a=>a.id),priority:c.priority??null,drawCalls:g.drawCalls,triangles:g.triangles,
        live:live.map(a=>a.id),dead:s.actors.filter(a=>a.team==='enemy'&&!a.alive&&a.active).map(a=>a.id),inView:live.filter(view).map(a=>a.id),liveDistM:live.map(dist).sort((a,b)=>a-b).map(x=>Math.round(x))};
    });
    const live=new Set(d.live),dead=new Set(d.dead),view=new Set(d.inView),enemiesDrawn=d.drawn.filter(id=>live.has(id)),inViewDrawn=d.drawn.filter(id=>view.has(id));
    tiers[quality]={quality:d.quality,limit:d.limit,skinnedTotal:d.drawn.length,enemiesDrawn:enemiesDrawn.length,enemiesInViewDrawn:inViewDrawn.length,enemiesLive:d.live.length,liveDistM:d.liveDistM,enemiesInView:d.inView.length,enemiesInViewNotDrawn:d.inView.length-inViewDrawn.length,
      fallenGermansDrawn:d.drawn.filter(id=>dead.has(id)).length,polesAndOthersDrawn:d.drawn.length-enemiesDrawn.length-d.drawn.filter(id=>dead.has(id)).length,priority:d.priority,drawCalls:d.drawCalls,triangles:d.triangles,errors};
    if(quality==='low')await page.screenshot({path:`${OUT}09${scene==='forward'?'b':''}-echelon2-low-${scene==='forward'?'forward-':''}actors${TAG}.png`});
    expect(errors).toEqual([]);expect(d.quality).toBe(quality);
    await context.close();
  }
  writeFileSync(`${OUT}metrics-echelon2-actors${TAG}.json`,JSON.stringify(report,null,1)+'\n');
});
