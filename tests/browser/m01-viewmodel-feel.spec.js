import {test,expect} from '@playwright/test';
import {driver} from '../helpers/m01-route.js';
import {eyePosition,aimDirection,traceObstruction} from '../../src/world/spatial.js';
import {WZ29_FEEL,adsEase,adsFieldOfView,wallLowerTarget} from '../../src/render/m01-wz29-presentation.js';

// T39 M01-VIEWMODEL-FEEL-V2, browser side, production build. Honest scope: real input only drives the aim (right mouse); the
// near-wall saves come from the real simulation (walking the real route up to the road portal wall), never from injected state.
// A pixel capture is evidence, not proof of "no clipping": the weapon pass is drawn over the world, so the reach claim is
// proved from the viewmodel's own measured muzzle reach against the sim's collision boxes, and the pictures are attached.
const key='cod-guerra:checkpoint:m01:v2';
const REGION={x:320,y:260,width:960,height:460};            // lower right of the 1280x720 viewport: rifle, hands, sleeves
const HIDE='#pause,#hud{visibility:hidden !important}';       // overlays are not part of the weapon region
const TIMEOUT=()=>process.env.CI?240000:120000;

function route(){
  const d=driver();d.step({skip:true});for(let i=0;i<20;i++)d.step();
  const hip=d.sim.snapshot();
  const nav=(x,z)=>{for(let i=0;i<3000;i++){const p=d.sim.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<1.2)return;
    let turn=Math.atan2(dz,dx)-p.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));d.step({lookX:turn/.0022,forward:1,sprint:true});}throw new Error('route: walk');};
  const face=angle=>{let turn=angle-d.sim.player.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));d.step({lookX:turn/.0022});};
  nav(-10.9,32.8);face(0);
  // Walk up to the road portal wall (face at x = -7) and stop about a metre short of it, like a player would.
  let guard=0;while(-7-d.sim.player.x>1.05&&guard++<80)d.step({forward:1});
  for(let i=0;i<10;i++)d.step({});
  const p=d.sim.player,hit=traceObstruction(d.sim.world,eyePosition(p),aimDirection(p.angle,p.pitch),5);
  if(hit?.id!=='road_portal_n')throw new Error(`route: expected the road portal wall, got ${hit?.id}`);
  const wall={snapshot:d.sim.snapshot(),clearance:hit.distance};
  face(Math.PI);for(let i=0;i<5;i++)d.step({});
  return {hip,wall,away:d.sim.snapshot()};
}
const saves=route();
if(saves.hip.player.aiming||!(saves.wall.clearance>WZ29_FEEL.wall.full&&saves.wall.clearance<1.1))throw new Error('fixtures not reached through real controls');

