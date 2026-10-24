// M01-BOMB-EFFECTS-V1 (R1-a, 2026-10-23, golden amendment 16): the evidence behind the seed re-pins of tests/m01-deck-assault.test.js (seed 4 -> seed 1 with support) and tests/m01-rearguard.test.js
// (seed 7 -> seed 5 in the sum of five). A re-pin is honest only if the PROPERTY the test asserts is as likely, and as strong, after the change as before it, so this measures that property on
// the predecessor (e7f5f28, the candidate before R1-a, extracted from git with its data) and on the working tree, on the same seeds, with the same pilots:
//   deck      the precondition of the deck-assault test: with the covering-fire pilot ("support"), at the east demolition a German of the spans is already dead on the collapsing spans (x 663..877,
//             not carried), so that the rule "a body on the spans falls with them and does not retreat" is exercised at all. Over 12 seeds.
//   rearguard the property of the rearguard test: the length of the deck fight (entry of the Germans on the spans to the east demolition) of the control pilot that never fires, with the
//             rearguard and with rearguardHolds() off; "sooner in the sum, never longer on a seed". Over 8 seeds, the five pinned ones and three more.
// Read-only: nothing here changes a simulation. Not run by npm test. Deterministic JSON (no clocks, no paths).
//   node tools/verification/m01-bomb-effects-repin-audit.mjs [--jobs 3] [--out <file>]
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync,mkdtempSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const ROOT=resolve(import.meta.dirname,'../..'),SELF=import.meta.filename;
const PREDECESSOR='e7f5f2879b1bdbddad7c94ae12fad97627758758';
const DECK_SEEDS=[19390901,1,2,3,4,5,6,7,8,9,10,11],REAR_SEEDS=[7,5,19390901,3,4,11,1,8],REAR_PINNED=[19390901,5,3,4,11];
const r2=v=>Math.round(v*100)/100;

