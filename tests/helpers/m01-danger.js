// H9 D4 danger scenarios (docs/direction/H9_DIFICULDADE.md section 6): how long a player who STANDS in the open, or CROUCHES in cover, in sight of the German MG34s lives at each
// difficulty level, and the proof that every lethal wound was telegraphed (rule F1). Built on the real test pilot (m01-route.js): the phase is reached on recruta (the level of the
// golden routes, where the pilot always arrives alive), the state is saved flat at the start of the phase and RE-LEVELLED to the level under test, so for one seed every level starts from
// the identical state and only the level's rules differ (a paired comparison). Nothing here changes a simulation: the instrumented subclass only reads and calls `super`.
//
//   exposed/repair  during obj_m01_cover_repair, standing at (-120, 16.5) (the support pilot's post, 7.5 m from the sappers, in sight of both gate MG34s and the twelve gate riflemen)
//   covered/repair  during obj_m01_cover_repair, crouched in cv_sandbag_mid_2 at (-26.5, 28), 1.5 m behind the node (world.coverAt: within 3.5 m of it and west of it: the sim's own test of cover;
//                   the control pilot's post (-28, 28) is walked to within 1.2 m and ends at about x -29, 4 m from the node, which is NOT cover for the wound roll)
//   exposed/hold    from CP-C (05:34) on, during obj_m01_hold_access, standing at (-10, 22) on the open bank (sight of both MG34s and the gate riflemen, no cover node within 3.5 m)
//   covered/hold    from CP-C (05:34) on, crouched in cv_sandbag_mid_2: the cover-adjust salvo (30 s soldado, 20 s veterano) and the usual fire
// Time to death (TTD) counts from the later of the tick the player is at his post and the arrival of train 963 (04:45, evt_m01_train963_arrives: the gate MG34s and riflemen are active
// from then; before it the repair phase is quiet), so it is the time spent in sight of the ACTIVE guns. A death during the walk to the post is reported as such (it counts from the start).
import {M01Simulation,clockText} from '../../src/game/m01-simulation.js';
import {M01_DIFFICULTY,M01_AIMED_AT_PLAYER_KINDS,F1_TELEGRAPH_GAP_SEC} from '../../src/game/m01-difficulty.js';
import {driver,toRepair} from './m01-route.js';

export const DANGER_SEEDS=Object.freeze([19390901,1,2,3,4,5,6,7,8,9,10,11]);
export const DANGER_SCENARIOS=Object.freeze({
  'exposed/repair':{phase:'repair',post:{x:-120,z:16.5},crouch:false,covered:false,limitSec:240},
  'covered/repair':{phase:'repair',post:{x:-26.5,z:28},crouch:true,covered:true,limitSec:240},
  'exposed/hold':{phase:'hold',post:{x:-10,z:22},crouch:false,covered:false,limitSec:180},
  'covered/hold':{phase:'hold',post:{x:-26.5,z:28},crouch:true,covered:true,limitSec:180}
});
// The pass bars of section 6: exposed = median time to death (a run that survives the limit counts as infinite); covered = no run dies sooner than the bar.
export const DANGER_BANDS=Object.freeze({
  recruta:{deaths:0},
  soldado:{exposed:[15,25],covered:120},
  veterano:{exposed:[8,12],covered:60}
});
/** How many draws of the main stream (a 32-bit LCG, src/core/random.js) took it from state `a` to state `b`; -1 when more than 8. */
const draws=(a,b)=>{let s=a;for(let n=0;n<=8;n++,s=(Math.imul(1664525,s)+1013904223)>>>0)if(s===b)return n;return -1;};
const STEP=.05,AIMED=new Set(M01_AIMED_AT_PLAYER_KINDS),CALLOUTS=/^(dlg_m01_026|dlg_m01_027|co_m01_enemy_mg_fire_on_squad)$/;
export const median=xs=>{const s=[...xs].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor((s.length-1)/2+.5))]:null;};

/** The same save as another level's: the key, and Kowal's pool (timers.kowalRounds counts down from the level's pool). Used to start every level from one state. */
export function atLevel(snapshot,level){
  const s=structuredClone(snapshot),from=M01_DIFFICULTY[s.difficulty??'recruta'],to=M01_DIFFICULTY[level];
  if(level==='recruta')delete s.difficulty;else s.difficulty=level;
  s.timers.kowalRounds=(s.timers.kowalRounds??from.kowalRounds)+to.kowalRounds-from.kowalRounds;
  if(level==='recruta')for(const k of ['lastHitAt','burstWound','telegraph'])delete s.timers[k];
  return s;
}

