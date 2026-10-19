// M01 integration golden AMENDMENTS 06 (P2 pacing), 07 (combat AI slice 1), 08 (combat slice 2), 09 (navigator queue), 10 (reactive dialogue) and 11 (rearguard + director review) of the combined tree. Not invoked by npm test.
//
// Same method as amendment 05 (tools/verification/m01-npc-navigation-golden-audit.mjs), with the two checks of the reverted branch tools that only an integration can make:
// each branch (claude/busy-ritchie-3fkvk2-pacing, -combat) wrote its own golden against f6913a0 and the Captain reverted it (5316718, a580b09) so the golden is moved once, here,
// on the integration tree, against the EXACT predecessor commit of the merge:
//   06  predecessor 66e47b2 (phys + npc + skin + anim + audio; its simulation is the one the NPC navigation golden, amendment 05, pins), named delta `pacing`;
//   07  predecessor = the amendment 06 commit (its simulation is the one the pacing golden pins), named delta `combat-ai`.
// The previous golden is KEPT byte for byte where it is and pinned by sha256; the new golden is a new fixture. Proof, per golden route (the two routes of the T47 golden):
//   0. PILOT. The predecessor's simulation, extracted from git with its own data, driven by the live test pilot (tests/helpers/m01-route.js), reproduces the previous golden.
//   1. LOCKSTEP. The predecessor runs on the SAME controls as the live simulation; every tick the two gameplay frames are compared. The first difference must be a path of the
//      named delta (CFG.deltaFields, measured and then pinned, never a catch-all) and until then the two are byte identical.
//   2. WHAT FOLLOWS is timing, never the plot: each side then runs on its own route; the 12 objective states, the four checkpoints in order, the consumed event ids, the plot
//      flags (m01.suggested_cover excluded: a rotating cover hint, one per salvo), the survivors and the final battle clock 07:05:00 must be identical. Every event with a
//      battle-clock trigger fires at a battle clock >= its historical time (non-gated: within one tick, 0.05 s x 30), outside the 06:45-07:05 jump.
//   3. NAVIGATION GUARD (amendment 05 kept): on the live route no clipping event and no men standing inside each other; same on seeds 3 and 7 with and without support.
//   4. RECORD: first difference, ticks, real seconds to 06:00 and to the end, the real-clock and battle-clock shift of every consumed event, German rounds per real minute (enemyFire.nextId).
// Deterministic JSON (no clocks, no paths). x86_64 only (D11/D30).
//   node tools/verification/m01-integration-golden-audit.mjs --amendment 06|07|08|09|10|11 [--write]
// Amendment 09 (`identical`) moves the source lock and nothing else: the navigator queue (one route() per tick, reused work buffers, a warmed solid list) changes the bytes of the simulation
// and of the navigator but not one byte of what a tick computes on the golden routes. Its lockstep must therefore find NO difference in any tick of either route (a first difference is a failure
// there, as its absence is a failure for the others), the digests of the live simulation must equal the previous golden's, and the new golden is the old one with the new source lock.
// Amendment 10 (`noBehaviourDifference`) is the dialogue: the lines the director says, the callouts and the guide change what is SAID (the queue, the subtitle, the consumed tokens, the
// director's record timers.barks, the guide's cadence and two HUD messages that became voices) and nothing that HAPPENS. Its lockstep proves that: with exactly those paths stripped from both
// frames the two simulations must be byte identical on every tick of both routes, and the first difference itself must be one of those dialogue paths (measured: tick 355, the
// scripted line 067 now said on evt_m01_planes_heard, so dialogueConsumed and the queue differ before the director's new record timers.barks).
// Without --write nothing is written: the regenerated account and golden must equal the committed files byte for byte. When a later amendment has moved the simulation, an
// amendment is history: CFG.after names the commit whose simulation its golden pins, and the check runs that tree's simulation and pilot instead of the working tree's.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,symlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {M01Simulation as WorkingTree,seconds,clockText} from '../../src/game/m01-simulation.js';
import {route as workingPilot} from '../../tests/helpers/m01-route.js';
import {firstDifference} from '../../tests/helpers/m01-determinism.js';
import {GameplayDigest,gameplayFrame} from '../../tests/helpers/m01-animation-contract.js';
import {clippingAudit,stackingAudit} from '../../tests/helpers/m01-clipping.js';

