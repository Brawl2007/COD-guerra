import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { M01_DIFFICULTY_IDS, M01_DIFFICULTY_NEW_GAME } from '../src/game/m01-difficulty.js';
import { M01_DIFFICULTY_LABELS } from '../src/ui/m01-hud.js';
import { M01Simulation } from '../src/game/m01-simulation.js';

// H9 D5: the selector only passes the level; these tests pin the contract between the UI sources and the simulation. Not a playtest.
const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('src/main.js','utf8'),game=fs.readFileSync('src/game/game.js','utf8');

test('the menu offers exactly the three levels in order, soldado selected, with pt-PT labels',()=>{
  const select=html.match(/<select id="difficulty">(.*?)<\/select>/s)?.[1];assert.ok(select);
  const options=[...select.matchAll(/<option value="(\w+)"( selected)?>([^<]+)<\/option>/g)].map(m=>({id:m[1],selected:Boolean(m[2]),text:m[3]}));
  assert.deepEqual(options.map(o=>o.id),[...M01_DIFFICULTY_IDS]);
  assert.deepEqual(options.filter(o=>o.selected).map(o=>o.id),['soldado']);assert.equal(M01_DIFFICULTY_NEW_GAME,'soldado');
  for(const o of options)assert.equal(o.text,M01_DIFFICULTY_LABELS[o.id]);
  assert.deepEqual(Object.keys(M01_DIFFICULTY_LABELS),[...M01_DIFFICULTY_IDS]);
});
test('new games and replay pass the choice to the simulation; continue does not touch it',()=>{
  assert.match(main,/const newGame=\(\)=>game\.restartMission\(game\.isM01\?\$\('#difficulty'\)\.value:undefined\)/);
  assert.equal((main.match(/newGame\(\)/g)??[]).length,2);
  const cont=main.match(/\$\('#continue'\)\.addEventListener\('click'.*?\}\);/s)[0];assert.match(cont,/game\.start\(\{continueSaved:true\}\)/);assert.doesNotMatch(cont,/difficulty/i);
  assert.match(html,/id="pause-difficulty"/);assert.match(html,/id="difficulty-badge"/);
  assert.match(game,/new M01Simulation\(undefined,\{difficulty\}\)/);
});
test('the level chosen at a new game is the simulation level and survives snapshot, restore and checkpoint restart',()=>{
  const recruta=new M01Simulation(undefined,{difficulty:'recruta'}),legacy=new M01Simulation();
  assert.deepEqual(recruta.snapshot(),legacy.snapshot());assert.equal('difficulty' in recruta.snapshot(),false);   // recruta stays byte-identical, no new key
  for(const id of ['soldado','veterano']){
    const sim=new M01Simulation(undefined,{difficulty:id}),saved=JSON.stringify(sim.snapshot());assert.equal(JSON.parse(saved).difficulty,id);
    const loaded=new M01Simulation();assert.equal(loaded.loadCheckpoint(saved).ok,true);assert.equal(loaded.difficulty,id);
    loaded.restoreCheckpoint();assert.equal(loaded.difficulty,id);
  }
  const sim=new M01Simulation(undefined,{difficulty:'veterano'});sim.reset();assert.equal(sim.difficulty,'veterano');
});
