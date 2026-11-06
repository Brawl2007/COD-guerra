// H9 D5 (2026-10-22): the death beat, the level on the checkpoint card and the "continuar em nível mais baixo" offer. The simulation decides the death (`player-down`) and the re-levelling
// (lowerDifficulty); game.js only presents: for DEATH_BEAT.sec of REAL time it does not tick the simulation, counts the deaths per checkpoint in the session (not saved) and offers the next
// lower level from the third death at one checkpoint. Exercised through the real Game.loop with recording stubs for the canvas, the audio and the renderer (no DOM, no WebGL).
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {Game} from '../src/game/game.js';
import {M01HudPresenter,DEATH_BEAT,deathBeatFrame,M01_DIFFICULTY_LABELS} from '../src/ui/m01-hud.js';
import {lowerLevelOf} from '../src/game/m01-difficulty.js';
import fs from 'node:fs';

class FakeElement {
  constructor(tag='div'){
    this.tag=tag;this.children=[];this.own='';this.className='';this.dataset={};this.styles=new Map();this.classes=new Set();
    this.style={setProperty:(k,v)=>this.styles.set(k,String(v)),removeProperty:k=>this.styles.delete(k)};
    const c=this.classes;this.classList={toggle:(n,on=!c.has(n))=>{on?c.add(n):c.delete(n);return on;},add:n=>c.add(n),remove:(...n)=>n.forEach(x=>c.delete(x)),contains:n=>c.has(n)};
  }
  get textContent(){return this.children.length?this.children.map(c=>c.textContent).join(''):this.own;}
  set textContent(v){this.children=[];this.own=String(v);}
  replaceChildren(...children){this.children=children;this.own='';}
}
const doc={createElement:tag=>new FakeElement(tag)};
const KEYS=['root','objective','objectiveStatus','objectivePanel','objectiveUpdate','clock','checkpoint','checkpointName','interaction','subtitle','message',
  'health','healthBar','status','ammo','mag','reserve','weaponName','weaponState','grenades','lowHealth','fade','titleCard','resumeCard','hitMarker','death','deathCause','deathNote','crosshair','vignette'];
const STEP=.05,FRAME=.05;   // a rendered frame of 50 ms: one simulation step when the game runs