const ROOT=resolve(import.meta.dirname,'../..');
const write=process.argv.includes('--write');
const amendmentArg=(()=>{const i=process.argv.indexOf('--amendment');return i<0?null:process.argv[i+1];})();
assert.equal(process.arch,'x64','exact gameplay golden regeneration requires x86 (same rule as D30)');
const AMENDMENTS={
  '06':{task:'M01-P2-PACING-V1',delta:'pacing',predecessor:'66e47b239a9e0bc586375481fb1a554e46b845e2',
    // History since amendment 07: the pacing golden pins the simulation of 5d99df8 (the amendment 06 commit; its merge 74da28f has the same simulation).
    after:'5d99df87875b4e8712c6378fbd4d0b19b3395aa7',
    previousGolden:'tests/fixtures/m01-npc-navigation-gameplay-baseline.json',golden:'tests/fixtures/m01-pacing-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/pacing-p2-2026-10-18',
    generationStage:'P2 pacing on the integration tree (phys + npc + skin + anim + audio): seg_hold 05:34-05:59 at 24x while the player holds the deck after the raid, objective marker and status, continuity cues gated to their objective and >= 20 real s apart; golden amendment 06',
    // Measured on both golden routes (first lockstep difference, tick 355, 04:33:10): the objective panel shows the pacing interlude after obj_m01_deliver_message
    // ("Mensagem entregue. Fique com o posto - avioes a norte") where the predecessor showed "Mantenha contacto com a seccao". Only the HUD text and status lines.
    deltaFields:/^\$\.state\.mission\.(text|status)$/},
  '07':{task:'M01-COMBAT-AI-V1',delta:'combat-ai',predecessor:'5d99df87875b4e8712c6378fbd4d0b19b3395aa7',
    // History since amendment 08: the combat AI golden pins the simulation of 5d13d32 (the amendment 07 commit; 9cd2aca, the predecessor of 08, has the same gameplay inputs).
    after:'5d13d32d91bfa1434a18c5aba3d5ab268d69bc6b',
    previousGolden:'tests/fixtures/m01-pacing-gameplay-baseline.json',golden:'tests/fixtures/m01-combat-ai-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/combat-ai-2026-10-18',
    generationStage:'Combat AI slice 1 on the pacing integration tree: per-actor actor.ai streams, rifle peeks, MG34 burst groups, line-of-sight and threat targets, suppression breaking peeks, Kowal 2-5 round bursts; golden amendment 07',
    // Measured on both golden routes: the first lockstep difference is the new saved record actor.ai (tick 1, Kowal = actors.3, missing in the predecessor). With it stripped from
    // both frames (stateOnly), the first BEHAVIOUR difference is Kowal's first rkm burst at tick 5129 (256.45 s): shot 0.25 -> 0.44 s (a 4-round burst instead of the fixed 3).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai$/,
    stateOnly:frame=>{for(const k of ['state','checkpoint'])for(const x of frame[k]?.actors??[])delete x.ai;return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.(shot|cooldown|firedAt|rounds)$/,behaviourActors:/^(szymon_kowal|de_east_\d+)$/},
  '08':{task:'M01-COMBAT-DECK-ASSAULT-V1',delta:'deck-assault',predecessor:'9cd2aca86c377e74ff6cc4f9444431a2ff1aa7ec',
    // History since amendment 09: the deck assault golden pins the simulation of c7c82ee (the slice-2 branch head after its review fixes: the amendment 08 regenerated at 204a5a8), not the working tree's.
    after:'c7c82ee6a2c44318b06bd674dbe94dc1ff43aa1d',
    previousGolden:'tests/fixtures/m01-combat-ai-gameplay-baseline.json',golden:'tests/fixtures/m01-deck-assault-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/deck-assault-2026-10-18',
    // The deck assault lives in its own module too; it is hashed for this amendment only (06 and 07 keep their input lists byte for byte).
    extraInputs:['src/game/m01-deck-assault.js'],
    generationStage:'Combat slice 2, the deck assault on the combat AI integration tree: at 06:05 the ten Germans of grp_de_spans enter the road deck, four post on span 08 and six bound by cover to mid-deck (x 458-578, never west of x 450) with the slice-1 AI and real rounds, fall back east of x 945 on losses, suppression, the end of their hold or 165 s; the east demolition waits for the deck to clear; enemy_down_by_player; a 120-round ammo box of the section at the deck post; review fixes (MG34 near miss pins the sappers 5 s, searching fire where the player was last seen leaves as player rounds, dead men on the collapsed spans fall with them, an absolute bound on the deck hold); golden amendment 08',
    // Measured on both golden routes: the first lockstep difference is the new key `who` of a sighting (actor.ai.seen.who, the review fix that sends searching fire on the player's
    // last-seen spot as player rounds), first written by the rail-gate MG when it sees the player after train 963. With it stripped from both frames (stateOnly), the first
    // BEHAVIOUR difference is recorded below (behaviourFields / behaviourActors are measured, then pinned).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen\.who$/,
    stateOnly:frame=>{for(const k of ['state','checkpoint'])for(const x of frame[k]?.actors??[])if(x.ai?.seen)delete x.ai.seen.who;return frame;},
    // Measured: route 19390901 (control), tick 5331 (04:46:31): sapper pawel_krawiec suppressedUntil +1.5 s (an MG34 near miss pins the working sappers 5 s, was 3.5 s);
    // route 7 support, tick 5195 (04:45:30): the new event enemy_down_by_player where the predecessor emitted only player-shot (the pilot kills the gate MG gunner).
    behaviourFields:/^\$\.((state|checkpoint)\.actors\.\d+\.suppressedUntil|events\.\d+\.type)$/,behaviourActors:/^(pawel_krawiec|sapper_\d)$/},
  '09':{task:'M01-NAV-QUEUE-V1',delta:'nav-queue',predecessor:'c7c82ee6a2c44318b06bd674dbe94dc1ff43aa1d',
    // History since amendment 10: the nav-queue golden pins the simulation of 167dccc (the navigator branch with its amendment 09 remade), not the working tree's.
    after:'167dccc9194b6062947d02e0a0cc30176cc57461',identical:true,
    previousGolden:'tests/fixtures/m01-deck-assault-gameplay-baseline.json',golden:'tests/fixtures/m01-nav-queue-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/nav-queue-2026-10-19',
    extraInputs:['src/game/m01-deck-assault.js'],
    generationStage:'NPC navigator work on the deck assault integration tree: at most one route() per tick, taken in roster order (the others keep the straight walk of that tick and ask again), work buffers reused between plans, the solid list built at construction and after a load, the neighbour queries of a walking man on reused storage; golden amendment 09 moves the source lock only'},
  '10':{task:'M01-DIALOGUE-V1',delta:'dialogue',predecessor:'167dccc9194b6062947d02e0a0cc30176cc57461',
    // History since amendment 11: the dialogue golden pins the simulation of c1a3ecf (the dialogue merged on the navigator-queue tree), not the working tree's.
    after:'c1a3ecf304f1e8a30283d251d2ff8ec174e0ba93',noBehaviourDifference:true,
    previousGolden:'tests/fixtures/m01-nav-queue-gameplay-baseline.json',golden:'tests/fixtures/m01-dialogue-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/dialogue-2026-10-19',
    // The director lives in its own module too; it is hashed for this amendment only.
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js'],
    generationStage:'Reactive dialogue on the navigator-queue integration tree: the 55 reviewed lines (dlg_m01_100-154, 114/115 unwired) and the guide variants 015a-d as data (a bark rule per line), a deterministic director (src/game/m01-barks.js) with cooldowns on the real clock, repeats, variant rotation and substitution against the callouts, a priority queue with a two-voice limit and a rolling 60 s budget in line(), the six canonical lines nothing said (030 035 036 042 047 067) wired, the cover rotation and the guide spoken instead of messaged; state in timers.barks; golden amendment 10',
    // Measured (dry run of the strip, predecessor 167dccc against the working tree, 23839 ticks of the control route): the first lockstep difference is the dialogue itself at tick 355 (04:33:10,
    // evt_m01_planes_heard): the orphan line 067 is now said there, so dialogueConsumed[12] and the queue differ, and timers.barks is new. The behaviour does not move at all: with the dialogue
    // state stripped from both frames (stateOnly) the two simulations are byte identical on every tick of both routes.
    deltaFields:/^\$\.(state|checkpoint)\.(dialogueConsumed|dialogueQueue|subtitle|timers\.(barks|guide|guideDist))(\.|$)/,
    stripped:['dialogueConsumed','dialogueQueue','subtitle','timers.barks','timers.guide','timers.guideDist','events: message «Zieliński chama-o da trincheira…»','events: message «Zieliński: …mude de cobertura»'],
    stateOnly:frame=>{
      const strip=s=>{if(!s)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete s[k];for(const k of ['barks','guide','guideDist'])delete s.timers?.[k];strip(s.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>!(e.type==='message'&&/^(Zieliński chama-o da trincheira|Zieliński: .*mude de cobertura)/.test(e.message)));
      return frame;}},
  '11':{task:'M01-REARGUARD-V1',delta:'rearguard',predecessor:'c1a3ecf304f1e8a30283d251d2ff8ec174e0ba93',after:null,
    previousGolden:'tests/fixtures/m01-dialogue-gameplay-baseline.json',golden:'tests/fixtures/m01-rearguard-gameplay-baseline.json',
    evidence:'docs/verification/m01-runtime/rearguard-2026-10-19',
    extraInputs:['src/game/m01-deck-assault.js','src/game/m01-barks.js','src/game/m01-rearguard.js'],
    generationStage:'Combat slice 2b on the reactive-dialogue integration tree: while the east demolition gate holds the clock at 06:09:30 for the deck, the Polish rearguard (pl_east_0..2, never victims of the 20 s rule) kneels at x 165-175 (z 38.7) and fires real kb wz.29 rounds (own stream, damage and the suppression rule of the player\'s rifle, a line-of-fire rule) at the deck assault, then resumes the withdrawal; plus the bark director review fixes (B1 the peek lines read the AI\'s own sight, ai.seen of riflemen too; N1 reactive lines counted when shown; N3 030 to Kowal with a fired condition); golden amendment 11',
    // Measured on both golden routes (tick 5163, 04:45:16): the first lockstep difference is B1's new sighting of a gate rifleman (de_east_2's ai.seen, null in the predecessor:
    // only the MG34 wrote it). With the new state stripped from both frames (stateOnly: the dialogue state, every ai.seen, the rearguard's rear/ai/firedAt), the first BEHAVIOUR
    // difference is the rearguard: pl_east_0 turns from the platoon file towards his post on the tick the gate holds the clock (06:09:30; control tick 13266, support tick 12730).
    deltaFields:/^\$\.(state|checkpoint)\.actors\.\d+\.ai\.seen$/,
    stateOnly:frame=>{
      const strip=st=>{if(!st)return;for(const k of ['dialogueConsumed','dialogueQueue','subtitle'])delete st[k];delete st.timers?.barks;
        for(const a of st.actors??[]){if(a.ai)delete a.ai.seen;if(/^pl_east_[0-2]$/.test(a.id)){delete a.rear;delete a.ai;delete a.firedAt;}}strip(st.resumeCheckpoint);};
      strip(frame.state);strip(frame.checkpoint);
      frame.events=frame.events.filter(e=>e.type!=='message'||!/^Zieliński: .*mude de cobertura/.test(e.message));
      return frame;},
    behaviourFields:/^\$\.(state|checkpoint)\.actors\.\d+\.x$/,behaviourActors:/^pl_east_[0-2]$/}};
const CFG=AMENDMENTS[amendmentArg];if(!CFG)throw new Error(`--amendment ${amendmentArg}: 06, 07, 08, 09, 10 or 11`);
assert.ok(CFG.predecessor,'the predecessor commit is pinned');assert.ok(CFG.identical||CFG.deltaFields,'the named delta paths are pinned (measure them first)');
const KEY=`amendment-${amendmentArg}`,ACCOUNT_FILE=`GOLDEN_AMENDMENT_${amendmentArg}.json`;
const out=join(ROOT,CFG.evidence),ACCOUNT=join(out,ACCOUNT_FILE),GOLDEN=join(ROOT,CFG.golden);
const sha=v=>createHash('sha256').update(typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v)).digest('hex');
const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{maxBuffer:1<<29});
const INPUTS=['src/game/m01-simulation.js','src/game/m01-pacing.js','missions/m01-tczew/mission.json','missions/m01-tczew/map-layout.json','src/game/m01-animation-presentation.js',
  'src/game/m01-aim.js','src/game/m01-fire.js','src/game/m01-display-fire.js','src/game/m01-yard-life.js','src/world/spatial.js','src/world/tczew-world.js',
  'src/world/m01-navigation.js','src/world/m01-nav-layout.js','tests/helpers/m01-route.js'];

