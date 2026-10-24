// M01 R2-b: how the fight for the road deck unfolds (the deck assault of grp_de_spans against the Polish side), measured on the real test routes (tests/helpers/m01-route.js).
// Read-only: nothing here changes a simulation. Deterministic (no wall clock, no paths).
//   node tools/verification/m01-german-ai-metrics.mjs [--rev <git rev>] [--set 'groups.grp_de_spans.deckAssault.safeX=450' ...] [--routes 19390901:0,7:1,...] [--jsonl <file>]
//     [--label <text>] [--audit] [--timeline <file>] [--snap <dir> [--level soldado|veterano]] [--sed 'src/game/m01-section.js|old text|new text' ...]
// --snap <dir> measures only the deck fight, from the saves of the first tick of the window (snap-<seed>-<0|1>.json, taken from a route of recruta), with the pilot's own controls, re-levelled to
// --level (the paired comparison of tests/helpers/m01-danger.js); a death ends the run and is recorded (`death`). Without it the whole route is played.
//   node tools/verification/m01-german-ai-metrics.mjs --summary <file.jsonl> [--label <text>]
// Which tree is measured: the working tree by default; --rev <rev> extracts that commit (src, missions, the json data of assets / research) with `git archive`; --set <path>=<json value>
// (repeatable) measures a COPY of the working tree whose mission.json carries that value (--sed does the same for a constant of a source file: file|exact old text|new text, which must occur once), so one tree can be measured at two values of a data constant (`safeX` 450 against the shipped
// one). The pilot, the routes and the counting are always THIS tool's and THIS tree's tests/helpers/m01-route.js, so a before / after pair runs the same controls. Routes: seed:mode
// with mode 0 = the golden control route, 1 = the support pilot; the default is the 24 audit routes (12 seeds x both pilots). One JSON line per route (stdout, and appended to
// --jsonl so a restart loses nothing; a route already in the file under the same label is skipped).
// The window is the deck fight: evt_m01_germans_on_east_spans (06:05) to evt_m01_east_demolition. Every rate is per REAL second inside it. What is measured:
//   distance   per tick, the nearest living man of the deck assault (grp_de_spans, role assault, not carried) to the player and to the nearest Polish body on the bridge (the player, the
//              section's pair, the rearguard, any ally on the deck): the minimum over the window, the median over the ticks, and the share of ticks under 300, 150 and 100 m.
//   casualties every German who dies in the window, with the source of the death (player rifle, Polish rearguard, Polish section, ckm, the east demolition, a grenade) found by wrapping
//              the methods that can kill and comparing the roster before and after; the rounds each Polish source fired and those that struck (a drop of health).
//   pressure   the share of man-ticks the assault men spend suppressed, and the share of ticks a Polish deck man (pair, rearguard) is suppressed.
//   german fire the rounds the deck men fire (by kind), the collisions with the player and the wounds, per shooter, and the health lost in the window.
//   grenades   enemy-grenade events (R2-b), the explosions, the wounds they cause the player.
//   lines      the share of ticks with men advancing or in cover on BOTH girders (north z < 40 and south z > 40): two approach lines at once.
//   integrity  completion, the four checkpoints, the survivors, the 12 objective states, the real clock of the entry and of the east demolition; with --audit the clipping events and
//              the men standing inside each other over the whole route.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,symlinkSync,readFileSync,writeFileSync,existsSync,appendFileSync,cpSync,mkdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {route,coverControls} from '../../tests/helpers/m01-route.js';
import {atLevel} from '../../tests/helpers/m01-danger.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';

const ROOT=resolve(import.meta.dirname,'../..');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const args=name=>process.argv.flatMap((a,i)=>a===name?[process.argv[i+1]]:[]);
const round=(v,n=2)=>v===null||v===undefined||!Number.isFinite(v)?null:Math.round(v*10**n)/10**n;
const mean=xs=>xs.length?round(xs.reduce((a,b)=>a+b,0)/xs.length,2):null;
const median=xs=>{const s=[...xs].sort((a,b)=>a-b);return s.length?s[Math.floor((s.length-1)/2+.5)]:null;};
const quant=(xs,q)=>{const s=[...xs].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(q*(s.length-1)+.5))]:null;};
const ENTRY='evt_m01_germans_on_east_spans',BLAST='evt_m01_east_demolition';