/** The real Game.loop over a real simulation, with recording stubs for everything the browser provides. */
function liveGame(difficulty='soldado'){
  const sim=new M01Simulation(11,{difficulty});sim.tick(STEP,{skip:true});sim.drainEvents();
  const el=Object.fromEntries(KEYS.map(k=>[k,new FakeElement()]));el.rounds=new FakeElement('div');el.rounds.children=Array.from({length:5},()=>new FakeElement('i'));
  const presenter=new M01HudPresenter(el,{document:doc}),states=[],stored={},ticks={n:0},game=Object.create(Game.prototype);
  const realTick=sim.tick.bind(sim);sim.tick=(...a)=>{ticks.n++;return realTick(...a);};
  Object.assign(game,{sim,m01Hud:presenter,hud:el,pendingSounds:[],pendingM01HitFeedback:null,touch:true,started:true,paused:false,disposed:false,last:0,
    canvas:{},input:{clear(){},consumeLook:()=>0,consumeLookY:()=>0,forwardAxis:()=>0,sideAxis:()=>0,sprinting:()=>false,aim:false,consumeFire:()=>false,consumePressed:()=>false},
    audio:{hit(){},landing(){},crack(){},impact(){},resetPresentation(){},updateM01Presentation(){},init(){},suspend(){},wz29Shot(){},wz29Mechanism(){}},audioDirector:null,
    renderer:{quality:'low',resetEffects(){},renderMission(){},m01:{feedbackState:()=>({overlayAlpha:0,exposureFlash:0,suppressionVisual:0,direction:0}),playerHit(){},surfaceDamage(){},impact(){},
      roundFeedback(){},directionalHit(){},muzzle(){},playerLanding(){},explosionFeedback(){},explosion(){}}},
    listeners:[],messageUntil:0,checkpointUntil:0,hitUntil:0,deathBeat:null,deathOffer:null,deaths:{},
    onState:(state,detail)=>states.push([state,detail])});
  el.vignette.classList=new FakeElement().classList;el.message=new FakeElement();el.crosshair=new FakeElement();
  globalThis.document={hidden:false,pointerLockElement:null,exitPointerLock(){}};
  globalThis.localStorage={setItem:(k,v)=>{stored[k]=v;},getItem:k=>stored[k]??null};
  globalThis.requestAnimationFrame=()=>0;
  let now=0;const frame=(sec=FRAME)=>{now+=sec*1000;game.loop(now);};
  return {game,sim,el,presenter,states,stored,ticks,frame,frames:(n,sec=FRAME)=>{for(let i=0;i<n;i++)frame(sec);}};
}
/** Arms a lethal wound by `de_east_1` (engaged long enough for F1) inside the next simulation tick, as a round landing in updateCombat would. */
function armDeath(sim,by='de_east_1'){
  const real=sim.updateCombat;let armed=true;
  sim.updateCombat=function(dt){real.call(this,dt);if(!armed)return;armed=false;this.scene=null;
    const a={id:by,team:'enemy'},L=this.level;this.noteTelegraph(a,'player',1,.075);this.clock+=(L.reactionGraceSec??0)+.3;this.noteTelegraph(a,'player',1,.075);
    this.player.health=Math.min(this.player.health,L.woundDamage);this.woundPlayer({by,kind:'player',weapon:'mg34',firedAt:this.clock});};
  return ()=>{sim.updateCombat=real;};
}
/** One death through the loop until the beat has just ended (the offer, if any, is up) or the checkpoint has been restored. */
function dieAndWait(t){
  armDeath(t.sim);t.frame();   // the tick that kills; the loop stops ticking
  assert.ok(t.game.deathBeat,'the beat began');
  const clock=t.sim.clock;let guard=0;
  while(t.game.deathBeat&&guard++<200)t.frame();
  return clock;
}

test('the beat curve: black in 0.45 s, the cause fades in from 0.3 s and out over the last 0.4 s of 2.5 s; before it nothing',()=>{
  assert.equal(DEATH_BEAT.sec,2.5);assert.equal(DEATH_BEAT.offerAfterDeaths,3);
  assert.deepEqual(deathBeatFrame(-1),{black:0,text:0});assert.deepEqual(deathBeatFrame(NaN),{black:0,text:0});assert.deepEqual(deathBeatFrame(0),{black:0,text:0});
  assert.ok(Math.abs(deathBeatFrame(.225).black-.5)<1e-9);assert.equal(deathBeatFrame(.45).black,1);assert.equal(deathBeatFrame(2.5).black,1);
  assert.equal(deathBeatFrame(.3).text,0);assert.ok(deathBeatFrame(.475).text>.49&&deathBeatFrame(.475).text<.51);assert.equal(deathBeatFrame(.65).text,1);assert.equal(deathBeatFrame(2.0).text,1);
  assert.ok(deathBeatFrame(2.3).text>.49&&deathBeatFrame(2.3).text<.51);assert.equal(deathBeatFrame(2.5).text,0);
  let last=-1;for(let a=0;a<=.45;a+=.01){const b=deathBeatFrame(a).black;assert.ok(b>=last);last=b;}
});

