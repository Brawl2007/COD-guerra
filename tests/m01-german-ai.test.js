// R2-b (2026-10-24, owner complaint «os polacos fazem pouco para contrariar o ataque; os inimigos mostram pouca inteligência; combate artificial»): the fight for the road deck, part 1.
//   the data    the closing lines of the deck assault down to `safeX` (the single number the owner decides), the tactics, the records, the events (src/game/m01-deck-assault.js, mission.json);
//   the Poles   from the deck assault (06:05) the section's riflemen fire REAL rounds at the Germans of the deck (src/game/m01-section.js real, sim.alliedRound: the model of the rearguard's rifles and the
//               player's), on a cycle of their own, pinned men stay down, and the suppression they cause never shields the platoon (the rule of the 20 s reads only the player's: playerSuppressedUntil).
// Part 2 (tests/m01-german-ai-tactics.test.js): the lines, the girders in turn, the search and the stick grenades. Part 3 (tests/m01-german-ai-saves.test.js): saves, legacy saves and a whole fight.
// State-level tests on saves taken from the real routes (tests/helpers/m01-route.js, stopped at the first tick of the deck assault) and on hand-made scenes on those saves (tests/helpers/m01-deck-scene.js):
// not a browser playthrough, not a playtest. The numbers of the whole fight (24 routes, the sweeps) are in docs/verification/m01-runtime/german-ai-r2b-2026-10-24/README.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import definition from '../missions/m01-tczew/mission.json' with {type:'json'};
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {DECK_SAFE_X,DECK_LINE_MARGIN_M,deckAssaultPlan,deckLines,deckLineNumber,deckLimitNode,validDeckRecord} from '../src/game/m01-deck-assault.js';
import {SECTION,sectionRealOn} from '../src/game/m01-section.js';
import {validateM01AudioEvent,DECK_TACTIC_KINDS} from '../src/game/m01-audio-events.js';
import {deathText} from '../src/game/m01-difficulty.js';
import {eyePosition} from '../src/world/spatial.js';
import {json} from './helpers/m01-determinism.js';
import {P,T,ENTRY,dist,load,plan,entry,isolate,pair,scene,lcg,shotsOf} from './helpers/m01-deck-scene.js';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
test('the closing lines: three per man by default (line 0 is the old limit), the deepest at safeX + 8 m + his place in the formation; safeX 450 is the old assault node for node',()=>{
  assert.equal(DECK_SAFE_X,250,'the shipped value of the single number the owner decides (it was 450)');
  const minLimit=Math.min(...P.limits);
  P.assault.forEach((id,k)=>{
    const lines=P.lines[k],path=P.paths[k],[z]=P.lanes[k];
    assert.equal(lines.length,3,`${id}: line 0, one closing line, the deepest`);
    assert.ok(lines.every((n,i)=>!i||n>lines[i-1]),'increasing nodes');
    assert.equal(path[lines[0]].x,P.limits[k],`${id}: line 0 is his old limit`);
    assert.equal(path.at(-1).x,DECK_SAFE_X+DECK_LINE_MARGIN_M+(P.limits[k]-minLimit),`${id}: the deepest line`);
    assert.equal(lines.at(-1),path.length-1);
    assert.ok(path[lines[1]].x<path[lines[0]].x&&path[lines[1]].x>path.at(-1).x,`${id}: the closing line lies between`);
    assert.ok(path.every((p,i)=>p.z===z&&(!i||p.x<path[i-1].x)),`${id}: one lane, east to west`);
  });
  // the owner's numbers: the man in front ends 228 m from the deck post of the player (< 300 m) and 83 m from the rearguard's eastmost post (x 165-175: >= 80 m)
  const lead=P.paths[0].at(-1).x;assert.ok(lead-30<300&&lead-175>=80,`the lead man's deepest line x ${lead}`);
  // 450 = the assault of before R2-b: one line, the same nodes, the same limits, the same safety line
  const old=deckAssaultPlan(plan(d=>{d.safeX=450;}));
  assert.ok(old.lines.every(l=>l.length===1),'no closing line at 450');
  P.assault.forEach((id,k)=>{
    const [z,dx]=P.lanes[k],lim=P.limits[k],pts=definition.groups.find(g=>g.id==='grp_de_spans').deckAssault.stations.map(x=>x+dx).filter(x=>x>lim+6);
    assert.deepEqual(old.paths[k].map(p=>p.x),[...pts,lim],`${id}: the path of before, node for node`);assert.ok(old.paths[k].every(p=>p.z===z));
    assert.deepEqual(old.lines[k],[old.paths[k].length-1]);
  });
  assert.equal(old.safeX,450);assert.equal(old.holdBaseSec,old.maxSec,'and the squad has no closing extra');
  // the boundary: a line exists only when the deepest is at least closeGapM west of the limit (458 - 8 - safeX >= 24, i.e. safeX <= 426)
  assert.ok(deckAssaultPlan(plan(d=>{d.safeX=426;})).lines[0].length>=2,'at the boundary a deepest line exists');
  assert.equal(deckAssaultPlan(plan(d=>{d.safeX=427;})).lines[0].length,1,'one metre east it does not');
  assert.equal(P.holdBaseSec,P.maxSec+T.closeExtraSec+(minLimit-(DECK_SAFE_X+DECK_LINE_MARGIN_M))/P.rushSpeed,'the absolute bounds of the hold follow the longest normal fight');
});

