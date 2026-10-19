import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {driver,route} from '../helpers/m01-route.js';
import {seconds} from '../../src/game/m01-simulation.js';

// P2 pacing HUD in the real game (production build, Chromium, controls and pointer lock as the player has them): the world marker of the current objective
// (label, distance, side) and the "Mais tarde…" card of a compressed battle clock. The saves come from the Node route of tests/helpers/m01-route.js; the
// simulation publishes the marker and the tempo, the page must show exactly that, and neither may sit on the crosshair or the subtitle area.
// This is a presentation/state check on SwiftShader, not a playtest and not a performance figure.
const key='cod-guerra:checkpoint:m01:v2';
const OUT=new URL('../../docs/verification/m01-runtime/pacing-hud-2026-10-18/',import.meta.url).pathname;
const VIEWPORTS=[[1366,768],[1920,1080]];
const POST_LABEL='Posto da ponte ferroviária';
const LABELS=['Sargento Zieliński','Sapadores no aterro','Barracão ferroviário, porta oeste','Posição no tabuleiro rodoviário'];   // static places, in route order

// Deliver-message objective, far from the post (facing it, 90 degrees right, 90 degrees left) and beside it (the E press delivers); then the first compressed tick
// after the repair, and the the hold-deck compression (05:34-05:59, 24x) and a save three battle minutes before its end.
let scenes;
function build(){
  const d=driver(),{sim,step,walk}=d;step({skip:true});
  walk(-66,26);walk(-30,26);
  const post=sim.world.point('forward_post'),toward=Math.atan2(post.z-sim.player.z,post.x-sim.player.x);
  const far=sim.snapshot();far.player.angle=toward;                       // facing the post: bearing 0
  const right=structuredClone(far),left=structuredClone(far);
  right.player.angle=toward-Math.PI/2;left.player.angle=toward+Math.PI/2;   // post 90 degrees to the right / left, off screen
  walk(-30,2);walk(16,2);const near=sim.snapshot();
  // The route compresses twice: once the repair is done (gate, 04:49-05:30) and once the player holds the deck (05:34-05:59).
  // Along the same route the marker points at a different static place for each objective: keep the first save of each, with the point the simulation published.
  const byLabel={};
  let ready=null,start=null,end=null;
  route(19390901,{onStep:({sim})=>{
    const m=sim.objectiveMarker;if(m&&LABELS.includes(m.label)&&!byLabel[m.label])byLabel[m.label]={snapshot:sim.snapshot(),point:{x:m.x,z:m.z}};
    if(!ready&&sim.tempo.compressed)ready=sim.snapshot();
    if(!start&&sim.tempo.compressed&&sim.battleClock>=seconds('05:34:00'))start=sim.snapshot();
    if(!end&&sim.tempo.compressed&&sim.battleClock>=seconds('05:57:00'))end=sim.snapshot();}});
  if(!ready||!start||!end||LABELS.some(l=>!byLabel[l]))throw new Error('The route never compressed the clock');
  return {far,right,left,near,ready,start,end,post,byLabel};
}
test.beforeAll(()=>{scenes=build();mkdirSync(OUT,{recursive:true});});

