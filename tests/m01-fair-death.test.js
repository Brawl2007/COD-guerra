// H9 D4 (2026-10-22): the fair-death rules F1-F5 on soldado and veterano, proved on the simulation (docs/direction/H9_DIFICULDADE.md section 3). recruta keeps today's rules byte for byte:
// none of the rules below applies to it (the golden routes run on it). The scenarios of tests/helpers/m01-danger.js put a player in sight of the German MG34s and measure every lethal wound.
//   F1  a wound takes the player to 0 only if the SAME shooter has been engaging him for the reaction grace (1.2 s soldado, 0.8 s veterano) and a telegraph (muzzle flash, tracer, crack, callout)
//       happened within the last 6 s; otherwise the damage applies and health stays at 1. The first burst at the player never kills.
//   F2  at most one wound per MG34 burst (burstWoundCap).      F3  bombs and demolitions never hurt the player.
//   F4  no lethal wound while a cutscene plays.               F5  every death carries its cause and shooter.
// The time-to-death bars of section 6 are measured by tools/verification/m01-danger-sweep.mjs (docs/verification/m01-runtime/difficulty-d3-d4-2026-10-22/), not asserted here.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {M01_DIFFICULTY,M01_DIFFICULTY_IDS,F1_TELEGRAPH_GAP_SEC,BURST_GROUP_SEC} from '../src/game/m01-difficulty.js';
import {runDanger,phaseStart,atLevel,DANGER_SEEDS} from './helpers/m01-danger.js';

const STEP=.05;
const fresh=(difficulty,seed=11)=>{const sim=new M01Simulation(seed,{difficulty});sim.tick(STEP,{skip:true});sim.drainEvents();return sim;};
const round=(sim,by,dt=0,kind='player')=>({by,kind,firedAt:sim.clock+dt,weapon:/^de_east_[01]$/.test(by)?'mg34':'kar98k'});
const HARD=['soldado','veterano'];
// A row that wounds on every collision for 60: only the fair-death rules stand between the player and a quick death (the stress for F1 and F4).
const stress=level=>Object.freeze({...M01_DIFFICULTY[level],woundChance:{exposed:1,cover:1},woundDamage:60,burstWoundCap:null});

test('F1: the first burst at the player never kills, whatever his health: a seven-round MG34 burst is inside the grace on both levels',()=>{
  for(const id of HARD){
    const L=M01_DIFFICULTY[id],sim=fresh(id);sim.player.health=1;const a={id:'de_east_0',team:'enemy'};
    sim.noteTelegraph(a,'player',7,.075);   // the burst of seven rounds: 0.45 s
    for(let k=0;k<7;k++)sim.woundPlayer(round(sim,'de_east_0',k*.075));
    assert.equal(sim.player.alive,true,`${id}: the first burst did not kill`);assert.equal(sim.player.health,1);assert.ok(.45<L.reactionGraceSec,'a whole burst is shorter than the grace');
    assert.equal(sim.drainEvents().filter(e=>e.type==='player-down').length,0);
    // the same man's NEXT burst, once the grace has passed and the engagement goes on, does
    sim.clock+=L.reactionGraceSec+.2;sim.noteTelegraph(a,'player',7,.075);sim.woundPlayer(round(sim,'de_east_0'));
    assert.equal(sim.player.alive,false,`${id}: engaged for the grace: lethal`);assert.equal(sim.failure,'Abatido pela MG34 do dique (portões).');
  }
  // a rifleman's first round to the player is his telegraph (a Kar98k has no tracer): the same
  for(const id of HARD){const sim=fresh(id);sim.player.health=1;sim.noteTelegraph({id:'de_east_6',team:'enemy'},'player',1,.075);sim.woundPlayer(round(sim,'de_east_6'));assert.equal(sim.player.alive,true,id);}
});

