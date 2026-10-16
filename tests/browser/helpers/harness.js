const CHECKPOINT_KEY='cod-guerra:checkpoint:m01:v2';
const states=new WeakMap();

function globToRegExp(glob){
  let out='^';
  for(let i=0;i<glob.length;i++){
    const c=glob[i];
    if(c==='*'){
      if(glob[i+1]==='*'){out+='.*';i++;}
      else out+='[^/]*';
    }else if(c==='?')out+='.';
    else out+=/[\\^$+?.()|{}\[\]]/.test(c)?`\\${c}`:c;
  }
  return new RegExp(out+'$');
}

export function patternMatchesUrl(pattern,url){return globToRegExp(pattern).test(url);}

export function isBenignNavigationAbort(errorText,{navigating=false}={}){
  return navigating&&errorText==='net::ERR_ABORTED';
}

export function installBrowserHarness(page){
  if(states.has(page))return states.get(page);
  const state={
    pageErrors:[],consoleErrors:[],requestFailures:[],httpFailures:[],expectedFailures:[],crashed:false,
    inFlight:new Map(),requestGeneration:new WeakMap(),generation:0,pendingIntentionalReload:false,abortBeforeGeneration:null,createdAt:Date.now(),navigating:false
  };
  states.set(page,state);
  page.on('pageerror',error=>state.pageErrors.push({message:error.message,stack:error.stack??null}));
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())state.navigating=false;});
  page.on('request',request=>{
    if(request.isNavigationRequest()&&request.frame()===page.mainFrame()){
      state.navigating=true;
      if(state.pendingIntentionalReload){
        state.generation+=1;
        state.abortBeforeGeneration=state.generation;
        state.pendingIntentionalReload=false;
      }
    }
    state.requestGeneration.set(request,state.generation);
    state.inFlight.set(request,{url:request.url(),method:request.method(),resourceType:request.resourceType(),startedAt:Date.now()});
  });
  page.on('requestfinished',request=>state.inFlight.delete(request));
  page.on('console',message=>{
    if(message.type()!=='error')return;
    const location=message.location(),expected=location?.url?state.expectedFailures.find(x=>x.regex.test(location.url)):null;
    state.consoleErrors.push({text:message.text(),location,expected:Boolean(expected),label:expected?.label??null});
  });
  page.on('requestfailed',request=>{
    const url=request.url(),expected=state.expectedFailures.find(x=>x.regex.test(url));
    state.inFlight.delete(request);
    const errorText=request.failure()?.errorText??null;
    const generation=state.requestGeneration.get(request)??state.generation;
    const expectedNavigationAbort=errorText==='net::ERR_ABORTED'&&state.abortBeforeGeneration!==null&&generation<state.abortBeforeGeneration;
    const benignNavigationAbort=expectedNavigationAbort;
    const item={url,method:request.method(),errorText,expected:Boolean(expected),generation,expectedNavigationAbort,benignNavigationAbort,label:expected?.label??null};
    state.requestFailures.push(item);
  });
  page.on('response',response=>{
    if(response.status()<400)return;
    const url=response.url(),expected=state.expectedFailures.find(x=>x.regex.test(url));
    state.httpFailures.push({url,status:response.status(),statusText:response.statusText(),expected:Boolean(expected),label:expected?.label??null});
  });
  page.on('crash',()=>{state.crashed=true;});
  return state;
}

export function browserHarnessState(page){return installBrowserHarness(page);}

export async function reloadWithExpectedAborts(page,options){
  const state=installBrowserHarness(page);
  // Advance the document generation when the intentional reload's main-frame
  // navigation request starts. Only ERR_ABORTED requests born in an older
  // generation are benign; all requests from the new document remain strict.
  state.pendingIntentionalReload=true;
  try{return await page.reload(options);}finally{state.pendingIntentionalReload=false;}
}