async function open(page,snapshot,quality='low'){
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key,snapshot});
  await page.goto('?debug=1');await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9);
  await page.locator('#quality').selectOption(quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game'&&window.gameDiagnostics().m01.viewModel.active);
  return {errors,failed};
}
const diag=page=>page.evaluate(()=>window.gameDiagnostics());
const pause=async page=>{await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();};
const resume=async page=>{await page.locator('#resume').click();await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game');};
const weapon=page=>page.screenshot({clip:REGION,style:HIDE});
// Pause freezes the weapon region: the clock, the viewmodel stats and the pixels stay exactly as they were.
async function expectFrozen(page){
  const a=await diag(page),shotA=await weapon(page);await page.waitForTimeout(400);
  const b=await diag(page),shotB=await weapon(page);
  expect(b.clock).toBe(a.clock);expect(b.m01.viewModel).toEqual(a.m01.viewModel);expect(b.m01.demolition.camera.fov).toBe(a.m01.demolition.camera.fov);
  expect(Buffer.compare(shotA,shotB)).toBe(0);
  return shotA;
}
// Records every rendered frame (inside the game's own rAF chain, after it drew) and, when asked, pauses on the first frame
// whose aim is clearly mid-transition. Pausing uses the game's own blur/pointer-lock path, synchronously, so a slow software
// renderer cannot step past the moment. Nothing is injected into the simulation.
const install=page=>page.evaluate(()=>{
  const raf=window.requestAnimationFrame.bind(window),state=window.__feel={recording:false,captureMid:false,frames:[],mid:null};
  window.requestAnimationFrame=callback=>raf(time=>{
    callback(time);
    if(!state.recording)return;
    const g=window.gameDiagnostics?.();if(!g||g.paused||!g.m01?.viewModel?.active)return;
    const v=g.m01.viewModel;
    state.frames.push({clock:g.clock,aim:v.aimBlend,aiming:g.player.aiming,fov:v.presentation.fov,camFov:g.m01.demolition.camera.fov});
    if(state.captureMid&&!state.mid&&g.player.aiming&&v.aimBlend>=.25&&v.aimBlend<1){
      window.dispatchEvent(new Event('blur'));
      state.mid={clock:g.clock,aim:v.aimBlend,fov:v.presentation.fov,camFov:g.m01.demolition.camera.fov,aiming:g.player.aiming,paused:g.paused};
      document.exitPointerLock();
    }
  });
});
// Every consecutive pair of rendered frames obeys the curve: progress moves by dt/0.30 in, dt/0.22 out, exactly, whatever the
// frame rate was; and the world FOV of every frame is the shared ease of that progress.
function expectCurve(frames){
  let pairs=0,moving=0;
  for(const f of frames){
    expect(Math.abs(f.camFov-adsFieldOfView(f.aim)),`camera fov ${f.camFov} at aim ${f.aim}`).toBeLessThan(1e-9);
    expect(Math.abs(f.fov-adsFieldOfView(f.aim)),`reported fov ${f.fov}`).toBeLessThan(6e-5);
  }
  for(let i=1;i<frames.length;i++){
    const prev=frames[i-1],cur=frames[i],dt=cur.clock-prev.clock;
    if(dt<0)continue;
    const expected=cur.aiming?Math.min(1,prev.aim+dt/WZ29_FEEL.ads.in):Math.max(0,prev.aim-dt/WZ29_FEEL.ads.out);
    expect(Math.abs(cur.aim-expected),`aim ${prev.aim} -> ${cur.aim} over ${dt} s (aiming ${cur.aiming})`).toBeLessThan(1e-6);
    pairs++;if(prev.aim>0&&prev.aim<1||cur.aim>0&&cur.aim<1)moving++;
  }
  return {pairs,moving};
}

test('hip, mid-ADS and ADS by real right-mouse aim: 70 -> 48 on the shared eased curve; pause freezes the weapon region',async({page},info)=>{
  test.setTimeout(TIMEOUT());
  const {errors,failed}=await open(page,saves.hip);
  // HIP: nothing aimed, world FOV 70, no wall in reach.
  const hip=await diag(page);
  expect(hip.player.aiming).toBe(false);expect(hip.m01.viewModel.aimBlend).toBe(0);expect(hip.m01.viewModel.presentation.fov).toBe(70);
  expect(hip.m01.demolition.camera.fov).toBe(70);expect(hip.m01.viewModel.presentation.wallLower).toBe(0);
  await pause(page);
  const hipShot=await expectFrozen(page);await info.attach('hip',{body:hipShot,contentType:'image/png'});
  await page.screenshot({path:info.outputPath('viewmodel-feel-hip.png'),style:HIDE});
  await resume(page);
  // MID-ADS: right mouse down; the page pauses on the first rendered frame with the aim between 25 % and 100 %.
  await install(page);
  await page.evaluate(()=>{window.__feel.frames=[];window.__feel.recording=true;window.__feel.captureMid=true;});
  await page.mouse.down({button:'right'});
  await page.waitForFunction(()=>window.__feel.mid,null,{timeout:60000});
  await expect(page.locator('#pause')).toBeVisible();
  const mid=await page.evaluate(()=>window.__feel.mid);
  expect(mid.aiming).toBe(true);expect(mid.aim).toBeGreaterThanOrEqual(.25);expect(mid.aim).toBeLessThan(1);
  expect(mid.camFov).toBeGreaterThan(48);expect(mid.camFov).toBeLessThan(70);
  expect(Math.abs(mid.camFov-(70-22*adsEase(mid.aim)))).toBeLessThan(1e-9);
  const midShot=await expectFrozen(page);await info.attach('mid-ADS',{body:midShot,contentType:'image/png'});
  await page.screenshot({path:info.outputPath('viewmodel-feel-mid-ads.png'),style:HIDE});
  expect(Buffer.compare(midShot,hipShot)).not.toBe(0);
  // ADS: aim again by input and wait until the transition has finished; the sights are on the camera axis, world FOV 48.
  await resume(page);
  await page.mouse.up({button:'right'});await page.mouse.down({button:'right'});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.aimBlend===1&&window.gameDiagnostics().player.aiming,null,{timeout:60000});
  await pause(page);
  const ads=await diag(page),v=ads.m01.viewModel;
  expect(v.presentation.fov).toBe(48);expect(ads.m01.demolition.camera.fov).toBe(48);expect(v.presentation.wallLower).toBe(0);
  for(const sight of Object.values(v.visualSights)){expect(Math.abs(sight[0])).toBeLessThan(1e-6);expect(Math.abs(sight[1])).toBeLessThan(1e-6);}
  const adsShot=await expectFrozen(page);await info.attach('ADS',{body:adsShot,contentType:'image/png'});
  await page.screenshot({path:info.outputPath('viewmodel-feel-ads.png'),style:HIDE});
  expect(Buffer.compare(adsShot,midShot)).not.toBe(0);
  // OUT: release the aim; 0.22 s of mission time back to the hip and to FOV 70, on the same per-frame law.
  await resume(page);
  await page.mouse.up({button:'right'});
  await page.waitForFunction(()=>{const f=window.__feel.frames.at(-1);return f&&!f.aiming&&f.aim===0;},null,{timeout:60000});
  const {pairs,moving}=expectCurve(await page.evaluate(()=>window.__feel.frames));
  expect(pairs).toBeGreaterThan(3);
  await info.attach('curve-evidence',{body:JSON.stringify({pairs,framesInTransition:moving,note:'every consecutive rendered pair satisfies the 0.30 s in / 0.22 s out law and fov = 70-22*ease(progress)'},null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});

test('near a wall the rifle is held lowered and short of the wall; with the wall behind, it is raised again',async({page,context},info)=>{
  test.setTimeout(TIMEOUT());
  const target=wallLowerTarget(saves.wall.clearance);
  expect(target).toBeGreaterThan(.5);   // a real stand-off, between the lowest-pose distance and the muzzle reach
  const first=await open(page,saves.wall.snapshot);
  await page.waitForFunction(()=>{const p=window.gameDiagnostics().m01.viewModel.presentation;return p&&p.wallDistance!==null&&p.wallLower>0;},null,{timeout:60000});
  // Settled: the player stands still, so the lowering has reached the steady state of the distance the viewmodel itself probed.
  const {reach,full}=WZ29_FEEL.wall;
  await page.waitForFunction(({reach,full})=>{const p=window.gameDiagnostics().m01.viewModel.presentation;
    return p.wallDistance!==null&&Math.abs(p.wallLower-Math.min(1,Math.max(0,(reach-p.wallDistance)/(reach-full))))<2e-3;},{reach,full},{timeout:60000});
  await pause(page);
  const near=await diag(page),p=near.m01.viewModel.presentation;
  expect(near.player.aiming).toBe(false);
  // The probe's distance is the simulation's own trace to the same collision box (computed in Node from the same save).
  expect(Math.abs(p.wallDistance-saves.wall.clearance)).toBeLessThan(.02);
  expect(Math.abs(p.wallLower-wallLowerTarget(p.wallDistance))).toBeLessThan(2e-3);
  expect(near.m01.viewModel.clip).toBe('aim');
  // The rifle stands short of the wall (muzzle reach is measured on the drawn muzzle), nothing was added to the simulation.
  expect(p.muzzleReach).toBeLessThanOrEqual(p.wallDistance-.04);
  expect(p.muzzleReach).toBeLessThan(.95);
  expect(near.m01.weapon.state).toBe('READY');
  const loweredShot=await expectFrozen(page);
  await info.attach('lowered-near-wall',{body:loweredShot,contentType:'image/png'});
  await page.screenshot({path:info.outputPath('viewmodel-feel-near-wall-lowered.png'),style:HIDE});
  expect(first.errors).toEqual([]);expect(first.failed).toEqual([]);
  await page.close();
  // Same spot, turned away from the wall (nothing in reach): the rifle is back at the hip pose.
  const second=await context.newPage();
  const openSecond=await open(second,saves.away);
  await second.waitForFunction(()=>window.gameDiagnostics().m01.viewModel.presentation.wallLower===0,null,{timeout:60000});
  await pause(second);
  const clear=await diag(second),c=clear.m01.viewModel.presentation;
  expect(c.wallDistance).toBeNull();expect(c.wallLower).toBe(0);expect(c.muzzleReach).toBeGreaterThan(1.1);
  const clearShot=await expectFrozen(second);
  await info.attach('raised-clear',{body:clearShot,contentType:'image/png'});
  await second.screenshot({path:info.outputPath('viewmodel-feel-clear-raised.png'),style:HIDE});
  expect(Buffer.compare(loweredShot,clearShot)).not.toBe(0);
  expect(openSecond.errors).toEqual([]);expect(openSecond.failed).toEqual([]);
});