function extract(commit){
  const dir=mkdtempSync(join(tmpdir(),`m01-${amendmentArg}-${commit.slice(0,7)}-`));
  const data=git('ls-tree','-r','--name-only',commit,'assets','research').toString().split('\n').filter(p=>p.endsWith('.json'));
  execFileSync('tar',['-x','-C',dir],{input:git('archive','--format=tar',commit,'src','missions','tests/helpers',...data)});symlinkSync(join(ROOT,'node_modules'),join(dir,'node_modules'));
  return dir;
}
const previousText=readFileSync(join(ROOT,CFG.previousGolden)),previous=JSON.parse(previousText);
const tree=extract(CFG.predecessor),predecessorSource=readFileSync(join(tree,'src/game/m01-simulation.js'));
assert.equal(sha(predecessorSource),previous.sourceSha256,'the predecessor simulation is exactly the source the previous golden pins (source lock chain)');
const {M01Simulation:Before}=await import(pathToFileURL(join(tree,'src/game/m01-simulation.js')));
let Live=WorkingTree,route=workingPilot,liveRoot=ROOT;
if(CFG.after){liveRoot=extract(CFG.after);Live=(await import(pathToFileURL(join(liveRoot,'src/game/m01-simulation.js')))).M01Simulation;
  route=(await import(pathToFileURL(join(liveRoot,'tests/helpers/m01-route.js')))).route;}
