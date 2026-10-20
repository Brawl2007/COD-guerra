import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation,validateM01Snapshot} from '../src/game/m01-simulation.js';
import {Game} from '../src/game/game.js';
import {driver,toRepair,route} from './helpers/m01-route.js';
import {deathCard,DEATH_BEAT_MS} from '../src/ui/m01-hud.js';
import {validateM01AudioEvent} from '../src/game/m01-audio-events.js';
const CP='cp_m01_b2_reparo';
const fresh=id=>{const s=new M01Simulation(19390901,{difficulty:id});s.tick(.05,{skip:true});s.drainEvents();return s;};
function lethal(s,by='de_east_0'){
 const a=s.actor(by);s.player.health=s.level.woundDamage;
 if(s.level.reactionGraceSec!==null){s.noteTelegraph(a,'player',1,.075);s.clock+=s.level.reactionGraceSec+.1;s.noteTelegraph(a,'player',1,.075);}
 const before=s.rng.state;s.woundPlayer({by,weapon:a.weapon,firedAt:s.clock,kind:'player'});assert.equal(s.rng.state,before);return s.drainEvents();
}
for(const id of ['recruta','soldado','veterano'])test(`${id}: the actual lethal round publishes its source once, with no additional draw`,()=>{
 const s=fresh(id),events=lethal(s),down=events.filter(e=>e.type==='player-down');assert.equal(down.length,1);
 assert.equal(down[0].by,'de_east_0');assert.match(down[0].cause,/MG34.*portões de Lisewo/);assert.equal(s.failure,down[0].cause);assert.equal(s.player.alive,false);
 s.woundPlayer({by:'de_east_0',firedAt:s.clock});assert.equal(s.drainEvents().filter(e=>e.type==='player-down').length,0);
 s.tick(.05);assert.equal(s.player.alive,true);assert.equal(s.drainEvents().filter(e=>e.type==='restored').length,1);
});
test('a nonlethal or fair-death-clamped wound never creates a death event',()=>{
 const s=fresh('soldado');s.player.health=1;s.woundPlayer({by:'de_east_20',firedAt:s.clock});assert.equal(s.player.alive,true);assert.equal(s.drainEvents().some(e=>e.type==='player-down'),false);
});
test('fall and water publish their actual existing reasons, not an invented shooter',()=>{
 let s=fresh('soldado');s.playerLanded({speed:15,drop:10,damage:100,surface:'ground',x:s.player.x,y:s.player.y,z:s.player.z});
 let down=s.drainEvents().find(e=>e.type==='player-down');assert.deepEqual(down,{type:'player-down',cause:'Você caiu de uma altura fatal.',by:null});
 s=fresh('soldado');s.player.y=-10;s.timers.water=7.99;s.boundaries(.05);down=s.drainEvents().find(e=>e.type==='player-down');assert.equal(down.cause,'Você caiu no Vístula.');assert.equal(down.by,null);
});
for(const id of ['soldado','veterano','recruta'])test(`${id}: the real crate-delivery route captures CP-B2 only when applicable, after the complete tick`,()=>{
 class Level extends M01Simulation{constructor(seed){super(seed,{difficulty:id});}}
 const d=toRepair(driver(19390901,{Simulation:Level})),s=d.sim;
 assert.equal(s.checkpointsReached.includes(CP),id!=='recruta');assert.equal(s.checkpointEnabled(CP),id!=='recruta');
 if(id==='recruta'){assert.equal(s.checkpoint.difficulty,undefined);return;}
 assert.equal(s.checkpoint.checkpointsReached.at(-1),CP);assert.equal(s.checkpoint.player.carrying,null);assert.equal(s.checkpoint.player.health,100);
 assert.equal(s.checkpoint.objectives.obj_m01_fetch_material.state,'done');assert.equal(s.checkpoint.objectives.obj_m01_cover_repair.state,'active');
 assert.equal(s.checkpoint.mission.text,'Proteja o reparo da linha');assert.equal(s.checkpoint.dialogueConsumed.includes('dlg_m01_024'),true);
 validateM01Snapshot(s.checkpoint);const saved=structuredClone(s.checkpoint),restored=new M01Simulation();restored.restoreSnapshot(saved);assert.deepEqual(restored.snapshot(false),saved);
 s.player.health=1;s.player.alive=false;s.tick(.05);assert.deepEqual(s.snapshot(false),saved,'death restores exactly the saved repair state, ammunition, clocks, actors and RNG');
});
test('CP-B2 cannot be disguised as a legacy Recruit save; rejection is atomic',()=>{
 class Level extends M01Simulation{constructor(seed){super(seed,{difficulty:'soldado'});}}
 const s=toRepair(driver(19390901,{Simulation:Level})).sim,invalid=s.snapshot(false);delete invalid.difficulty;
 const target=fresh('recruta'),before=target.snapshot();assert.equal(target.loadCheckpoint(JSON.stringify(invalid)).ok,false);assert.deepEqual(target.snapshot(),before);
});
test('presentation freezes simulation and resumes at the real checkpoint only after 2.5 active seconds; pausing preserves the beat',()=>{
 const s=fresh('soldado'),events=lethal(s),g=Object.assign(Object.create(Game.prototype),{sim:s,last:0,input:{clear(){}},onState(){},m01Hud:{reset(){}},renderer:{resetEffects(){}},hud:{message:{textContent:''}},rebuildSounds(){},messageUntil:0});
 g.handleM01Event(events.find(e=>e.type==='player-down'));const saved=s.snapshot(),card=deathCard(g.m01Down);
 assert.match(card.lines[0],/MG34/);assert.match(card.lines[1],/CP-A/);assert.equal(card.lines[2],'Soldado');
 assert.equal(g.playerDownBlocksFrame(1000,true),true);assert.deepEqual(s.snapshot(),saved);
 assert.equal(g.playerDownBlocksFrame(1200,false),true);assert.equal(g.playerDownBlocksFrame(12000,true),true);
 assert.equal(g.playerDownBlocksFrame(12000+DEATH_BEAT_MS-1001,true),true);assert.deepEqual(s.snapshot(),saved);
 assert.equal(g.playerDownBlocksFrame(12000+DEATH_BEAT_MS-1000,true),false);
 s.tick(.05);for(const e of s.drainEvents())g.handleM01Event(e);assert.equal(s.player.alive,true);assert.equal(g.m01Down,null);
 assert.equal(g.hud.message.textContent,'A retomar o último checkpoint','the death cause does not replace the restored objective context');assert.equal(g.m01Deaths.get('cp_m01_a_orientacao'),1);
});
test('only a real down player can enter the beat and the event contract requires cause/source',()=>{
 const g=Object.assign(Object.create(Game.prototype),{sim:fresh('soldado')});g.beginPlayerDown({cause:'test',by:null});assert.equal(g.m01Down,undefined);
 assert.throws(()=>validateM01AudioEvent({type:'player-down',cause:'',by:null}));assert.throws(()=>validateM01AudioEvent({type:'player-down',cause:'Real cause'}));
});

