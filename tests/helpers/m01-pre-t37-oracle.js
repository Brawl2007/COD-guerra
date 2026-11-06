import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {TczewWorld} from '../../src/world/tczew-world.js';
import {loadIkAssets,boneSnapshot} from './m01-ik-fixture.js';

// Scene used for the external IK-off oracle (tests/fixtures/m01-pre-t37-bones.json): the same roster/clock on the pre-T37 M01Characters (5a169ba) and on the current one with ik:false.
export const ORACLE_SPOTS=[{name:'rail embankment south flank',x:-50,z:9},{name:'road approach north flank',x:-40,z:32},{name:'far west embankment',x:-300,z:0}];
export const ORACLE_TIMES=[5.0,5.4,6.2];
const walk={speed:1.4,odometer:.4,gait:'walk',gaitSince:0},run={speed:3.3,odometer:.5,gait:'run',gaitSince:0};
export const oracleRoster=(world,x,z)=>[
  ['marek_zielinski',x,z,{facing:.4}],
  ['pl_walker',x-3,z,{state:'ADVANCE',facing:.9,motion:walk}],
  ['pl_runner',x-5,z+2,{state:'RETREAT',facing:2.1,motion:run}],
  ['pawel_krawiec',x-6,z,{role:'ENGINEER',state:'GUARD',crouched:true,facing:-.3}],
  ['pl_pinned',x-8,z,{state:'TAKE_COVER',crouched:true,suppressedUntil:99,facing:1.2}],
  ['de_rifle_1',x+3,z,{team:'enemy',facing:Math.PI}],
  ['de_walker',x+5,z+2,{team:'enemy',state:'ADVANCE',facing:Math.PI+.5,motion:walk}]
].map(([id,ax,az,extra])=>({id,active:true,alive:true,team:'ally',role:'RIFLEMAN',state:'SUPPRESS',crouched:false,suppressedUntil:0,x:ax,y:world.heightAt(ax,az),z:az,
  bodyYaw:extra.facing,shot:0,firedAt:-100,rounds:5,...extra}));
/** Run the scene on M01Characters class `Ctor` (pre-T37 or current ik:false) and return {key: sha256 of every bone local+world double}. */
export async function runOracleScene(Ctor,options={}){
  const world=new TczewWorld(),{sources,clips}=await loadIkAssets();
  const c=new Ctor(new THREE.Scene(),{visualVariation:false,debug:false,...options});
  for(const [k,v] of sources)c.sources.set(k,v);
  for(const [k,v] of clips)c.clips.set(k,v);
  const out={};
  try{
    for(const spot of ORACLE_SPOTS){
      const roster=oracleRoster(world,spot.x,spot.z);
      for(const t of ORACLE_TIMES){
        c.update(roster,t,{x:spot.x,z:spot.z},'high',null,world);
        for(const a of roster){
          const inst=c.instances.get(a.id);if(!inst)throw new Error(`no instance ${a.id} @${spot.name} t=${t}`);
          const h=createHash('sha256'),snap=boneSnapshot(inst);
          for(const [name,p,q,m] of snap){h.update(name);h.update(Buffer.from(new Float64Array([...p,...q,...m]).buffer));}
          const mz=c.muzzle(a.id);if(mz)h.update(Buffer.from(new Float64Array(mz.toArray()).buffer));
          out[`${spot.name}|t=${t}|${a.id}`]={bones:snap.length,sha256:h.digest('hex')};
        }
      }
    }
  }finally{c.dispose();}
  return out;
}
