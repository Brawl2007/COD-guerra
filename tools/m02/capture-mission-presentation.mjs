// Explicit inspection fixtures; never counted as the continuous playthrough.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const out=process.env.M02_VISUAL_OUT??'/tmp/m02-visual-final';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().split('\n').filter(Boolean),method:'Paused, explicitly labelled inspection fixtures in the product HUD; not a playthrough. Mechanical weapon fixtures tick the simulation and sample the M01 viewmodel per tick, drawing the world at the final instant.',errors:[],captures:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`${process.env.M02_BASE_URL??'http://127.0.0.1:5173/COD-guerra'}/m02.html?quality=high&debug=1`);
 await page.waitForFunction(()=>window.m02Bench&&!document.querySelector('#mission-start').disabled,null,{timeout:120000});
 await page.click('#mission-start');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>window.m02Diagnostics().state==='paused');
 await page.addStyleTag({content:'#mission-menu,#cartela-banner{display:none!important} #inspection-label{position:fixed;bottom:12px;left:18px;padding:6px;background:#151713de;color:#e4d1a5;font:13px sans-serif;z-index:99}'});
 await page.evaluate(()=>{const label=document.createElement('div');label.id='inspection-label';label.textContent='INSPEÇÃO VISUAL · CENÁRIO CONTROLADO';document.body.append(label);});
 const scenes=process.env.M02_VISUAL_SCENES?.split(',')??['c01-section','quinta-medium','leczyca-high','lesmierz-high','mp38-high'];
 for(const shot of scenes){
  await page.evaluate(name=>{
   const {sim,renderer}=window.m02Bench;
   renderer.applyQualityProfile(name==='quinta-medium'?'medium':'high');
   if(name==='c01-section'){
    const gruca=sim.allies.find(a=>a.id==='pl_gruca');
    sim.teleportPlayer(gruca.x-4,gruca.z-1,Math.atan2(1,4),0);
   }
   if(name==='c01-wide')sim.teleportPlayer(-8,-178,.8,-.02);
   if(name==='c01-preparation'){
    sim.startAreaAFullC01();for(let i=0;i<40;i++)sim.tick(.05,{});
    sim.teleportPlayer(-6,-177,.9,-.08);
   }
   if(name==='c02-approach'){sim.reset('C02');sim.teleportPlayer(-12,-65,.97,-.02);}
   if(name.startsWith('wz29-')){
    sim.reset('C01');renderer.renderFrame(.05,0);
    // Sample the real mechanical adapter on each tick; draw the world at the
    // final instant. Avoid flooding the software GPU with off-screen frames.
    const mechanicsFrame=()=>{renderer.presentation.consume(sim.drainEvents(),sim);renderer.presentation.updateWeapon(sim,renderer.qualityProfile.id);};
    if(name==='wz29-ads')for(let i=0;i<12;i++){sim.tick(.05,{aim:true});mechanicsFrame();}
    if(name==='wz29-bolt'){
     sim.tick(.05,{aim:true,fire:true});mechanicsFrame();
     for(let i=0;i<9;i++){sim.tick(.05,{aim:true});mechanicsFrame();}
    }
    if(name==='wz29-reload'){
     for(let round=0;round<5;round++){
      sim.tick(.05,{fire:true});mechanicsFrame();
      for(let i=0;i<22;i++)sim.tick(.05,{});mechanicsFrame();
     }
     sim.tick(.05,{reload:true});mechanicsFrame();
     for(let i=0;i<20;i++)sim.tick(.05,{});
    }
   }
   if(name==='wz28-fire'){
    sim.reset('C01');const actor=sim.allies.find(a=>a.weapon==='rkm_wz28'),target=sim.enemies.find(a=>a.encounterId==='EA0');
    sim.fireActorBurst(actor,target,{x:target.x,y:1.3,z:target.z},'ally');sim.tick(.05,{});
    const x=actor.x+2,z=actor.z+2.2;sim.teleportPlayer(x,z,Math.atan2(actor.z-z,actor.x-x),-.03);
   }
   if(name==='mg34-fire'||name==='mg34-detail'){
    sim.reset('C02');const actor=sim.enemies.find(a=>a.id==='DE-A05');
    sim.teleportPlayer(8.6,-30,0,.08);
    sim.fireActorBurst(actor,sim.player,{x:sim.player.x,y:1.3,z:sim.player.z},'enemy');sim.tick(.05,{});
    if(name==='mg34-detail')sim.teleportPlayer(actor.x+.5,actor.z+2,Math.atan2(-2,-.5),-.04);
   }
   if(name==='quinta-medium')sim.teleportPlayer(-20,-43,Math.PI/2,-.02);
   if(name==='leczyca-high'){sim.enterAreaBC06();sim.teleportPlayer(-18,-3,-2.44,-.015);}
   if(name==='lesmierz-high'){sim.enterAreaCC09();sim.teleportPlayer(-4,-4,-.7,-.02);}
   if(name==='mp38-high'||name==='mp38-fire'){
    if(sim.activeCellId!=='C')sim.enterAreaCC09();
    const actor=sim.enemies.find(a=>a.weapon==='mp38'),f=actor.facing;
    sim.teleportPlayer(actor.x+Math.cos(f)*3.5,actor.z+Math.sin(f)*3.5,f+Math.PI,-.04);
    if(name==='mp38-fire'){
     sim.fireActorBurst(actor,sim.player,{x:sim.player.x,y:1.3,z:sim.player.z},'enemy');sim.tick(.05,{});
     sim.teleportPlayer(actor.x+Math.cos(f+.65)*3.5,actor.z+Math.sin(f+.65)*3.5,f+.65+Math.PI,-.04);
    }
   }
   if(name.startsWith('mp38-reload-')||name==='mp38-charge'){
    sim.reset('C02');sim.enterAreaCC09();const actor=sim.enemies.find(a=>a.weapon==='mp38');
    actor.mag=0;sim.tick(.05,{});
    const age=name==='mp38-reload-extract'?.8:name==='mp38-reload-insert'?1.8:2.3;
    for(let i=0;i<Math.round(age/.05);i++)sim.tick(.05,{});
    const f=actor.facing+.65;sim.teleportPlayer(actor.x+Math.cos(f)*3.5,actor.z+Math.sin(f)*3.5,f+Math.PI,-.18);
   }
   document.getElementById('inspection-label').textContent=`INSPEÇÃO VISUAL · CENÁRIO CONTROLADO · ${name}`;
   renderer.renderFrame(0,0);
  },shot);
  await page.waitForTimeout(1200);
  await page.screenshot({path:`${out}/${shot}.png`});
  const diagnostics=await page.evaluate(()=>({software:window.m02Bench.renderer.softwareRasterizer,quality:window.m02Bench.renderer.qualityProfile.id,environment:window.m02Diagnostics().environment,presentation:window.m02Diagnostics().presentation,simulation:{health:window.m02Bench.sim.player.health,weapon:window.m02Bench.sim.weapon.snapshot()},architecture:window.m02Bench.renderer.architectureBatches,mp38:[...window.m02Bench.renderer.presentation.characters.instances.values()].filter(v=>v.m02MP38).map(v=>({id:v.id,visible:v.m02MP38.visible,rifle:v.meshes.find(m=>m.name==='rifle')?.visible,phase:v.m02ReloadPhase,magazine:v.m02MP38.getObjectByName('mp38_magazine')?.position.toArray()}))}));
  report.captures.push({shot,diagnostics});
  if(shot==='wz29-ads'&&diagnostics.presentation.weapon.aimBlend<.99)throw Error('ADS fixture did not settle');
  if(shot==='wz29-reload'&&(diagnostics.simulation.health<=0||diagnostics.presentation.weapon.clip!=='reload_clip'))throw Error('Reload fixture must show the living player reloading');
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
 console.log(JSON.stringify({captures:report.captures.map(c=>c.shot),errors:report.errors}));
}finally{fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
