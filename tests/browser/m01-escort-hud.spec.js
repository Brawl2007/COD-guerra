import {test,expect} from '@playwright/test';
import {route} from '../helpers/m01-route.js';

// SP-08 HUD in the real game (production build, Chromium): the corridor count «passaram X de Y» on the objective status line, counted one man at a time by the
// simulation, and the escort line with the marker on Dudek. The saves come from the Node route of tests/helpers/m01-route.js; the page must show what the simulation
// publishes (mission.status, objectiveMarker). A presentation/state check on SwiftShader, not a playtest and not a performance figure.
const key='cod-guerra:checkpoint:m01:v2';
let saves;
test.beforeAll(()=>{
  let count=null,escort=null;
  route(19390901,{onStep:({sim})=>{
    const t=sim.corridorTask;
    if(!count&&t?.phase==='count'&&t.counted<=1&&sim.actors.some(a=>a.group==='grp_east_platoon'&&a.alive&&a.active&&a.x>-275))count=sim.snapshot();
    if(!escort&&t?.phase==='escort'&&t.escorted&&sim.actor('leon_dudek').x<-60)escort=sim.snapshot();
  }});
  if(!count||!escort)throw new Error('The route never counted or escorted');
  saves={count,escort};
});
async function open(page,snapshot){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:60000});
  return errors;
}
const status=page=>page.locator('#objective-status').textContent();

test('the corridor count is on the objective status line and goes up one man at a time while the platoon passes the post',async({page})=>{
  const errors=await open(page,saves.count);
  await expect(page.locator('#objective-status')).toHaveText(/^Corredor · passaram \d+ de \d+ homens do pelotão leste$/,{timeout:30000});
  const seen=[];
  for(let i=0;i<40;i++){const m=/passaram (\d+) de (\d+)/.exec(await status(page));if(m)seen.push([Number(m[1]),Number(m[2])]);await page.waitForTimeout(250);}
  expect(seen.length).toBeGreaterThan(10);
  const total=seen[0][1];expect(seen.every(([,y])=>y===total)).toBe(true);
  for(let i=1;i<seen.length;i++)expect(seen[i][0]-seen[i-1][0]).toBeGreaterThanOrEqual(0),expect(seen[i][0]-seen[i-1][0]).toBeLessThanOrEqual(1);
  expect(seen.at(-1)[0]).toBeGreaterThan(seen[0][0]);
  expect(errors).toEqual([]);
});

test('in the escort the status line says how far the station is and the marker is on Dudek with Bąk',async({page})=>{
  const errors=await open(page,saves.escort);
  await expect(page.locator('#objective-status')).toHaveText(/^(A escoltar Dudek com Bąk · faltam \d+ m até à estação|Escolte Dudek com Bąk · .+|Dudek abrigado sob fogo com Bąk · .+)$/,{timeout:30000});
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.objective-marker')).opacity)>.9,null,{timeout:30000});
  await expect(page.locator('.objective-marker .marker-label')).toHaveText('Dudek com Bąk');
  expect(errors).toEqual([]);
});
