import { mkdir,writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const args=process.argv.slice(2),i=args.indexOf('--out'),out=i<0?'test-results/m01-poses':args[i+1];
if(!out)throw new Error('Missing --out directory');
const combat=args.includes('--combat'),labels=combat?['Mira','Disparo / recuo','Sob fogo','Passo']:['Em pé','Sentado','Ferido','Transportado'];
const html='<!doctype html><meta charset="utf-8"><title>M01 — poses provisórias</title><style>body{margin:0;background:#27342f;color:#eef2e9;font:18px system-ui}canvas{display:block;width:1280px;height:640px}.labels{display:flex;justify-content:space-around;padding:10px}small{display:block;text-align:center;font-size:14px}</style><canvas></canvas><div class="labels">'+labels.map(l=>'<span>'+l+'</span>').join('')+'</div><small>Geometrias procedurais provisórias · Comparação isolada, sem partida de missão</small><script type="module" src="/COD-guerra/tools/m01-pose-gallery.js"></script>';
const server=await createServer({server:{host:'127.0.0.1',port:5181,strictPort:true},plugins:[{name:'m01-pose-verification',configureServer(s){
  s.middlewares.use((req,res,next)=>{if(!req.url?.split('?')[0].endsWith('/__m01_poses'))return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
}}]});
let browser;
try{
  await server.listen();browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:5181/COD-guerra/__m01_poses'+(combat?'?combat=1':''));await page.waitForFunction(()=>window.poseGallery?.ready,null,{timeout:30000});
  await mkdir(out,{recursive:true});await page.screenshot({timeout:60000,path:out+(combat?'/combat-recoil.png':'/pose-gallery.png')});
  const report={...await page.evaluate(()=>window.poseGallery),errors,viewport:[1280,720]};
  if(combat){
    report.frames=[{file:'combat-recoil.png',...await page.evaluate(()=>window.poseGallery)}];
    await page.evaluate(()=>window.renderPoseGallery(10.12));await page.screenshot({timeout:60000,path:out+'/combat-recovery.png'});
    report.frames.push({file:'combat-recovery.png',...await page.evaluate(()=>window.poseGallery)});
  }
  await writeFile(out+'/gallery-report.json',JSON.stringify(report,null,2)+'\n');
  if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify(report));
}finally{await browser?.close();await server.close();}