test('a death through Game.loop: the beat shows the cause, the simulation is NOT ticked for 2.5 s of real time, then the next tick restores the checkpoint',()=>{
  const t=liveGame('soldado'),{game,sim,el}=t,saved=JSON.stringify(sim.checkpoint);
  t.frames(3);const before=sim.clock;assert.ok(before>0.1);
  armDeath(sim);t.frame();   // the killing tick
  assert.equal(sim.player.alive,false);assert.equal(sim.failure,'Abatido pela MG34 do dique (portões).');
  assert.ok(game.deathBeat,'player-down began the beat');assert.equal(game.deathBeat.cause,'shot');assert.equal(game.deathBeat.deaths,1);assert.equal(game.deathBeat.offer,null);
  assert.equal(el.deathCause.textContent,'Abatido pela MG34 do dique (portões).');assert.equal(el.deathNote.textContent,'A retomar em CP-A · Orientação · Soldado');
  const deadAt=sim.clock,tickAfterDeath=t.ticks.n;
  // 2.45 s of frames (49 x 50 ms): no tick, the clock is frozen, the screen goes black and the cause is up
  t.frames(49);
  assert.equal(t.ticks.n,tickAfterDeath,'the simulation was not ticked during the beat');assert.equal(sim.clock,deadAt);assert.equal(sim.player.alive,false);
  assert.equal(el.death.styles.get('opacity'),'1.000');assert.ok(Number(el.death.styles.get('--death-text'))>0);
  assert.ok(game.deathBeat.age>2.4&&game.deathBeat.age<2.5);
  t.frame();   // the frame in which the beat reaches 2.5 s
  assert.equal(game.deathBeat,null,'the beat is over');assert.equal(t.ticks.n,tickAfterDeath,'still not ticked in the frame that ended it');
  assert.equal(el.death.styles.get('opacity'),'0.000');
  t.frame();   // the next frame ticks: the simulation restores
  assert.equal(t.ticks.n,tickAfterDeath+1);assert.equal(sim.player.alive,true);assert.equal(JSON.stringify(sim.snapshot(false)),saved,'back at the checkpoint, exactly');
  assert.equal(game.deathBeat,null);assert.equal(game.deathOffer,null);assert.equal(t.states.length,0,'no offer, no pause: the game just goes on');
  assert.equal(game.deaths.cp_m01_a_orientacao,1,'one death counted at CP-A');
});

test('the beat runs on real time: a pause freezes it; it ends exactly after 2.5 s of unpaused frames; a long frame cannot skip it',()=>{
  const t=liveGame('soldado'),{game,sim}=t;armDeath(sim);t.frame();assert.ok(game.deathBeat);
  t.frames(10);const age=game.deathBeat.age;assert.ok(Math.abs(age-.5)<1e-9);
  game.paused=true;t.frames(40);assert.equal(game.deathBeat.age,age,'paused: the beat does not advance');
  game.paused=false;t.frames(39);assert.ok(game.deathBeat&&game.deathBeat.age<2.5);
  t.frames(1);assert.equal(game.deathBeat,null);
  // real time, not simulation time: a slow frame counts what it took (0.25 s is the simulation's cap, not the beat's) and a frame that took minutes (a hidden tab) counts 1 s at most
  const u=liveGame('veterano');armDeath(u.sim);u.frame();u.frame(.25);assert.ok(Math.abs(u.game.deathBeat.age-.25)<1e-9,'a 0.25 s frame is 0.25 s of beat');
  u.frame(.8);assert.ok(Math.abs(u.game.deathBeat.age-1.05)<1e-9,'a slow 0.8 s frame is 0.8 s of beat, not 0.25');
  u.frame(300);assert.ok(Math.abs(u.game.deathBeat.age-2.05)<1e-9,'a frame that took minutes counts 1 s at most');
  u.frame(300);assert.equal(u.game.deathBeat,null,'and the beat ends on the next');
});

test('player-down from the fall, the river and the boundary begins the same beat with their own text',()=>{
  for(const [cause,kill] of [['fall',s=>s.playerLanded({speed:20,drop:20,damage:100,surface:'ground',x:s.player.x,y:s.player.y,z:s.player.z})],
    ['bounds',s=>{s.player.x=410;s.timers.boundary=7.99;}]]){
    const t=liveGame('veterano');
    if(cause==='fall'){const real=t.sim.updateCombat;t.sim.updateCombat=function(dt){real.call(this,dt);if(this.player.alive)kill(this);};}else kill(t.sim);
    t.frames(4);assert.ok(t.game.deathBeat,cause);assert.equal(t.game.deathBeat.cause,cause);
    assert.equal(t.el.deathCause.textContent,{fall:'Você caiu de uma altura fatal.',bounds:'Você se afastou da sua secção.'}[cause]);
  }
});