test('the tactics are mission data validated at load: a typo stops the game',()=>{
  const bad={
    safeX_low:d=>{d.safeX=100;},limit_west:d=>{d.limits[0]=240;},stations_order:d=>{d.stations.push(900);},no_tactics:d=>{delete d.tactics;},stages:d=>{d.tactics.stages=0;},closeGap:d=>{d.tactics.closeGapM=0;},
    pressure_share:d=>{d.tactics.pressure.share=0;},pressure_window:d=>{d.tactics.pressure.windowSec=-1;},hold:d=>{d.tactics.closeHoldSec=[9,3];},extra:d=>{d.tactics.closeExtraSec=1e3;},wait:d=>{d.tactics.alternateWaitSec=-1;},
    pin:d=>{d.tactics.pinSec=30;},squad:d=>{d.tactics.squadTargets.rangeM=10;},search:d=>{d.tactics.search.afterSec=d.tactics.search.memorySec;},grenade_range:d=>{d.tactics.grenade.rangeM=5;},grenade_fuse:d=>{d.tactics.grenade.fuseSec=d.tactics.grenade.flightSec;},
    grenade_wound:d=>{d.tactics.grenade.woundM=9;d.tactics.grenade.reachM=8;},grenade_per:d=>{d.tactics.grenade.perMan=5;},
  };
  for(const [name,f] of Object.entries(bad))assert.throws(()=>deckAssaultPlan(plan(f)),/deck assault/,name);
  assert.doesNotThrow(()=>deckAssaultPlan(plan(d=>{d.safeX=120;})),'the floor of the number the owner may move');
  assert.doesNotThrow(()=>deckAssaultPlan(plan(d=>{d.tactics.grenade.perMan=0;})),'no grenades is a valid choice');
});

test('A* validity: every node of every path, and the legs between them, are clear of every solid for a body, and the navigator routes a man along a line to the next without a detour',()=>{
  const s=new M01Simulation(),nav=s.navigator,world=s.world;
  P.assault.forEach((id,k)=>{
    const path=P.paths[k];
    path.forEach((n,i)=>{
      assert.ok(!nav.blockedAt(n.x,n.z,.35,world.heightAt(n.x,n.z)),`${id} node ${i} (${n.x}, ${n.z}) is inside a solid`);
      if(!i)return;
      const a=path[i-1],steps=Math.ceil(dist(a,n)/.25);
      for(let j=0;j<=steps;j++){const x=a.x+(n.x-a.x)*j/steps;assert.ok(!nav.blockedAt(x,n.z,.35,world.heightAt(x,n.z)),`${id}: the leg ${i-1}-${i} is blocked at x ${x.toFixed(1)}`);}
    });
    for(const i of P.lines[k].slice(1)){
      const from=path[i-1],to=path[i],pts=nav.route({x:from.x,y:world.heightAt(from.x,from.z),z:from.z,radius:.3,space:'metres'},to);
      assert.ok(pts,`${id}: a route to line node ${i}`);let len=0,prev=[from.x,from.z];for(const p of pts){len+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);prev=p;}
      assert.ok(len<=dist(from,to)*1.05+.5,`${id}: ${len.toFixed(1)} m for ${dist(from,to).toFixed(1)} m`);
    }
  });
  // the six lanes stay 0.92 m apart in z (nobody walks through another), and the deepest lines are all west of line 0 of every man (the formation moves as one)
  const zs=P.lanes.map(l=>l[0]).sort((a,b)=>a-b);assert.ok(zs.every((z,i)=>!i||Math.abs(z-zs[i-1])>=.9));
  assert.ok(Math.max(...P.paths.map(p=>p.at(-1).x))<Math.min(...P.limits));
});

