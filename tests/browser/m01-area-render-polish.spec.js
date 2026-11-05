import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {M01AreaSimulation} from '../../src/game/m01-area-sim.js';
import {M01ActRunner} from '../../src/game/m01-acts.js';
import {actControls,ACT_TICK} from '../helpers/m01-act-route.js';
import {actBControls} from '../helpers/m01-act-b-route.js';
import {actCControls,ACT_C_TICK} from '../helpers/m01-act-c-route.js';

// Area render polish (2026-11-05): the stretcher of the VII-b bearers, the flash of a shell at the frame it lands, and the dusk guidance of VII-c (hooded lanterns at the exit, the glow of the town,
// a lifted ambient). Production build, Chromium/SwiftShader. The scenes are saved in Node with the same simulation as the act specs; the page restores them, the capture script freezes the game
// (a window blur pauses the loop; the renderer keeps drawing the same clock) on the frame it wants. A presentation check, not a playtest and not a frame-rate figure.
// POLISH_OUT = output directory (the committed evidence, or a scratch directory for the «before» run); POLISH_ONLY = comma list of shots.
const OUT=process.env.POLISH_OUT??new URL('../../docs/verification/m01-runtime/area-render-polish-2026-11-05/',import.meta.url).pathname;
const QUALITIES=(process.env.POLISH_Q??'high,low').split(',');
const ONLY=process.env.POLISH_ONLY?process.env.POLISH_ONLY.split(','):null;
const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3';
const live=sim=>({schema:3,missionId:'m01_tczew',act:sim.actId,carry:sim.carry,actSave:sim.snapshot()});
const look=(env,at,toward,pitch=0)=>{Object.assign(env.actSave.player,{...at,crouched:false,angle:Math.atan2(toward.z-at.z,toward.x-at.x),pitch});return env;};

let scenes;
function build(){
  const a=new M01AreaSimulation(19390901,{difficulty:'recruta'}),sa={arrived:false,lastHealth:100};
  for(let i=0;i<30000&&!a.mission.complete;i++){a.tick(ACT_TICK,actControls(a,'passive',sa));a.drainEvents();}
  const runner=new M01ActRunner({enabled:true}),sim=runner.enter(a),state={arrived:false,lastHealth:100};
  const until=(done,max=40000)=>{for(let i=0;i<max&&!done();i++){sim.tick(ACT_TICK,actBControls(sim,'passive',state));sim.drainEvents();}if(!done())throw new Error('scene not reached');};
  const out={};
  // a shell has just been launched: the player (at the arrival post) looks at the point where it will fall, 1.5 s from now
  until(()=>sim.timers.barrage.run?.k>=3&&sim.timers.barrage.run.shells.length>0&&sim.timers.barrage.run.shells[0].landAt-sim.clock>1.2);
  const shell=sim.timers.barrage.run.shells[0];
  out.shell=look(live(sim),{x:sim.player.x,z:sim.player.z},{x:shell.x,z:shell.z},-.03);
  out.shellInfo={landIn:shell.landAt-sim.clock,at:{x:shell.x,z:shell.z},player:{x:sim.player.x,z:sim.player.z}};
  until(()=>sim.timers.medics.state==='carry'&&sim.clock-sim.timers.medics.since>2.5&&sim.actor(sim.timers.medics.patient).carriedBy);
  const m0=sim.actor('np_maqueiro_0'),m1=sim.actor('np_maqueiro_1');
  // the player stands 5 m to the side of the first bearer, looking at the pair
  out.carry=look(live(sim),{x:m0.x-4.2,z:m0.z-2.6},{x:m0.x,z:m0.z+1.4},-.1);out.carryInfo={m0:{x:m0.x,z:m0.z,f:m0.facing},m1:{x:m1.x,z:m1.z}};
  // the second act of the chain, to VII-c
  until(()=>sim.mission.complete,120000);
  const c=runner.enter(sim),st={};
  const untilC=(done,max=60000)=>{for(let i=0;i<max&&!done();i++){c.tick(ACT_C_TICK,actCControls(c,'prompt',st));c.drainEvents();}if(!done())throw new Error('scene C not reached');};
  untilC(()=>c.scene?.id==='cs_npc_dusk');untilC(()=>!c.scene);untilC(()=>c.clock>c.timers.withdrawal.since+16);
  out.duskLine=look(live(c),{x:-410,z:-1159.2},{x:-585,z:-1062},.01);   // at the post, looking down the way the line will go, to the exit
  out.duskTown=look(live(c),{x:-500,z:-1090},{x:-780,z:-1030},.02);   // half-way, looking west-south-west at the town
  untilC(()=>c.timers.withdrawal.lineOutAt!==null);
  untilC(()=>c.timers.rear.move===4&&c.timers.rear.moving);
  // all but the last man are out: the field holds 11 men since f13d2292 (roster without pl_np_3), so `>=11` with rearOutAt still null can never hold
  untilC(()=>c.timers.withdrawal.rearOutAt===null&&c.timers.withdrawal.out.length>=10);
  out.duskExit=look(live(c),{x:-540,z:-1092},{x:-580,z:-1062},.0);   // the approach to the band
  out.duskExitFar=look(live(c),{x:-470,z:-1130},{x:-580,z:-1062},.0);   // 130 m from the band
  return out;
}
test.beforeAll(()=>{scenes=build();mkdirSync(OUT,{recursive:true});});

