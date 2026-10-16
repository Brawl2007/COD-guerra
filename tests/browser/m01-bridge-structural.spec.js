import {test,expect} from '@playwright/test';
import {M01Simulation} from '../../src/game/m01-simulation.js';
import {route} from '../helpers/m01-route.js';

// Structural closeout captures: same relocation fixture as the portal polish spec.
// The saved snapshot only moves the player; demolition state comes from real route snapshots.
const key='cod-guerra:checkpoint:m01:v2';
const baseline=process.env.M01_BASELINE_CAPTURE==='1';

function relocated(sim,snapshot,x,z,target){
  const s=structuredClone(snapshot),y=sim.world.heightAt(x,z),dx=target.x-x,dz=target.z-z;
  s.player.x=x;s.player.z=z;s.player.y=y;s.player.angle=Math.atan2(dz,dx);
  s.player.pitch=Math.atan2((target.y??y+1.5)-y-1.6,Math.hypot(dx,dz));s.player.aiming=false;
  return s;
}
async function openView(browser,info,{name,sim,snapshot,x,z,target,quality='high'}){
  const page=await browser.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  const state=relocated(sim,snapshot,x,z,target);
  await page.addInitScript(({key,state,quality})=>{
    localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('cod-guerra:visual-quality',quality);
  },{key,state,quality});
  await page.goto('?debug=1');
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});
  await expect(page.locator('#error')).toBeHidden();await page.locator('#quality').selectOption(quality);
  await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:120000});
  await page.waitForFunction(()=>window.gameDiagnostics().m01.renderedFrames>2,null,{timeout:120000});
  await page.evaluate(()=>document.exitPointerLock());await expect(page.locator('#pause')).toBeVisible();
  const data=await page.evaluate(()=>window.gameDiagnostics());
  await page.screenshot({path:info.outputPath(name),style:'#pause,#hud,#menu {visibility:hidden!important}',timeout:120000});
  const counters={quality:data.quality,player:data.player,drawCalls:data.drawCalls,triangles:data.triangles,textures:data.textures,
    geometries:data.geometries,visiblePieces:data.m01.visiblePieces,bridgePortalPolish:data.m01.bridgePortalPolish};
  await info.attach(name+'.json',{body:JSON.stringify(counters,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  return {page,data,counters};
}

const fresh=()=>{const sim=new M01Simulation(19390901);sim.tick(.05,{skip:true});return sim;};

test('captures bridge structure at near, medium and long range',async({browser},info)=>{
  test.setTimeout(1500000);
  const sim=fresh(),intact=sim.snapshot(false),samples={};
  const views=[
    // Near: inside the trusses, at deck level, and the rail → bridge junction.
    {name:'rail-deck-near-high.png',x:30,z:-3.2,target:{x:110,z:-1,y:2.5}},
    {name:'road-deck-near-high.png',x:28,z:38.6,target:{x:110,z:40,y:3}},
    {name:'rail-approach-junction-high.png',x:-34,z:-2.4,target:{x:12,z:0,y:-.4}},
    // Near/medium: truss side elevation, bearings, piers and abutment from the west bank.
    {name:'rail-truss-side-high.png',x:18,z:-42,target:{x:95,z:0,y:-1}},
    {name:'road-truss-side-high.png',x:18,z:84,target:{x:95,z:40,y:1}},
    {name:'pier-01-bearings-high.png',x:22,z:-26,target:{x:140.9,z:0,y:-3}},
    // Medium and long silhouettes, LOD1/LOD2 included.
    {name:'bridges-medium-high.png',x:-40,z:-150,target:{x:260,z:20,y:0}},
    {name:'bridges-long-high.png',x:-120,z:-250,target:{x:620,z:20,y:2}},
    {name:'bridges-medium-low.png',x:-40,z:-150,target:{x:260,z:20,y:0},quality:'low'},
    // Close inspection: truss node from the deck, Pratt portal frame, pier 2 from the east floodplain.
    {name:'rail-truss-node-near-high.png',x:58,z:2.6,target:{x:66.5,z:4.8,y:1.2}},
    {name:'road-girder-near-high.png',x:40,z:41.2,target:{x:46,z:43.2,y:1.4}},
    {name:'pratt-portal-near-high.png',x:885,z:-1,target:{x:925,z:0,y:6.5}},
    {name:'pier-02-close-high.png',x:292,z:-24,target:{x:270.2,z:-2,y:-2.5}},
    // Quality tiers on the same deck view: Medium keeps structure without rivets; Low is the authored kit only.
    {name:'rail-deck-near-medium.png',x:30,z:-3.2,target:{x:110,z:-1,y:2.5},quality:'medium'},
    {name:'rail-deck-near-low.png',x:30,z:-3.2,target:{x:110,z:-1,y:2.5},quality:'low'}
  ];
  for(const v of views){
    const {page,data,counters}=await openView(browser,info,{...v,sim,snapshot:intact});
    samples[v.name]={...counters,bridgeStructure:data.m01.bridgeStructure};
    if(!baseline){
      const d=data.m01.bridgeStructure,quality=v.quality??'high';
      expect(d.quality).toBe(quality);expect(d.collidersAdded).toBe(0);
      if(quality==='low')expect(d.visibleDetails).toBe(0);else expect(d.visibleDetails).toBeGreaterThan(0);
    }
    await page.close();
  }
  if(!baseline){
    // Medium carries the structure without rivets; High adds near-range rivets/fishplates on top of it.
    const high=samples['rail-deck-near-high.png'].bridgeStructure,medium=samples['rail-deck-near-medium.png'].bridgeStructure;
    expect(high.visibleDetails).toBeGreaterThan(medium.visibleDetails);expect(medium.hiddenSourcePrimitives).toBeGreaterThan(0);
    expect(samples['rail-deck-near-low.png'].bridgeStructure.hiddenSourcePrimitives).toBe(0);
  }
  console.log('M01_BRIDGE_STRUCTURAL_COUNTERS '+JSON.stringify(Object.fromEntries(Object.entries(samples).map(([k,c])=>[k,{quality:c.quality,drawCalls:c.drawCalls,
    triangles:c.triangles,structureBatches:c.bridgeStructure?.activeBatches,structureDetails:c.bridgeStructure?.visibleDetails}]))));
  await info.attach('bridge-structural-counters',{body:JSON.stringify(samples,null,2),contentType:'application/json'});
});

test('captures demolished spans with the structural detail they inherit',async({browser},info)=>{
  test.setTimeout(600000);
  const sim=fresh(),snapshots=route(19390901,{support:true}).combatSnapshots,east=snapshots.eastDemolitionOutside;
  expect(east).toBeTruthy();
  for(const v of [
    {name:'east-demolition-spans-high.png',x:842,z:-60,target:{x:790,z:0,y:-2}},
    {name:'east-demolition-wide-high.png',x:700,z:-120,target:{x:800,z:10,y:-2}}
  ]){
    const {page,data}=await openView(browser,info,{...v,sim,snapshot:east});
    // The renderer only reads the restored save: span_06 hidden, its collapsed replacement shown.
    expect(Object.hasOwn(east.consumed,'evt_m01_east_demolition')).toBe(true);
    expect(data.m01.visiblePieces).toBeGreaterThan(0);
    if(!baseline){
      // Structure follows the GLB swap: collapsed spans carry it, the hidden intact spans do not count as shown.
      const active=data.m01.bridgeStructure.active;
      expect(active).toEqual(expect.arrayContaining(['rail_span_06_collapsed','rail_span_07_collapsed']));
      expect(active).not.toContain('rail_span_06');expect(active).not.toContain('rail_span_07');
      expect(data.m01.bridgeStructure.hiddenJointStubs).toBeGreaterThan(0);
    }
    await page.close();
  }
});