const starts=new Map();
/** The flat save, on recruta, at the start of a phase (cached per seed): `repair` = the crate has just been delivered, `hold` = obj_m01_hold_access is active and CP-C has just been saved (05:34,
 *  the second raid over, full health): a checkpoint heals, so the exposures start after it and no run is healed half way through. */
export function phaseStart(seed,phase){
  const key=`${seed}/${phase}`;if(starts.has(key))return starts.get(key);
  const d=toRepair(driver(seed)),{sim,walk,step,until}=d;
  let snap=sim.snapshot(false);starts.set(`${seed}/repair`,snap);
  if(phase==='hold'){
    walk(-115,27);walk(-28,28);step({crouch:true});
    until(()=>sim.checkpointsReached.includes('cp_m01_c_engenheiros'),500);snap=sim.snapshot(false);starts.set(key,snap);
  }
  return starts.get(key);
}
export const phaseName=sim=>Object.entries(sim.objectives).filter(([,o])=>o.state==='active').map(([id])=>id.replace('obj_m01_','')).join('+')||sim.mission.phase;

/** The simulation under test: the level's rules (or a candidate row merged over them, as the sweep tool does), plus a record of the wounds, the shooters' engagements and the telegraphs. */
export function dangerSim(difficulty,seed,{candidate=null}={}){
  const log={wounds:[],bursts:[],cracks:[],callouts:[],collisions:0,landRounds:0,drawViolations:0,down:null,engagement:new Map()};
  class Danger extends M01Simulation{
    constructor(s){super(s,{difficulty});}
    get level(){return candidate??super.level;}
    // A collision = an enemy round whose trace hit the player's collider (landRound asks world.coverAt only then, after its one wound roll). The draws of a landing are counted from the
    // stream's state (an LCG: each draw is one step): the wound roll is the only draw, so exactly one per collision and none otherwise, whatever F1, F2 or F4 then decide.
    landRound(r){const w=this.world,own=Object.hasOwn(w,'coverAt'),orig=w.coverAt,s0=this.rng.state;let hit=false;w.coverAt=(...x)=>{hit=true;return orig.apply(w,x);};
      try{super.landRound(r);}finally{if(own)w.coverAt=orig;else delete w.coverAt;}
      log.landRounds++;if(hit)log.collisions++;
      if(draws(s0,this.rng.state)!==(hit?1:0))log.drawViolations++;}
    // The test's own account of each shooter's engagement of the player (not the simulation's timers.telegraph): first round, then a gap of more than 6 s breaks it.
    burst(a,target,kind,o){
      const fired=super.burst(a,target,kind,o);
      if(fired&&a.team==='enemy'&&AIMED.has(kind)){
        const t=this.clock,last=t+((o?.rounds??1)-1)*(o?.interval??.075),e=log.engagement.get(a.id);
        log.bursts.push({by:a.id,kind,at:t});
        if(e&&t-e.last<=F1_TELEGRAPH_GAP_SEC)e.last=Math.max(e.last,last);else log.engagement.set(a.id,{first:t,last});
      }
      return fired;
    }
    line(id,token){const said=super.line(id,token);if(said&&CALLOUTS.test(id))log.callouts.push(this.clock);return said;}
    woundPlayer(r){
      const hpBefore=this.player.health,e=log.engagement.get(r.by),scene=this.scene?.id??null;
      super.woundPlayer(r);
      if(this.player.health<hpBefore||!this.player.alive)log.wounds.push({at:this.clock,by:r.by,weapon:r.weapon,kind:r.kind,firedAt:r.firedAt,hpBefore,hpAfter:this.player.health,
        lethal:!this.player.alive,engagedFor:e?+(r.firedAt-e.first).toFixed(3):null,scene,battle:this.battleClock,objective:phaseName(this)});
    }
  }
  return {sim:new Danger(seed),log};
}

