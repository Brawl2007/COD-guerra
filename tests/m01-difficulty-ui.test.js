import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/game.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {difficultyText} from '../src/ui/m01-hud.js';
function fixture(sim=new M01Simulation()){
 return Object.assign(Object.create(Game.prototype),{sim,started:false,paused:true,pendingSounds:[],renderer:{resetEffects(){}},audio:{resetPresentation(){},init(){}},input:{clear(){}},m01Hud:{reset(){},checkpoint(){}},rebuildSounds(){},resume(){this.paused=false;},requestControl(){this.paused=false;},persistCheckpoint(){}});
}
for(const id of ['recruta','soldado','veterano'])test(`new mission selects ${id}, replay and checkpoint keep that level`,()=>{
 const g=fixture();g.restartMission({difficulty:id});assert.equal(g.sim.difficulty,id);assert.equal(g.sim.player.health,100);assert.equal(g.sim.weapon.mag,5);assert.equal(g.sim.weapon.reserve,40);
 const snapshot=g.sim.snapshot();g.restartMission();assert.equal(g.sim.difficulty,id);assert.deepEqual(g.sim.snapshot(),snapshot);g.sim.restoreCheckpoint();assert.equal(g.sim.difficulty,id);
 assert.equal(g.difficultyLabel,difficultyText(id));
});
test('a new Recruta game remains byte-identical to the existing simulation default',()=>{
 const g=fixture();g.restartMission({difficulty:'recruta'});assert.deepEqual(g.sim.snapshot(),new M01Simulation().snapshot());
});
test('Continue honours an old save without difficulty even when the current menu game is Soldado',()=>{
 const legacy=new M01Simulation().snapshot();assert.equal(legacy.difficulty,undefined);
 const original=globalThis.localStorage;globalThis.localStorage={getItem:()=>JSON.stringify(legacy)};
 try{const g=fixture(new M01Simulation(17,{difficulty:'soldado'}));g.start({continueSaved:true});assert.equal(g.sim.difficulty,'recruta');assert.equal(g.difficultyLabel,'Recruta');}finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original;}
});
test('an invalid new-game level rejects without destroying the running state',()=>{
 const g=fixture(),old=g.sim,saved=old.snapshot();assert.throws(()=>g.restartMission({difficulty:'unknown'}),RangeError);assert.equal(g.sim,old);assert.deepEqual(g.sim.snapshot(),saved);
});
test('checkpoint notification names the saved level; sandbox receives no M01 difficulty',()=>{
 const g=fixture(new M01Simulation(17,{difficulty:'veterano'}));let text;g.m01Hud.checkpoint=value=>text=value;
 g.handleM01Event({type:'checkpoint',id:'cp_m01_a_orientacao'});assert.match(text,/CP-A · Orientação · Veterano$/);
 let resets=0;const sandbox={missionId:'sandbox-1944',clock:0,reset(){resets++;}},other=fixture(sandbox);other.restartMission({difficulty:'soldado'});assert.equal(resets,1);assert.equal(other.sim,sandbox);assert.equal(other.difficultyLabel,'');
});
