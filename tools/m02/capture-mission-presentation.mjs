// Explicit inspection fixtures; never counted as the continuous playthrough.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out=process.env.M02_VISUAL_OUT??'/tmp/m02-visual-final';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Paused, explicitly labelled inspection fixtures in the product HUD; not a playthrough.',errors:[],captures:[]};
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
   if(name==='quinta-medium')sim.teleportPlayer(-20,-43,Math.PI/2,-.02);
   if(name==='leczyca-high'){sim.enterAreaBC06();sim.teleportPlayer(-18,-3,-2.44,-.015);}
   if(name==='lesmierz-high'){sim.enterAreaCC09();sim.teleportPlayer(-4,-4,-.7,-.02);}
   if(name==='mp38-high'){
    if(sim.activeCellId!=='C')sim.enterAreaCC09();
    const actor=sim.enemies.find(a=>a.weapon==='mp38'),f=actor.facing;
    sim.teleportPlayer(actor.x+Math.cos(f)*3.5,actor.z+Math.sin(f)*3.5,f+Math.PI,-.04);
   }
   renderer.renderFrame(0,0);
  },shot);
  await page.waitForTimeout(1200);
  await page.screenshot({path:`${out}/${shot}.png`});
  report.captures.push({shot,diagnostics:await page.evaluate(()=>({software:window.m02Bench.renderer.softwareRasterizer,quality:window.m02Bench.renderer.qualityProfile.id,environment:window.m02Diagnostics().environment,presentation:window.m02Diagnostics().presentation,architecture:window.m02Bench.renderer.architectureBatches,mp38:[...window.m02Bench.renderer.presentation.characters.instances.values()].filter(v=>v.m02MP38).map(v=>({id:v.id,visible:v.m02MP38.visible,rifle:v.meshes.find(m=>m.name==='rifle')?.visible}))}))});
 }
 if(report.errors.length)throw Error(report.errors.join('\n'));
 console.log(JSON.stringify({captures:report.captures.map(c=>c.shot),errors:report.errors}));
}finally{fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
