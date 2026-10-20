import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
test.describe.configure({timeout:180000});
const errors=new WeakMap();test.beforeEach(({page})=>{const e=[];errors.set(page,e);page.on('pageerror',x=>e.push(x.message));});test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
const state=page=>page.evaluate(()=>({diagnostics:window.gameDiagnostics(),snapshot:window.gameVerificationState().snapshot,status:document.querySelector('#objective-status').textContent,marker:document.querySelector('.marker-label').textContent}));
async function boot(page,name,touch=false){
 const saved=JSON.parse(readFileSync(new URL(`../fixtures/m01-sp08-${name}.json`,import.meta.url)));
 await page.addInitScript(saved=>{localStorage.setItem('cod-guerra:checkpoint:m01:v2',JSON.stringify(saved));localStorage.setItem('cod-guerra:visual-quality','low');},saved);
 await page.goto('?debug=1&visual-verify=1'+(touch?'&touch=1':''));await expect(page.locator('#continue')).toBeEnabled({timeout:90000});await page.locator('#continue').click();await page.waitForFunction(clock=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>=clock+6,saved.clock,{timeout:90000});
 return saved;
}
async function pause(page,touch=false){if(touch)await page.locator('#tb-pause').tap();else await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();}
async function photo(page,info,name){await page.screenshot({path:info.outputPath(name),style:'#pause{visibility:hidden!important}'});}
async function returning(page,info,touch=false){
 const saved=await boot(page,'outside-post',touch),before=await state(page);await expect(page.locator('#objective-status')).toContainText('Regresse ao posto');await expect(page.locator('.marker-label')).toContainText('Posto de disparo');
 if(touch)await expect(page.locator('#touch-controls')).toBeVisible();await pause(page,touch);await photo(page,info,'outside-post.png');const stopped=(await state(page)).snapshot.clock;await page.locator('#resume').click();
 await page.waitForFunction(({clock,touch})=>!window.gameDiagnostics().paused&&window.gameDiagnostics().clock>clock+.1&&(touch||document.pointerLockElement!==null),{clock:stopped,touch});
 let cdp;
 try{
  if(touch){
   const b=await page.locator('#touch-move').boundingBox(),x=b.x+Math.min(100,b.width*.27),y=b.y+b.height*.67;cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y+Math.min(56,b.y+b.height-y-10)}]});
  }else await page.keyboard.down('KeyS');
  await expect(page.locator('#objective-status')).toContainText('Mantenha o posto',{timeout:30000});
 }finally{if(touch&&cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else if(!touch)await page.keyboard.up('KeyS');}
 await pause(page,touch);const arrived=await state(page),p=arrived.snapshot.player,bp=before.snapshot.player;
 expect(Math.hypot(p.x-bp.x,p.z-bp.z)).toBeGreaterThan(2);expect(p.alive).toBe(true);expect(arrived.status).toBe('Mantenha o posto · '+arrived.snapshot.mission.status);expect(arrived.marker).toBe('Dudek com Bąk · observe a retirada');expect(arrived.snapshot.objectives.obj_m01_hold_corridor.state).toBe('active');
 await photo(page,info,'holding-post.png');writeFileSync(info.outputPath('normal-controls-return.json'),JSON.stringify({fixtureClock:saved.clock,control:touch?'real CDP touch joystick, backwards':'real keyboard KeyS',before,arrived,errors:errors.get(page)},null,2));
 return arrived;
}
test('desktop: normal controls return to the post; observing Dudek does not order following; checkpoint restart clears the role',async({page},info)=>{
 await returning(page,info);
 await page.locator('#restart-checkpoint').click();if(await page.locator('#pause').isVisible())await page.locator('#resume').click();
 await page.waitForFunction(()=>window.gameVerificationState().snapshot.objectives.obj_m01_leave_bridge.state==='active');
 await expect(page.locator('#objective-status')).not.toContainText('Mantenha o posto');await expect(page.locator('#objective-status')).not.toContainText('Regresse ao posto');
 const restored=await state(page);expect(restored.snapshot.difficulty).toBe('soldado');expect(restored.snapshot.checkpointsReached.at(-1)).toBe('cp_m01_d_retirada');writeFileSync(info.outputPath('checkpoint-role-cleared.json'),JSON.stringify(restored,null,2));
});
test.describe('mobile corridor',()=>{test.use({viewport:{width:896,height:414},hasTouch:true,isMobile:true,deviceScaleFactor:1});test('real touch controls return to the post and the context fits short screens',async({page},info)=>{
 await returning(page,info,true);const layouts=[];
 for(const viewport of [{width:896,height:414},{width:640,height:360},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.waitForFunction(()=>document.querySelector('#health-wrap').getBoundingClientRect().top>document.querySelector('#objective-panel').getBoundingClientRect().bottom);
  const layout=await page.locator('#objective-status').evaluate(n=>{const r=n.getBoundingClientRect(),h=document.querySelector('#health-wrap').getBoundingClientRect(),panel=document.querySelector('#objective-panel').getBoundingClientRect();return {text:n.textContent,left:r.left,right:r.right,bottom:r.bottom,health:{top:h.top,bottom:h.bottom,left:h.left,right:h.right},panelBottom:panel.bottom,width:innerWidth,height:innerHeight};});
  expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeLessThanOrEqual(viewport.width);expect(layout.bottom).toBeLessThan(viewport.height/2);expect(layout.health.top).toBeGreaterThan(layout.panelBottom);expect(layout.health.bottom).toBeLessThanOrEqual(viewport.height);layouts.push(layout);await photo(page,info,`post-${viewport.width}x${viewport.height}.png`);
 }
 writeFileSync(info.outputPath('context-layouts.json'),JSON.stringify(layouts,null,2));await page.setViewportSize({width:896,height:414});await page.locator('#resume').click();await expect(page.locator('#touch-controls')).toBeVisible();
});});
test('the real ready corridor proceeds to west demolition and removes the old role without scripted game writes',async({page},info)=>{
 await boot(page,'all-clear');await page.waitForFunction(()=>window.gameVerificationState().snapshot.consumed.evt_m01_west_demolition!==undefined,null,{timeout:90000});
 const after=await state(page);expect(after.snapshot.objectives.obj_m01_hold_corridor.state).toBe('done');expect(after.snapshot.objectives.obj_m01_reach_shelter.state).toBe('active');
 await expect(page.locator('#objective-status')).not.toContainText('Mantenha o posto');await expect(page.locator('#objective-status')).not.toContainText('Regresse ao posto');
 await pause(page);await photo(page,info,'real-west-demolition.png');writeFileSync(info.outputPath('objective-transition.json'),JSON.stringify(after,null,2));
});
