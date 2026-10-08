// Isolated close-up gallery of M01 battle damage: the real Renderer/M01View/M01DamageDecals driven by a throw-away
// M01Simulation in tools/verification/m01-damage-decals-fixture.html (served by vite dev, never built).
// Impacts are the simulation's own traceShot/traceRound results; blasts are real damage records or real
// M01Simulation.consume() events. Verification only: not a playtest, not an FPS measurement.
// Use: CHROME_EXECUTABLE=… node tools/verification/m01-damage-decals-gallery.mjs <out-dir> [shot,shot…]
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {deflateSync} from 'node:zlib';
import {m01DecalAtlas} from '../../src/render/m01-damage-decals.js';

const ROOT=new URL('../../',import.meta.url).pathname,OUT=process.argv[2]??join(ROOT,'test-results/m01-damage-decals');
const ONLY=process.argv[3]?.split(',');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5191','--strictPort'],{cwd:ROOT,stdio:'pipe'});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
const base='http://127.0.0.1:5191/COD-guerra/';
for(let i=0;i<150;i++){if(server.exitCode!==null)throw new Error(log);try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const {chromium}=createRequire(join(ROOT,'package.json'))('@playwright/test');
const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(`${base}tools/verification/m01-damage-decals-fixture.html?quality=high`);
await page.waitForFunction(()=>window.ready===true,null,{timeout:120000});
await page.evaluate(()=>window.stage.ready());
await mkdir(OUT,{recursive:true});

// Each shot: a pose for the throw-away player (camera), then real events. Targets are world points the trace aims at.
const SHOTS=[
  {name:'brick-portal',label:'tijolo: face leste do portal ferroviário (tiros do jogador) e torre (tiros alemães do dique)',
    pose:{x:4.5,z:-5.4,angle:Math.PI,pitch:.05},
    shots:[[-1.5,.9,-5.0],[-1.5,1.5,-5.8],[-1.5,2.2,-4.9],[-1.5,.6,-6.3],[-1.5,2.6,-5.5],[-1.5,1.2,-4.6]],rounds:[[-1.5,1.4,-8.2],[-1.5,2.4,-8.9],[-1.5,.8,-7.4]]},
  {name:'stone-abutment',label:'pedra: tampo do encontro oeste e lancil da ponte rodoviária',
    pose:{x:4,z:31,angle:0,pitch:-.42},shots:[[8,null,33],[9.2,null,34.5],[10.4,null,32.2],[7.4,null,35.6]]},
  {name:'wood-hut',label:'madeira: parede norte do barracão (veio vertical)',pose:{x:-260,z:10,angle:Math.PI/2,pitch:.08},
    shots:[[-263.4,-1.6,14],[-261.8,-.9,14],[-260.2,-2.1,14],[-258.6,-.5,14],[-257,-1.3,14]]},
  {name:'tree-bark',label:'casca: tronco da árvore m01_tree_0 (polígono do tronco perto)',pose:{x:-36,z:-5.4,angle:-Math.PI/2,pitch:.12},
    shots:[[-36,.2,-9],[-35.9,.9,-9],[-36.1,-.4,-9]]},
  {name:'earth-slope',label:'terra: tiros alemães (portões de Lisewo, entre as pontes) na encosta sul do aterro',pose:{x:-106,z:20,angle:Math.PI*1.04,pitch:-.3},
    by:'de_east_7',rounds:[[-111,null,17.5],[-112.5,null,18.6],[-110,null,19.2],[-113.6,null,17.2],[-114.3,null,19.6],[-111.8,null,20.4]]},
  {name:'earth-cover',label:'terra: face do parapeito cv_sandbag_mid_1 (tiros alemães)',pose:{x:-30,z:18,angle:0,pitch:-.12},
    by:'de_east_7',rounds:[[-24.55,-2.4,17.6],[-24.55,-2.2,18.4],[-24.55,-2.6,19]]},
  {name:'railway',label:'via férrea: carril, travessa e balastro (tiros do jogador)',pose:{x:-81,z:4.2,angle:Math.PI*1.09,pitch:-.38},
    rail:true},
  {name:'road-deck',label:'tabuleiro rodoviário: pavimento e lancis (tiros alemães do tabuleiro leste)',pose:{x:16,z:40,angle:0,pitch:-.2},
    by:'de_spans_0',rounds:[[22,0,39.2],[24,0,41.1],[21,0,40.4],[25.5,0,39.8],[23,.2,42.75]]},
  {name:'metal-joint',label:'metal: junta de dilatação ferroviária entre vãos 1 e 2',pose:{x:136.5,z:-1.6,angle:0,pitch:-.45},
    shots:[[140.4,0,-2.3],[141.2,0,-1.1],[140.8,0,-3.1]]},
  {name:'grenade-terrain',label:'granada no terreno: queimado, terra lançada, detritos e brasas (4 s depois)',pose:{x:-106,z:22,angle:Math.PI,pitch:-.36},
    grenade:{x:-111,y:null,z:22},advance:4},
  {name:'grenade-road-deck',label:'granada no tabuleiro rodoviário (só o tabuleiro, nunca o chão por baixo; 4 s depois)',pose:{x:16,z:40,angle:0,pitch:-.32},
    grenade:{x:21.5,y:.08,z:40.3},advance:4},
  // Aerial bombs never land within 30 m of the player (M01Simulation.safeImpact): trigger them from where the route is.
  {name:'repair-crater',label:'cratera da bomba no ponto de reparo 1 (evento real nowicki_lost)',consumeFrom:{x:-120,z:20},pose:{x:-49,z:15.5,angle:-.36,pitch:-.3},
    consume:['evt_m01_nowicki_lost'],advance:6},
  {name:'repair-crater-track',label:'bomba junto à via (evento real nowicki_lost com o jogador a sul): cratera no talude e travessas queimadas',consumeFrom:{x:-66,z:22},pose:{x:-38,z:.8,angle:.47,pitch:-.3},
    consume:['evt_m01_nowicki_lost'],advance:6},
  // The bomb only falls on the station itself when the player is over 30 m away (M01Simulation.safeImpact).
  {name:'station-bomb',label:'bomba na estação (evento real bombing_0434): entulho e poeira na base da fachada norte',consumeFrom:{x:-300,z:20},
    pose:{x:-392,z:16,angle:2.2,pitch:-.12},consume:['evt_m01_bombing_0434'],advance:8},
  {name:'west-demolition',label:'demolição oeste (evento real): via queimada e entulho no encontro ferroviário danificado',pose:{x:-30,z:2,angle:0,pitch:-.25},
    consume:['evt_m01_west_demolition'],advance:10},
  // Overview only: the camera is lifted 30 m above the pose (not a gameplay view) to show the scorch around the ruin.
  {name:'east-demolition',label:'demolição leste (evento real), vista aérea de verificação a 30 m: queimados à volta dos pilares 6',pose:{x:776,z:10,angle:.2,pitch:0},
    lift:{height:30,pitch:-.9},consume:['evt_m01_east_demolition'],advance:10},
  {name:'east-demolition-deck-end',label:'demolição leste: fuligem na ponta do vão 5 (tabuleiro rodoviário)',pose:{x:650,z:40,angle:0,pitch:-.45},
    consume:['evt_m01_east_demolition'],advance:10}
];
const report=[];
for(const s of SHOTS){
  if(ONLY&&!ONLY.includes(s.name))continue;
  const info=await page.evaluate(async s=>{
    const st=window.stage;st.reset();st.place(s.pose);st.label(s.label);st.render();
    const results=[];
    // A null height aims at the simulation's ground there (rounds arrive at ~1.6°: 40 cm high lands 14 m long).
    const target=t=>({x:t[0],y:t[1]??st.surfaceAt(t[0],t[2]).heightAt,z:t[2]});
    for(const t of s.shots??[])results.push(st.playerShot(target(t)));
    for(const t of s.rounds??[])results.push(st.enemyRound(target(t),s.by));
    if(s.rail){
      // Rail head, a sleeper top and the ballast between sleepers on rail_embankment_west, from the drawn layout.
      const w=st.world(),pts=w.features.get('rail_embankment_west').polyline,a=pts[0],b=pts[1],dx=b[0]-a[0],dz=b[2]-a[2],L=Math.hypot(dx,dz),ux=dx/L,uz=dz/L;
      const at=(d,o,h)=>({x:a[0]+ux*d-uz*o,y:h,z:a[2]+uz*d+ux*o});
      for(const [d,o,h] of [[86.4,.72,.15],[87.75,.2,.09],[85.0,-.4,.03],[88.6,-.72,.15],[86.85,-1,.03],[89.1,.55,.09]])results.push(st.playerShot(at(d,o,h)));
    }
    if(s.grenade){const g=s.grenade,y=g.y??st.surfaceAt(g.x,g.z).heightAt+.08;st.grenade({x:g.x,y,z:g.z});}
    if(s.consumeFrom){st.place({...s.consumeFrom,angle:0});st.render();}
    for(const id of s.consume??[])st.consume(id);
    if(s.consumeFrom)st.place(s.pose);
    if(s.lift)st.lift(s.lift.height,s.lift.pitch);
    st.advance(s.advance??1.2);const draw=st.render();st.advance(.05);const draw2=st.render();
    return {results,draw:draw2,decals:st.diagnostics()};
  },s);
  await page.screenshot({path:join(OUT,`${s.name}.png`)});
  report.push({name:s.name,label:s.label,...info});
  console.log(s.name,JSON.stringify({marks:info.decals.marks,byKind:info.decals.byKind,residueTriangles:info.decals.residueTriangles,debris:info.decals.debris,embers:info.decals.embers,draw:info.draw.calls,results:info.results.map(r=>r.material)}));
}
await writeFile(join(OUT,'gallery-report.json'),JSON.stringify({errors,shots:report},null,1));
// The procedural atlas itself (original art, generated in code): over light grey, over dark olive, and the height map.
const A=m01DecalAtlas(),W=A.width,H=A.height,S=2,w=W*S,h=H*S*3,img=Buffer.alloc(w*h*3);
[[150,148,140],[70,66,48],null].forEach((bg,panel)=>{for(let y=0;y<H*S;y++)for(let x=0;x<w;x++){
  const i=(H-1-Math.floor(y/S))*W+Math.floor(x/S),o=((panel*H*S+y)*w+x)*3,a=A.color[i*4+3]/255;
  for(let k=0;k<3;k++)img[o+k]=bg?Math.round(A.color[i*4+k]*a+bg[k]*(1-a)):A.heightMap[i];
}});
await writeFile(join(OUT,'atlas.png'),png(w,h,img));
console.log('atlas',w,h,'checksum',A.checksum);
if(errors.length)console.error(errors);
await browser.close();server.kill();
function png(w,h,rgb){
  const table=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const len=Buffer.alloc(4),sum=Buffer.alloc(4),body=Buffer.concat([Buffer.from(type),data]);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(body));return Buffer.concat([len,body,sum]);};
  const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);
  const head=Buffer.alloc(13);head.writeUInt32BE(w,0);head.writeUInt32BE(h,4);head[8]=8;head[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