if(arg('--summary')){
  const label=arg('--label'),rows=readFileSync(arg('--summary'),'utf8').split('\n').filter(l=>l.trim()).map(l=>JSON.parse(l)).filter(r=>!label||r.label===label);
  const out={};
  for(const l of [...new Set(rows.map(r=>r.label))]){
    const rs=rows.filter(r=>r.label===l),pick=f=>rs.map(f),sum=f=>rs.reduce((a,r)=>a+f(r),0);
    const bySource=Object.fromEntries(['player','rearguard','section','ckm','demolition','grenade','other'].map(s=>[s,round(sum(r=>r.casualties.bySource[s]??0)/rs.length,2)]));
    out[l]={routes:rs.length,
      fightRealSec:{mean:mean(pick(r=>r.window.durSec)),min:Math.min(...pick(r=>r.window.durSec)),max:Math.max(...pick(r=>r.window.durSec))},
      toPlayerM:{minOfMin:Math.min(...pick(r=>r.dist.toPlayer.min)),meanOfMin:mean(pick(r=>r.dist.toPlayer.min)),meanOfMedian:mean(pick(r=>r.dist.toPlayer.median)),
        pctUnder300:mean(pick(r=>r.dist.toPlayer.pctUnder300)),pctUnder150:mean(pick(r=>r.dist.toPlayer.pctUnder150)),routesUnder300:rs.filter(r=>r.dist.toPlayer.min<300).length,routesUnder150:rs.filter(r=>r.dist.toPlayer.min<150).length},
      toPostM:{minOfMin:Math.min(...pick(r=>r.dist.toPost.min)),meanOfMin:mean(pick(r=>r.dist.toPost.min)),meanOfMedian:mean(pick(r=>r.dist.toPost.median)),
        pctUnder300:mean(pick(r=>r.dist.toPost.pctUnder300)),pctUnder150:mean(pick(r=>r.dist.toPost.pctUnder150)),pctUnder100:mean(pick(r=>r.dist.toPost.pctUnder100)),
        routesUnder150:rs.filter(r=>r.dist.toPost.min<150).length,routesUnder100:rs.filter(r=>r.dist.toPost.min<100).length},
      germanCasualtiesPerRoute:{assaultDead:mean(pick(r=>r.casualties.assaultDead)),bySource,routesWithBreakOut:rs.filter(r=>r.casualties.assaultDead>=3).length,assaultAliveAtEnd:mean(pick(r=>r.casualties.assaultAliveAtEnd))},
      polishRounds:{section:{shots:mean(pick(r=>r.polish.section.shots)),hits:mean(pick(r=>r.polish.section.hits))},rearguard:{shots:mean(pick(r=>r.polish.rearguard.shots)),hits:mean(pick(r=>r.polish.rearguard.hits))},
        player:{shots:mean(pick(r=>r.polish.player.shots)),hits:mean(pick(r=>r.polish.player.hits))},kowalBursts:mean(pick(r=>r.polish.kowalBursts))},
      pressure:{assaultSuppressedPct:mean(pick(r=>r.pressure.assaultSuppressedPct)),polesPinnedPct:mean(pick(r=>r.pressure.polesPinnedPct))},
      germanFire:{roundsPerRoute:mean(pick(r=>r.germanFire.rounds)),collisionsOnPlayer:mean(pick(r=>r.germanFire.collisions)),woundsOnPlayer:mean(pick(r=>r.germanFire.wounds)),minHealthInWindow:Math.min(...pick(r=>r.germanFire.minHealth)),
        meanMinHealth:mean(pick(r=>r.germanFire.minHealth))},
      grenades:{thrownPerRoute:mean(pick(r=>r.grenades.thrown)),routesWithAny:rs.filter(r=>r.grenades.thrown>0).length,exploded:mean(pick(r=>r.grenades.exploded)),playerWounds:mean(pick(r=>r.grenades.playerWounds)),playerDamage:mean(pick(r=>r.grenades.playerDamage))},
      twoLinesPct:mean(pick(r=>r.lines.bothSidesPct)),
      stages:{maxStageReachedMean:mean(pick(r=>r.tactics.maxStage)),routesAtStage1:rs.filter(r=>r.tactics.maxStage>=1).length,routesAtStage2:rs.filter(r=>r.tactics.maxStage>=2).length,pullBacks:mean(pick(r=>r.tactics.pullBacks)),searches:mean(pick(r=>r.tactics.searches))},
      integrity:{complete:`${rs.filter(r=>r.integrity.complete).length}/${rs.length}`,checkpoints4:`${rs.filter(r=>r.integrity.checkpoints===4).length}/${rs.length}`,
        survivors:Object.fromEntries([...new Set(rs.map(r=>r.integrity.survivors))].sort().map(v=>[v,rs.filter(r=>r.integrity.survivors===v).length])),
        demolitionRealSec:{mean:mean(pick(r=>r.integrity.demolitionAt)),min:Math.min(...pick(r=>r.integrity.demolitionAt)),max:Math.max(...pick(r=>r.integrity.demolitionAt))},
        routeRealSec:{mean:mean(pick(r=>r.integrity.routeRealSec))},
        clippingEvents:rs.some(r=>r.integrity.clipping===null)?null:rs.reduce((a,r)=>a+r.integrity.clipping,0),stackedPairs:rs.some(r=>r.integrity.stackedPairs===null)?null:rs.reduce((a,r)=>a+r.integrity.stackedPairs,0)}};
  }
  console.log(JSON.stringify({tool:'tools/verification/m01-german-ai-metrics.mjs --summary',summary:out},null,1));
  process.exit(0);
}

