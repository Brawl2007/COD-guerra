#!/usr/bin/env node
// V-1 (2026-11-06): historical fidelity audit of M01 (docs/direction/M01_VIBE_FIDELITY_PLAN.md, «Princípio … 80 % fiel» and «V-1»).
// Loads missions/m01-tczew/history-context.json, validates it (schema, every source ID in research/SOURCES.md, every ref resolves in the mission
// data, coverage of every event/objective/group/cast/card/dialogue/debrief id) and computes
//   fidelity = Σ weight·layerFactor (DOCUMENTED + RECONSTRUCTED) / Σ weight·layerFactor, per act and overall.
// Usage: node tools/verification/m01-fidelity-audit.mjs [--json] [--measure]
//   --json     machine-readable report on stdout
//   --measure  re-run the control routes (tools/verification/m01-fidelity-measure.mjs, ~30 s) and print each route's real seconds (no per-weight comparison yet)
// Read-only: it never writes a file and changes nothing in the game.
import {readFileSync} from 'node:fs';

const ROOT=new URL('../../',import.meta.url);
const read=f=>readFileSync(new URL(f,ROOT),'utf8');
const MISSION_DIR='missions/m01-tczew/';
export const CONTEXT_FILE=MISSION_DIR+'history-context.json';
export const CLASSES=Object.freeze(['DOCUMENTED','RECONSTRUCTED','GAMEPLAY_DRAMATIZATION']);
export const FAITHFUL=new Set(['DOCUMENTED','RECONSTRUCTED']);
export const CERTAINTIES=Object.freeze(['ALTA','MÉDIA','BAIXA','n/a']);
export const KINDS=Object.freeze(['event','objective','cutscene','card','hour','group','cast','vehicle','sector','scene','dialogue','debrief','history']);
export const THRESHOLD=.8;
const DATA_FILES=['mission.json','acts.json','areas/np/act.json','areas/np/act-vii-b.json','areas/np/act-vii-c.json','areas/np/layout.json'];
const AREA_FILES={act_vii_a_north:'areas/np/act.json',act_vii_b_north_day:'areas/np/act-vii-b.json',act_vii_c_withdrawal:'areas/np/act-vii-c.json'};