test('three deaths at one checkpoint: the offer of the next lower level (soldado -> recruta), the game paused on the offer screen; fewer, or recruta, never',()=>{
  const t=liveGame('soldado'),{game,sim}=t;
  dieAndWait(t);t.frames(2);assert.equal(game.deaths.cp_m01_a_orientacao,1);assert.equal(game.deathOffer,null);   // restored, playing
  dieAndWait(t);t.frames(2);assert.equal(game.deaths.cp_m01_a_orientacao,2);assert.equal(game.deathOffer,null);assert.equal(t.states.length,0);
  armDeath(sim);t.frame();assert.equal(game.deathBeat.deaths,3);assert.deepEqual(game.deathBeat.offer,{to:'recruta',deaths:3,checkpoint:'cp_m01_a_orientacao',card:'CP-A · Orientação · Soldado'});
  const ticks=t.ticks.n;t.frames(60);
  assert.equal(game.deathBeat,null);assert.equal(game.paused,true,'the game waits on the offer screen');assert.equal(t.ticks.n,ticks,'not ticked');assert.equal(sim.player.alive,false);
  assert.equal(game.deathOffer.to,'recruta');assert.deepEqual(t.states.at(-1),['death-offer',game.deathOffer]);
  t.frames(30);assert.equal(t.ticks.n,ticks,'paused: nothing runs');
  game.resume();assert.equal(game.paused,true,'resume() does not skip the offer');
  // a fourth death after "tentar de novo" at the same level offers again
  game.restartCheckpoint();assert.equal(game.deathOffer,null);assert.equal(game.sim.difficulty,'soldado');assert.equal(game.paused,false);assert.equal(game.deaths.cp_m01_a_orientacao,3,'the count is kept');
  dieAndWait(t);assert.equal(game.deathOffer.deaths,4);
  // recruta: nothing lower, so deaths never offer anything
  const r=liveGame('recruta');for(let i=0;i<4;i++){dieAndWait(r);r.frames(2);}
  assert.equal(r.game.deaths.cp_m01_a_orientacao,4);assert.equal(r.game.deathOffer,null);assert.equal(r.states.length,0);assert.equal(lowerLevelOf('recruta'),null);
});

test('deaths are counted per checkpoint, and by session only: another checkpoint starts again; a new mission or a lower level resets the count',()=>{
  const t=liveGame('veterano'),{game,sim}=t;
  dieAndWait(t);t.frames(2);dieAndWait(t);t.frames(2);
  sim.saveCheckpoint('cp_m01_b_reorganizacao');   // a later checkpoint: its deaths are its own
  dieAndWait(t);t.frames(2);assert.equal(game.deaths.cp_m01_a_orientacao,2);assert.equal(game.deaths.cp_m01_b_reorganizacao,1);assert.equal(game.deathOffer,null);
  assert.equal(JSON.stringify(sim.checkpoint).includes('deaths'),false,'the counter is not part of the save');
  dieAndWait(t);t.frames(2);dieAndWait(t);assert.equal(game.deathOffer.to,'soldado');assert.equal(game.deathOffer.checkpoint,'cp_m01_b_reorganizacao');assert.equal(game.deathOffer.card,'CP-B · Reorganização após o ataque · Veterano');
  game.restartMission('soldado');assert.deepEqual(game.deaths,{});assert.equal(game.deathOffer,null);assert.equal(game.deathBeat,null);assert.equal(game.sim.difficulty,'soldado');
});