async function open(page,snapshot){
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:60000});
  return errors;
}
const hud=page=>page.evaluate(()=>window.gameDiagnostics().m01.hudPresentation);
const markerText=async page=>{await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.objective-marker')).opacity)>.9);return markerNow(page);};   // the marker fades in over .4 s
const markerNow=page=>page.evaluate(()=>({label:document.querySelector('.objective-marker .marker-label').textContent,distance:document.querySelector('.objective-marker .marker-distance').textContent,
  side:document.querySelector('.objective-marker').dataset.side??null,opacity:Number(getComputedStyle(document.querySelector('.objective-marker')).opacity),
  player:{x:window.gameDiagnostics().player.x,z:window.gameDiagnostics().player.z}}));
const meters=t=>Number(/^(\d+) m$/.exec(t.distance)?.[1]);
const rects=(page,sel)=>page.evaluate(sel=>Object.fromEntries(Object.entries(sel).map(([k,s])=>{const n=document.querySelector(s),r=n?.getBoundingClientRect(),o=n?Number(getComputedStyle(n).opacity):0;
  return [k,r?{x:r.x,y:r.y,w:r.width,h:r.height,opacity:o}:null];})),sel);
const overlap=(a,b)=>Boolean(a&&b&&a.w&&b.w&&a.h&&b.h&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h);
const SEL={marker:'.objective-marker',tempo:'.tempo-card',crosshair:'#crosshair',captions:'#captions',subtitle:'#subtitle',message:'#message'};

// Neither the marker nor the card may touch the crosshair or the caption/subtitle block, and both must be fully inside the window.
async function layout(page,width,height,{marker=false,tempo=false}){
  await page.setViewportSize({width,height});
  if(marker)await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.objective-marker')).opacity)>.9);
  if(tempo)await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.tempo-card')).opacity)>.5,null,{timeout:30000});
  const r=await rects(page,SEL),at=`@${width}x${height}`;
  for(const [name,on] of [['marker',marker],['tempo',tempo]])if(on){
    const b=r[name];expect(b?.w,`${name} has a box ${at}`).toBeGreaterThan(0);
    expect(b.x,`${name} left ${at}`).toBeGreaterThanOrEqual(0);expect(b.y,`${name} top ${at}`).toBeGreaterThanOrEqual(0);
    expect(b.x+b.w,`${name} right ${at}`).toBeLessThanOrEqual(width+.5);expect(b.y+b.h,`${name} bottom ${at}`).toBeLessThanOrEqual(height+.5);
    for(const other of ['crosshair','captions','subtitle','message'])expect(overlap(b,r[other]),`${name} x ${other} ${at}`).toBeFalsy();
    // The caption block is anchored to the bottom: even empty, the marker (22 vh) and the card (top right) must sit above it.
    expect(b.y+b.h,`${name} above the captions ${at}`).toBeLessThanOrEqual(r.captions.y);
  }
  if(marker&&tempo)expect(overlap(r.marker,r.tempo),`marker x tempo ${at}`).toBeFalsy();
  return r;
}

test('the objective marker names the active objective, shows a distance that follows the player, and sits centred above the crosshair when it is ahead',async({page})=>{
  test.setTimeout(process.env.CI?300000:200000);
  const errors=await open(page,scenes.far);
  await page.waitForFunction(()=>window.gameDiagnostics().m01.hudPresentation.marker);
  const h=await hud(page);expect(h.marker).toMatchObject({label:POST_LABEL,side:null});expect(h.marker.x).toBeCloseTo(.5,1);
  const first=await markerText(page);
  expect(first.label).toBe(POST_LABEL);expect(first.opacity).toBeGreaterThan(.9);
  // The text is the simulation's own distance to the point it published (mission.json forward_post), to the metre, not an invented number.
  const to=p=>Math.hypot(scenes.post.x-p.x,scenes.post.z-p.z);
  expect(Math.abs(meters(first)-to(first.player))).toBeLessThanOrEqual(2);
  // The objective the marker points at is the one the panel shows as active.
  expect(await page.locator('#objective-text').textContent()).toBe('Leve a mensagem e o café ao posto da ponte');
  // Walking forward (real W with pointer lock): the distance text must change and keep following the player.
  await page.keyboard.down('KeyW');
  await page.waitForFunction(d=>{const t=document.querySelector('.objective-marker .marker-distance').textContent;return Number(/^(\d+) m$/.exec(t)?.[1])<=d-3;},meters(first),{timeout:60000});
  const later=await markerText(page);await page.keyboard.up('KeyW');
  expect(meters(later)).toBeLessThan(meters(first));expect(later.label).toBe(POST_LABEL);
  expect(Math.abs(meters(later)-to(later.player))).toBeLessThanOrEqual(2);
  for(const [w,hh] of VIEWPORTS){
    const r=await layout(page,w,hh,{marker:true});
    // Ahead of the player: the label is centred on the window, so it hangs above the crosshair and not beside it.
    expect(Math.abs(r.marker.x+r.marker.w/2-w/2),`marker centred @${w}x${hh}`).toBeLessThanOrEqual(w*.04);
    await page.screenshot({path:`${OUT}marker-ahead-${w}x${hh}.png`,style:'#pause{visibility:hidden!important}'});
  }
  expect(errors).toEqual([]);
});

test('with the post off screen the marker is pinned to the nearer edge on the side where it lies',async({page})=>{
  test.setTimeout(process.env.CI?300000:200000);
  for(const [name,snapshot,side,edge] of [['right',scenes.right,'right',.95],['left',scenes.left,'left',.05]]){
    const errors=await open(page,snapshot);
    await page.waitForFunction(()=>window.gameDiagnostics().m01.hudPresentation.marker);
    const h=await hud(page);expect(h.marker).toMatchObject({label:POST_LABEL,side});expect(h.marker.x).toBeCloseTo(edge,3);
    expect((await markerText(page)).side).toBe(side);
    for(const [w,hh] of VIEWPORTS){
      const r=await layout(page,w,hh,{marker:true});
      const centre=r.marker.x+r.marker.w/2;
      if(side==='right')expect(centre,`right half @${w}x${hh}`).toBeGreaterThan(w*.5);else expect(centre,`left half @${w}x${hh}`).toBeLessThan(w*.5);
      await page.screenshot({path:`${OUT}marker-${name}-${w}x${hh}.png`,style:'#pause{visibility:hidden!important}'});
    }
    expect(errors).toEqual([]);
    await page.evaluate(()=>localStorage.clear());await page.goto('about:blank');
  }
});

test('delivering the message takes the marker away, and every later objective gets its own label and distance',async({page})=>{
  test.setTimeout(process.env.CI?300000:200000);
  let errors=await open(page,scenes.near);
  // At usable range the local action takes over from the distance marker.
  await expect(page.locator('#interaction')).toContainText('E ·');
  await expect(page.locator('.objective-marker')).toHaveCSS('opacity','0');
  expect((await hud(page)).marker.label).toBe(POST_LABEL);
  await page.keyboard.press('KeyE');
  // Once delivered no required objective is active until the sappers are called: the simulation publishes no marker, so none is drawn (and none is left pointing at the post).
  await page.waitForFunction(()=>window.gameDiagnostics().m01.hudPresentation.marker===null&&Number(getComputedStyle(document.querySelector('.objective-marker')).opacity)===0,null,{timeout:60000});
  expect(errors).toEqual([]);
  for(const label of LABELS){
    await page.goto('about:blank');
    errors=await open(page,scenes.byLabel[label].snapshot);
    const t=await markerText(page),point=scenes.byLabel[label].point;
    expect(t.label,label).toBe(label);expect((await hud(page)).marker.label).toBe(label);
    expect(Math.abs(meters(t)-Math.hypot(point.x-t.player.x,point.z-t.player.z)),`${label}: distance text`).toBeLessThanOrEqual(2);
    expect(await page.locator('#objective-text').textContent(),`${label}: objective panel`).not.toBe('');
    for(const [w,hh] of VIEWPORTS)await layout(page,w,hh,{marker:true});
    expect(errors).toEqual([]);
  }
});

for(const [name,reason] of [['ready',/^Reparo concluído\./],['start',/^Em posição no tabuleiro\./]])
test(`"Mais tarde…" appears when the clock compresses (${name}), with its reason, and hides after its few seconds while the clock stays accelerated`,async({page})=>{
  test.setTimeout(process.env.CI?300000:200000);
  const errors=await open(page,scenes[name]);
  const card=()=>page.evaluate(()=>({opacity:Number(getComputedStyle(document.querySelector('.tempo-card')).opacity),label:document.querySelector('.tempo-card strong').textContent,
    reason:document.querySelector('.tempo-card small').textContent,compressed:document.getElementById('hud').classList.contains('tempo-compressed'),
    clock:window.gameDiagnostics().clock}));
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.tempo-card')).opacity)>.9,null,{timeout:60000});
  const shown=await card();
  expect(shown.compressed).toBe(true);expect(shown.label).toBe('Mais tarde…');expect(shown.reason).toMatch(reason);
  expect((await hud(page)).tempo).toBe(true);
  for(const [w,hh] of VIEWPORTS){
    await layout(page,w,hh,{tempo:true});
    await page.screenshot({path:`${OUT}mais-tarde-card-${name}-${w}x${hh}.png`,style:'#pause{visibility:hidden!important}'});
  }
  // The card fades out after about six seconds of mission clock; the accelerated state (class, pulsing clock) is what remains.
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.tempo-card')).opacity)===0,null,{timeout:120000});
  const hidden=await card();
  expect(hidden.clock-shown.clock).toBeGreaterThanOrEqual(5);expect(hidden.compressed).toBe(true);
  expect(errors).toEqual([]);
});

test('"Mais tarde…" and the accelerated clock end together when the compression window closes at 05:59',async({page})=>{
  test.setTimeout(process.env.CI?300000:200000);
  const errors=await open(page,scenes.end);
  expect((await hud(page)).tempo).toBe(true);
  await page.waitForFunction(()=>!window.gameDiagnostics().m01.hudPresentation.tempo,null,{timeout:120000});
  const after=await page.evaluate(()=>({compressed:document.getElementById('hud').classList.contains('tempo-compressed'),opacity:Number(getComputedStyle(document.querySelector('.tempo-card')).opacity),
    label:document.querySelector('.tempo-card strong').textContent,battle:window.gameDiagnostics().m01.battleClock??null}));
  expect(after.compressed).toBe(false);expect(after.label).toBe('');
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.tempo-card')).opacity)===0,null,{timeout:10000});
  expect(errors).toEqual([]);
});