export function loadContext(){return JSON.parse(read(CONTEXT_FILE));}
export function loadData(){return Object.fromEntries(DATA_FILES.map(f=>[f,JSON.parse(read(MISSION_DIR+f))]));}
/** Source IDs defined in the tables of research/SOURCES.md (first column). */
export function sourceIds(){
  const ids=new Set();for(const line of read('research/SOURCES.md').split('\n')){const m=line.match(/^\|\s*([A-Z]\d\d(?:-PDF)?)\s*\|/);if(m)ids.add(m[1]);}
  return ids;
}
/** Resolves «file#a/b/c»: object keys, or array elements by id, by event, or by index. Returns undefined when missing. */
export function resolveRef(data,ref){
  const [file,path='']=ref.split('#');let node=data[file];if(node===undefined)return undefined;
  for(const seg of path.split('/').filter(Boolean)){
    if(Array.isArray(node))node=node.find(x=>x&&x.id===seg)??node.find(x=>x&&x.event===seg&&!x.id)??(/^\d+$/.test(seg)?node[Number(seg)]:undefined);
    else if(node&&typeof node==='object')node=node[seg];else return undefined;
    if(node===undefined)return undefined;
  }
  return node;
}
/** Every data id the context must cover, as refs. */
export function requiredRefs(data){
  const m=data['mission.json'],out=[];
  const each=(file,path,list)=>{for(const x of list??[])if(x?.id)out.push(`${file}#${path}/${x.id}`);};
  each('mission.json','events',m.events);each('mission.json','objectives',m.objectives);each('mission.json','groups',m.groups);each('mission.json','cast',m.cast);
  each('mission.json','historicalPersonsOffscreen',m.historicalPersonsOffscreen);each('mission.json','cutscenes',m.cutscenes);each('mission.json','dialogue',m.dialogue);
  each('mission.json','callouts/lines',m.callouts.lines);each('mission.json','debrief/paragraphs',m.debrief.paragraphs);each('mission.json','sectors',m.sectors);
  each('mission.json','clock/segments',m.clock.segments);
  for(const file of Object.values(AREA_FILES)){
    const a=data[file];
    for(const k of ['events','objectives','groups','cast','history','callouts','barrages'])each(file,k,a[k]);
    each(file,'debrief/paragraphs',a.debrief?.paragraphs);
    for(const [k,c] of Object.entries(a.cards??{}))if(c?.id)out.push(`${file}#cards/${k}`);
  }
  return out;
}
/** Validation problems (empty = valid). */
export function validate(ctx=loadContext(),data=loadData(),sources=sourceIds()){
  const errors=[],ids=new Set(),acts=new Set(data['acts.json'].order),shares={};
  if(ctx.schemaVersion!==1)errors.push(`schemaVersion ${ctx.schemaVersion} != 1`);
  const layers=ctx.weighting?.layers??{};
  for(const e of ctx.entries??[]){
    const at=`entry ${e.id}`;
    if(!e.id||ids.has(e.id))errors.push(`${at}: id missing or duplicated`);ids.add(e.id);
    if(!KINDS.includes(e.kind))errors.push(`${at}: kind ${e.kind}`);
    if(!acts.has(e.act))errors.push(`${at}: act ${e.act} not in acts.json order`);
    if(!(e.layer in layers))errors.push(`${at}: layer ${e.layer} has no factor`);
    if(!CLASSES.includes(e.classification))errors.push(`${at}: missing/invalid classification ${e.classification}`);
    if(!CERTAINTIES.includes(e.certainty))errors.push(`${at}: certainty ${e.certainty}`);
    if(!Array.isArray(e.sources))errors.push(`${at}: sources not an array`);
    else{for(const s of e.sources)if(!sources.has(s))errors.push(`${at}: source ${s} not in research/SOURCES.md`);
      if(e.classification==='DOCUMENTED'&&!e.sources.length)errors.push(`${at}: DOCUMENTED without sources`);}
    if(e.classification==='GAMEPLAY_DRAMATIZATION'&&e.certainty!=='n/a')errors.push(`${at}: dramatization must have certainty n/a`);
    if(typeof e.playWeightSec!=='number'||!(e.playWeightSec>=0))errors.push(`${at}: playWeightSec`);
    if(typeof e.weightEstimated!=='boolean')errors.push(`${at}: weightEstimated must be boolean`);
    if(!e.note)errors.push(`${at}: note missing`);
    if(!Array.isArray(e.refs)||!e.refs.length)errors.push(`${at}: no refs`);
    else for(const r of e.refs)if(resolveRef(data,r)===undefined)errors.push(`${at}: ref ${r} does not resolve`);
    if(e.splitOf){(shares[e.splitOf]??=[]).push(e.share);}
  }
  for(const [k,v] of Object.entries(shares))if(Math.abs(v.reduce((a,b)=>a+b,0)-1)>1e-9)errors.push(`split ${k}: shares sum to ${v.reduce((a,b)=>a+b,0)}`);
  return errors;
}
export function missingCoverage(ctx=loadContext(),data=loadData()){
  const covered=new Set(ctx.entries.flatMap(e=>e.refs));
  return requiredRefs(data).filter(r=>!covered.has(r));
}
/** Fidelity per act and overall, with and without layer factors, plus per-layer figures and the dramatizations by weight. */
export function fidelity(ctx=loadContext()){
  const L=ctx.weighting.layers,acts={},layersBy={};
  const bucket=()=>({faithful:0,total:0,rawFaithful:0,rawTotal:0});
  const all=bucket();
  for(const e of ctx.entries){
    const f=L[e.layer]??1,w=e.playWeightSec,good=FAITHFUL.has(e.classification);
    for(const b of [acts[e.act]??=bucket(),all,(layersBy[e.act]??={})[e.layer]??=bucket()]){
      b.total+=w*f;b.rawTotal+=w;if(good){b.faithful+=w*f;b.rawFaithful+=w;}
    }
  }
  // Sensitivity (not the measure): the plan defines RECONSTRUCTED as including «tarefas plausíveis»; the data classify the player's/section's role
  // as GAMEPLAY_DRAMATIZATION. roleAsTask counts the «#jogo» half of each split objective as faithful, to show what that decision is worth.
  const role={};
  for(const e of ctx.entries){
    const f=L[e.layer]??1,w=e.playWeightSec,good=FAITHFUL.has(e.classification)||(e.kind==='objective'&&e.splitOf&&e.id.endsWith('#jogo'));
    for(const k of [e.act,'TOTAL']){const b=role[k]??={f:0,t:0};b.t+=w*f;if(good)b.f+=w*f;}
  }
  const fin=b=>({fidelity:b.total?b.faithful/b.total:null,rawFidelity:b.rawTotal?b.rawFaithful/b.rawTotal:null,weightedSec:b.total,rawSec:b.rawTotal});
  const dram=ctx.entries.filter(e=>e.classification==='GAMEPLAY_DRAMATIZATION').map(e=>({id:e.id,act:e.act,kind:e.kind,layer:e.layer,playWeightSec:e.playWeightSec,
    weightedSec:Math.round(e.playWeightSec*(L[e.layer]??1)*10)/10,weightEstimated:e.weightEstimated,note:e.note})).sort((a,b)=>b.weightedSec-a.weightedSec);
  return {threshold:THRESHOLD,acts:Object.fromEntries(Object.entries(acts).map(([k,b])=>[k,{...fin(b),layers:Object.fromEntries(Object.entries(layersBy[k]).map(([l,x])=>[l,fin(x)]))}])),
    overall:fin(all),sensitivityRoleAsTask:Object.fromEntries(Object.entries(role).map(([k,b])=>[k,b.t?b.f/b.t:null])),dramatizations:dram,conflicts:ctx.entries.filter(e=>e.conflict).map(e=>({id:e.id,act:e.act,conflict:e.conflict}))};
}
async function measureDrift(ctx){
  const {measureAll}=await import('./m01-fidelity-measure.mjs');
  const m=measureAll();
  // Report the total real seconds of each route: the weights of history-context.json were taken from the same routes.
  return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,v.totalSec]));
}
const pct=v=>v==null?'—':`${(v*100).toFixed(1)} %`;
if(import.meta.url===`file://${process.argv[1]}`){
  const ctx=loadContext(),data=loadData(),errors=validate(ctx,data),missing=missingCoverage(ctx,data),fid=fidelity(ctx);
  const report={file:CONTEXT_FILE,entries:ctx.entries.length,errors,missingCoverage:missing,...fid};
  if(process.argv.includes('--measure'))report.routeSeconds=await measureDrift(ctx);
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,1));
  else{
    console.log(`M01 fidelity audit — ${CONTEXT_FILE} (${ctx.entries.length} entries)`);
    console.log(`validation: ${errors.length?errors.length+' error(s)':'ok'}; coverage: ${missing.length?missing.length+' id(s) without entry':'complete'}`);
    for(const e of errors.slice(0,20))console.log('  ERROR '+e);for(const r of missing.slice(0,20))console.log('  MISSING '+r);
    console.log('\nact                      fidelity  (sem fatores)  peso ponderado s  peso bruto s  ≥80 %');
    for(const [k,a] of [...Object.entries(fid.acts),['TOTAL',fid.overall]])
      console.log(`${k.padEnd(24)} ${pct(a.fidelity).padStart(8)}  ${pct(a.rawFidelity).padStart(13)}  ${a.weightedSec.toFixed(0).padStart(16)}  ${a.rawSec.toFixed(0).padStart(12)}  ${a.fidelity>=THRESHOLD?'sim':'NÃO'}`);
    console.log('\nsensitivity — papel do jogador nos objetivos contado como tarefa reconstruída (decisão do proprietário, não é a medida):');
    console.log('  '+Object.entries(fid.sensitivityRoleAsTask).map(([k,v])=>`${k} ${pct(v)}`).join(' · '));
    console.log('\nper layer (fidelity / weighted s):');
    for(const [k,a] of Object.entries(fid.acts))console.log(`  ${k}: `+Object.entries(a.layers).map(([l,x])=>`${l} ${pct(x.fidelity)}/${x.weightedSec.toFixed(0)}`).join(' · '));
    console.log('\ntop dramatizations by weighted seconds:');
    for(const d of fid.dramatizations.slice(0,15))console.log(`  ${String(d.weightedSec).padStart(7)} s  ${d.act.padEnd(22)} ${d.id}${d.weightEstimated?' (estimado)':''}`);
    console.log(`\nconflicts flagged in the data/docs: ${fid.conflicts.length}`);
    if(report.routeSeconds)console.log('route seconds re-measured: '+JSON.stringify(report.routeSeconds));
  }
  process.exitCode=errors.length||missing.length?1:0;
}
