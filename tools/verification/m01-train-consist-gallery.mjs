// Isolated close-up gallery of train 963's consist (real M01TrainWagons + real wagon GLBs, neutral sun, free camera).
// Verification only: not a playtest, not an FPS measurement, no simulation. The in-game captures live in
// tests/browser/m01-train-consist-polish.spec.js.
// Use: CHROME_EXECUTABLE=… node tools/verification/m01-train-consist-gallery.mjs <out-dir>
import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {createRequire} from 'node:module';

const ROOT=new URL('../../',import.meta.url).pathname,OUT=process.argv[2]??join(ROOT,'docs/verification/m01-runtime/train-detail-coupling-polish-v1/gallery');
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.glb':'model/gltf-binary'};
const server=http.createServer(async(req,res)=>{
  const path=normalize(join(ROOT,decodeURIComponent(new URL(req.url,'http://x').pathname)));
  if(!path.startsWith(ROOT)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'content-type':TYPES[extname(path)]??'application/octet-stream'}).end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=createRequire(join(ROOT,'package.json'))('@playwright/test');
const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`http://127.0.0.1:${server.address().port}/tools/verification/m01-train-consist-fixture.html`);
await page.waitForFunction(()=>window.ready===true);
await page.evaluate(async()=>{window.stage.resize(960,540);await window.stage.load();});
await mkdir(OUT,{recursive:true});
// Gap between wagon 4 (open) and 5 (covered) at x=1121.85; wagon 5 at 1126.4; consist end at 1676.95.
const SHOTS=[
  {name:'coupling-side',player:[1121.85,-2.5],quality:'high',pos:[1121.85,.1,-6.2],at:[1121.85,-.05,-2.5],fov:40,label:'acoplamento entre vagões 4 e 5 (LOD0, High)'},
  {name:'coupling-oblique',player:[1121.85,-2.5],quality:'high',pos:[1119.6,.25,-4.9],at:[1121.85,-.1,-2.5],fov:50,label:'tampões, engate de parafuso e mangueiras (LOD0, High)'},
  {name:'underframe-low',player:[1126.4,-2.5],quality:'high',pos:[1126.4,-.55,-6.4],at:[1126.4,-.3,-2.5],fov:55,label:'estrado: travessas, freio, tirantes, conduta (LOD0, High)'},
  {name:'wheel-rail',player:[1126.4,-2.5],quality:'high',pos:[1128.0,-.62,-4.6],at:[1128.4,-.72,-3.25],fov:30,label:'roda sobre o carril (LOD0)'},
  {name:'wheel-rail-end-on',player:[1126.4,-2.5],quality:'high',pos:[1131.2,-.55,-2.5],at:[1128.4,-.75,-2.5],fov:28,label:'rodado de topo: verdugos dentro da via (LOD0)'},
  {name:'consist-side-high',player:[1150,-2.5],quality:'high',pos:[1150,1.2,-26],at:[1150,.8,-2.5],fov:55,label:'quatro vagões, tons e desgaste por id (High)'},
  {name:'tail-end',player:[1672.4,-2.5],quality:'high',pos:[1680.2,.4,-5.6],at:[1677,-.1,-2.5],fov:45,label:'fim da composição: engate e mangueira pendurados'},
  {name:'coupling-mid-tier',player:[1121.85+150,-2.5],quality:'high',pos:[1121.85,.1,-6.2],at:[1121.85,-.05,-2.5],fov:40,label:'mesmo acoplamento com o vagão em LOD1 (conjunto mid)'},
  {name:'coupling-far-tier',player:[1121.85+500,-2.5],quality:'high',pos:[1121.85,.1,-6.2],at:[1121.85,-.05,-2.5],fov:40,label:'mesmo acoplamento com o vagão em LOD2 (silhueta far)'},
  {name:'coupling-low',player:[1121.85,-2.5],quality:'low',pos:[1121.85,.1,-6.2],at:[1121.85,-.05,-2.5],fov:40,label:'Low: conjunto mid perto, sem pormenor near'},
];
const report=[];
for(const s of SHOTS){
  const info=await page.evaluate(s=>{const st=window.stage;st.update({x:s.player[0],z:s.player[1]},s.quality);st.camera(s.pos,s.at,s.fov);st.label(s.label);
    const r=st.render(),d=st.diagnostics();return {drawCalls:r.calls,triangles:r.triangles,detail:d.detail,lod:d.lodDistribution};},s);
  await page.screenshot({path:join(OUT,`${s.name}.png`)});report.push({name:s.name,quality:s.quality,...info});console.log(s.name,info.drawCalls,info.triangles);
}
const children=await page.evaluate(async()=>[await window.stage.recreate(),await window.stage.recreate()]);
await writeFile(join(OUT,'gallery-report.json'),JSON.stringify({errors,recreateParentChildren:children,shots:report},null,2));
if(errors.length)console.error(errors);
await browser.close();server.close();
