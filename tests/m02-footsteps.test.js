import test from 'node:test';
import assert from 'node:assert/strict';
import {M02Footsteps} from '../src/render/m02-footsteps.js';
import {M02BenchSimulation} from '../src/game/m02-01-simulation.js';
import {AudioCore} from '../src/core/audio/core.js';
import {surfaceAt,zoneAt} from '../src/core/audio/layout.js';

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

test('M02 feeds M01 footsteps and room reverb from the visible floor and active cell',()=>{
 const core=new AudioCore(),calls=[],audio={core,setLayout:raw=>core.setLayout(raw),setListener:(x,y,z)=>core.update(x,y,z),footstep:(...args)=>calls.push(args)};
 const foley=new M02Footsteps(audio),sim=new M02BenchSimulation(),before=sim.snapshot();
 const player={...sim.player,x:-36,y:0,z:-15},ally={id:'ally',team:'ally',active:true,alive:true,x:-35,y:0,z:-15};
 for(let i=0;i<26;i++){player.x+=.08;ally.x+=.08;foley.update(player,[ally],i*.05,sim.world);}
 assert.equal(core.layout.ok,true);assert.equal(core.zone.id,'m02_B01');assert.equal(core.surface.material,'wood');
 assert.ok(calls.some(c=>c[0]==='wood'&&!c[1].npc));assert.ok(calls.some(c=>c[0]==='wood'&&c[1].npc));
 assert.equal(surfaceAt(core.layout,-35,1,-15).material,'earth','wood floor is limited to foot height');
 assert.equal(zoneAt(core.layout,0,0,-80).id,'open');
 assert.deepEqual(sim.snapshot(),before,'audio classification never changes the simulation');
 sim.enterAreaBC06();foley.update(player,[ally],2,sim.world);
 assert.equal(core.zone.id,'open');assert.equal(core.surface.material,'earth','a previous cell cannot leave a ghost floor');
 assert.equal(zoneAt(core.layout,-50,0,-24).id,'m02_B05');
 assert.equal(surfaceAt(core.layout,-50,0,-24).material,'earth','B05 has the earth floor shown by the renderer');
});

test('a nearby ally step is muffled by a real wall and never leaks its filter to later sounds',()=>{
 const sim=new M02BenchSimulation(),before=sim.snapshot(),heard=[];let occlusion=null;
 const audio={setOcclusion:value=>{occlusion=value;},footstep:(material,opts)=>heard.push({material,opts,occlusion})};
 const foley=new M02Footsteps(audio),player={...sim.player,x:-42,y:0,z:-16},ally={id:'ally',team:'ally',active:true,alive:true,x:-39,y:0,z:-16};
 assert.equal(sim.world.lineOfSight(player,{...ally,space:'metres',eyeHeight:.2},{includeFoliage:false}),false);
 for(let i=0;i<28;i++){ally.z+=.08;foley.update(player,[ally],i*.05,sim.world);assert.equal(occlusion,null);}
 assert.ok(heard.some(step=>step.opts.npc&&step.occlusion?.hz===1200&&step.occlusion.gain===.4));
 heard.length=0;foley.reset();player.x=-46;ally.x=-44;ally.z=-16;
 assert.equal(sim.world.lineOfSight(player,{...ally,space:'metres',eyeHeight:.2},{includeFoliage:false}),true);
 for(let i=0;i<28;i++){ally.z+=.08;foley.update(player,[ally],2+i*.05,sim.world);assert.equal(occlusion,null);}
 assert.ok(heard.some(step=>step.opts.npc&&step.occlusion===null));
 assert.deepEqual(sim.snapshot(),before);
});