export async function forceAssetFailure(page,pattern,{status=404,body='forced browser harness asset failure',label=pattern,minHits=1}={}){
  const state=installBrowserHarness(page),record={pattern,regex:globToRegExp(pattern),label,minHits,hits:0,status};
  state.expectedFailures.push(record);
  await page.route(pattern,async route=>{
    record.hits++;
    await route.fulfill({status,contentType:'text/plain',body,headers:{'x-m01-test-forced-failure':label.slice(0,120)}});
  });
  return record;
}

function visibleState(){
  const visible=id=>{const el=document.querySelector(id);return el?{visible:!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden',disabled:Boolean(el.disabled),text:(el.textContent??'').trim().slice(0,240)}:null;};
  const checkpointSummary=key=>{
    try{
      const raw=localStorage.getItem(key);
      if(!raw)return {present:false};
      const s=JSON.parse(raw);
      return {present:true,schema:s.schema??null,missionId:s.missionId??null,clock:s.clock??null,battleClock:s.battleClock??null,scene:s.scene?.id??s.scene??null,
        checkpointsReached:Array.isArray(s.checkpointsReached)?s.checkpointsReached.slice(-6):null,actors:Array.isArray(s.actors)?s.actors.length:null};
    }catch(error){return {present:true,parseError:error.message};}
  };
  const checkpoint=checkpointSummary('cod-guerra:checkpoint:m01:v2'),legacyCheckpoint=checkpointSummary('cod-guerra:checkpoint:v1');
  const g=window.gameDiagnostics?.()??null;
  const m=g?.m01??null;
  const compact=g?{
    missionId:g.missionId,clock:g.clock,paused:g.paused,complete:g.complete,missionPhase:g.missionPhase,player:g.player,weapon:g.weapon??null,eventIds:(g.eventIds??[]).slice(-24),
    quality:g.quality,drawCalls:g.drawCalls,triangles:g.triangles,
    m01:m?{
      battleClock:m.battleClock,scene:m.scene,gate:m.gate,checkpoints:m.checkpoints,enemyAlive:m.enemyAlive,weapon:m.weapon,flags:m.flags,
      requiredAssetFailures:m.requiredAssetFailures,assetFailures:(m.assetFailures??[]).slice(-12),
      actorPoses:m.actorPoses,actorAnimations:m.actorAnimations,fireEffects:m.fireEffects,viewModel:m.viewModel,wagons:m.wagons,
      aircraft:m.aircraft,stationEvacuation:m.stationEvacuation,hudStatus:m.hudStatus,
      characters:m.characters?{active:m.characters.active,loaded:m.characters.loaded,failures:(m.characters.failures??[]).slice(-12),proneAvailable:m.characters.proneAvailable,
        ckm:m.characters.ckm,actors:(m.characters.actors??[]).filter(a=>a.prone||a.id?.startsWith('ckm_')||['generic_rifleman','leon_dudek','szymon_kowal','jozef_bak','stanislaw_nowak'].includes(a.id)).slice(0,20)}:null,
      objectives:m.objectives?Object.fromEntries(Object.entries(m.objectives).map(([id,o])=>[id,{state:o.state,progress:o.progress??null}])):null
    }:null
  }:null;
  return {
    href:location.href,readyState:document.readyState,visibilityState:document.visibilityState,pointerLockId:document.pointerLockElement?.id??null,
    checkpoint,legacyCheckpoint,
    ui:{start:visible('#start'),continue:visible('#continue'),pause:visible('#pause'),resume:visible('#resume'),restart:visible('#restart-checkpoint'),complete:visible('#complete'),error:visible('#error')},
    diagnostics:compact
  };
}

export async function captureHarnessSnapshot(page){
  const state=installBrowserHarness(page);
  const inFlight=()=>[...state.inFlight.values()].map(x=>({...x,ageMs:Date.now()-x.startedAt})).sort((a,b)=>b.ageMs-a.ageMs).slice(0,20);
  if(page.isClosed())return {pageClosed:true,crashed:state.crashed,inFlight:inFlight()};
  try{
    const snapshot=await page.evaluate(visibleState);
    snapshot.crashed=state.crashed;snapshot.inFlight=inFlight();
    snapshot.pendingAssets=snapshot.inFlight.filter(x=>/\.(?:glb|gltf|png|jpe?g|webp|ogg|mp3|wav)(?:[?#]|$)/i.test(x.url));
    return snapshot;
  }catch(error){return {captureError:error.message,pageClosed:page.isClosed(),crashed:state.crashed,inFlight:inFlight()};}
}

export function classifyHarnessState(snapshot){
  if(snapshot?.crashed)return 'BROWSER_CRASHED';
  if(snapshot?.pageClosed)return 'PAGE_CLOSED';
  if(snapshot?.captureError)return 'PAGE_UNREADABLE';
  if(snapshot?.readyState!=='complete')return 'PAGE_NOT_READY';
  if(snapshot?.ui?.error?.visible)return 'ERROR_MODAL_VISIBLE';
  const g=snapshot?.diagnostics,m=g?.m01;
  if(m?.requiredAssetFailures?.length)return 'REQUIRED_ASSET_FAILURE';
  if(snapshot?.pendingAssets?.length)return 'ASSET_REQUEST_PENDING';
  if(g?.paused===true)return 'SIMULATION_PAUSED';
  if(g&&!g.paused&&snapshot.pointerLockId!=='game')return 'POINTER_LOCK_MISSING';
  if(m&&Array.isArray(m.assetFailures)&&m.assetFailures.length)return 'OPTIONAL_ASSET_FAILURE_PRESENT';
  return 'WAIT_CONDITION_UNMET';
}

async function waitFailure(page,label,timeout,error=null){
  const snapshot=await captureHarnessSnapshot(page),state=installBrowserHarness(page),classification=classifyHarnessState(snapshot);
  const recent={pageErrors:state.pageErrors.slice(-6),consoleErrors:state.consoleErrors.slice(-6),requestFailures:state.requestFailures.slice(-8),httpFailures:state.httpFailures.slice(-8)};
  const diagnostic=JSON.stringify({label,classification,snapshot,recent},null,2);
  return new Error(`[browser-harness:${label}] ${classification} after ${timeout}ms\n${diagnostic}${error?`\nOriginal: ${error.message}`:''}`);
}

export async function waitForState(page,label,predicate,arg=null,{timeout=30000,polling='raf',failFastOn=[]}={}){
  if(!failFastOn.length){
    try{return await page.waitForFunction(predicate,arg,{timeout,polling});}
    catch(error){
      // Playwright can reject exactly at the timeout boundary while a slow
      // software-rendered frame is committing the observable state. Recheck
      // before and after diagnostic capture: the latter uses only time already
      // spent collecting failure evidence, not a larger gameplay wait budget.
      try{if(await page.evaluate(predicate,arg))return true;}
      catch(recheckError){throw await waitFailure(page,label,timeout,recheckError);}
      const failure=await waitFailure(page,label,timeout,error);
      try{if(await page.evaluate(predicate,arg))return true;}
      catch(recheckError){throw await waitFailure(page,label,timeout,recheckError);}
      throw failure;
    }
  }
  const started=Date.now(),interval=typeof polling==='number'?Math.max(16,polling):100;
  while(Date.now()-started<timeout){
    if(page.isClosed())throw await waitFailure(page,label,Date.now()-started);
    try{if(await page.evaluate(predicate,arg))return true;}
    catch(error){throw await waitFailure(page,label,Date.now()-started,error);}
    const snapshot=await captureHarnessSnapshot(page),classification=classifyHarnessState(snapshot);
    if(failFastOn.includes(classification))throw await waitFailure(page,label,Date.now()-started);
    await new Promise(resolve=>setTimeout(resolve,interval));
  }
  throw await waitFailure(page,label,timeout);
}

export async function waitForPointerLockRunning(page,label='pointer-lock-running',{timeout=15000,afterClock=null}={}){
  return waitForState(page,label,threshold=>{
    const g=window.gameDiagnostics?.();const floor=Number.isFinite(threshold)?threshold+.01:.05;
    return Boolean(g&&!g.paused&&g.clock>floor&&document.pointerLockElement?.id==='game');
  },afterClock,{timeout,polling:100,failFastOn:['BROWSER_CRASHED','PAGE_CLOSED','PAGE_UNREADABLE','REQUIRED_ASSET_FAILURE','ERROR_MODAL_VISIBLE']});
}

export async function waitForM01Ready(page,label='m01-models-ready',{timeout=30000}={}){
  return waitForState(page,label,()=>window.gameDiagnostics?.().m01?.models?.length===9,null,{timeout,polling:100,failFastOn:['BROWSER_CRASHED','PAGE_CLOSED','PAGE_UNREADABLE','REQUIRED_ASSET_FAILURE','ERROR_MODAL_VISIBLE']});
}

export async function attachHarnessDiagnostics(page,info,{always=false}={}){
  const state=installBrowserHarness(page);
  const unexpected={
    browserLifecycle:state.crashed||page.isClosed()?[{crashed:state.crashed,pageClosed:page.isClosed()}]:[],
    pageErrors:state.pageErrors,
    consoleErrors:state.consoleErrors.filter(x=>!x.expected),
    requestFailures:state.requestFailures.filter(x=>!x.expected&&!x.benignNavigationAbort),
    httpFailures:state.httpFailures.filter(x=>!x.expected),
    forcedFailuresNotObserved:state.expectedFailures.filter(x=>x.hits<x.minHits).map(x=>({pattern:x.pattern,label:x.label,minHits:x.minHits,hits:x.hits,status:x.status}))
  };
  const hasUnexpected=Object.values(unexpected).some(v=>v.length);
  const failed=info.status!==info.expectedStatus;
  if(always||failed||hasUnexpected){
    const snapshot=await captureHarnessSnapshot(page);
    const body={classification:classifyHarnessState(snapshot),snapshot,unexpected,
      expectedAssetFailures:state.expectedFailures.map(x=>({pattern:x.pattern,label:x.label,hits:x.hits,minHits:x.minHits,status:x.status})),
      observed:{requestFailures:state.requestFailures.slice(-20),httpFailures:state.httpFailures.slice(-20),consoleErrors:state.consoleErrors.slice(-20),pageErrors:state.pageErrors.slice(-20)}};
    await info.attach('browser-harness-diagnostics',{body:JSON.stringify(body,null,2),contentType:'application/json'});
  }
  return {unexpected,hasUnexpected};
}

export async function finalizeBrowserHarness(page,info){
  const {unexpected,hasUnexpected}=await attachHarnessDiagnostics(page,info);
  if(info.status===info.expectedStatus&&hasUnexpected){
    const summary={};for(const [k,v] of Object.entries(unexpected))if(v.length)summary[k]=v.slice(0,6);
    throw new Error(`Browser harness detected unexpected errors in an otherwise green test:\n${JSON.stringify(summary,null,2)}`);
  }
}

export async function assertCheckpointStorage(page,{present=true,schema=2}={}){
  const result=await page.evaluate(({key})=>{const raw=localStorage.getItem(key);if(!raw)return {present:false};try{const s=JSON.parse(raw);return {present:true,schema:s.schema??null,clock:s.clock??null,battleClock:s.battleClock??null};}catch(error){return {present:true,parseError:error.message};}},{key:CHECKPOINT_KEY});
  if(result.present!==present)throw new Error(`checkpoint storage presence mismatch: expected ${present}, got ${result.present}`);
  if(present&&result.parseError)throw new Error(`checkpoint storage parse failed: ${result.parseError}`);
  if(present&&result.schema!==schema)throw new Error(`checkpoint schema mismatch: expected ${schema}, got ${result.schema}`);
  return result;
}