const liveSource=readFileSync(join(liveRoot,'src/game/m01-simulation.js'));
const definition=JSON.parse(readFileSync(join(liveRoot,'missions/m01-tczew/mission.json'),'utf8'));
const blob=(commit,f)=>{try{return sha(execFileSync('git',['-C',ROOT,'show',`${commit}:${f}`],{maxBuffer:1<<26,stdio:['ignore','pipe','ignore']}));}catch{return null;}};
const changedInputs=[...INPUTS,...(CFG.extraInputs??[])].filter(f=>{let now=null;try{now=sha(readFileSync(join(liveRoot,f)));}catch{}return blob(CFG.predecessor,f)!==now;});
assert.ok(changedInputs.length>0,'the live gameplay inputs moved');

const NOT_PLOT=new Set(['m01.suggested_cover']);
const plot=f=>Object.fromEntries(Object.entries(f).filter(([k])=>!NOT_PLOT.has(k)).sort());
function observer({audit=true}={}){
  const fired={},o={fired,at0600:null,clip:audit?clippingAudit():null,stack:audit?stackingAudit():null};
  o.step=step=>{const {sim,events}=step;
    for(const id of Object.keys(sim.consumed))fired[id]??={battle:sim.battleClock,real:+sim.clock.toFixed(2)};
    if(o.at0600===null&&sim.battleClock>=seconds('06:00:00'))o.at0600=+sim.clock.toFixed(2);
    if(audit){o.clip.observe(step);o.stack.observe(step);}};
  return o;
}
const endState=(sim,o)=>({ticks:Math.round(sim.clock/.05),real:+sim.clock.toFixed(2),battleClock:sim.battleClock,complete:sim.mission.complete,
  survivors:sim.flags['m01.east_platoon_survivors'],playerHealth:sim.player.health,checkpoints:[...sim.checkpointsReached],
  objectives:Object.fromEntries(Object.entries(sim.objectives).map(([id,x])=>[id.replace('obj_m01_',''),x.state])),consumedEventIds:Object.keys(sim.consumed).sort(),
  flags:plot(sim.flags),at0600:o.at0600});