/** One scenario run: {scenario, difficulty, seed, died, ttd, ...}. `ttd` is null when the player lived to the limit. */
export function runDanger({seed,difficulty,scenario,candidate=null}){
  const S=DANGER_SCENARIOS[scenario];if(!S)throw new Error(`unknown scenario ${scenario}`);
  const {sim,log}=dangerSim(difficulty,seed,{candidate});
  sim.restoreSnapshot(atLevel(phaseStart(seed,S.phase),difficulty));sim.drainEvents();
  const t0=sim.clock;let postAt=null,downAt=null;
  const tick=controls=>{
    sim.tick(STEP,controls);
    for(const e of sim.drainEvents()){
      if(e.type==='round-impact'&&e.crack)log.cracks.push(sim.clock);
      else if(e.type==='message'&&/^Zieliński:/.test(e.message))log.callouts.push(sim.clock);
      else if(e.type==='player-down'&&downAt===null){downAt=sim.clock;log.down=e;}
    }
    if(downAt===null&&!sim.player.alive)downAt=sim.clock;   // (a simulation before H9 D3 emits no player-down: the death is the same tick)
    return downAt===null;
  };
  const walkTo=(x,z,limit=60)=>{
    for(let i=0;i<limit*20;i++){
      const p=sim.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.4)return true;
      let turn=Math.atan2(dz,dx)-p.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
      if(!tick({lookX:turn/.0022,forward:1,sprint:true}))return false;
    }
    return false;
  };
  let alive=walkTo(S.post.x,S.post.z);
  if(alive){
    if(Boolean(sim.world.coverAt(sim.player))!==S.covered)throw new Error(`${scenario}: the post (${S.post.x}, ${S.post.z}) is ${S.covered?'not ':''}in cover for the wound roll`);
    postAt=sim.clock;
    if(sim.player.crouched!==S.crouch)alive=tick({crouch:true});
    const origin=()=>Math.max(postAt,sim.consumed.evt_m01_train963_arrives??Infinity);   // the limit counts from the guns being active too
    while(alive&&sim.clock-origin()<S.limitSec&&!sim.mission.complete)alive=tick({});
  }
  const died=downAt!==null,lethal=log.wounds.find(w=>w.lethal)??null,from=postAt===null?t0:Math.max(postAt,sim.consumed.evt_m01_train963_arrives??postAt);
  // A telegraph (section 3 of the design): the muzzle flash and tracer of a burst aimed at the player (the shooter had him in sight), a round that cracked past his eye, a callout.
  const lastTelegraph=lethal?Math.max(-Infinity,...[...log.bursts.map(b=>b.at),...log.cracks,...log.callouts].filter(t=>t<=lethal.at+1e-9)):null;
  return {scenario,difficulty,seed,died,diedWalking:died&&postAt===null,ttd:died?+(downAt-from).toFixed(2):null,survivedSec:died?null:+(sim.clock-from).toFixed(1),
    wounds:log.wounds.length,collisions:log.collisions,landRounds:log.landRounds,drawViolations:log.drawViolations,minHealth:Math.min(100,...log.wounds.map(w=>w.hpAfter)),
    killedBy:lethal?{by:lethal.by,weapon:lethal.weapon,kind:lethal.kind,objective:lethal.objective,battle:clockText(lethal.battle),engagedFor:lethal.engagedFor,
      sinceTelegraph:Number.isFinite(lastTelegraph)?+(lethal.at-lastTelegraph).toFixed(2):null,scene:lethal.scene,text:log.down?.text??null}:null,
    woundList:log.wounds.map(w=>({t:+(w.at-from).toFixed(2),by:w.by,dmg:w.hpBefore-w.hpAfter,hp:w.hpAfter,lethal:w.lethal,engagedFor:w.engagedFor}))};
}

/** Section 6 bars for the runs of ONE scenario kind ('exposed' | 'covered') at ONE level: {ok, why}. Runs of recruta must not die at all. */
export function evaluateBand(difficulty,kind,runs){
  const ttds=runs.map(r=>r.died?r.ttd:Infinity),deaths=runs.filter(r=>r.died).length;
  if(difficulty==='recruta')return {ok:deaths===0,why:`${deaths} deaths of ${runs.length}`};
  const band=DANGER_BANDS[difficulty];
  if(kind==='exposed'){const m=median(ttds);return {ok:m>=band.exposed[0]&&m<=band.exposed[1],why:`median TTD ${m} s (band ${band.exposed.join('-')}), ${deaths} deaths of ${runs.length}`};}
  const early=ttds.filter(t=>t<band.covered);return {ok:early.length===0,why:`${early.length} runs died before ${band.covered} s (min ${Math.min(...ttds)} s), ${deaths} deaths of ${runs.length}`};
}
