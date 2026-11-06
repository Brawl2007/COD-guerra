import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M01ViewModel} from '../src/render/m01-viewmodel.js';
import {Wz29} from '../src/game/wz29.js';
import {viewModelFixture} from './helpers/m01-viewmodel-fixture.js';

// Perf audit 2026-11-05: the named nodes the view model touches every frame are looked up once per build, not walked for in the skeleton each frame.
const data=()=>({clock:10,player:{aiming:true,moveBlend:0,sprinting:false},weapon:new Wz29(),renderState:{weaponVisible:true}});

test('M01ViewModel.update finds fp_hands/weapon/rifle/clip/eye_r once per build, then reuses them',async()=>{
  const c=await viewModelFixture(),v=new M01ViewModel(new THREE.Scene(),c,new THREE.Texture()),s=data();
  try{
    for(let n=0;n<3;n++){s.clock+=.016;v.update(s,'high',0);}   // warm-up: the first frames fill the cache
    const root=v.root,original=root.getObjectByName.bind(root);let calls=0;
    const seenNames=[];root.getObjectByName=name=>{calls++;seenNames.push(name);return original(name);};
    for(let n=0;n<6;n++){s.clock+=.016;v.update(s,'high',0);}
    assert.equal(calls,0,seenNames.join()+' '+'no getObjectByName on the root during later frames');
    assert.ok(v.part('weapon')===original('weapon')&&v.part('rifle')===original('rifle')&&v.part('eye_r')===original('eye_r'));
  }finally{v.dispose();c.dispose();}
});