test('"continuar em nível mais baixo": the simulation restores the checkpoint as the lower level, the save keeps it, the counter restarts, the game resumes; the level never rises',()=>{
  const t=liveGame('veterano'),{game,stored}=t;
  for(let i=0;i<2;i++){dieAndWait(t);t.frames(2);}
  dieAndWait(t);assert.equal(game.deathOffer.to,'soldado');
  const clockBefore=game.sim.checkpoint.clock;
  assert.equal(game.continueLowerLevel(),true);
  assert.equal(game.sim.difficulty,'soldado');assert.equal(game.sim.player.alive,true);assert.equal(game.sim.clock,clockBefore,'restored at the checkpoint, now a soldado save');
  assert.equal(game.sim.checkpoint.difficulty,'soldado');validateM01Snapshot(game.sim.checkpoint);
  assert.equal(JSON.parse(stored['cod-guerra:checkpoint:m01:v2']).difficulty,'soldado','the persisted save keeps the lower level');
  assert.deepEqual(game.deaths,{});assert.equal(game.deathOffer,null);assert.equal(game.paused,false);assert.equal(t.states.at(-1)[0],'playing');
  assert.equal(game.continueLowerLevel(),false,'no offer, nothing happens');
  // soldado -> recruta, and the saved JSON then has no difficulty key at all (recruta stays what it was)
  for(let i=0;i<2;i++){dieAndWait(t);t.frames(2);}
  dieAndWait(t);assert.equal(game.deathOffer.to,'recruta');assert.equal(game.continueLowerLevel(),true);
  assert.equal(game.sim.difficulty,'recruta');assert.equal('difficulty' in JSON.parse(stored['cod-guerra:checkpoint:m01:v2']),false);
  // the badge reads the level back from the game; the presenter keeps no level of its own
  assert.equal(game.difficulty,'recruta');
});

test('the checkpoint card carries the level; the save is persisted as before',()=>{
  for(const id of ['recruta','soldado','veterano']){
    const t=liveGame(id),{game,presenter,stored}=t;
    t.sim.saveCheckpoint('cp_m01_b_reorganizacao');
    for(const e of t.sim.drainEvents())game.handleM01Event(e);
    assert.equal(presenter.checkpointName,`CP-B · Reorganização após o ataque · ${M01_DIFFICULTY_LABELS[id]}`,id);
    assert.equal(JSON.parse(stored['cod-guerra:checkpoint:m01:v2']).checkpointsReached.at(-1),'cp_m01_b_reorganizacao');
  }
  const t=liveGame('soldado');t.sim.saveCheckpoint('cp_m01_b2_reparo');for(const e of t.sim.drainEvents())t.game.handleM01Event(e);
  assert.equal(t.presenter.checkpointName,'CP-B2 · Reparo · Soldado');
});

test('sources: the offer screen, the death beat and the wiring exist in the page; the UI only asks the game, and the game only asks the simulation',()=>{
  const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('src/main.js','utf8'),game=fs.readFileSync('src/game/game.js','utf8'),css=fs.readFileSync('src/styles-d5-difficulty.css','utf8');
  for(const id of ['death-beat','death-cause','death-note','death-offer','death-offer-text','death-lower','death-retry','death-menu'])assert.match(html,new RegExp(`id="${id}"`),id);
  assert.match(html,/<section id="death-offer" class="overlay centered hidden"/);assert.match(css,/#death-beat\{/);
  assert.match(main,/\$\('#death-lower'\)\.addEventListener\('click',\(\)=>game\.continueLowerLevel\(\)\)/);assert.match(main,/\$\('#death-retry'\)\.addEventListener\('click',\(\)=>game\.restartCheckpoint\(\)\)/);
  assert.match(main,/state==='death-offer'/);
  assert.match(game,/this\.sim\.lowerDifficulty\(offer\.to\)/);assert.match(game,/event\.type==='player-down'/);
  // the game never decides the death or the level itself: no health, no failure and no snapshot surgery in the presentation
  const beat=game.slice(game.indexOf('beginDeathBeat('),game.indexOf('get difficulty()'));
  assert.doesNotMatch(beat,/\.health\s*[-+*]?=[^=]|\.alive\s*=[^=]|\.failure\s*=[^=]|relevelSnapshot|restoreSnapshot/);
});