function clockEvents(now,old){
  const rows=[];
  for(const e of definition.events){
    const t=[e.trigger,...(e.trigger.of??[])].find(t=>t.type==='battleClock');if(!t)continue;
    const at=seconds(t.at),seg=definition.clock.segments.find(s=>at>=seconds(s.from)&&at<seconds(s.to)),n=now[e.id],o=old[e.id];
    assert.ok(n&&o,`${e.id} fired on both sides`);
    const fixed=e.trigger.type==='battleClock'&&!e.trigger.gate;
    if(!seg?.jump){assert.ok(n.battle>=at-1e-6,`${e.id} never before ${t.at}`);if(fixed)assert.ok(n.battle-at<=1.5+1e-6,`${e.id} at ${t.at} (fired ${clockText(n.battle)})`);}
    rows.push({id:e.id,at:t.at,fixed,jump:Boolean(seg?.jump),battle:{predecessor:+o.battle.toFixed(2),live:+n.battle.toFixed(2)},real:{predecessor:o.real,live:n.real}});
  }
  return rows;
}

const report={task:CFG.task,amendment:KEY,delta:CFG.delta,predecessor:CFG.predecessor,predecessorSourceSha256:previous.sourceSha256,sourceSha256:sha(liveSource),
  previousGolden:{task:previous.task,file:CFG.previousGolden,sha256:sha(previousText),sourceSha256:previous.sourceSha256},...(CFG.identical?{identical:true}:{deltaFields:CFG.deltaFields.source}),
  ...(CFG.stateOnly?(CFG.noBehaviourDifference?{noBehaviourDifference:true,stripped:CFG.stripped}:{behaviourFields:CFG.behaviourFields.source,behaviourActors:CFG.behaviourActors.source}):{}),
  authority:`Written only by tools/verification/m01-integration-golden-audit.mjs --amendment ${amendmentArg} --write (x86); never edited by hand.`,
  changedGameplayInputsSincePredecessor:changedInputs,routes:[]};