/** The predecessor tree, extracted like tools/verification/m01-integration-golden-audit.mjs does it (sources, mission data, the test helpers and the JSON data of assets and research). */
function extractPredecessor(){
  const dir=mkdtempSync(join(tmpdir(),'m01-repin-'));
  const git=(...a)=>execFileSync('git',['-C',ROOT,...a],{maxBuffer:1<<29});
  const data=git('ls-tree','-r','--name-only',PREDECESSOR,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',dir],{input:git('archive','--format=tar',PREDECESSOR,'src','missions','tests/helpers','package.json',...data)});
  symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}

class Stop extends Error{}
const BLAST='evt_m01_east_demolition';
async function measureDeck(root,seed){
  const {route}=await import(pathToFileURL(join(root,'tests/helpers/m01-route.js')));
  let row=null;
  try{route(seed,{support:true,onStep:({sim})=>{
    if(!sim.consumedEvent(BLAST))return;
    const dead=sim.actors.filter(a=>a.group==='grp_de_spans'&&!a.alive&&!a.carriedBy);
    row={seed,deadOnSpans:dead.filter(a=>a.x>=663&&a.x<=877).map(a=>a.id),deadElsewhere:dead.filter(a=>!(a.x>=663&&a.x<=877)).map(a=>a.id)};
    throw new Stop();
  }});}catch(e){if(!(e instanceof Stop))throw e;}
  return {...row,case:row.deadOnSpans.length>=1};
}
async function measureRearguard(root,seed){
  const {M01Simulation}=await import(pathToFileURL(join(root,'src/game/m01-simulation.js')));
  const {driver,toRepair}=await import(pathToFileURL(join(root,'tests/helpers/m01-route.js')));
  const deckRoundsKey=sim=>sim.actors.filter(a=>a.group==='grp_de_spans'&&a.deck).map(a=>`${a.suppressedUntil}/${a.health}`).join();
  const toDeck=(Simulation,until)=>{
    const d=toRepair(driver(seed,{Simulation})),{sim,step,walk}=d;
    walk(-115,27);walk(-28,28);step({crouch:true});d.until(()=>sim.active('hold_access'),500);step({crouch:true});
    walk(-115,32);walk(-30,40);walk(-10,40);walk(30,40);d.until(()=>until(sim),900);
    return d;
  };
  class NoRearguard extends M01Simulation{rearguardHolds(){return false;}}
  const measure=Simulation=>{let rounds=0;
    class Probe extends Simulation{rearguardShot(a){const k=deckRoundsKey(this);super.rearguardShot(a);if(deckRoundsKey(this)!==k)rounds++;}}
    const sim=toDeck(Probe,s=>s.consumedEvent(BLAST)).sim;
    return {fight:sim.consumed[BLAST]-sim.consumed.evt_m01_germans_on_east_spans,rounds};
  };
  const a=measure(NoRearguard),b=measure(M01Simulation);
  return {seed,without:r2(a.fight),withIt:r2(b.fight),delta:r2(b.fight-a.fight),rounds:b.rounds,neverLonger:b.fight<=a.fight+1e-6};
}

if(process.argv.includes('--one')){
  const i=process.argv.indexOf('--one'),[kind,root,seed]=process.argv.slice(i+1,i+4);
  console.log(JSON.stringify(await (kind==='deck'?measureDeck:measureRearguard)(root,Number(seed))));
}else{
  const jobs=Number(arg('--jobs')??3),OUT=resolve(arg('--out')??join(ROOT,'docs/verification/m01-runtime/bomb-effects-2026-10-23/REPIN_EVIDENCE.json'));
  const pred=extractPredecessor();
  const trees={predecessor:pred,live:ROOT};
  const queue=['deck','rearguard'].flatMap(kind=>Object.keys(trees).flatMap(tree=>(kind==='deck'?DECK_SEEDS:REAR_SEEDS).map(seed=>({kind,tree,seed})))),done=new Map(),total=queue.length;
  try{
    await new Promise((resolveAll,rejectAll)=>{
      let running=0;
      const next=()=>{
        if(!queue.length&&running===0)return resolveAll();
        while(running<jobs&&queue.length){
          const job=queue.shift();running++;
          const child=spawn(process.execPath,[SELF,'--one',job.kind,trees[job.tree],String(job.seed)],{stdio:['ignore','pipe','inherit']});
          let out='';child.stdout.on('data',d=>{out+=d;});
          child.on('close',code=>{
            running--;
            if(code!==0)return rejectAll(new Error(`${job.kind} ${job.tree} seed ${job.seed} failed (${code})`));
            done.set(`${job.kind}/${job.tree}/${job.seed}`,JSON.parse(out.trim().split('\n').at(-1)));
            console.error(`done ${done.size}/${total}: ${job.kind} ${job.tree} ${job.seed}`);next();
          });
        }
      };
      next();
    });
  }finally{rmSync(pred,{recursive:true,force:true});}
  const rows=(kind,tree,seeds)=>seeds.map(seed=>done.get(`${kind}/${tree}/${seed}`));
  const mean=xs=>r2(xs.reduce((a,b)=>a+b,0)/xs.length);
  const deck=Object.fromEntries(Object.keys(trees).map(tree=>{const r=rows('deck',tree,DECK_SEEDS);return [tree,{seedsWithTheCase:r.filter(x=>x.case).map(x=>x.seed),share:`${r.filter(x=>x.case).length}/${r.length}`,rows:r}];}));
  const rearguard=Object.fromEntries(Object.keys(trees).map(tree=>{
    const r=rows('rearguard',tree,REAR_SEEDS),pinned=rows('rearguard',tree,REAR_PINNED);
    return [tree,{neverLonger:`${r.filter(x=>x.neverLonger).length}/${r.length}`,seedsLonger:r.filter(x=>!x.neverLonger).map(x=>({seed:x.seed,deltaSec:x.delta})),meanDeltaSec:mean(r.map(x=>x.delta)),
      pinnedSeeds:REAR_PINNED,pinnedSumWithoutSec:r2(pinned.reduce((a,x)=>a+x.without,0)),pinnedSumWithSec:r2(pinned.reduce((a,x)=>a+x.withIt,0)),rows:r}];}));
  const text=JSON.stringify({task:'M01-BOMB-EFFECTS-V1',what:'the properties behind the seed re-pins of the deck-assault and rearguard tests, on the predecessor (e7f5f28) and on the working tree, same seeds and pilots; deterministic, no clock, no path',
    predecessor:PREDECESSOR,deckSeeds:DECK_SEEDS,rearguardSeeds:REAR_SEEDS,deck,rearguard},null,2)+'\n';
  mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,text);console.log(`written ${OUT}`);
}
