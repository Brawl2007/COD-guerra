import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import legacy from '../fixtures/m01-d3-legacy-danger-save.json' with {type:'json'};
const key='cod-guerra:checkpoint:m01:v2';
test.describe.configure({timeout:180000});
const errors=new WeakMap();test.beforeEach(({page})=>{const list=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
async function boot(page,saved){
 await page.addInitScript(({key,saved})=>{localStorage.setItem(key,JSON.stringify(saved));localStorage.setItem('cod-guerra:visual-quality','low');localStorage.setItem('cod-guerra:difficulty','recruta');},{key,saved});
 await page.goto('?debug=1&visual-verify=1');await expect(page.locator('#continue')).toBeEnabled({timeout:90000});await page.locator('#continue').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused);
}
const state=page=>page.evaluate(()=>({d:window.gameDiagnostics(),s:window.gameVerificationState().snapshot}));
test('a genuine D3 danger save remains playable in D4 with its actual saved level',async({page},info)=>{
 expect(Object.values(legacy.timers.telegraph).every(e=>!('cue'in e))).toBe(true);await boot(page,legacy);await page.waitForFunction(clock=>window.gameDiagnostics().clock>clock,legacy.clock);
 await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();await expect(page.locator('#error')).toBeHidden();
 // This genuine save is just before CP-C: its first normal tick must preserve the old checkpoints and append CP-C.
 const result=await state(page);expect(result.s.difficulty).toBe('soldado');expect(result.s.player.alive).toBe(true);expect(result.s.checkpointsReached).toEqual([...legacy.checkpointsReached,'cp_m01_c_engenheiros']);
 await expect(page.locator('#pause-objective')).toContainText('Soldado');await page.screenshot({path:info.outputPath('d3-legacy-danger-save.png')});writeFileSync(info.outputPath('d3-legacy-loaded.json'),JSON.stringify(result,null,2));
});
test('an incoming round from the real audited route publishes its actual shooter and restores the checkpoint',async({page},info)=>{
 // Produced by the route observer from normal controls, before a real fatal round; never hand-authored or HP-injected.
 const saved=JSON.parse(readFileSync(new URL('../fixtures/m01-d4-native-before-fatal.json',import.meta.url))),origin=JSON.parse(readFileSync(new URL('../fixtures/m01-d4-native-before-fatal-origin.json',import.meta.url)));
 expect(saved.player.alive).toBe(true);expect(origin.method).toContain('normal controls');await boot(page,saved);
 await page.waitForFunction(()=>{const down=window.gameDiagnostics().m01.playerDown;if(!down)return false;if(document.pointerLockElement)document.exitPointerLock();return true;},null,{polling:25,timeout:30000});
 await expect(page.locator('#pause')).toBeVisible();const down=await state(page),cause=down.d.m01.playerDown;expect(cause.by).toMatch(/^de_(east|spans)_\d+$/);
 const shooter=down.s.actors.find(a=>a.id===cause.by);expect(shooter).toBeTruthy();expect(cause.cause).toContain(shooter.weapon==='mg34'?'MG34':'espingarda alemã');expect(down.s.player.alive).toBe(false);
 await expect(page.locator('#title-card')).toContainText(cause.cause);await expect(page.locator('#title-card')).toContainText(cause.checkpoint);await expect(page.locator('#title-card')).toContainText('Veterano');
 await page.screenshot({path:info.outputPath('actual-combat-source.png'),style:'#pause{visibility:hidden!important}'});
 const layouts=[];
 for(const viewport of [{width:1280,height:720},{width:896,height:414},{width:640,height:360},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  const layout=await page.locator('#title-card').evaluate(node=>({viewport:{width:innerWidth,height:innerHeight},lines:[...node.children].map(n=>{const r=n.getBoundingClientRect();return {text:n.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:n.clientWidth,scrollWidth:n.scrollWidth,height:n.clientHeight,scrollHeight:n.scrollHeight};})}));
  expect(layout.lines[0].text).toBe(cause.cause);
  for(const line of layout.lines){expect(line.left).toBeGreaterThanOrEqual(0);expect(line.right).toBeLessThanOrEqual(viewport.width);expect(line.top).toBeGreaterThanOrEqual(0);expect(line.bottom).toBeLessThanOrEqual(viewport.height);expect(line.scrollWidth).toBeLessThanOrEqual(line.width+1);expect(line.scrollHeight).toBeLessThanOrEqual(line.height+1);}
  layouts.push(layout);await page.screenshot({path:info.outputPath(`actual-combat-${viewport.width}x${viewport.height}.png`),style:'#pause{visibility:hidden!important}'});
 }
 writeFileSync(info.outputPath('cause-layouts.json'),JSON.stringify(layouts,null,2));await page.setViewportSize({width:1280,height:720});
 const cp=saved.checkpointsReached.at(-1);await page.locator('#resume').click();await page.waitForFunction(()=>window.gameDiagnostics().m01.playerDown===null&&!window.gameDiagnostics().paused);
 const restored=await state(page);expect(restored.s.player.alive).toBe(true);expect(restored.s.difficulty).toBe('veterano');expect(restored.s.checkpointsReached.at(-1)).toBe(cp);expect(restored.s.resumeCheckpoint?.player.health??restored.s.player.health).toBe(100);
 await expect(page.locator('#message')).not.toContainText(cause.cause);await page.screenshot({path:info.outputPath('actual-combat-restored.png')});
 writeFileSync(info.outputPath('actual-combat-source.json'),JSON.stringify({origin,down,restored,errors:errors.get(page)},null,2));
});
