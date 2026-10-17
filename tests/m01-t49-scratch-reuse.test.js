import test from 'node:test';
import assert from 'node:assert/strict';
import {M01Impostors} from '../src/render/m01-impostors.js';
import {seconds} from '../src/game/m01-simulation.js';

const actor=(id,o={})=>({id,active:true,alive:true,civilian:false,team:'enemy',x:0,y:0,z:0,state:'GUARD',crouched:false,...o});
const frame=(dir=[1,0,0])=>({camera:{position:{x:0,y:1.6,z:0},fov:70,getWorldDirection:v=>v.set(...dir)},clock:10,battleClock:seconds('06:05'),fog:[.5,.5,.5],sunColor:[1,.8,.6],sunDir:[.9,.1,-.3],viewportHeight:720});
const setup=()=>{const imp=new M01Impostors({add(){}},{debug:false});imp.select([actor('g1',{x:900}),actor('g2',{x:800,z:5})],new Set(),{x:0,z:0},'low',10);return imp;};

test('impostor sync uploads only populated nations, limited to counts*16 matrix floats',()=>{
  const imp=setup(),{pl,de}=imp.meshes;
  imp.sync(frame());
  assert.equal(de.count,2);assert.equal(pl.count,0);
  assert.equal(pl.instanceMatrix.version,0,'empty nation is not re-uploaded');
  assert.ok(de.instanceMatrix.version>0);
  assert.deepEqual(de.instanceMatrix.updateRanges,[{start:0,count:32}]);
  imp.sync(frame());   // ranges are replaced, not accumulated
  assert.deepEqual(de.instanceMatrix.updateRanges,[{start:0,count:32}]);
  imp.dispose();
});
test('impostor sync is repeatable with the shared forward scratch vector',()=>{
  const imp=setup();
  imp.sync(frame([1,0,0]));const a=JSON.stringify(imp.diagnostics.items);
  imp.sync(frame([0,0,1]));imp.sync(frame([1,0,0]));
  assert.equal(JSON.stringify(imp.diagnostics.items),a);
  imp.dispose();
});
