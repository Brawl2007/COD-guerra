// R4 INC-1 risks 1 and 2: which save "Continuar" opens with the acts switch on, and that a new game cannot leave the old act save reachable.
// Real Game.start / Game.restartMission over recording stubs (no DOM); localStorage is a plain object.
import test from 'node:test';
import assert from 'node:assert/strict';
import {M01ActRunner} from '../src/game/m01-acts.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {Game} from '../src/game/game.js';
import {chooseContinue} from '../src/game/m01-save-select.js';

const ACT_KEY='cod-guerra:checkpoint:m01:acts:v3',BACKUP=ACT_KEY+':backup',BASE_KEY='cod-guerra:checkpoint:m01:v2';
const on=new M01ActRunner({enabled:true}),qa=new M01ActRunner({enabled:true,startAct:'vii-a'});
const actText=()=>JSON.stringify(qa.envelope(qa.createInitial()));
const baseText=()=>JSON.stringify(new M01Simulation().checkpoint);

function setup(stored,runner){
  const states=[],said=[];
  globalThis.localStorage={setItem:(k,v)=>{stored[k]=v;},getItem:k=>stored[k]??null,removeItem:k=>{delete stored[k];}};
  globalThis.document={pointerLockElement:null,exitPointerLock(){}};
  const game=Object.create(Game.prototype);
  Object.assign(game,{acts:runner,sim:new M01Simulation(),started:false,paused:true,touch:true,pendingSounds:[],deaths:{},
    m01Hud:{reset(){}},audio:{init(){},resetPresentation(){}},audioDirector:null,input:{clear(){}},renderer:{resetEffects(){}},
    onState:(s,d)=>states.push([s,d]),say:t=>said.push(t),rebuildSounds(){},endDeathBeat(){},resume(){}});
  return {game,states,said};
}

test('pure rule: absent, valid and invalid act envelopes',()=>{
  const a=actText(),b=baseText();
  assert.equal(chooseContinue(on,null,b).source,'base');
  assert.equal(chooseContinue(on,a,b).source,'acts');
  const bad=chooseContinue(on,'{"schema":3,"x":1}',b);
  assert.deepEqual([bad.source,bad.text,bad.rejected],['base',b,'{"schema":3,"x":1}']);
});

test('new game, then Continue: the old VII-a save is out of reach and kept under the backup key',()=>{
  const a=actText(),stored={[ACT_KEY]:a};
  const {game,states}=setup(stored,on);
  game.restartMission('soldado');
  assert.equal(stored[ACT_KEY],undefined);assert.equal(stored[BACKUP],a);
  assert.equal(game.started,true);
  game.started=false;stored[BASE_KEY]=baseText();
  assert.equal(game.start({continueSaved:true}),true);assert.equal(game.sim.constructor.name,'M01Simulation');assert.deepEqual(states.filter(s=>s[0]==='save-error'),[]);
});

test('VII-a save + act-1 save: the valid act envelope wins (newer by construction); without it the act-1 save opens',()=>{
  const stored={[ACT_KEY]:actText(),[BASE_KEY]:baseText()};
  const {game}=setup(stored,on);
  assert.equal(game.start({continueSaved:true}),true);assert.equal(game.sim.constructor.name,'M01AreaSimulation');
  const g2=setup({[BASE_KEY]:baseText()},on).game;
  assert.equal(g2.start({continueSaved:true}),true);assert.equal(g2.sim.constructor.name,'M01Simulation');
});

test('invalid act envelope + valid act-1 save: falls back with a notice, keeps the blob under the backup key, no save-error',()=>{
  const bad='{"schema":3,"broken":true}',stored={[ACT_KEY]:bad,[BASE_KEY]:baseText()};
  const {game,states,said}=setup(stored,on);
  assert.equal(game.start({continueSaved:true}),true);
  assert.equal(game.sim.constructor.name,'M01Simulation');assert.equal(stored[BACKUP],bad);assert.equal(stored[ACT_KEY],undefined);
  assert.equal(said.length,1);assert.deepEqual(states.filter(s=>s[0]==='save-error'),[]);
});

test('invalid act envelope and no act-1 save: save-error, and nothing is deleted',()=>{
  const bad='{"schema":3,"broken":true}',stored={[ACT_KEY]:bad};
  const {game,states}=setup(stored,on);
  assert.equal(game.start({continueSaved:true}),false);assert.equal(states.at(-1)[0],'save-error');
  assert.equal(stored[ACT_KEY],bad);assert.equal(stored[BACKUP],bad);
});

test('acts off: the acts key is never read nor written',()=>{
  const touched=[],stored={[BASE_KEY]:baseText(),[ACT_KEY]:actText()};
  const {game}=setup(stored,null);
  const g=globalThis.localStorage;
  globalThis.localStorage={getItem:k=>{touched.push(k);return g.getItem(k);},setItem:(k,v)=>{touched.push(k);g.setItem(k,v);},removeItem:k=>{touched.push(k);g.removeItem(k);}};
  assert.equal(game.start({continueSaved:true}),true);game.started=false;game.restartMission();
  assert.deepEqual(touched.filter(k=>k.includes(':acts:')),[]);
});
