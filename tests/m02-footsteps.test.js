import test from 'node:test';
import assert from 'node:assert/strict';
import {M02Footsteps} from '../src/render/m02-footsteps.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';

test('M02 reuses M01 distance-based steps: holding movement into a wall is silent, walking and nearby allies sound',()=>{
 const calls=[],foley=new M02Footsteps({footstep:(...args)=>calls.push(args)}),sim=new M02BenchSimulation(),before=sim.snapshot();
 const player={...sim.player,moving:true},ally={id:'ally',team:'ally',active:true,alive:true,x:1,z:player.z};
 for(let i=0;i<50;i++)foley.update(player,[ally],i*.05);
 assert.equal(calls.length,0,'commanded velocity without displacement must be silent');
 for(let i=0;i<20;i++){player.x+=.12;ally.x+=.12;foley.update(player,[ally],3+i*.05);}
 assert.ok(calls.some(c=>!c[1].npc));assert.ok(calls.some(c=>c[1].npc));
 const count=calls.length;for(let i=0;i<20;i++)foley.update(player,[ally],4);assert.equal(calls.length,count,'pause cannot walk');
 foley.reset();player.x+=1;foley.update(player,[ally],1);assert.equal(calls.length,count,'restoring nearby is not a stride');
 player.x+=100;foley.update(player,[ally],1.05);assert.equal(calls.length,count,'streaming is not walking');
 assert.deepEqual(sim.snapshot(),before);
});