test('F1: the window is six seconds of the shooter\'s own rounds; another man\'s engagement, a stale one or a round aimed elsewhere does not license the kill',()=>{
  assert.equal(F1_TELEGRAPH_GAP_SEC,6);
  for(const id of HARD){
    const L=M01_DIFFICULTY[id],a={id:'de_east_1',team:'enemy'},b={id:'de_east_0',team:'enemy'};
    const kill=(setup)=>{const sim=fresh(id);setup(sim);sim.player.health=1;sim.woundPlayer(round(sim,'de_east_1'));return sim.player.alive;};
    // engaged for the grace and a bit: dead
    assert.equal(kill(s=>{s.noteTelegraph(a,'player',1,.075);s.clock+=L.reactionGraceSec+.01;s.noteTelegraph(a,'player',1,.075);}),false,`${id}: engaged`);
    // exactly the grace: dead (the boundary belongs to the kill); a hair less: alive
    assert.equal(kill(s=>{s.noteTelegraph(a,'player',1,.075);s.clock+=L.reactionGraceSec;s.noteTelegraph(a,'player',1,.075);}),false,`${id}: exactly the grace`);
    assert.equal(kill(s=>{s.noteTelegraph(a,'player',1,.075);s.clock+=L.reactionGraceSec-.05;s.noteTelegraph(a,'player',1,.075);}),true,`${id}: a hair short`);
    // the engagement kept alive by rounds every 5 s for half a minute still counts; one gap of more than 6 s ends it
    assert.equal(kill(s=>{s.noteTelegraph(a,'player',1,.075);for(let i=0;i<6;i++){s.clock+=5;s.noteTelegraph(a,'player',1,.075);}}),false,`${id}: kept alive by rounds 5 s apart`);
    assert.equal(kill(s=>{s.noteTelegraph(a,'player',1,.075);s.clock+=2;s.noteTelegraph(a,'player',1,.075);s.clock+=6.5;s.noteTelegraph(a,'player',1,.075);}),true,`${id}: a gap of 6.5 s starts again`);
    // somebody else's engagement is not his
    assert.equal(kill(s=>{s.noteTelegraph(b,'player',1,.075);s.clock+=10;s.noteTelegraph(b,'player',1,.075);}),true,`${id}: another shooter`);
    // rounds aimed at the sappers, the squad, the area or the east bridgehead are not an engagement of the player
    for(const kind of ['repair','squad','area','platoon','east'])assert.equal(kill(s=>{s.noteTelegraph(a,kind,1,.075);s.clock+=10;s.noteTelegraph(a,kind,1,.075);}),true,`${id}/${kind}`);
    // the cover-adjust salvo is aimed at the player: it counts
    assert.equal(kill(s=>{s.noteTelegraph(a,'cover',7,.075);s.clock+=L.reactionGraceSec+.1;s.noteTelegraph(a,'cover',7,.075);}),false,`${id}: cover salvo`);
  }
});

test('F2: one wound per MG34 burst (the round still lands: impact, crack, suppression); the next burst of the same gun wounds again',()=>{
  for(const id of HARD){
    const sim=fresh(id);let hits=0;
    for(let k=0;k<7;k++){const h=sim.player.health;sim.woundPlayer(round(sim,'de_east_0',k*.075));if(sim.player.health<h)hits++;}
    assert.equal(hits,M01_DIFFICULTY[id].burstWoundCap,id);assert.equal(M01_DIFFICULTY[id].burstWoundCap,1);
    const h=sim.player.health;sim.woundPlayer(round(sim,'de_east_0',BURST_GROUP_SEC+.3));assert.ok(sim.player.health<h||sim.player.health===1,`${id}: the next burst wounds`);
  }
});

test('F3: a bomb or a demolition never hurts the player, on any level, even at the impact point; an aerial impact is moved 30 m or more away',()=>{
  for(const id of M01_DIFFICULTY_IDS){
    const sim=fresh(id);const p=sim.player;
    for(const [name,aerial] of [['raid_0530',true],['station_bomb',true],['east_demolition',false],['west_demolition',false]]){
      const at={x:p.x,y:p.y,z:p.z},health=p.health,rng=sim.rng.state;
      const placed=sim.impact(name,at,aerial);
      assert.equal(p.health,health,`${id}/${name}`);assert.equal(p.alive,true);assert.equal(sim.rng.state,rng,'no draw');
      if(aerial)assert.ok(Math.hypot(placed.x-p.x,placed.z-p.z)>=30-1e-9,`${id}/${name}: moved off the player`);else assert.deepEqual({x:placed.x,z:placed.z},{x:at.x,z:at.z},'a demolition keeps its point');
    }
    assert.equal(sim.drainEvents().filter(e=>e.type==='player-hit'||e.type==='player-down').length,0,id);
  }
  // and in the code: the impact paths never touch the player's health at all
  for(const fn of ['impact','safeImpact','updateRaidSchedule'])assert.doesNotMatch(M01Simulation.prototype[fn].toString(),/\.health|\.alive/,fn);
});

test('F4: no lethal wound while a cutscene plays (soldado, veterano); the same wound kills once it is over; recruta keeps its rules unchanged',()=>{
  for(const id of HARD){
    const L=M01_DIFFICULTY[id],a={id:'de_east_1',team:'enemy'};
    for(const scene of ['cs_m01_order','cs_m01_bombing','cs_m01_east_blast','cs_m01_west_blast']){
      const sim=fresh(id),wound=()=>{sim.clock+=1;sim.noteTelegraph(a,'player',1,.075);sim.woundPlayer(round(sim,'de_east_1'));};   // a new burst each time (1 s later), the engagement goes on
      sim.noteTelegraph(a,'player',1,.075);sim.clock+=L.reactionGraceSec+.5;sim.noteTelegraph(a,'player',1,.075);
      sim.player.health=L.woundDamage;sim.scene={id:scene,elapsed:1,beats:[]};
      sim.woundPlayer(round(sim,'de_east_1'));
      assert.equal(sim.player.alive,true,`${id}/${scene}`);assert.equal(sim.player.health,1,`${id}/${scene}: the damage applied, health stays at 1`);
      assert.equal(sim.drainEvents().filter(e=>e.type==='player-down').length,0);assert.equal(sim.failure,null);
      wound();assert.equal(sim.player.alive,true,'the scene is still playing: another wound, still alive');assert.equal(sim.player.health,1);
      sim.scene=null;wound();assert.equal(sim.player.alive,false,`${id}/${scene}: after the scene the same wound is lethal`);assert.equal(sim.failure,'Abatido pela MG34 do dique (portões).');
      validateM01Snapshot(fresh(id).snapshot());
    }
  }
  // recruta: the rule is not there (it would only matter after 13 wounds; the golden routes never come near and stay byte for byte)
  const r=fresh('recruta');r.scene={id:'cs_m01_order',elapsed:1,beats:[]};r.player.health=8;r.woundPlayer(round(r,'de_east_1'));assert.equal(r.player.alive,false);
});

