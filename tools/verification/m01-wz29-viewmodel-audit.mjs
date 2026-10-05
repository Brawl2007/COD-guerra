import * as THREE from 'three';
import {pathToFileURL} from 'node:url';
import {M01ViewModel} from '../../src/render/m01-viewmodel.js';
import {M01ViewModel as BaseViewModel} from './fixtures/m01-wz29-base-viewmodel.mjs';
import {viewModelFixture,geometryReport,readCharacterGLB} from '../../tests/helpers/m01-viewmodel-fixture.js';
import {Wz29} from '../../src/game/wz29.js';

export const landmarks={rear:[0,.056,-.29],front:[0,.065,-.752],muzzle:[0,.032,-.765]};
export function alignmentReport(view){
  const weapon=view.root.getObjectByName('weapon'),points={};
  for(const [name,local]of Object.entries(landmarks))points[name]=weapon.localToWorld(new THREE.Vector3(...local));
  const camera=new THREE.PerspectiveCamera(58,1280/720,.03,6);camera.updateMatrixWorld(true);
  const projected={};for(const [name,p]of Object.entries(points))projected[name]=p.clone().project(camera).toArray();
  const flash=view.flash.getWorldPosition(new THREE.Vector3());
  return {cameraForward:[0,0,-1],points:Object.fromEntries(Object.entries(points).map(([k,v])=>[k,v.toArray()])),projected,
    horizontalPixels:Math.abs(projected.rear[0]-projected.front[0])*640,
    verticalPixels:Math.abs(projected.rear[1]-projected.front[1])*360,
    centerHorizontalPixels:Math.abs(projected.front[0])*640,centerVerticalPixels:Math.abs(projected.front[1])*360,
    muzzleFlashDistance:flash.distanceTo(points.muzzle)};
}
export async function audit(View=M01ViewModel){
  const result={landmarks,source:'real GLB / official GLTFLoader, textures omitted only in Node',lods:[]};
  for(const lod of [0,1]){
    const characters=await viewModelFixture(lod),view=new View(new THREE.Scene(),characters,new THREE.Texture());
    const sim={clock:10,player:{aiming:false,moveBlend:0,sprinting:false},weapon:new Wz29(),renderState:{weaponVisible:true}},samples=[];
    for(const [name,aim,move,run,state,progress]of [
      ['hip_idle',false,0,false,'READY',0],['ADS_idle',true,0,false,'READY',0],['hip_walk',false,1,false,'READY',0],['hip_run',false,1,true,'READY',0],
      ['hip_fire',false,0,false,'BOLT_CYCLE',.05],['ADS_fire',true,0,false,'BOLT_CYCLE',.05],['bolt',false,0,false,'BOLT_CYCLE',.55],
      ...[.1,.4,.7].map(p=>['reload_'+p,false,0,false,'RELOAD_CLIP',p]),...['RELOAD_SINGLE'].map(s=>['single_round',false,0,false,s,.4])]){
      sim.player.aiming=aim;sim.player.moveBlend=move;sim.player.sprinting=run;
      sim.weapon.state=state;sim.weapon.started=sim.clock*1000-progress*3400;sim.weapon.until=sim.weapon.started+(state==='BOLT_CYCLE'?1050:3400);
      if(state==='BOLT_CYCLE')sim.weapon.started=sim.clock*1000-progress*1050;
      sim.weapon.until=sim.weapon.started+(state==='BOLT_CYCLE'?1050:3400);sim.weapon.lastShot=state==='BOLT_CYCLE'?sim.weapon.started:-1e9;
      view.visual=null; // Independent boundary samples, as after constructing/restoring a renderer.
      view.update(sim,'low',state==='BOLT_CYCLE'&&progress<.06?sim.clock+.01:0);
      samples.push({name,alignment:alignmentReport(view),geometry:geometryReport(view),stats:view.stats});
    }
    result.lods.push({lod,clips:['aim','fire_bolt','reload_clip'].map(name=>({name,duration:characters.clips.get(name).duration,
      metadata:readCharacterGLB('m01_soldier_animations.glb').json.animations.find(a=>a.name===name).extras})),samples});
    view.dispose();characters.dispose();
  }
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(await audit(process.argv.includes('--base')?BaseViewModel:M01ViewModel),null,2));
