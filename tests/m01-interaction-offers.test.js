import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Simulation} from '../src/game/m01-simulation.js';
const fresh=()=>{const s=new M01Simulation();s.tick(.05,{skip:true});s.drainEvents();return s;};
const configure=(kind,distance)=>{
 const s=fresh(),p=s.player;for(const o of Object.values(s.objectives))o.state='locked';
 const bak=s.actor('jozef_bak');Object.assign(bak,{alive:true,active:true,state:'WOUNDED',carriedBy:null});delete bak.carry;
 const objective=kind.includes('crate')?'fetch_material':kind.includes('bak')?'rescue_bak':'deliver_message';s.activate(objective);
 const target=kind==='take_bak'?bak:s.world.point({take_crate:'rail_hut',deliver_crate:'repair_site_2',deliver_bak:'aid_position',deliver_message:'forward_post'}[kind]);
 Object.assign(p,{x:target.x-distance,z:target.z,y:target.y,carrying:kind==='deliver_bak'?'jozef_bak':kind==='deliver_crate'?'sapper_crate':null});
 if(kind==='deliver_bak'){bak.active=false;bak.carriedBy=p.id;bak.carry={phase:'carry',startedAt:s.clock,duration:1.6};}
 return s;
};
for(const [kind,range]of [['take_bak',3],['deliver_bak',4],['take_crate',5],['deliver_crate',6],['deliver_message',4]])test(`the ${kind} offer and action agree at both sides of the ${range} m boundary`,()=>{
 for(const d of [range-.001,range,range+.001,range+.5]){
  const s=configure(kind,d),before=JSON.stringify({carrying:s.player.carrying,objectives:s.objectives,flags:s.flags});
  const available=d<range;assert.equal(s.interactionAction()?.id??null,available?kind:null);
  assert.equal(s.interaction.startsWith('E ·'),available);
  s.updateObjectives(0,true);
  assert.equal(JSON.stringify({carrying:s.player.carrying,objectives:s.objectives,flags:s.flags})!==before,available);
 }
});
test('invalid actor, death, locked scene, other cargo and carry transitions never offer or execute E',()=>{
 const blockers=[s=>s.actor('jozef_bak').alive=false,s=>s.actor('jozef_bak').active=false,s=>s.actor('jozef_bak').state='GUARD',s=>s.actor('jozef_bak').carriedBy='leon_dudek',s=>s.player.alive=false,s=>s.player.active=false,s=>s.scene={id:'cs_m01_intro',elapsed:1,beats:[]},s=>s.player.carrying='sapper_crate'];
 for(const block of blockers){const s=configure('take_bak',2);block(s);assert.equal(s.interactionAction(),null);s.updateObjectives(0,true);assert.notEqual(s.player.carrying,'jozef_bak');}
 for(const phase of ['pickup','putdown']){const s=configure('deliver_bak',2);s.actor('jozef_bak').carry.phase=phase;assert.equal(s.interactionAction(),null);s.updateObjectives(0,true);assert.equal(s.player.carrying,'jozef_bak');}
});
test('saved carry reconstructs the same delivery offer and completion without an extra saved field',()=>{
 const s=configure('deliver_bak',2);
 const saved=s.snapshot(),r=fresh();r.restoreSnapshot(saved);assert.deepEqual(r.interactionAction(),s.interactionAction());
 for(const sim of [s,r])sim.updateObjectives(0,true);assert.deepEqual(r.snapshot(),s.snapshot());
});
test('pre-roll staging directions are consumed once without leaking to messages or claiming a gesture',()=>{
 const s=fresh(),scene=s.definition.cutscenes.find(c=>c.id==='cs_m01_west_blast');
 s.battleClock=6*3600+45*60-.1;s.readiness=()=>true;
 s.updatePreRoll();const first=s.drainEvents();s.updatePreRoll();
 assert.equal(first.some(e=>e.type==='message'&&scene.preRoll.timeline.some(b=>b.action===e.message)),false);
 assert.ok(s.dialogueConsumed.includes(`${scene.id}:pre:1`),'old beat token preserved');
 assert.deepEqual(s.drainEvents(),[],'no duplicate production action event');
 assert.ok(s.dialogueConsumed.includes(scene.preRoll.timeline.find(b=>b.line).line),'spoken line remains');
});

test('interaction confirmations carry priority and exact objective scope for the existing HUD line',()=>{
 const s=configure('take_bak',2);s.updateObjectives(0,true);
 const msg=s.drainEvents().find(e=>e.type==='message'&&/Bąk está consigo/.test(e.message));
 assert.equal(msg.priority,2);assert.deepEqual(msg.scope,{id:'obj_m01_rescue_bak',state:'active'});
 const aid=s.world.point('aid_position');Object.assign(s.player,aid);s.actor('jozef_bak').carry.phase='carry';s.updateObjectives(0,true);
 const done=s.drainEvents().find(e=>e.type==='message'&&/Bąk entregue/.test(e.message));assert.equal(done.priority,2);assert.deepEqual(done.scope,{id:'obj_m01_rescue_bak',state:'done'});
});
