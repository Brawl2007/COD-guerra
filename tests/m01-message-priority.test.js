import test from 'node:test';
import assert from 'node:assert/strict';
import {messageIsCurrent,acceptsMessage} from '../src/ui/m01-hud.js';
import {M01Simulation} from '../src/game/m01-simulation.js';
import {Game} from '../src/game/game.js';
test('single HUD message prioritises confirmation and urgency; objective change or clock expiry invalidates stale guidance',()=>{
 const states={rescue:{state:'active'}},active={until:4000,priority:2,scope:{id:'rescue',state:'active'}};
 assert.equal(acceptsMessage(active,0,1000,states),false);assert.equal(acceptsMessage(active,1,1000,states),false);
 assert.equal(acceptsMessage(active,3,1000,states),true);assert.equal(messageIsCurrent(active,4000,states),false);
 states.rescue.state='done';assert.equal(messageIsCurrent(active,1000,states),false);assert.equal(acceptsMessage(active,0,1000,states),true);
});
test('Game uses the existing message node, honours priority, and a replaced world cannot retain a confirmation',()=>{
 const g={isM01:true,sim:{clock:1,world:{},objectives:{}},hud:{message:{textContent:''}},messageUntil:0};
 const say=(...args)=>Game.prototype.say.call(g,...args);
 say('Bąk entregue',3600,{priority:2});say('MG distante',2600,{priority:0});assert.equal(g.hud.message.textContent,'Bąk entregue');
 say('Abrigue-se',2600,{priority:3});assert.equal(g.hud.message.textContent,'Abrigue-se');
 g.sim.world={};say('A retomar');assert.equal(g.hud.message.textContent,'A retomar');
 g.sim.clock=10;say('Próxima ordem');assert.equal(g.hud.message.textContent,'Próxima ordem');
});

test('continuity messages inherit their real objective scope and cannot survive its completion',()=>{
 const sim=new M01Simulation();sim.activate('cover_repair');
 const g=Object.assign(Object.create(Game.prototype),{sim,hud:{message:{textContent:''}},messageUntil:0});
 g.handleM01Event({type:'message',message:'Reparo: 50%',continuity:{kind:'repair'}});
 assert.equal(g.messageRecord.priority,0);assert.deepEqual(g.messageRecord.scope,{id:'obj_m01_cover_repair',state:'active'});
 sim.finish('cover_repair');assert.equal(messageIsCurrent(g.messageRecord,sim.clock*1000,sim.objectives),false);
 g.say('Próxima ordem',2600,{priority:0});assert.equal(g.hud.message.textContent,'Próxima ordem');
});
