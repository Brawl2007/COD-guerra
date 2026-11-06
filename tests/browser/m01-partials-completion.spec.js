import {test,expect} from '@playwright/test';
import {M01Simulation,seconds} from '../../src/game/m01-simulation.js';
import {route} from '../helpers/m01-route.js';
import fs from 'node:fs';
const key='cod-guerra:checkpoint:m01:v2',OUT=process.env.M01_PARTIALS_BROWSER_OUT??'test-results/partials-completion-evidence/production';
const windows=['04:30:00','04:36:00','04:44:30','04:46:00','04:51:30','05:41:00'],scenes=['cs_m01_bombing','cs_m01_order','cs_m01_east_blast','cs_m01_west_blast'];
let fixtures;
function saves(){if(fixtures)return fixtures;fixtures={};
  route(19390901,{support:false,onStep:({sim})=>{
    for(const at of windows)if(!fixtures[at]&&sim.battleClock>=seconds(at))fixtures[at]=sim.snapshot();
    if(scenes.includes(sim.scene?.id)&&sim.scene.elapsed>=1&&!fixtures[sim.scene.id])fixtures[sim.scene.id]=sim.snapshot();
  }});return fixtures;
}
async function paused(browser,snapshot,{fallback=false}={}){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(fallback)await page.route('**/characters/crews-evacuation/*.glb',r=>r.fulfill({status:503,body:'intentional optional crew-kit failure'}));
  await page.addInitScript(({key,snapshot})=>{localStorage.setItem(key,JSON.stringify(snapshot));localStorage.setItem('cod-guerra:visual-quality','high');},{key,snapshot});
  await page.goto('?debug=1&visual-verify=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01.models.length===9,null,{timeout:120000});
  await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement?.id==='game'){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});
  await page.locator('#continue').click();await expect(page.locator('#pause')).toBeVisible({timeout:120000});
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.paused&&d.m01.renderedFrames>0&&d.m01.demolition.clock===d.clock&&d.m01.wagons.loaded.length===6&&d.m01.fieldStructures.ready&&d.m01.environmentProps.runtime.ready&&d.m01.bridgeFinish.status==='ready';},null,{timeout:180000});
  return {page,errors};
}
async function camera(page,position,target){const frame=await page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
  await page.evaluate(p=>window.m01BridgeFinishDebug.setCamera(p),{position,target});
  await page.waitForFunction(({frame,position})=>{const d=window.gameDiagnostics();return d.m01.renderedFrames>frame&&d.m01.bridgeCamera.position.every((v,i)=>Math.abs(v-position[i])<1e-9);},{frame,position},{timeout:120000});
}
async function record(page,name,input){fs.mkdirSync(OUT,{recursive:true});const raw=await page.evaluate(()=>({diagnostics:window.gameDiagnostics(),state:window.gameVerificationState()}));
  const expected=new M01Simulation();expected.restoreSnapshot(input);expect(raw.state.snapshot).toEqual(expected.snapshot());expect(raw.diagnostics.paused).toBe(true);
  await page.screenshot({path:`${OUT}/${name}-unmasked-ui.png`,style:'#pause,#menu{visibility:hidden!important}',timeout:120000});
  await page.screenshot({path:`${OUT}/${name}.png`,style:'#pause,#menu,#fade,#resume-card{visibility:hidden!important}',timeout:120000});
  fs.writeFileSync(`${OUT}/${name}.json`,JSON.stringify({editorialMask:'World image hides only pause/menu and frozen T04 resume fade/card; unmasked-ui sibling preserves the original overlay. No authoritative clock advancement.',provenance:'Production renderer continuation of a real-control CPU mission route, frozen with real pointer-lock pause. Editorial camera changes presentation only. Not human playtesting.',input,raw},null,2));return raw;
}
test('four free scenes show data-driven letterbox/prompt and remain exact across pause and reload without rotating player camera',async({browser})=>{
  test.setTimeout(1200000);for(const id of scenes){const input=saves()[id];expect(input).toBeDefined();const {page,errors}=await paused(browser,input);
    const before=await record(page,id,input),cue=before.diagnostics.m01.hudPresentation.sceneBeats;expect(cue.letterbox).toBe(true);expect(cue.lookPrompt.length).toBeGreaterThan(0);
    await expect(page.locator('.scene-look-prompt')).toBeVisible();await page.waitForTimeout(750);const after=await record(page,`${id}-paused`,input);
    expect(after.state).toEqual(before.state);expect(after.diagnostics.m01.hudPresentation.sceneBeats).toEqual(cue);
    expect(after.diagnostics.m01.bridgeCamera).toEqual(before.diagnostics.m01.bridgeCamera);await page.reload();await page.waitForFunction(()=>window.gameDiagnostics?.().m01.models.length===9,null,{timeout:120000});await page.evaluate(()=>{const hold=e=>{if(document.pointerLockElement){document.removeEventListener('pointerlockchange',hold,true);e.stopImmediatePropagation();document.exitPointerLock();}};document.addEventListener('pointerlockchange',hold,true);});await page.locator('#continue').click();await page.waitForFunction(()=>window.gameDiagnostics().paused&&window.gameDiagnostics().m01.renderedFrames>0,null,{timeout:120000});
    // A fresh Game boots paused and the menu already rendered frames, so the wait above can resolve before the Continue frame: wait for the pause overlay and the HUD's scene prompt of the restored scene, as the first load does.
    await expect(page.locator('#pause')).toBeVisible({timeout:120000});await expect(page.locator('.scene-look-prompt')).toBeVisible({timeout:120000});const reloaded=await record(page,`${id}-reloaded`,input);expect(reloaded.state).toEqual(before.state);expect(reloaded.diagnostics.m01.hudPresentation.sceneBeats).toEqual(cue);expect(reloaded.diagnostics.m01.bridgeCamera).toEqual(before.diagnostics.m01.bridgeCamera);expect(errors).toEqual([]);await page.close();
  }
});
test('train arrival at04:44:30, stop04:46 and yard at04:36/05:41 draw smoke/headlamps/civilian tasks/damage with exact authority',async({browser})=>{
  test.setTimeout(1200000);for(const at of windows){const input=saves()[at],{page,errors}=await paused(browser,input);
    if(at==='04:44:30'||at==='04:46:00'||at==='04:51:30')await camera(page,[-20,8,-18],[1100,3,-2.5]);
    else await camera(page,[-309,1,5],[-365,1,20]);
    const before=await record(page,`life-${at.replaceAll(':','')}`,input),d=before.diagnostics.m01;
    if(['04:44:30','04:46:00','04:51:30'].includes(at)){expect(d.trainLife.native.calls).toBeGreaterThan(0);expect(d.trainLife.native.calls).toBeLessThanOrEqual(12);}
    if(at==='04:44:30'){expect(d.trainLife.trains[0].offset).toBeGreaterThan(0);expect(d.trainLife.trains[0].offset).toBeLessThan(360);}
    if(at==='04:51:30'){expect(d.trainLife.trains[1].offset).toBeGreaterThan(0);expect(d.trainLife.trains[1].offset).toBeLessThan(240);}
    if(at==='04:46:00'){expect(d.trainLife.trains[0].offset).toBe(0);expect(d.trainLife.trains[0].headlamp).toBe(true);expect(d.trainLife.trains[0].fog).toBe(false);expect(d.battlefieldFx.atmosphere.trainPuffs).toBeGreaterThan(0);}
    if(at==='04:30:00')expect(d.stationDamage.visible).toBe(false);
    if(at==='04:36:00'||at==='05:41:00'){expect(d.stationDamage.visible).toBe(true);expect(d.stationDamage.brokenPanes).toBe(12);
      const yard=before.state.snapshot.actors.filter(a=>a.group==='grp_station_yard');expect(yard).toHaveLength(6);expect(yard.filter(a=>a.lantern)).toHaveLength(2);expect(yard.every(a=>a.z<27)).toBe(true);}
    await page.waitForTimeout(750);const after=await page.evaluate(()=>({state:window.gameVerificationState(),d:window.gameDiagnostics()}));expect(after.state).toEqual(before.state);
    expect(after.d.m01.trainLife).toEqual(d.trainLife);expect(errors).toEqual([]);await page.close();
  }
});
test('optional supplemental crew GLB failure preserves mission continuation and procedural actors',async({browser})=>{
  test.setTimeout(600000);const input=saves()['04:36:00'],{page,errors}=await paused(browser,input,{fallback:true});
  const raw=await record(page,'optional-crew-fallback',input);expect(raw.diagnostics.m01.characters.failures.some(f=>JSON.stringify(f).includes('crews-evacuation'))).toBe(true);
  expect(raw.diagnostics.m01.actorPoses.standing+raw.diagnostics.m01.actorPoses.wounded).toBeGreaterThan(0);expect(errors).toEqual([]);await page.close();
});