const rev=arg('--rev'),sets=args('--set'),seds=args('--sed'),jsonl=arg('--jsonl'),timelineFile=arg('--timeline'),audit=process.argv.includes('--audit'),snapDir=arg('--snap'),level=arg('--level');
const label=arg('--label')??((rev??(sets.length||seds.length?`working-tree ${[...sets,...seds].join(' ')}`:'working-tree'))+(level?` ${level}`:''));
const DEFAULT_ROUTES=[19390901,1,2,3,4,5,6,7,8,9,10,11].flatMap(seed=>[`${seed}:0`,`${seed}:1`]).join(',');
const routes=(arg('--routes')??DEFAULT_ROUTES).split(',').map(s=>{const [seed,mode]=s.split(':');return {seed:Number(seed),support:mode==='1',key:`${seed}:${mode}`};});

function extract(at){
  const dir=mkdtempSync(join(tmpdir(),'m01-r2b-metrics-'));
  const data=execFileSync('git',['-C',ROOT,'ls-tree','-r','--name-only',at,'assets','research'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(p=>p.endsWith('.json'));
  const tar=execFileSync('git',['-C',ROOT,'archive','--format=tar',at,'src','missions',...data],{maxBuffer:1<<29});
  execFileSync('tar',['-x','-C',dir],{input:tar});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
/** A copy of the working tree (src, missions, the json data of assets / research) with the mission.json paths of --set replaced by the given JSON values. */
function copyWithPatches(patches,sources=[]){
  const dir=mkdtempSync(join(tmpdir(),'m01-r2b-metrics-'));
  cpSync(join(ROOT,'src'),join(dir,'src'),{recursive:true});cpSync(join(ROOT,'missions'),join(dir,'missions'),{recursive:true});
  for(const top of ['assets','research'])cpSync(join(ROOT,top),join(dir,top),{recursive:true,filter:p=>statSync(p).isDirectory()||p.endsWith('.json')});
  symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  const file=join(dir,'missions/m01-tczew/mission.json'),def=JSON.parse(readFileSync(file,'utf8'));
  for(const p of patches){
    const eq=p.indexOf('='),path=p.slice(0,eq).split('.'),value=JSON.parse(p.slice(eq+1));
    let node=def;
    for(let i=0;i<path.length-1;i++){const key=path[i];node=Array.isArray(node)?node.find(x=>x.id===key)??node[Number(key)]:node[key];if(node===undefined)throw new Error(`--set ${p}: no ${key}`);}
    node[path.at(-1)]=value;
  }
  writeFileSync(file,JSON.stringify(def,null,2));
  for(const x of sources){
    const [f,from,to]=x.split('|'),path=join(dir,f),text=readFileSync(path,'utf8');
    if(text.split(from).length!==2)throw new Error(`--sed ${f}: the text must occur exactly once (${from})`);
    writeFileSync(path,text.replace(from,()=>to));
  }
  return dir;
}
const treeRoot=rev?extract(rev):sets.length||seds.length?copyWithPatches(sets,seds):ROOT;
const {M01Simulation:Base,seconds}=await import(pathToFileURL(join(treeRoot,'src/game/m01-simulation.js')));
const {eyePosition}=await import(pathToFileURL(join(treeRoot,'src/world/spatial.js')));

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const isAssault=a=>a.group==='grp_de_spans'&&a.deck!==undefined&&/^de_spans_[4-9]$/.test(a.id);
const spansOf=sim=>sim.actors.filter(a=>a.group==='grp_de_spans');

function measure({seed,support}){
  const o={inWin:false,t0:null,t1:null,ticks:0,toPlayer:[],toPost:[],assaultSuppTicks:0,assaultTicks:0,polesPinned:0,polesTicks:0,bothSides:0,sideTicks:0,
    casualties:[],bySource:{},hits:{section:0,rearguard:0,player:0},shots:{section:0,rearguard:0,player:0},kowalBursts:0,rounds:{},collisions:0,wounds:0,woundList:[],minHealth:100,health0:null,
    grenadeThrown:0,grenadeExploded:0,grenadePlayerWounds:0,grenadePlayerDamage:0,maxStage:0,pullBacks:0,searches:0,timeline:[]};
  const clip=audit?clippingAudit():null,stack=audit?stackingAudit():null;
  let src='other';
  const note=(clock,what)=>{if(timelineFile)o.timeline.push(`${clock.toFixed(2)} ${what}`);};
  class Probe extends Base{
    // Attribution: run the method, compare the Germans before and after (alive, health). `source` is where a death or a hit belongs.
    #around(source,shotKey,run){
      if(!o.inWin)return run();
      const before=spansOf(this).map(a=>[a.id,a.alive,a.health,a.suppressedUntil]);
      const r=run();
      let struck=false;
      for(const [id,alive,health] of before){
        const a=this.actor(id);
        if(a.health<health-1e-9)struck=true;
        if(alive&&!a.alive&&!o.casualties.some(c=>c.id===id)){
          o.casualties.push({id,source,at:round(this.clock-o.t0,1),x:round(a.x,0),phase:a.deck?.phase??null,speed:round(a.motion?.speed??0,1),facing:round(a.facing,2)});o.bySource[source]=(o.bySource[source]??0)+1;
          note(this.clock-o.t0,`CASUALTY ${id} by ${source} at x ${a.x.toFixed(0)} (${a.deck?.phase}, speed ${(a.motion?.speed??0).toFixed(1)})`);
        }
      }
      if(shotKey){
        if(struck)o.hits[shotKey]++;
      }
      return r;
    }
    fire(){
      if(o.inWin){const n=this.weapon.shotCount;const r=this.#around('player','player',()=>super.fire());if(this.weapon.shotCount>n)o.shots.player++;return r;}
      return super.fire();
    }
    rearguardShot(a){
      if(o.inWin){o.shots.rearguard++;return this.#around('rearguard','rearguard',()=>super.rearguardShot(a));}
      return super.rearguardShot(a);
    }
    afterSection(){
      if(!o.inWin)return super.afterSection();
      const n=this.timers.section?.n?.shots??0;
      const r=this.#around('section','section',()=>super.afterSection());
      const m=this.timers.section?.n?.shots??0;if(m>n){o.shots.section+=m-n;}
      return r;
    }
    landCKMRounds(){return o.inWin?this.#around('ckm',null,()=>super.landCKMRounds()):super.landCKMRounds();}
    updateGrenades(dt,request){return o.inWin?this.#around('grenade',null,()=>super.updateGrenades(dt,request)):super.updateGrenades(dt,request);}
    consume(id){return id===BLAST&&o.inWin?this.#around('demolition',null,()=>super.consume(id)):super.consume(id);}
    kowalFire(dt){
      if(!o.inWin)return super.kowalFire(dt);
      const k=this.actor('szymon_kowal'),before=k.rounds,at=k.firedAt;const r=super.kowalFire(dt);if(k.firedAt!==at&&k.rounds<before)o.kowalBursts++;return r;
    }
    burst(a,target,kind,opts){
      const fired=super.burst(a,target,kind,opts);
      if(o.inWin&&fired&&a.group==='grp_de_spans'){const n=opts?.rounds??1;o.rounds[kind]=(o.rounds[kind]??0)+n;}
      return fired;
    }
    landRound(r){
      if(!o.inWin||!/^de_spans_/.test(r.by))return super.landRound(r);
      const w=this.world,own=Object.hasOwn(w,'coverAt'),orig=w.coverAt;let hit=false;w.coverAt=(...x)=>{hit=true;return orig.apply(w,x);};
      try{return super.landRound(r);}finally{if(own)w.coverAt=orig;else delete w.coverAt;if(hit)o.collisions++;}
    }
    woundPlayer(r){
      const before=this.player.health;const out=super.woundPlayer(r);
      if(o.inWin&&this.player.health<before){o.wounds++;o.woundList.push({by:r.by,weapon:r.weapon,kind:r.kind,dmg:round(before-this.player.health,1),at:round(this.clock-o.t0,1)});
        note(this.clock-o.t0,`PLAYER WOUND -${(before-this.player.health).toFixed(0)} by ${r.by} (${r.weapon}/${r.kind}) health ${this.player.health.toFixed(0)}`);}
      return out;
    }
  }
  const play=onStep=>{
    if(!snapDir)return route(seed,{support,Simulation:Probe,onStep});
    let raw=JSON.parse(readFileSync(join(snapDir,`snap-${seed}-${support?1:0}.json`),'utf8'));if(level){delete raw.resumeCheckpoint;raw=atLevel(raw,level);}   // (the save of the window has no use for the resume checkpoint: a death ends the run, nothing is restored)
    const sim=new Probe(1);sim.restoreSnapshot(raw);sim.drainEvents();let after=0;
    for(let i=0;i<20*600&&!o.death;i++){
      const controls=support&&(sim.active('cover_repair')||sim.active('cover_withdrawal'))?coverControls(sim):{};
      sim.tick(.05,controls);const events=sim.drainEvents();onStep({sim,controls,events,dt:.05});
      if(events.some(e=>e.type==='player-down')){o.death={at:round(sim.clock-o.t0,1),cause:events.find(e=>e.type==='player-down').cause,by:events.find(e=>e.type==='player-down').by};break;}
      if(sim.consumedEvent(BLAST)&&++after>40)break;
    }
    return {sim};
  };
  const result=play(step=>{
    const {sim,events}=step;
    if(audit){clip.observe(step);stack.observe(step);}
    if(!o.inWin&&sim.consumedEvent(ENTRY)&&!sim.consumedEvent(BLAST)){o.inWin=true;o.t0=sim.consumed[ENTRY];o.health0=sim.player.health;note(0,'ENTRY');}
    if(o.inWin&&sim.consumedEvent(BLAST)){o.inWin=false;o.t1=sim.consumed[BLAST];note(sim.clock-o.t0,'DEMOLITION');}
    if(!o.inWin)return;
    for(const e of events){
      if(e.type==='enemy-grenade'){o.grenadeThrown++;note(sim.clock-o.t0,`GRENADE thrown by ${e.by} at (${e.target.x.toFixed(0)},${e.target.z.toFixed(1)}) from (${e.origin.x.toFixed(0)},${e.origin.z.toFixed(1)})`);}
      if(e.type==='m01-blast'&&e.kind==='grenade'&&e.by){o.grenadeExploded++;note(sim.clock-o.t0,`GRENADE exploded (${e.by}) at (${e.point.x.toFixed(0)},${e.point.z.toFixed(1)})`);}
      if(e.type==='german-grenade-hit'){o.grenadePlayerWounds++;o.grenadePlayerDamage+=e.damage??0;note(sim.clock-o.t0,`GRENADE hit on the player -${(e.damage??0).toFixed(0)}`);}
      if(e.type==='deck-tactic'){if(e.kind==='pullback')o.pullBacks++;if(e.kind==='search')o.searches++;if(e.kind==='stage'){o.maxStage=Math.max(o.maxStage,e.line);}note(sim.clock-o.t0,`TACTIC ${e.kind} ${e.by} ${JSON.stringify(e.info??{})}`);}
    }
    o.ticks++;
    for(const e of events)if(e.type==='player-down'&&!o.death)o.death={at:round(sim.clock-o.t0,1),cause:e.cause,by:e.by};
    const p=sim.player,assault=spansOf(sim).filter(a=>isAssault(a)&&a.alive&&a.active&&!a.carriedBy);
    o.minHealth=Math.min(o.minHealth,p.health);
    // The Polish POSTS on the bridge (x > 0): the player, the section's pair, Bąk, and the rearguard that holds the deck (not the platoon that is still running west: it is a target, not a post).
    const poles=[p,...sim.allies.filter(a=>a.alive&&a.active&&!a.civilian&&!a.displayOnly&&a.x>0&&(a.group!=='grp_east_platoon'||(a.rear!==undefined&&a.rear.phase!=='released')))];
    if(assault.length){
      let dp=Infinity,dq=Infinity,north=false,south=false;
      for(const g of assault){
        dp=Math.min(dp,dist(g,p));for(const q of poles)dq=Math.min(dq,dist(g,q));
        if(['advance','cover','hold'].includes(g.deck.phase)){if(g.z<40)north=true;else south=true;}
      }
      o.toPlayer.push(dp);o.toPost.push(dq);o.sideTicks++;if(north&&south)o.bothSides++;
      for(const g of assault){o.assaultTicks++;if(g.suppressedUntil>sim.clock)o.assaultSuppTicks++;}
    }
    const polesOnDeck=sim.allies.filter(a=>a.alive&&a.active&&!a.civilian&&!a.displayOnly&&a.x>0&&(a.id==='staszek_pawlak'||a.id==='east_platoon_voice'||a.rear?.phase==='hold'));
    if(polesOnDeck.length){o.polesTicks++;if(polesOnDeck.some(a=>a.suppressedUntil>sim.clock))o.polesPinned++;}
  });
  const sim=result.sim;
  const durSec=(o.t1??sim.clock)-o.t0,pct=(xs,lim)=>xs.length?round(100*xs.filter(x=>x<lim).length/xs.length,1):null;
  const stat=xs=>({min:round(Math.min(...xs),1),median:round(median(xs),1),p10:round(quant(xs,.1),1),pctUnder300:pct(xs,300),pctUnder150:pct(xs,150),pctUnder100:pct(xs,100)});
  const assaultDead=spansOf(sim).filter(a=>isAssault(a)&&!a.alive).length;
  const wounded=spansOf(sim).filter(a=>isAssault(a)&&a.alive&&a.health<100).length;
  const row={key:`${seed}:${support?1:0}`,seed,support,window:{startReal:round(o.t0,2),endReal:round(o.t1,2),durSec:round(durSec,1),ticks:o.ticks},
    dist:{toPlayer:o.toPlayer.length?stat(o.toPlayer):{min:null,median:null},toPost:o.toPost.length?stat(o.toPost):{min:null,median:null}},
    casualties:{list:o.casualties,bySource:o.bySource,assaultDead,assaultWounded:wounded,assaultAliveAtEnd:6-assaultDead,deadTotalAtEnd:spansOf(sim).filter(a=>!a.alive).length},
    polish:{section:{shots:o.shots.section,hits:o.hits.section},rearguard:{shots:o.shots.rearguard,hits:o.hits.rearguard},player:{shots:o.shots.player,hits:o.hits.player},kowalBursts:o.kowalBursts},
    pressure:{assaultSuppressedPct:o.assaultTicks?round(100*o.assaultSuppTicks/o.assaultTicks,1):null,polesPinnedPct:o.polesTicks?round(100*o.polesPinned/o.polesTicks,1):null},
    germanFire:{rounds:Object.values(o.rounds).reduce((a,b)=>a+b,0),byKind:o.rounds,collisions:o.collisions,wounds:o.wounds,woundList:o.woundList,minHealth:round(o.minHealth,1),healthAtEntry:round(o.health0,1),healthEnd:round(sim.player.health,1)},
    grenades:{thrown:o.grenadeThrown,exploded:o.grenadeExploded,playerWounds:o.grenadePlayerWounds,playerDamage:round(o.grenadePlayerDamage,1)},
    lines:{bothSidesPct:o.sideTicks?round(100*o.bothSides/o.sideTicks,1):null},
    tactics:{maxStage:o.maxStage,pullBacks:o.pullBacks,searches:o.searches},
    death:o.death??null,snapshot:Boolean(snapDir),
    integrity:{complete:sim.mission.complete,checkpoints:sim.checkpointsReached.length,survivors:sim.flags['m01.east_platoon_survivors'],
      objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,x])=>[id.replace('obj_m01_',''),x.state])),entryAt:round(o.t0,2),demolitionAt:round(o.t1,2),routeRealSec:round(sim.clock,1),
      clipping:clip?clip.events.length:null,stackedPairs:stack?stack.summary().pairs:null}};
  return {row,timeline:o.timeline};
}
const done=new Set();
if(jsonl&&existsSync(jsonl))for(const line of readFileSync(jsonl,'utf8').split('\n')){if(!line.trim())continue;try{const r=JSON.parse(line);if(r.label===label)done.add(r.key);}catch{/* a torn last line */}}
for(const r of routes){
  if(done.has(r.key)){console.error(`skip ${r.key} (done)`);continue;}
  const {row,timeline}=measure(r),out={...row,label};
  const line=JSON.stringify(out);console.log(line);if(jsonl)appendFileSync(jsonl,line+'\n');
  if(timelineFile){mkdirSync(dirname(resolve(timelineFile)),{recursive:true});appendFileSync(timelineFile,`# ${label} ${r.key}\n${timeline.join('\n')}\n`);}
}
