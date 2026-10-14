import {test,expect} from '@playwright/test';

test.use({video:'on'});

test('M01 Argon — gameplay real + multi-soldier GLB animation showcase',async({page},info)=>{
  test.setTimeout(process.env.CI?240000:120000);
  const errors=[],badResponses=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)badResponses.push(r.status()+' '+r.url());});
  // First shot: actual production game/mission, never an invented background.
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models?.length===9,null,{timeout:60000});
  await expect(page.locator('#error')).toBeHidden();
  await page.locator('#start').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>.2,null,{timeout:60000});
  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.gameDiagnostics()?.m01?.characters?.active>0,null,{timeout:60000});
  await page.waitForTimeout(3000);
  const gameplay=await page.evaluate(()=>({clock:window.gameDiagnostics().clock,
    actors:window.gameDiagnostics().m01.characters.actors.map(a=>({id:a.id,clip:a.clip}))}));
  await page.screenshot({path:info.outputPath('01-m01-real-gameplay.png')});
  // Second shot: controlled inspection with the REAL M01Characters renderer, rigs, textures, and GLBs.
  await page.goto('tools/verification/m01-argon-animation-showcase.html');
  await page.waitForFunction(()=>window.ready===true&&window.showcase?.diagnostics()?.renderedModels>=9,null,{timeout:100000});
  const stage=async(mode,screenshot,delay)=>{
    await page.evaluate(m=>window.showcase.setMode(m),mode);
    await page.waitForTimeout(delay);
    const d=await page.evaluate(()=>window.showcase.diagnostics());
    expect(d.renderedModels).toBeGreaterThanOrEqual(mode==='closeup'?5:9);
    await page.screenshot({path:info.outputPath(screenshot)});
    return d;
  };
  const march=await stage('platoon','02-pelotao-animacoes-walk-run-sprint-crouch.png',3800);
  const types=new Set(march.actors.map(a=>a.clip));
  for(const name of ['walk','run','sprint','crouch_walk'])expect(types.has(name),name+' não apareceu: '+[...types]).toBe(true);
  const reaction=await stage('reactions','03-reacoes-hit-duck-turn.png',450);
  for(const name of ['hit_front','near_miss_duck','turn_left','turn_right'])
    expect(reaction.actors.some(a=>a.clip===name),name+' não apareceu').toBe(true);
  await page.waitForTimeout(2600);
  const close=await stage('closeup','04-vista-proxima-soldados-3d.png',3400);
  await info.attach('m01-argon-showcase-diagnostics',{body:JSON.stringify({
    source:'REAL Chromium+Three.js M01Characters on PR #62, staged actors for demonstration (not campaign gameplay)',
    realGameplay:gameplay,stage:[march,reaction,close],errors,badResponses
  }),contentType:'application/json'});
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});
