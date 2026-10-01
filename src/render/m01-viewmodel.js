import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// The same licensed rig supplies the hands, wz.29 and mechanical animation. Never edits weapon state.
export class M01ViewModel {
  constructor(scene,characters,texture){
    this.scene=scene;this.characters=characters;this.root=null;this.lod=null;this.mixer=null;
    this.flash=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#ffd18b',transparent:true,
      blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    this.flash.position.set(0,.032,-.765);this.flash.scale.set(.14,.14,1);
    this.roundGeometry=new THREE.CylinderGeometry(.0056,.0056,.064,8);this.roundGeometry.rotateX(Math.PI/2);
    this.round=new THREE.Mesh(this.roundGeometry,new THREE.MeshStandardMaterial({color:'#b99b4e',metalness:.65,roughness:.45}));
    this.round.position.z=-.03;this.round.visible=false;
    this.wounded=null;this.stats={active:false};
  }
  release(root,mixer){
    if(!root)return;root.removeFromParent();mixer.stopAllAction();mixer.uncacheRoot(root);
    const skins=new Set();root.traverse(n=>{if(n.isSkinnedMesh)skins.add(n.skeleton);});skins.forEach(s=>s.dispose());
  }
  build(lod){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;
    this.release(this.root,this.mixer);this.lod=lod;
    this.root=clone(this.characters.sources.get(`pl:${lod}`).scene);this.scene.add(this.root);
    this.root.traverse(n=>{if(n.isMesh){n.visible=['body','rifle','clip'].includes(n.name);n.frustumCulled=false;n.castShadow=false;n.receiveShadow=false;}});
    this.mixer=new THREE.AnimationMixer(this.root);
    this.root.getObjectByName('weapon').add(this.flash);this.root.getObjectByName('weapon_clip').add(this.round);
  }
  play(root,mixer,clip,time){
    mixer.stopAllAction();const action=mixer.clipAction(this.characters.clips.get(clip));
    action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();mixer.setTime(time);
    root.updateMatrixWorld(true);
  }
  update(sim,quality,flashUntil){
    const characters=this.characters;
    if(quality!=='low')void characters.loadSource('pl:0');
    const lod=quality!=='low'&&characters.sources.has('pl:0')?0:1;
    if(!characters.sources.has(`pl:${lod}`)||!characters.clips.size)return false;
    if(this.lod!==lod)this.build(lod);
    const p=sim.player,w=sim.weapon,t=sim.clock,carry=p.carrying==='jozef_bak';
    this.root.visible=sim.renderState.weaponVisible||carry;
    if(!this.root.visible){this.stats={active:true,visible:false,lod};return true;}
    let clip='aim',sample=0;
    if(carry){clip='carry_wounded';sample=t%characters.clips.get(clip).duration;}
    else if(w.reloading){clip='reload_clip';sample=w.reloadProgress(t*1000)*characters.clips.get(clip).duration;}
    else if(w.boltCycling){clip='fire_bolt';sample=Math.min(1,(t*1000-w.started)/(w.until-w.started))*characters.clips.get(clip).duration;}
    this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);
    this.play(this.root,this.mixer,clip,sample);
    // Match the rig's right eye to the first-person camera. This is also stable after pause/reload.
    const eye=new THREE.Vector3();this.root.getObjectByName('eye_r').getWorldPosition(eye);
    this.root.position.copy(eye).multiplyScalar(-1);
    if(!p.aiming&&!carry)this.root.position.add(new THREE.Vector3(.16,-.23,.02));
    const bob=p.moveBlend*Math.sin(t*(p.sprinting?14:9))*.014;
    this.root.position.y+=Math.abs(bob);if(p.sprinting&&!carry)this.root.rotation.z=.1;
    this.root.getObjectByName('rifle').visible=!carry;
    this.root.getObjectByName('clip').visible=!carry&&w.state==='RELOAD_CLIP';
    // Partial reload inserts one cartridge. The five-round clip mesh stays hidden.
    this.round.visible=w.state==='RELOAD_SINGLE'&&sample>.7&&sample<2.3;
    this.flash.visible=!carry&&t<flashUntil;
    if(carry&&!this.wounded){
      const root=clone(characters.sources.get(`pl:${lod}`).scene);
      root.traverse(n=>{if(n.isMesh){n.visible=['body','head_bak','helmet_wz31','gear'].includes(n.name);n.frustumCulled=false;n.castShadow=false;}});
      this.root.getObjectByName('carry_socket').add(root);
      this.wounded={root,mixer:new THREE.AnimationMixer(root)};
    }
    if(this.wounded){
      this.wounded.root.visible=carry;
      if(carry)this.play(this.wounded.root,this.wounded.mixer,'carried',t%characters.clips.get('carried').duration);
    }
    this.root.updateMatrixWorld(true);
    this.stats={active:true,visible:true,lod,clip,clipTime:sample,carrying:carry,singleRound:this.round.visible};
    return true;
  }
  dispose(){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;this.release(this.root,this.mixer);this.root=null;
    this.flash.material.dispose();this.roundGeometry.dispose();this.round.material.dispose();
  }
}