test('train lamp and smoke at1km resolve in a clear sightline while the original gate still occludes the lamp',async({browser})=>{
  test.setTimeout(900000);const input=saves()['04:46:00'],{page,errors}=await paused(browser,input);
  await trainPixels(page,input,{name:'train-1km-occluded',position:[75,35,-90],target:[1075,8,-2.5],occluded:true});
  const position=[1773.4567811865475,35,704.6067811865474];
  for(const [i,delta]of [0,-.4,.4].entries())await trainPixels(page,input,{name:i?`train-1km-clear-jitter${i}`:'train-1km',position,target:[1075,8+delta,-2.5+delta],smoke:i===0});
  await camera(page,[-120,-1.4,16.5],[1063,3,6]);await record(page,'train-canonical-view10',input);
  expect(errors).toEqual([]);await page.close();
});

async function trainPixels(page,input,{name,position,target,occluded=false,smoke=true}){
  // Presentation assets arrive after the paused-ready predicate (decal atlas upload; the 12 character sources incl. the MG34 crew at the east
  // gate, which swap their procedural bodies for skinned ones). Each arrival redraws the frozen frame (frame key) and would otherwise land between
  // the off/lamp/both captures, so wait for them, then require the three captures to be consecutive frames caused only by the lamp/smoke toggles.
  await page.waitForFunction(()=>{const d=window.gameDiagnostics();return d.m01.damageDecals.atlasReady&&d.m01.characters.loaded.length>=12;},null,{timeout:240000});
  await camera(page,position,target);
  const options={off:{lamp:false,smoke:false},lamp:{lamp:true,smoke:false},...(smoke?{both:{lamp:true,smoke:true}}:{})},frames=()=>page.evaluate(()=>window.gameDiagnostics().m01.renderedFrames);
  let captures;
  for(let attempt=0;;attempt++){
    captures={};let consecutive=true,last=await frames();
    for(const [state,effects]of Object.entries(options)){
      const before=await frames();consecutive&&=before===last;await page.evaluate(o=>window.m01BridgeFinishDebug.setTrainEffects(o),effects);
      await page.waitForFunction(f=>window.gameDiagnostics().m01.renderedFrames>f,before,{timeout:120000});
      captures[state]=(await page.screenshot({path:`${OUT}/${name}-${state}.png`,style:'#pause,#menu,#fade,#resume-card{visibility:hidden!important}',timeout:120000})).toString('base64');
      last=await frames();consecutive&&=last===before+1;
      const stateSnapshot=await page.evaluate(()=>window.gameVerificationState().snapshot),expected=new M01Simulation();expected.restoreSnapshot(input);expect(stateSnapshot).toEqual(expected.snapshot());
    }
    if(consecutive)break;
    // An unrelated redraw (late asset) fell between captures: they are not a same-frame A/B. Retake the series (bounded).
    expect(attempt,'off/lamp/both captures were interleaved with unrelated redraws on every attempt').toBeLessThan(4);
  }
  const pixels=await page.evaluate(async captures=>{
    const decode=async value=>{const b=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),im=await createImageBitmap(new Blob([b],{type:'image/png'})),canvas=new OffscreenCanvas(im.width,im.height),ctx=canvas.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,im.width,im.height).data;};
    const a=await decode(captures.off),b=await decode(captures.lamp),c=captures.both?await decode(captures.both):b;let lampPixels=0,smokePixels=0,lampBrightening=0;
    // Restrict comparisons to the projected train in the world. CSS ammo/HUD animations are irrelevant.
    for(let y=330;y<390;y++)for(let x=610;x<670;x++){const i=(y*1280+x)*4,lamp=Math.max(...[0,1,2].map(k=>Math.abs(a[i+k]-b[i+k]))),smoke=Math.max(...[0,1,2].map(k=>Math.abs(c[i+k]-b[i+k])));if(lamp>=3)lampPixels++;if(smoke>=3)smokePixels++;lampBrightening=Math.max(lampBrightening,b[i]-a[i]);}return {lampPixels,smokePixels,lampBrightening};
  },captures);
  const native=await page.evaluate(()=>window.gameDiagnostics().m01.trainLife.native);
  expect(native.calls).toBeGreaterThan(0);expect(native.calls).toBeLessThanOrEqual(12);
  fs.writeFileSync(`${OUT}/${name}-pixels.json`,JSON.stringify({distanceMetres:Math.hypot(position[0]-1066.35,position[1]-2.5,position[2]+2.5),camera:position,target,pixels,native,occluded,worldPixelRegion:[610,330,670,390],editorialMask:'pause/menu/frozen resume overlay only',method:'Same paused production frame/camera and snapshot; independently toggle only lamp and smoke; decoded world-region PNG RGB threshold3/255. Original frontal ray is blocked by gate_rail_left; clear oblique ray reaches the lamp first (persisted diagnostic). Small target perturbations check raster stability.'},null,2));
  if(occluded)expect(pixels.lampPixels).toBe(0);else{expect(pixels.lampPixels).toBeGreaterThan(0);expect(pixels.lampBrightening).toBeGreaterThanOrEqual(3);}
  if(smoke)expect(pixels.smokePixels).toBeGreaterThan(0);
  await page.evaluate(()=>window.m01BridgeFinishDebug.setTrainEffects(true));
}