test('repair checkpoint cannot be captured before actual material delivery or while carrying cargo',()=>{
 const s=fresh('soldado');s.activate('cover_repair');s.tick(.05);assert.equal(s.checkpointsReached.includes(CP),false);
 s.finish('fetch_material');s.player.carrying='sapper_crate';s.saveCheckpoint(CP);assert.equal(s.checkpointsReached.includes(CP),false);
 s.player.carrying=null;s.tick(.05);assert.equal(s.checkpointsReached.at(-1),CP);
});
test('a real grenade blast that kills the player publishes the grenade cause once',()=>{
 const s=fresh('soldado'),p=s.player;s.player.health=1;
 s.grenades.active.push({id:'m01_grenade_test',space:'metres',x:p.x,y:p.y+.9,z:p.z,vx:0,vy:0,vz:0,fuse:0});
 s.updateGrenades(.05,false);const down=s.drainEvents().filter(e=>e.type==='player-down');
 assert.equal(s.player.alive,false);assert.deepEqual(down,[{type:'player-down',cause:'Explosão de granada.',by:null}]);
});

for(const id of ['recruta','soldado','veterano'])test(`${id}: actual supported route restores CP-C and CP-D exactly after a lethal round`,()=>{
 class Level extends M01Simulation{constructor(seed){super(seed,{difficulty:id});}}
 const checkpoints={};route(19390901,{Simulation:Level,support:true,onStep:({sim})=>{
  const cp=sim.checkpointsReached.at(-1);if(['cp_m01_c_engenheiros','cp_m01_d_retirada'].includes(cp)&&!checkpoints[cp])checkpoints[cp]=structuredClone(sim.checkpoint);
 }});
 assert.deepEqual(Object.keys(checkpoints),['cp_m01_c_engenheiros','cp_m01_d_retirada']);
 for(const [cp,snapshot]of Object.entries(checkpoints)){
  const sim=new M01Simulation();sim.restoreSnapshot(snapshot);sim.drainEvents();
  assert.equal(lethal(sim).filter(e=>e.type==='player-down').length,1);assert.equal(sim.player.alive,false);
  sim.tick(.05);assert.equal(sim.player.alive,true);assert.equal(sim.checkpointsReached.at(-1),cp);assert.deepEqual(sim.snapshot(false),snapshot);
 }
});
