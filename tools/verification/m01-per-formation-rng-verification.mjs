import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {FormationWorld,active,checksum,envelope,copy} from './m01-per-formation-rng-prototype.mjs';

export function command(w,fid,type,payload,id,at=w.snapshot().clock+1){
  return envelope({id,at,formationId:fid,type,payload,authority:w.authority(fid)});
}
function policy(w,i){
  const phase=i%120;
  for(const [fid,wanted] of [['A',phase<70],['B',phase>=40&&phase<110]]){
    const owner=w.formation(fid).owner;
    if(wanted&&owner==='AGGREGATED')w.acquire(fid);
    else if(!wanted&&owner==='INDIVIDUAL')w.release(fid);
  }
}
function inputs(w,i){
  const s=w.snapshot(),events=[];
  if(i%83===0){for(const [fid,amount]of [['A',17],['B',13]])events.push(command(w,fid,'sharedSpend',{amount,expectedSharedRevision:s.shared.revision},`supply/${i}/${fid}`));}
  if(i%47===0)events.push(command(w,'A','suppress',{targetFormationId:'B',amount:1},`suppress/${i}`));
  if(i%1300===0)events.push(command(w,'A','loss',{memberId:`A/soldier/${Math.min(11,5+Math.floor(i/1300))}`,status:'dead'},`loss/${i}`));
  if(i%701===0)events.push(envelope({id:`artillery/${i}`,at:s.clock+1,type:'artillery',payload:{targets:[{formationId:'C',memberId:`C/soldier/${Math.min(11,Math.floor(i/701))}`,status:'dead'}]}}));
  if(i%97===0){const m=active(w.formation('B')).members.find(m=>m.status==='combatReady'&&m.loaded>0);if(m)events.push(command(w,'B','fire',{memberId:m.id,rounds:1},`fire/${i}`));}
  if(i%89===0&&events.length)events.push(copy(events[0]));return events;
}
const stepInputs=i=>({dt:[17,23,50,120,9,101,0][i%7],paused:i%19===0});
function initial(){
  const w=new FormationWorld({sectorReserve:100000});w.tick(350);w.acquire('A');w.acquire('B');w.tick(123);return w;
}
export function longFuture(ticks=10000){
  const a=initial(),save=a.save(),b=FormationWorld.restore(save);let events=0,zeroDtTicks=0,overlappingLeaseTicks=0,aggregateBTicksWhileALeased=0;
  const start=performance.now();
  for(let i=0;i<ticks;i++){
    const {dt,paused}=stepInputs(i);let es=[];
    if(dt&&!paused){policy(a,i);policy(b,i);es=inputs(a,i);}else zeroDtTicks++;
    a.tick(dt,es,{paused});b.tick(dt,es.toReversed(),{paused});events+=es.length;
    const sa=a.snapshot(),sb=b.snapshot();assert.deepEqual(sa,sb,`first divergent tick ${i}`);
    if(sa.formations[0].owner==='INDIVIDUAL'&&sa.formations[1].owner==='INDIVIDUAL')overlappingLeaseTicks++;
    if(sa.formations[0].owner==='INDIVIDUAL'&&sa.formations[1].owner==='AGGREGATED')aggregateBTicksWhileALeased++;
    if(i%173===0&&es.length){const before=a.snapshot();a.retry(es[0]);assert.deepEqual(a.snapshot(),before);}
  }
  return {formations:3,membersPerFormation:12,ticks,comparisons:ticks,events,zeroDtTicks,overlappingLeaseTicks,aggregateBTicksWhileALeased,
    elapsedMs:performance.now()-start,clockMs:a.snapshot().clock,checksum:checksum(a.snapshot()),saveChecksum:save.checksum,
    generations:a.snapshot().formations.map(f=>({id:f.id,generation:f.generation})),divergences:0};
}
export function benchmark(ticks=1000){
  const w=initial();let events=0;const start=performance.now();
  for(let i=0;i<ticks;i++){const {dt,paused}=stepInputs(i);let es=[];if(dt&&!paused){policy(w,i);es=inputs(w,i);}events+=es.length;w.tick(dt,es,{paused});}
  const elapsedMs=performance.now()-start;return {environment:'Node mathematical model; full clone/validation/receipts included',formations:3,membersPerFormation:12,ticks,events,
    elapsedMs,microsecondsPerTick:elapsedMs*1000/ticks,checksum:checksum(w.snapshot())};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const report={node:process.version,longFuture:longFuture(10000),benchmark:benchmark(1000)};
  if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
