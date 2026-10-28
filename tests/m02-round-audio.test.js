import test from 'node:test';
import assert from 'node:assert/strict';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {M02Presentation} from '../src/render/m02-presentation.js';
import {m02RoundPass,playM02RoundAudio} from '../src/render/m02-round-audio.js';

test('near passes use the finite collision-resolved segment and do not pass through walls',()=>{
 const player={x:0,y:0,z:0,eyeHeight:1.65},world={obstacles:[]};
 const trace={origin:{x:-8,y:1.65,z:1},point:{x:8,y:1.65,z:1}};
 assert.ok(Math.abs(m02RoundPass(trace,player,world).distance-1)<1e-9);
 assert.equal(m02RoundPass({...trace,point:{x:-2,y:1.65,z:1}},player,world),null,'a round stopped before the player is not a near pass');
 assert.equal(m02RoundPass({...trace,point:{x:8,y:5,z:10}},player,world),null,'a distant round is silent');
 world.obstacles.push({min:{x:-1,y:0,z:.4},max:{x:1,y:3,z:.6},material:'stone'});
 assert.equal(m02RoundPass(trace,player,world),null,'a solid wall separates the listener from the round');
});

test('an unobstructed hostile round passing the listener plays one directional crack, while friendly fire does not',()=>{
 const sim={player:{x:0,y:0,z:0,eyeHeight:1.65},world:{obstacles:[]}},calls=[];
 const audio={crack(...args){calls.push(args);}};
 const trace={origin:{x:-8,y:1.65,z:1},point:{x:8,y:1.65,z:1},hitKind:'none'};
 const spatial=()=>({pan:.6,front:.8,distance:1});
 playM02RoundAudio(audio,trace,sim,spatial,'hostile',{nearPass:true});
 playM02RoundAudio(audio,trace,sim,spatial,'friendly');
 assert.deepEqual(calls,[[.6,1,'hostile:pass',.8]]);
});

test('real blocked NPC round plays a local material impact; player impact uses its position and snapshots remain intact',()=>{
 const sim=new M02BenchSimulation();sim.enterAreaBC06();sim.allies=[];
 const gun=sim.enemies.find(a=>a.weapon==='mg34');sim.enemies=[gun];
 Object.assign(gun,{x:0,y:0,z:100,mag:50,suppressed:0});Object.assign(sim.player,{x:0,y:0,z:120,eyeHeight:1.65,angle:0});
 sim.world.obstacles.push({id:'audio-wall',min:{x:-3,y:0,z:103},max:{x:3,y:3,z:103.3},material:'wood_thick'});
 sim.fireActorBurst(gun,sim.player,{x:0,y:1.25,z:120},'enemy');
 const events=sim.drainEvents(),round=events.find(e=>e.type==='actor-burst');
 assert.equal(round.traces[0].hitKind,'world');assert.equal(round.traces[0].material,'wood_thick');
 assert.ok(round.traces[0].point.z-round.traces[0].origin.z>1);
 const calls=[],audio={ctx:{state:'running'},resetPresentation(){},setOcclusion(v){calls.push(['occlusion',v]);},weaponFire(...a){calls.push(['fire',...a]);},impact(...a){calls.push(['impact',...a]);},crack(...a){calls.push(['crack',...a]);},wz29Shot(){},wz29Mechanism(){}};
 const p=Object.create(M02Presentation.prototype);Object.assign(p,{audio,resetClock:sim.clock,playerRecord:sim.player,presentationWorld:sim.world,fireTimes:new Map(),roundEvents:new Map()});
 const before=sim.snapshot();p.consume(events,sim);
 const impact=calls.find(c=>c[0]==='impact');assert.equal(impact[1],'wood');assert.ok(impact[3]>16&&impact[3]<18);assert.equal(calls.some(c=>c[0]==='crack'),false);
 assert.deepEqual(calls[calls.indexOf(impact)-1],['occlusion',{hz:1200,gain:.4}],'the impact on the far side of the wall is muffled');
 p.consume([{type:'shot-fired',shot:{id:'player-test',hitKind:'world',material:'metal',point:{x:0,y:1,z:115}}}],sim);
 const own=calls.filter(c=>c[0]==='impact').at(-1);assert.equal(own[1],'metal');assert.ok(Math.abs(own[3]-5)<1e-9);assert.ok(own[2]<-.99);
 assert.deepEqual(sim.snapshot(),before);
});