test('the records: lim and gr are optional keys of the deck record, bounded; every record without them is the old one',()=>{
  const raw=entry(),s=load(raw);
  const man=s.actor('de_spans_5'),lines=deckLines(man);
  assert.ok(validDeckRecord(man,s.clock),'the record of the entry (no optional key)');
  assert.equal(deckLimitNode(man),lines[0]);assert.equal(deckLineNumber(man),0);
  man.deck.lim=lines[1];assert.ok(validDeckRecord(man,s.clock));assert.equal(deckLineNumber(man),1);
  man.deck.lim=lines[2];assert.ok(validDeckRecord(man,s.clock));assert.equal(deckLineNumber(man),2);
  man.deck.lim=lines[1]+1;assert.ok(!validDeckRecord(man,s.clock),'a limit that is not a line');
  man.deck.lim=lines[1];man.deck.gr=1;assert.ok(validDeckRecord(man,s.clock));
  for(const bad of [0,2,-1,1.5,'1']){man.deck.gr=bad;assert.ok(!validDeckRecord(man,s.clock),`gr ${bad}`);}
  delete man.deck.gr;man.deck.extra=1;assert.ok(!validDeckRecord(man,s.clock),'an unknown key');delete man.deck.extra;
  man.deck.node=P.paths[1].length;assert.ok(!validDeckRecord(man,s.clock),'a node past the deepest line');man.deck.node=0;
  const over=s.actor('de_spans_1');over.deck.lim=0;assert.ok(!validDeckRecord(over,s.clock),'an overwatch man has no line');
  // inside a save
  const save=json(raw);const m=save.actors.find(a=>a.id==='de_spans_4');m.deck.lim=P.lines[0][1];assert.doesNotThrow(()=>validateM01Snapshot(json(save)));
  m.deck.lim=P.lines[0][1]+1;assert.throws(()=>validateM01Snapshot(json(save)),/assalto do tabuleiro/);
});

