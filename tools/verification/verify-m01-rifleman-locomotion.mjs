import {createServer} from 'vite';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const out=process.argv[2]??'test-results/rifleman-locomotion',base='5f3cc34f53c61beec52255d67f8babd7194c9f7f';
const baselinePath='src/render/__rifleman_baseline.js';
const original=execFileSync('git',['show',`${base}:src/render/m01-characters.js`],{encoding:'utf8'});
await writeFile(baselinePath,original);await mkdir(out,{recursive:true});
const html='<!doctype html><meta charset="utf-8"><title>Rifleman locomotion pilot</title><style>body{margin:0;background:#22302e;color:#fff;font:16px system-ui}canvas{display:block}#label{padding:12px}small{padding:12px}</style><canvas></canvas><div id="label"></div><small>Visual fixture com renderer e GLBs reais; trajetória controlada, sem executar a missão.</small><script type="module" src="/COD-guerra/tools/verification/m01-rifleman-locomotion-gallery.js"></script>';
const server=await createServer({server:{host:'127.0.0.1',port:5182,strictPort:true},plugins:[{name:'rifleman-fixture',configureServer(s){s.middlewares.use((req,res,next)=>{
  if(!req.url?.split('?')[0].endsWith('/__rifleman'))return next();res.setHeader('Content-Type','text/html');res.end(html);
});}}]});let browser;
const report={base,baselineSourceSha256:createHash('sha256').update(original).digest('hex'),kind:'isolated real GLB/production renderer fixture, not mission playtest',frames:[],metrics:[],errors:[]};
try{
  await server.listen();browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1100,height:720}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.goto('http://127.0.0.1:5182/COD-guerra/__rifleman');await page.waitForFunction(()=>window.gallery?.ready,{},{timeout:60000});
  report.browser=browser.version();
  async function shot(name){const d=await page.evaluate(()=>window.gallery.frame());await page.screenshot({path:`${out}/${name}.png`});report.frames.push({file:name+'.png',...d});}
  await shot('00-idle');await page.evaluate(()=>window.gallery.step(.05,1.5,'INÍCIO WALK'));await shot('01-start-walk');
  await page.evaluate(()=>{for(let i=0;i<40;i++)window.gallery.step(.025,1.5,'WALK');});await shot('02-walk');
  await page.evaluate(()=>window.gallery.step(.05,3.6,'WALK → RUN'));await shot('03-walk-run-start');
  await page.evaluate(()=>{for(let i=0;i<4;i++)window.gallery.step(.025,3.6,'WALK → RUN');});await shot('04-walk-run-mid');
  await page.evaluate(()=>{for(let i=0;i<20;i++)window.gallery.step(.025,3.6,'RUN');});await shot('05-run');
  await page.evaluate(()=>{for(let i=0;i<4;i++)window.gallery.step(.025,1.5,'RUN → WALK');});await shot('06-run-walk-mid');
  await page.evaluate(()=>{for(let i=0;i<12;i++)window.gallery.step(.025,1.5,'WALK');});await shot('07-walk-return');
  const pause=await page.evaluate(()=>({feet:window.gallery.feet(),frame:window.gallery.frame()}));
  for(let i=0;i<20;i++)await page.evaluate(()=>window.gallery.frame());
  const after=await page.evaluate(()=>({feet:window.gallery.feet(),frame:window.gallery.frame()}));report.pause={identical:JSON.stringify(pause)===JSON.stringify(after)};if(!report.pause.identical)throw new Error('Pause drift');await shot('08-pause');
  report.restore=await page.evaluate(()=>window.gallery.restore());await shot('09-restore');
  report.lods={near:await page.evaluate(()=>window.gallery.lod(2,'high')),far:await page.evaluate(()=>window.gallery.lod(80,'low'))};
  await page.evaluate(()=>{for(let i=0;i<16;i++)window.gallery.step(.025,0,'PARAR');});await shot('10-stop-idle');
  report.fallback=await page.evaluate(()=>window.gallery.fallback());
  const audit=JSON.parse(await readFile('docs/verification/m01-runtime/rifleman-locomotion-2026-10-03/clip-audit.json','utf8'));
  for(const speed of [1.5,3.6,5.5])for(const lod of [0,2]){
    const result=await page.evaluate(({audit,speed,lod})=>window.gallery.metric(audit,{speed,id:speed===1.5?'de_spans_6':'pl_east_0',lod,quality:lod===0?'high':'low'}),{audit,speed,lod});
    const {samples,...summary}=result;report.metrics.push(summary);await writeFile(`${out}/metric-${speed}-lod${lod}.json`,JSON.stringify(samples)+'\n');
    if(summary.candidate.meanDriftMps>=summary.baseline.meanDriftMps*.35||summary.candidate.meanDriftMps>.1||summary.candidate.p95DriftMps>.25)throw new Error(`Insufficient drift improvement ${speed}/${lod}`);
  }
  if(report.errors.length)throw new Error(report.errors.join('\n'));report.pass=true;
}finally{await writeFile(`${out}/browser-gallery.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();await server.close();await rm(baselinePath,{force:true});}
console.log(JSON.stringify({pass:report.pass,metrics:report.metrics,errors:report.errors}));