async function boot(page,save,quality,watcher=null){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(({key,save,quality})=>{localStorage.setItem(key,JSON.stringify(save));localStorage.setItem('cod-guerra:visual-quality',quality);},{key:ACT_KEY,save,quality});
  if(watcher)await page.addInitScript(watcher);
  await page.goto('?debug=1&acts=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:150000});
  await page.locator('#continue').click();
  return errors;
}
const freeze=async page=>{await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.addStyleTag({content:'#pause,.overlay{display:none!important}'});await page.waitForTimeout(500);};
const stats=page=>page.evaluate(()=>{const d=window.gameDiagnostics();return {quality:d.quality,drawCalls:d.drawCalls,triangles:d.triangles,geometries:d.geometries,textures:d.textures,clock:d.clock,lighting:d.m01.lighting?{phase:d.m01.lighting.phase,alt:d.m01.lighting.sunAltDeg,exposure:d.m01.lighting.exposure,hemi:d.m01.lighting.hemiIntensity}:null,fx:d.m01.battlefieldFx?{active:d.m01.battlefieldFx.active,counts:d.m01.battlefieldFx.counts,light:d.m01.battlefieldFx.extraLights}:null,polish:d.m01.areaPolish??null};});
const setQuality=async(page,q)=>{await page.locator('#quality').selectOption(q,{force:true});await page.waitForTimeout(1500);};
// the first frame on which the burst has a flash is the impact frame: freeze there from inside the page, in the rAF callback that runs right after the game's own. Installed before the page's scripts so that
// the save's 1.5 s of whistle cannot pass while the page is still being driven from outside (a slow software GL would miss the impact).
const IMPACT_WATCHER=()=>{window.__flash=null;window.__seen={frames:0,maxFlash:0,err:null};const watch=()=>{let d;try{d=window.gameDiagnostics?.();window.__seen.frames++;window.__seen.maxFlash=Math.max(window.__seen.maxFlash,d?.m01?.battlefieldFx?.counts.flash??0);}catch(e){window.__seen.err=String(e);}if(d&&d.m01?.battlefieldFx?.counts.flash>0&&window.__flash===null){window.__flash={clock:d.clock,counts:{...d.m01.battlefieldFx.counts},light:d.m01.battlefieldFx.extraLights,kinds:{...d.m01.battlefieldFx.meta.kinds}};window.dispatchEvent(new Event('blur'));return;}requestAnimationFrame(watch);};requestAnimationFrame(watch);};
const want=name=>!ONLY||ONLY.includes(name);
const report={};
// The shared software-GL machine sometimes runs out of GPU/network resources under load (ERR_INSUFFICIENT_RESOURCES, empty-log VALIDATE_STATUS shader errors, GLTF textures whose blob could not be fetched). The unmodified build shows the same on the same scenes
// (docs README), so they are counted in the report but are not what these specs assert; any OTHER page error fails the test.
const ENV_ERROR=/ERR_INSUFFICIENT_RESOURCES|^THREE\.GLTFLoader: Couldn't load texture blob:|^THREE\.WebGLProgram: Shader Error \d+ - VALIDATE_STATUS false/;
const real=errors=>errors.filter(e=>!ENV_ERROR.test(e));
// a failed test must not leave its page (and its WebGL context) open for the next one
test.afterEach(async({browser})=>{for(const c of browser.contexts())await c.close();});

for(const quality of QUALITIES){
  test(`shell flash at the impact frame (${quality})`,async({browser})=>{
    test.skip(!want('shell'));
    test.setTimeout(400000);
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=await boot(page,scenes.shell,quality,IMPACT_WATCHER);
    await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_b_north_day',null,{timeout:60000});
    await page.waitForFunction(()=>window.__flash!==null,null,{timeout:180000});
    await page.addStyleTag({content:'#pause,.overlay{display:none!important}'});await page.waitForTimeout(600);
    const flash=await page.evaluate(()=>window.__flash);
    await page.screenshot({path:`${OUT}shell-impact-frame-${quality}.png`});
    report[`shell-${quality}`]={flash,stats:await stats(page),errors:{total:errors.length,real:real(errors)}};
    writeFileSync(`${OUT}report-shell-${quality}.json`,JSON.stringify(report[`shell-${quality}`],null,1)+'\n');
    expect(real(errors)).toEqual([]);await page.close();
  });
}
for(const quality of QUALITIES){
  test(`stretcher carry (${quality})`,async({browser})=>{
    test.skip(!want('carry'));
    test.setTimeout(400000);
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=await boot(page,scenes.carry,quality);
    await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_b_north_day',null,{timeout:60000});
        await page.waitForFunction(c=>window.gameDiagnostics().clock>c+1.5,scenes.carry.actSave.clock,{timeout:120000});
    await freeze(page);
    await page.screenshot({path:`${OUT}stretcher-carry-${quality}.png`});
    const s=await stats(page);writeFileSync(`${OUT}report-carry-${quality}.json`,JSON.stringify({stats:s,info:scenes.carryInfo,errors:{total:errors.length,real:real(errors)}},null,1)+'\n');
    expect(real(errors)).toEqual([]);await page.close();
  });
}
for(const [name,file] of [['duskLine','dusk-line'],['duskTown','dusk-town-glow'],['duskExit','dusk-exit-50m'],['duskExitFar','dusk-exit-130m']]){
  for(const quality of QUALITIES){
    test(`${file} (${quality})`,async({browser})=>{
      test.skip(!want(name));
      test.setTimeout(400000);
      const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=await boot(page,scenes[name],quality);
      await page.waitForFunction(()=>window.gameDiagnostics().m01.act==='act_vii_c_withdrawal',null,{timeout:60000});
            await page.waitForFunction(c=>window.gameDiagnostics().clock>c+.6,scenes[name].actSave.clock,{timeout:120000});
      await freeze(page);
      await page.screenshot({path:`${OUT}${file}-${quality}.png`});
      const s=await stats(page);writeFileSync(`${OUT}report-${file}-${quality}.json`,JSON.stringify({stats:s,errors:{total:errors.length,real:real(errors)}},null,1)+'\n');
      expect(real(errors)).toEqual([]);await page.close();
    });
  }
}