test('F1/F4/F5 on real exposures (12 seeds, both hard levels) under maximum lethality: every lethal wound has an engaged shooter (>= grace), a telegraph within 6 s, no cutscene, a cause; one draw per collision',()=>{
  let lethal=0,clamps=0,collisions=0,landRounds=0;
  for(const difficulty of HARD)for(const seed of DANGER_SEEDS){
    const r=runDanger({seed,difficulty,scenario:'exposed/repair',candidate:stress(difficulty)}),grace=M01_DIFFICULTY[difficulty].reactionGraceSec;
    assert.equal(r.drawViolations,0,`${difficulty}/${seed}: exactly one draw per collision, none otherwise`);collisions+=r.collisions;landRounds+=r.landRounds;
    clamps+=r.woundList.filter(w=>w.hp===1&&!w.lethal).length;
    for(const w of r.woundList.filter(w=>w.lethal)){
      assert.ok(w.engagedFor>=grace-1e-9,`${difficulty}/${seed}: lethal after ${w.engagedFor} s engaged (grace ${grace})`);
    }
    if(!r.died)continue;lethal++;
    const k=r.killedBy;
    assert.ok(k.engagedFor>=grace-1e-9,`${difficulty}/${seed}: engaged for ${k.engagedFor} s, grace ${grace}`);
    assert.ok(k.sinceTelegraph!==null&&k.sinceTelegraph<=F1_TELEGRAPH_GAP_SEC,`${difficulty}/${seed}: a telegraph ${k.sinceTelegraph} s before the lethal wound`);
    assert.equal(k.scene,null,`${difficulty}/${seed}: not in a cutscene`);assert.match(k.text,/^Abatido (pela MG34 do dique \(portões\)|por um atirador Kar98k (dos portões|do dique|do tabuleiro))\.$/);
    assert.match(k.by,/^de_(east|spans)_\d+$/);
  }
  assert.ok(lethal>=12,`the stress row kills on most of the 24 runs (${lethal})`);assert.ok(clamps>=1,'F1 clamped at least one would-be-lethal wound to 1 health');assert.ok(collisions>10&&landRounds>collisions);
});

test('the fair-death rules draw nothing and add no state to recruta: woundPlayer, noteTelegraph, playerDown and the respawn getter leave the stream and the save alone',()=>{
  for(const id of M01_DIFFICULTY_IDS){
    const sim=fresh(id),state=sim.rng.state,keys=Object.keys(sim.timers).sort(),e={id:'de_east_1',team:'enemy'};
    sim.noteTelegraph(e,'player',7,.075);assert.ok(sim.respawn);sim.scene={id:'cs_m01_order',elapsed:0,beats:[]};sim.woundPlayer(round(sim,'de_east_1'));sim.scene=null;   // F4 path
    sim.player.health=1;sim.clock+=3;sim.noteTelegraph(e,'player',1,.075);sim.woundPlayer(round(sim,'de_east_1'));                                                      // F1 clamp (hard levels) or a plain death (recruta)
    sim.playerDown('shot','de_east_1','mg34');sim.playerDown('fall');
    assert.equal(sim.rng.state,state,`${id}: no draw`);
    if(id==='recruta')assert.deepEqual(Object.keys(sim.timers).sort(),keys,'recruta: no new timer key');else assert.ok('telegraph' in sim.timers);
  }
});

test('the paired comparison starts every level from the identical state of one seed, and recruta runs of the exposures do not die',()=>{
  const start=phaseStart(1,'repair');
  for(const id of M01_DIFFICULTY_IDS){
    const s=atLevel(start,id);validateM01Snapshot(s);
    const strip=x=>{const c=JSON.parse(JSON.stringify(x));delete c.difficulty;delete c.timers.kowalRounds;return JSON.stringify(c);};assert.equal(strip(s),strip(start),id);
  }
  // recruta: the section 6 bar "0 deaths" on two of the four exposures here (the sweep tool runs all four on 12 seeds)
  for(const scenario of ['exposed/repair','covered/hold']){const r=runDanger({seed:19390901,difficulty:'recruta',scenario});assert.equal(r.died,false,scenario);assert.equal(r.drawViolations,0);}
});