test('the new events are validated: the stick grenade thrown, the explosion with its thrower, the changes of line; and the grenade death has its own words',()=>{
  const p={x:300,y:1.5,z:40},t={x:280,y:0,z:40};
  const g={type:'enemy-grenade',by:'de_spans_6',origin:p,target:t,fuse:3.8,flight:1.4,at:700};
  assert.doesNotThrow(()=>validateM01AudioEvent(g));
  for(const bad of [{by:'de_east_3'},{by:null},{origin:null},{target:{x:1,y:NaN,z:2}},{fuse:0},{flight:-1},{at:NaN}])assert.throws(()=>validateM01AudioEvent({...g,...bad}),/enemy-grenade/,JSON.stringify(bad));
  const blast={type:'m01-blast',kind:'grenade',point:t,soundAt:1,aerial:false,by:'de_spans_6'};assert.doesNotThrow(()=>validateM01AudioEvent(blast));
  assert.throws(()=>validateM01AudioEvent({...blast,kind:'bomb'}),/m01-blast.by/);assert.throws(()=>validateM01AudioEvent({...blast,by:'jan_wrona'}),/m01-blast.by/);
  assert.doesNotThrow(()=>validateM01AudioEvent({type:'m01-blast',kind:'grenade',point:t,soundAt:1,aerial:false}),'the player\'s grenade has no thrower');
  assert.deepEqual([...DECK_TACTIC_KINDS],['stage','pullback','search']);
  // a real round of the section: where it stopped and whether it struck, together; the display-grade shot of R2-a has neither
  const shot={type:'npc-shot',weapon:'ally_rifle',point:p,rounds:1,by:'staszek_pawlak',target:'de_spans_4'};assert.doesNotThrow(()=>validateM01AudioEvent(shot));
  assert.doesNotThrow(()=>validateM01AudioEvent({...shot,end:t,hit:true}));
  for(const bad of [{end:t},{hit:true},{end:{x:1,y:NaN,z:2},hit:false},{end:t,hit:'yes'},{end:null,hit:false}])assert.throws(()=>validateM01AudioEvent({...shot,...bad}),/npc-shot/,JSON.stringify(bad));
  const d={type:'deck-tactic',kind:'stage',by:'de_spans_4',line:1,at:700};assert.doesNotThrow(()=>validateM01AudioEvent(d));
  for(const bad of [{kind:'charge'},{by:'pl_east_1'},{line:-1},{line:1.5},{at:null}])assert.throws(()=>validateM01AudioEvent({...d,...bad}),/deck-tactic/,JSON.stringify(bad));
  assert.equal(deathText('shot','de_spans_6','stielhandgranate'),'Abatido por uma granada de mão do tabuleiro.');
  assert.equal(deathText('shot','de_spans_6','kar98k'),'Abatido por um atirador Kar98k do tabuleiro.','the rifle keeps its words');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The Poles' rounds. A scene on the entry save: the platoon out of the way, Pawlak on his feet at the deck post, one German of the assault put where the scene says.
const aimless={gauss:()=>0,sigmaMil:[0,0]};

test('alliedRound: a round without dispersion kills the man it is aimed at, draws nothing from the main stream and is not the player\'s suppression; a friend in the line holds it; a wounded man on the deck does not; a wall stops it; a limb wounds',()=>{
  const {s,shooter,t,put}=scene();
  const rng=s.rng.state,clock=s.clock;
  let r=s.alliedRound(shooter,t,{...aimless,clearanceM:.8});
  assert.deepEqual([r.fired,r.hit],[true,true]);assert.equal(t.alive,false);assert.equal(t.state,'DOWN');assert.equal(t.diedAt,clock,'recorded like every death');
  assert.equal(s.rng.state,rng,'no draw from the main stream');assert.equal(t.playerSuppressedUntil,undefined);
  // the player standing on the line, a few metres ahead of the shooter: no round, nothing happens to the German
  put(320,41.2);Object.assign(s.player,{x:40,z:41.2,crouched:false});
  r=s.alliedRound(shooter,t,{...aimless,clearanceM:.8});assert.equal(r.fired,false);assert.equal(t.alive,true);assert.equal(t.health,100);
  // kneeling on the line he is shot over (the rule of the rearguard: the line passes more than 15 cm above his body)
  s.player.crouched=true;r=s.alliedRound(shooter,t,{...aimless,clearanceM:.8});assert.equal(r.fired,true,'over a kneeling friend');
  // the clearance: the player at his usual post, 1.2 m off the line, blocks the rearguard's 1.5 m rule and not the section's 0.8 m
  put(320,41.2);Object.assign(s.player,{x:29,z:40,crouched:false});
  assert.equal(s.alliedRound(shooter,t,aimless).fired,false,'the rearguard\'s clearance (1.5 m) holds a pair that stands 1.2 m from the player');
  assert.equal(s.alliedRound(shooter,t,{...aimless,clearanceM:SECTION.real.clearanceM}).fired,true,'the section\'s clearance lets it fire');
  // Bąk lies wounded on the lane 34 m ahead of the pair (06:04): the line passes his body, not a man on his feet
  const bak=s.actor('jozef_bak');assert.equal(bak.state,'WOUNDED');assert.ok(Math.abs(bak.z-41.2)<.5&&bak.x>shooter.x);
  put(320,41.2);r=s.alliedRound(shooter,t,{...aimless,clearanceM:.8});assert.equal(r.fired,true,'the wounded man does not hold the pair\'s fire');
  const kowal=s.actor('szymon_kowal');Object.assign(kowal,{active:true,x:60,y:0,z:41.2,state:'GUARD',crouched:false});
  put(320,41.2);assert.equal(s.alliedRound(shooter,t,{...aimless,clearanceM:.8}).fired,false,'a man on his feet on the line does');kowal.active=false;
  // a wall across the lane: the round is fired and ends on it
  put(320,41.2);const wall={id:'t_wall',min:{x:100,y:0,z:35},max:{x:101,y:3,z:45},material:'stone'};s.world.obstacles.push(wall);
  r=s.alliedRound(shooter,t,{...aimless,clearanceM:.8});assert.equal(r.fired,true);assert.equal(r.hit,false);assert.equal(t.health,100,'cover stops it');
  s.world.obstacles.pop();
  // a limb: a man on his feet hit in the legs (the pitch error puts the ray 0.4 m under his chest) lives with what is left of 100 after 110 x 0.7 = 77
  put(320,41.2,false);let n=0;
  r=s.alliedRound(shooter,t,{gauss:()=>n++?-1:0,sigmaMil:[0,1.3],clearanceM:.8});
  assert.equal(r.hit,true);assert.equal(t.alive,true);assert.ok(Math.abs(t.health-23)<1e-9,`health ${t.health}`);assert.equal(t.state,'HIT_REACTION');assert.equal(t.hitAt,s.clock,'recorded as a hit');
});

test('the error grows with the range like every German round\'s: the same rifle at the same man hits far more at 150 m than at 600 m; a miss within 3 m still pins him for 5 s, and only the player\'s shot is the player\'s suppression; a round ends 40 m past the man it was aimed at',()=>{
  const {s,shooter,t,put}=scene({crouched:false});
  const hits=(x,n=500,seed=7)=>{const g=lcg(seed);let h=0;for(let i=0;i<n;i++){put(x,41.2,false);const r=s.alliedRound(shooter,t,{gauss:g,sigmaMil:SECTION.real.sigmaMil,clearanceM:.8});if(r.hit)h++;}return h;};
  const near=hits(170),far=hits(620);
  assert.ok(near>=60&&near>4*far,`hits at 150 m ${near}, at 600 m ${far} of 500 rounds`);
  // a miss: 6 mil to one side at 300 m is 1.8 m off a body 0.58 m wide and within the 3 m of a crack
  put(320,41.2,false);let r=s.alliedRound(shooter,t,{gauss:()=>1,sigmaMil:[6,0],clearanceM:.8});
  assert.equal(r.fired,true);assert.equal(r.hit,false);assert.equal(t.health,100);assert.equal(t.suppressedUntil,s.clock+5,'pinned 5 s, like by every rifle round of our side');assert.equal(t.playerSuppressedUntil,undefined);
  // 12 mil is 3.6 m: past the crack
  put(320,41.2,false);r=s.alliedRound(shooter,t,{gauss:()=>1,sigmaMil:[12,0],clearanceM:.8});assert.equal(t.suppressedUntil,0,'a miss by 3.6 m pins nobody');
  // a stray round does not go on to the other end of the bridge: a man standing 300 m behind the one aimed at, on the same line, is not touched by a miss that passes close to him
  put(320,41.2,false);const far2=s.actor('de_spans_5');Object.assign(far2,{x:640,z:41.2,y:0,alive:true,health:100,suppressedUntil:0,active:true,crouched:false});far2.deck.phase='clear';
  r=s.alliedRound(shooter,t,{gauss:()=>1,sigmaMil:[0.0001,6],clearanceM:.8});   // (over his head by 1.9 m at 320 m: it carries on, but only 40 m)
  assert.equal(far2.health,100);assert.equal(far2.suppressedUntil,0,'nobody 320 m beyond is pinned or hit');
  // the player's own shot marks the suppression as his
  put(320,41.2,false);const o=eyePosition(s.player),e=eyePosition(t),dx=e.x-o.x,dy=e.y-o.y,dz=e.z-o.z,L=Math.hypot(dx,dy,dz);
  s.suppressAlong(o,{x:dx/L,y:dy/L,z:dz/L},null,true);
  assert.equal(t.playerSuppressedUntil,s.clock+5);assert.equal(t.suppressedUntil,s.clock+5);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// The section's cycle, and what the Poles' fire must not do.
test('from the deck assault the pair fires real rounds on a cycle of its own at the nearest German it sees: a peek of 1-3 rounds a bolt apart, then a pause; the German is pinned or hit; a pinned man stays down; the record validates',()=>{
  const {s,t,put}=scene({at:[458,40.46]});t.deck.phase='clear';t.cooldown=1e6;
  assert.equal(sectionRealOn(s),true);assert.equal(s.sectionRealFire(),true);
  const hp=t.health;let pinned=false,killed=0;
  // the German is stood up again whenever a round kills him (the scene is about the cycle of the pair, not about his death); the east group's men on the far road are the pair's other targets
  const shots=shotsOf(s,20*45,{each:()=>{if(!t.alive||t.health<hp){pinned=true;killed++;put(458,40.46);}else if(t.suppressedUntil>s.clock)pinned=true;}}).filter(x=>/^de_spans_/.test(x.target));
  const by=id=>shots.filter(x=>x.by===id);
  assert.ok(by('staszek_pawlak').length>=2&&by('east_platoon_voice').length>=2,`both men fire (${by('staszek_pawlak').length}, ${by('east_platoon_voice').length})`);
  assert.ok(shots.every(x=>x.target==='de_spans_4'),'at the one German of the assault in sight');
  // a real round says where it stopped and whether it struck him (the presentation draws it): somewhere between the pair and 40 m past him (a truss member or the deck can stop it earlier)
  assert.ok(shots.every(x=>x.end&&typeof x.hit==='boolean'&&Number.isFinite(x.end.x)&&x.end.x>=10&&x.end.x<=458+40+1),'every real round has an end and a hit flag');
  assert.ok(shots.some(x=>x.hit)===killed>0,'and the flag is the one the German felt');
  for(const id of ['staszek_pawlak','east_platoon_voice']){
    const mine=by(id);for(let i=1;i<mine.length;i++)assert.ok(mine[i].at-mine[i-1].at>=1.0-1e-9,`${id}: the bolt of his rifle (${(mine[i].at-mine[i-1].at).toFixed(2)} s)`);
    const gaps=mine.slice(1).map((x,i)=>x.at-mine[i].at);assert.ok(gaps.some(g=>g>=3),`${id}: a pause between peeks`);
  }
  assert.ok(pinned,'a German at 440 m under two rifles is pinned (a miss within 3 m) or hit');
  const q=s.timers.section;assert.ok(q.fire&&Object.keys(q.fire).length>=2&&Object.keys(q.fire).every(id=>SECTION.role[id]==='rifle'),'the cycle is saved');
  assert.doesNotThrow(()=>validateM01Snapshot(json(s.snapshot())));
  // a pinned man stays down: keep the pair under fire for 20 s and nothing is fired; let go and they fire again
  const {s:s2,t:t2}=scene({at:[458,40.46]});t2.deck.phase='clear';t2.cooldown=1e6;
  const down=shotsOf(s2,20*20,{each:s=>{for(const a of pair(s))a.suppressedUntil=s.clock+1;}});assert.deepEqual(down,[],'nobody fires while pinned');
  const up=shotsOf(s2,20*20);assert.ok(up.length>=2,`and they answer when it is over (${up.length})`);
});

test('before the deck assault the section\'s rounds are display-grade as in R2-a: seen and heard, never traced; with the hook off the deck assault itself has no real fire and no cycle',()=>{
  const raw=json(entry());delete raw.consumed[ENTRY];
  assert.throws(()=>validateM01Snapshot(raw),/assalto|eventos/,'the deck records cannot exist without their event');
  assert.equal(sectionRealOn(new M01Simulation(3)),false,'nothing before the deck assault');
  class Display extends M01Simulation{sectionRealFire(){return false;}}
  const d=load(entry(),Display);for(const a of d.actors)if(a.group==='grp_east_platoon')a.active=false;d.actor('szymon_kowal').active=false;
  isolate(d,['de_spans_4']);const dt=d.actor('de_spans_4');Object.assign(dt,{x:458,z:40.46,y:0,alive:true,health:100,suppressedUntil:0});dt.deck.phase='clear';dt.cooldown=1e6;
  shotsOf(d,20*45);
  assert.equal(d.timers.section.fire,undefined,'no cycle of the real fire');
  assert.equal(dt.health,100);assert.equal(dt.suppressedUntil,0,'a display-grade round touches nobody');
});

test('the platoon\'s fate stays the player\'s: the rule of the 20 s reads the suppression the PLAYER causes; the Poles\' own fire does not shield the last man',()=>{
  const run=player=>{
    const s=load(entry());
    for(const a of s.actors)if(a.group==='grp_de_spans'){a.suppressedUntil=s.clock+60;if(player)a.playerSuppressedUntil=s.clock+60;}
    const n0=s.flags['m01.east_platoon_survivors'];
    for(let i=0;i<20*30;i++){s.tick(.05);s.drainEvents();if(s.enemyFire.rounds.some(r=>r.victim)||s.flags['m01.east_platoon_survivors']<n0)return true;}
    return false;
  };
  assert.equal(run(false),true,'every German pinned by somebody else: the platoon is exposed, the last man is shot at');
  assert.equal(run(true),false,'every German pinned by the player: nobody is shot at');
  // an older save has no record of who suppressed a man: all of that suppression was the player's
  const raw=json(entry());const man=raw.actors.find(a=>a.id==='de_spans_5');man.suppressedUntil=raw.clock+30;delete man.playerSuppressedUntil;
  const s=load(raw);assert.equal(s.actor('de_spans_5').playerSuppressedUntil,raw.clock+30,'an older save: all of it was the player\'s');
  const clean=load(entry());assert.equal(clean.actor('de_spans_6').playerSuppressedUntil,0,'a man of the deck the player has not suppressed has 0 from the entry on (the key is how a save of R2-b is told from an older one)');
});
