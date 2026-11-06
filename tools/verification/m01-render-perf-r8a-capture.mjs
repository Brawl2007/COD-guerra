// Headless Chromium A/B capture for R8-a (soldier draw-call batching). Run (after `npm run build`):
//   CHROME_EXECUTABLE=/opt/pw-browsers/chromium/chrome node tools/verification/m01-render-perf-r8a-capture.mjs <outDir>
// Starts the vite dev server on 127.0.0.1:5191, loads the fixture, captures PL and DE rows at 5 / 30 / 80 m (High) plus Medium/Low spot checks,
// writes before/after/diff PNGs and report.json (renderer.info draw calls and triangles of each frame, pixel diff). SwiftShader: numbers are
// draw calls and pixels, never FPS.
import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

const out=process.argv[2]??'test-results/m01-render-perf-r8a',port=5191;
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','tools/verification/vite.capture.config.mjs','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('vite did not start')),30000);server.stdout.on('data',d=>{if(String(d).includes('Local'))(clearTimeout(t),resolve());});server.on('exit',c=>reject(new Error('vite exited '+c)));});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${port}/COD-guerra/tools/verification/m01-render-perf-r8a-fixture.html`);
  await page.waitForFunction(()=>window.ready===true,null,{timeout:120000});
  const report={validation:'LOCAL headless Chromium/SwiftShader 1280x720; real M01Characters, GLBs and atlases; existing actors in staged poses. Draw calls = renderer.info.render.calls of one frame (scene + shadow pass). Not FPS.',samples:[],errors};
  const plan=[['pl',5,'high'],['de',5,'high'],['pl',30,'high'],['de',30,'high'],['pl',80,'high'],['de',80,'high'],['pl',5,'medium'],['de',30,'medium'],['pl',80,'low']];
  const b64=u=>Buffer.from(u.split(',')[1],'base64');
  for(const [kind,distance,quality] of plan){
    const r=await page.evaluate(o=>window.stage.capture(o),{kind,distance,quality});
    const name=`${kind}-${distance}m-${quality}`;
    await writeFile(`${out}/${name}-before.png`,b64(r.before.url));await writeFile(`${out}/${name}-after.png`,b64(r.after.url));await writeFile(`${out}/${name}-diff.png`,b64(r.pixelDiff.url));
    for(const k of ['before','after'])delete r[k].url;delete r.pixelDiff.url;
    report.samples.push({name,...r});console.log(name,'calls',r.before.calls,'->',r.after.calls,'tris',r.before.triangles,'->',r.after.triangles,'lods',r.after.lods.join(''),'diff max',r.pixelDiff.max,'px',r.pixelDiff.differingPixels,'noise',r.repeatNoise.differingPixels,'tieProbe px',r.drawOrderTieProbe.differingPixels,'max',r.drawOrderTieProbe.max,'| reversed-order vs before',r.mergedPartOrderReversedVsBefore.differingPixels,'vs merged',r.mergedPartOrderReversedVsMerged.differingPixels,'| same-instance unmerged vs before',r.sameInstanceUnmergedVsBefore.differingPixels,'vs merged',r.sameInstanceUnmergedVsMerged.differingPixels);
  }
  report.drawOrder={note:'Order in which WebGLRenderer draws the parts of one soldier (onBeforeRender). Opaque parts are sorted by material id, then by the view depth of each part\'s bounding-sphere centre, so the order between coplanar parts changes with the camera on the former path; the merged mesh fixes it by index order.',de:await page.evaluate(()=>window.stage.drawOrder('de')),pl:await page.evaluate(()=>window.stage.drawOrder('pl'))};
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n');
  const rows=report.samples.map(s=>`<h3>${s.name} - draw calls ${s.before.calls} -> ${s.after.calls}, differing pixels ${s.pixelDiff.differingPixels}, max channel diff ${s.pixelDiff.max}</h3><div><img src="${s.name}-before.png" width="420"><img src="${s.name}-after.png" width="420"><img src="${s.name}-diff.png" width="420"></div>`).join('');
  await writeFile(`${out}/pairs.html`,`<!doctype html><meta charset="utf-8"><title>R8-a before / after / diff</title><body style="font:14px system-ui">${rows}`);
  if(errors.length)console.error('page errors:',errors);
}finally{await browser?.close();server.kill();}
