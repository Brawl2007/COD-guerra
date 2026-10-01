import { mkdir,writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const args=process.argv.slice(2),i=args.indexOf('--out'),out=i<0?'test-results/m01-poses':args[i+1];
if(!out)throw new Error('Missing --out directory');
const html='<!doctype html><meta charset="utf-8"><title>M01 — poses provisórias</title><style>body{margin:0;background:#27342f;color:#eef2e9;font:18px system-ui}canvas{display:block;width:1280px;height:640px}.labels{display:flex;justify-content:space-around;padding:10px}small{display:block;text-align:center;font-size:14px}</style><canvas></canvas><div class="labels"><span>Em pé</span><span>Sentado</span><span>Ferido</span><span>Transportado</span></div><small>Geometrias procedurais provisórias · Comparação isolada, sem partida de missão</small><script type="module" src="/COD-guerra/tools/m01-pose-gallery.js"></script>';
const server=await createServer({server:{host:'127.0.0.1',port:5181,strictPort:true},plugins:[{name:'m01-pose-verification',configureServer(s){
  s.middlewares.use((req,res,next)=>{if(!req.url?.split('?')[0].endsWith('/__m01_poses'))return next();res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
}}]});
let browser;
try{
  await server.listen();browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
    args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5181/COD-guerra/__m01_poses');await page.waitForFunction(()=>window.poseGallery?.ready,null,{timeout:30000});
  await mkdir(out,{recursive:true});await page.screenshot({path:out+'/pose-gallery.png'});
  const report={...await page.evaluate(()=>window.poseGallery),errors,viewport:[1280,720]};
  await writeFile(out+'/gallery-report.json',JSON.stringify(report,null,2)+'\n');
  if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify(report));
}finally{await browser?.close();await server.close();}