const golden={task:CFG.task,generationStage:CFG.generationStage,amendment:KEY,delta:CFG.delta,predecessor:CFG.predecessor,predecessorSourceSha256:previous.sourceSha256,
  previousGolden:{task:previous.task,file:CFG.previousGolden,sha256:sha(previousText)},historicalGoldenSha256:previous.historicalGoldenSha256,sourceSha256:sha(liveSource),
  inputsSha256:Object.fromEntries([...INPUTS,...(CFG.extraInputs??[])].map(f=>{try{return [f,sha(readFileSync(join(liveRoot,f)))];}catch{return [f,null];}})),routes:[]};

for(const {seed,support,ticks,blocks} of previous.routes){
  // 0. The predecessor on the live pilot reproduces the previous golden.
  const pd=new GameplayDigest(),po=observer({audit:false});
  const own=route(seed,{support,Simulation:Before,onStep:step=>{pd.add(gameplayFrame(step.sim,step.events));po.step(step);}}).sim;
  assert.deepEqual(pd.finish(),{ticks,blocks},'0. the predecessor reproduces the previous golden on the live pilot (the pilot did not move)');
  // 1. Lockstep on the live controls.
  const a=new Before(seed);a.drainEvents();
  const digest=new GameplayDigest(),lo=observer(),row={seed,support,oldTicks:ticks,newTicks:0,firstDifference:null,identicalTicksBeforeIt:null,identicalBlocks:0,
    ...(CFG.stateOnly?{firstBehaviourDifference:null}:{})};   // only amendments with a new saved record carry it (06's account stays byte for byte)
  const result=route(seed,{support,Simulation:Live,onStep:step=>{
    const {sim,controls,dt,events}=step;row.newTicks++;
    a.tick(dt,structuredClone(controls));const ea=a.drainEvents();const live=gameplayFrame(sim,events);
    if(!row.firstDifference){const d=firstDifference(gameplayFrame(a,ea),live);
      if(d){const m=/^\$\.(?:state|checkpoint)\.actors\.(\d+)\./.exec(d.path);
        row.firstDifference={tick:row.newTicks,clock:+sim.clock.toFixed(2),battleClock:clockText(sim.battleClock),path:d.path,actor:m?sim.actors[Number(m[1])].id:null,
          predecessor:d.a??null,live:d.b??null,missing:d.missing??false};
        row.identicalTicksBeforeIt=row.newTicks-1;console.log(JSON.stringify({seed,support,firstDifference:row.firstDifference}));}}
    // The first difference that is not the new saved state alone (copies of both frames, with CFG.stateOnly stripped).
    if(CFG.stateOnly&&row.firstDifference&&!row.firstBehaviourDifference){const sa=CFG.stateOnly(structuredClone(gameplayFrame(a,ea))),sb=CFG.stateOnly(structuredClone(live));const d=JSON.stringify(sa)===JSON.stringify(sb)?null:firstDifference(sa,sb);   // (equal text first: the common case, cheap)
      if(d){const m=/^\$\.(?:state|checkpoint)\.actors\.(\d+)\./.exec(d.path);
        row.firstBehaviourDifference={tick:row.newTicks,clock:+sim.clock.toFixed(2),battleClock:clockText(sim.battleClock),path:d.path,actor:m?sim.actors[Number(m[1])].id:null,predecessor:d.a??null,live:d.b??null};
        console.log(JSON.stringify({seed,support,firstBehaviourDifference:row.firstBehaviourDifference}));}}
    digest.add(live);lo.step(step);
  }});
  const sim=result.sim,fin=digest.finish();
  if(CFG.identical){
    assert.equal(row.firstDifference,null,`1. ${CFG.delta}: not one tick of this route differs from the predecessor (a first difference is a failure of an identical amendment)`);
    assert.deepEqual(fin,{ticks,blocks},'1. the digests of the live simulation are the previous golden\'s, every block');
    row.identicalTicksBeforeIt=row.newTicks;
  }else{
  assert.ok(row.firstDifference,'the live simulation differs from the predecessor on this route');
  assert.match(row.firstDifference.path,CFG.deltaFields,`1. the first difference is a path of the named delta \`${CFG.delta}\``);
  if(CFG.noBehaviourDifference)assert.equal(row.firstBehaviourDifference,null,'1b. with the dialogue state stripped the two simulations are identical on every tick of the route: the dialogue is presentation only');
  else if(CFG.stateOnly){assert.ok(row.firstBehaviourDifference,'the behaviour moved too');assert.match(row.firstBehaviourDifference.path,CFG.behaviourFields,'1b. the first behaviour difference is a combat field');
    // An event path has no actor (amendment 08: the new enemy_down_by_player event); an actor path must be a man of the named delta.
    if(row.firstBehaviourDifference.actor!==null||!/\.events\./.test(row.firstBehaviourDifference.path))assert.match(row.firstBehaviourDifference.actor,CFG.behaviourActors,'1b. of a man the combat AI drives');}
  }
  for(let i=0;i<Math.min(fin.blocks.length,blocks.length)&&JSON.stringify(fin.blocks[i])===JSON.stringify(blocks[i]);i++)row.identicalBlocks++;
  // 2. Invariants against the predecessor on its own route.
  const endOld=endState(own,po),endNew=endState(sim,lo);
  assert.equal(endNew.complete,true);assert.equal(endNew.battleClock,seconds('07:05:00'));assert.equal(endNew.battleClock,endOld.battleClock);
  assert.equal(Object.keys(endNew.objectives).length,12);assert.deepEqual(endNew.objectives,endOld.objectives,'2. the same 12 objective end states');
  assert.deepEqual(endNew.checkpoints,endOld.checkpoints,'CP-A..D in order');assert.equal(endNew.checkpoints.length,4);
  assert.deepEqual(endNew.consumedEventIds,endOld.consumedEventIds,'the same consumed events');
  assert.equal(endNew.survivors,endOld.survivors,'the same survivors');
  assert.deepEqual(endNew.flags,endOld.flags,'the same plot flags');
  row.battleClockEvents=clockEvents(lo.fired,po.fired);
  row.movedEvents=endNew.consumedEventIds.filter(id=>po.fired[id].real!==lo.fired[id].real).map(id=>({event:id,real:{predecessor:po.fired[id].real,live:lo.fired[id].real},
    battle:{predecessor:+po.fired[id].battle.toFixed(2),live:+lo.fired[id].battle.toFixed(2)}}));
  // 3. Navigation guard.
  assert.equal(lo.clip.events.length,0,'3. no clipping event on the live route');assert.equal(lo.stack.summary().pairs,0,'3. nobody inside another man on the live route');
  row.endState={predecessorOwnRoute:{ticks:endOld.ticks,real:endOld.real,to0600:endOld.at0600,survivors:endOld.survivors,playerHealth:endOld.playerHealth},
    live:{ticks:endNew.ticks,real:endNew.real,to0600:endNew.at0600,survivors:endNew.survivors,playerHealth:endNew.playerHealth},
    objectives:endNew.objectives,checkpoints:endNew.checkpoints,finalBattleClock:clockText(endNew.battleClock),consumedEvents:endNew.consumedEventIds.length,
    suggestedCover:{predecessor:own.flags['m01.suggested_cover']??null,live:sim.flags['m01.suggested_cover']??null}};
  row.measured={clipping:lo.clip.events.length,stacked:lo.stack.summary().pairs,germanRoundsPerRealMin:{predecessor:+(own.enemyFire.nextId/(own.clock/60)).toFixed(2),live:+(sim.enemyFire.nextId/(sim.clock/60)).toFixed(2)}};
  report.routes.push(row);golden.routes.push({seed,support,...fin});
  console.log(JSON.stringify({seed,support,ticks:[ticks,row.newTicks],to0600:[endOld.at0600,endNew.at0600],end:[endOld.real,endNew.real],identicalBlocks:row.identicalBlocks}));
}
// 3 (cont.). The navigation guard and the plot on the other audited seeds, each side on its own route. Not part of the golden.
report.otherRoutes=[];
for(const seed of [3,7])for(const support of [false,true]){
  const lo=observer(),po=observer({audit:false});
  const live=route(seed,{support,Simulation:Live,onStep:lo.step}).sim,own=route(seed,{support,Simulation:Before,onStep:po.step}).sim;
  const endOld=endState(own,po),endNew=endState(live,lo);
  const r={seed,support,clipping:lo.clip.events.length,stacked:lo.stack.summary().pairs,
    same:{objectives:JSON.stringify(endOld.objectives)===JSON.stringify(endNew.objectives),checkpoints:JSON.stringify(endOld.checkpoints)===JSON.stringify(endNew.checkpoints),
      consumedEventIds:JSON.stringify(endOld.consumedEventIds)===JSON.stringify(endNew.consumedEventIds),finalBattleClock:endOld.battleClock===endNew.battleClock},
    survivors:{predecessor:endOld.survivors,live:endNew.survivors},real:{predecessor:endOld.real,live:endNew.real},
    repairComplete:{predecessor:po.fired.evt_m01_repair_complete?.real??null,live:lo.fired.evt_m01_repair_complete?.real??null}};
  report.otherRoutes.push(r);
  assert.equal(r.clipping,0,`seed ${seed} support ${support}: no clipping`);assert.equal(r.stacked,0,`seed ${seed} support ${support}: nobody inside another man`);
  assert.equal(endNew.complete,true);assert.equal(endNew.checkpoints.length,4);
  console.log(JSON.stringify(r));
}
const accountText=JSON.stringify(report,null,2)+'\n';
golden.audit=`${CFG.evidence}/${ACCOUNT_FILE}`;golden.auditSha256=sha(accountText);
const goldenText=JSON.stringify(golden,null,2)+'\n';
if(write){mkdirSync(out,{recursive:true});writeFileSync(ACCOUNT,accountText);writeFileSync(GOLDEN,goldenText);console.log('written');}
else{assert.equal(readFileSync(ACCOUNT,'utf8'),accountText,`${ACCOUNT_FILE} equals the regenerated account`);assert.equal(readFileSync(GOLDEN,'utf8'),goldenText,'the golden equals the regenerated one');console.log('check: identical');}
