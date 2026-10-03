import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline/promises';

const CHECKPOINT_KEY='cod-guerra:checkpoint:m01:v2';
const SOFTWARE_RE=/(swiftshader|software rasterizer|llvmpipe|lavapipe|softpipe|microsoft basic render|software)/i;
const SCENARIO_NAMES=['start','bridge','repair','withdrawal'];
const round=(n,digits=3)=>Number(n.toFixed(digits));

export function percentile(values,q){
  if(!Array.isArray(values)||values.length===0)throw new Error('Percentile requires a non-empty sample');
  if(!Number.isFinite(q)||q<0||q>1)throw new Error('Percentile q must be between 0 and 1');
  const sorted=[...values].sort((a,b)=>a-b);
  if(sorted.some(v=>!Number.isFinite(v)))throw new Error('Percentile sample contains a non-finite value');
  const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
  return sorted[lo]+(sorted[hi]-sorted[lo])*(pos-lo);
}
export function frameDeltasFromTimestamps(timestamps,{warmupMs=0,measurementMs=Infinity}={}){
  if(!Array.isArray(timestamps)||timestamps.length<2)return [];
  const end=warmupMs+measurementMs,out=[];
  for(let i=1;i<timestamps.length;i++){
    const previous=timestamps[i-1],current=timestamps[i];
    if(previous>=warmupMs&&current<=end)out.push(current-previous);
  }
  return out;
}
export function summariseFrameDeltas(deltas){
  if(!Array.isArray(deltas)||deltas.length===0)throw new Error('Frame sample is empty; no requestAnimationFrame deltas were measured');
  if(deltas.some(v=>!Number.isFinite(v)||v<=0))throw new Error('Frame sample contains non-finite or non-positive deltas');
  const durationMs=deltas.reduce((a,b)=>a+b,0),frames=deltas.length,over=t=>deltas.filter(v=>v>t).length;
  const stalls=deltas.map((ms,index)=>({frame:index+1,ms:round(ms)})).sort((a,b)=>b.ms-a.ms).slice(0,10);
  return {frames,durationMs:round(durationMs),fpsAverage:round(frames*1000/durationMs),frameTimeAverageMs:round(durationMs/frames),
    frameTimeMinMs:round(Math.min(...deltas)),frameTimeMaxMs:round(Math.max(...deltas)),
    p50Ms:round(percentile(deltas,.50)),p90Ms:round(percentile(deltas,.90)),p95Ms:round(percentile(deltas,.95)),p99Ms:round(percentile(deltas,.99)),
    framesOver16_67ms:over(16.67),framesOver33_33ms:over(33.33),framesOver50ms:over(50),framesOver100ms:over(100),largestStalls:stalls};
}
export function detectSoftwareRenderer(renderer){if(typeof renderer!=='string'||!renderer.trim())return null;return SOFTWARE_RE.test(renderer);}
export function rendererClass(renderer){const software=detectSoftwareRenderer(renderer);return software===null?'unknown':software?'software':'hardware';}
export function normalisePerformanceMemory(memory){
  if(!memory)return null;const fields=['usedJSHeapSize','totalJSHeapSize','jsHeapSizeLimit'],out={};
  for(const key of fields)if(Number.isFinite(memory[key]))out[key]=memory[key];return Object.keys(out).length?out:null;
}
export function assertFiniteJson(value,path='$'){
  if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Non-finite number at ${path}`);
  if(Array.isArray(value))value.forEach((v,i)=>assertFiniteJson(v,`${path}[${i}]`));
  else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))assertFiniteJson(v,`${path}.${k}`);
  return value;
}
export function serialiseBenchmark(value){assertFiniteJson(value);return JSON.stringify(value,null,2)+'\n';}

function parseArgs(argv){
  const take=(name,fallback)=>{const i=argv.indexOf(name);return i>=0?argv[i+1]:fallback;};
  const quality=take('--quality','low'),scenario=take('--scenario','all');
  if(!['low','medium','high'].includes(quality))throw new Error(`Invalid --quality ${quality}; use low, medium or high`);
  if(scenario!=='all'&&!SCENARIO_NAMES.includes(scenario))throw new Error(`Invalid --scenario ${scenario}; use ${SCENARIO_NAMES.join(', ')} or all`);
  const positive=(name,fallback)=>{const n=Number(take(name,fallback));if(!Number.isFinite(n)||n<=0)throw new Error(`${name} must be a positive number`);return n;};
  return {quality,scenario,out:take('--out','benchmark-results'),warmupSeconds:positive('--warmup',5),durationSeconds:positive('--duration',10),
    port:positive('--port',5184),width:positive('--width',1280),height:positive('--height',720),externalUrl:take('--url',null),
    environment:take('--environment',process.env.CI?'CI/cloud':'local/unspecified'),headless:argv.includes('--headless'),manual:argv.includes('--manual')};
}
function gitHead(){try{return execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}}
async function waitForPreview(url,server){
  for(let i=0;i<100;i++){
    if(server?.exitCode!==null)throw new Error(`Preview exited before becoming ready (code ${server.exitCode})`);
    try{if((await fetch(url)).ok)return;}catch{}
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error(`Preview did not become ready at ${url}`);
}
async function makeScenarios(){
  const {route}=await import(pathToFileURL(resolve('tests/helpers/m01-route.js'))),flow=route();
  return {
    start:{snapshot:flow.checkpoints.cp_m01_a_orientacao,scenarioSource:'checkpoint',sourceId:'cp_m01_a_orientacao'},
    bridge:{snapshot:flow.checkpoints.cp_m01_c_engenheiros,scenarioSource:'checkpoint',sourceId:'cp_m01_c_engenheiros'},
    repair:{snapshot:flow.combatSnapshots.repairThreat,scenarioSource:'saved-snapshot',sourceId:'route.combatSnapshots.repairThreat'},
    withdrawal:{snapshot:flow.combatSnapshots.withdrawal,scenarioSource:'saved-snapshot',sourceId:'route.combatSnapshots.withdrawal'},
  };
}
async function browserEnvironment(page,browser){
  const data=await page.evaluate(()=>{
    const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');let renderer=null,vendor=null;
    if(gl){const ext=gl.getExtension('WEBGL_debug_renderer_info');renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);vendor=ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR);}
    return {userAgent:navigator.userAgent,platform:navigator.userAgentData?.platform??navigator.platform??null,brands:navigator.userAgentData?.brands??null,
      viewport:{width:innerWidth,height:innerHeight},screen:{width:screen.width,height:screen.height,availWidth:screen.availWidth,availHeight:screen.availHeight},devicePixelRatio,
      webgl:{renderer,vendor},performanceMemory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null};
  });
  data.browserVersion=browser.version();data.performanceMemory=normalisePerformanceMemory(data.performanceMemory);
  data.softwareRenderer=detectSoftwareRenderer(data.webgl.renderer);data.rendererClass=rendererClass(data.webgl.renderer);return data;
}
async function orientHorizontal(page){
  const p=await page.evaluate(()=>window.gameDiagnostics().player);
  await page.evaluate(({angle,pitch})=>window.dispatchEvent(new MouseEvent('mousemove',{movementX:-angle/.0022,movementY:pitch/.0022,bubbles:true})),p);
  await page.waitForFunction(()=>{const p=window.gameDiagnostics().player;return Math.abs(p.pitch)<.04&&Math.abs(Math.atan2(Math.sin(p.angle),Math.cos(p.angle)))<.04;},null,{timeout:5000}).catch(()=>{});
}
async function rafSample(page,warmupMs,measurementMs){
  return page.evaluate(({warmupMs,measurementMs})=>new Promise(resolve=>{
    let warmStart=null,measureStart=null,last=null;const deltas=[];
    function measure(ts){
      if(measureStart===null){measureStart=ts;last=ts;requestAnimationFrame(measure);return;}
      deltas.push(ts-last);last=ts;
      if(ts-measureStart>=measurementMs)resolve({deltas,warmupActualMs:measureStart-warmStart,measurementActualMs:ts-measureStart});
      else requestAnimationFrame(measure);
    }
    function warm(ts){if(warmStart===null)warmStart=ts;if(ts-warmStart>=warmupMs)requestAnimationFrame(measure);else requestAnimationFrame(warm);}
    requestAnimationFrame(warm);
  }),{warmupMs,measurementMs});
}
function diagnosticSummary(d){return d?{clock:d.clock,battleClock:d.m01?.battleClock,quality:d.quality,drawCalls:d.drawCalls,triangles:d.triangles,
  visiblePieces:d.m01?.visiblePieces,models:d.m01?.models?.length,charactersActive:d.m01?.characters?.active,enemyAlive:d.m01?.enemyAlive,
  viewModel:d.m01?.viewModel?{active:d.m01.viewModel.active,visible:d.m01.viewModel.visible,lod:d.m01.viewModel.lod}:null}:null;}
async function pressEnter(message){const rl=createInterface({input:process.stdin,output:process.stdout});try{await rl.question(message);}finally{rl.close();}}
async function runScenario(browser,baseUrl,name,entry,options){
  const context=await browser.newContext({viewport:{width:options.width,height:options.height}}),page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(({key,snapshot})=>localStorage.setItem(key,JSON.stringify(snapshot)),{key:CHECKPOINT_KEY,snapshot:entry.snapshot});
  const navStart=performance.now();await page.goto(`${baseUrl}?debug=1`,{waitUntil:'load'});const pageLoadMs=performance.now()-navStart;
  await page.waitForFunction(()=>window.gameDiagnostics?.().m01?.models.length===9,null,{timeout:120000});const modelsReadyMs=performance.now()-navStart;
  await page.locator('#quality').selectOption(options.quality);await page.locator('#continue').click();
  await page.waitForFunction(()=>!window.gameDiagnostics().paused&&document.pointerLockElement?.id==='game',null,{timeout:60000});const gameReadyMs=performance.now()-navStart;
  await orientHorizontal(page);
  if(options.manual)await pressEnter(`\n[${name}] Jogue normalmente. Pressione Enter no terminal quando quiser iniciar warm-up + medição... `);
  const before=await page.evaluate(()=>window.gameDiagnostics());
  const memoryBefore=normalisePerformanceMemory(await page.evaluate(()=>performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null));
  const raw=await rafSample(page,options.warmupSeconds*1000,options.durationSeconds*1000),metrics=summariseFrameDeltas(raw.deltas);
  const after=await page.evaluate(()=>window.gameDiagnostics());
  const memoryAfter=normalisePerformanceMemory(await page.evaluate(()=>performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null));
  const env=await browserEnvironment(page,browser),warnings=[];
  if(env.softwareRenderer===true)warnings.push(`Software renderer detected: ${env.webgl.renderer}`);
  if(env.softwareRenderer===null)warnings.push('WebGL renderer could not be identified; hardware/software classification is unknown');
  if(!env.performanceMemory)warnings.push('performance.memory is unavailable in this browser');
  if(errors.length)warnings.push(`${errors.length} page error(s) captured`);if(failed.length)warnings.push(`${failed.length} HTTP response(s) >= 400 captured`);
  const result={name,scenarioSource:entry.scenarioSource,sourceId:entry.sourceId,quality:options.quality,
    loading:{pageLoadMs:round(pageLoadMs),modelsReadyMs:round(modelsReadyMs),gameReadyMs:round(gameReadyMs)},
    sampling:{warmupRequestedMs:options.warmupSeconds*1000,warmupActualMs:round(raw.warmupActualMs),measurementRequestedMs:options.durationSeconds*1000,measurementActualMs:round(raw.measurementActualMs)},
    metrics,environment:env,memory:{before:memoryBefore,after:memoryAfter},diagnostics:{before:diagnosticSummary(before),after:diagnosticSummary(after)},warnings,pageErrors:errors,failedResponses:failed};
  await context.close();return result;
}

export async function main(argv=process.argv.slice(2)){
  const options=parseArgs(argv);
  if(options.manual&&(options.scenario==='all'||options.headless))throw new Error('--manual requires one explicit --scenario and a headed browser (omit --headless)');
  const scenarios=await makeScenarios(),selected=options.scenario==='all'?SCENARIO_NAMES:[options.scenario];
  const baseUrl=options.externalUrl??`http://127.0.0.1:${options.port}/COD-guerra/`;let server=null,serverLog='';
  if(!options.externalUrl){
    server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(options.port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
    server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
  }
  let browser;
  try{
    await waitForPreview(baseUrl,server);
    const launch={headless:options.headless,args:['--disable-dev-shm-usage']};if(process.env.CHROME_EXECUTABLE)launch.executablePath=process.env.CHROME_EXECUTABLE;
    try{browser=await chromium.launch(launch);}catch(error){throw new Error(`Could not launch Chrome/Chromium${process.env.CHROME_EXECUTABLE?` at CHROME_EXECUTABLE=${process.env.CHROME_EXECUTABLE}`:''}. Set CHROME_EXECUTABLE to an installed Chrome/Chromium binary. Original error: ${error.message}`);}
    const run={schemaVersion:1,kind:'M01 Chromebook benchmark instrument',timestamp:new Date().toISOString(),commit:gitHead(),environment:options.environment,
      mode:options.manual?'manual':'automated',quality:options.quality,requestedViewport:{width:options.width,height:options.height},warmupSeconds:options.warmupSeconds,durationSeconds:options.durationSeconds,
      scenarios:[],warnings:['This tool measures the current browser/hardware only. Do not label CI/cloud or SwiftShader results as Chromebook GPU performance.']};
    for(const name of selected){console.log(`Benchmarking ${name} (${options.quality})...`);run.scenarios.push(await runScenario(browser,baseUrl,name,scenarios[name],options));}
    const ua=run.scenarios[0]?.environment?.userAgent??'';if(options.environment==='local/unspecified'&&/CrOS/i.test(ua))run.environment='chromebook';
    assertFiniteJson(run);await mkdir(options.out,{recursive:true});const stamp=run.timestamp.replace(/[:.]/g,'-');
    const file=resolve(options.out,`${stamp}-${options.quality}-${options.scenario}.json`);await writeFile(file,serialiseBenchmark(run));console.log(`Benchmark JSON: ${file}`);return {file,run};
  }finally{
    await browser?.close().catch(()=>{});
    if(server){server.kill();if(server.exitCode===null)await new Promise(r=>setTimeout(r,100));if(server.exitCode&&server.exitCode!==0)console.error(serverLog.trim());}
  }
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked)main().catch(error=>{console.error(`M01 benchmark failed: ${error.message}`);process.exitCode=1;});
