import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

// World uniforms include torso/legs. A first-person camera inside that body must only draw its arms.
export function viewModelArmsGeometry(source,jointNames){
  const joints=source.getAttribute('skinIndex'),weights=source.getAttribute('skinWeight');
  const armBones=new Set(jointNames.map((name,i)=>/^(clavicle|upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(name)?i:-1));
  const armVertex=i=>{
    // GLTFLoader can expose interleaved/normalized attributes; their backing arrays are not packed VEC4s.
    const j=[joints.getX(i),joints.getY(i),joints.getZ(i),joints.getW(i)];
    const w=[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)];
    let weight=0;for(let k=0;k<4;k++)if(armBones.has(j[k]))weight+=w[k];
    return weight>=.55;
  };
  const indices=source.index.array,selected=[];
  for(let i=0;i<indices.length;i+=3){
    const triangle=[indices[i],indices[i+1],indices[i+2]];
    if(triangle.every(armVertex))selected.push(...triangle);
  }
  const geometry=source.clone();geometry.setIndex(selected);return geometry;
}

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
    this.wounded=null;this.armGeometry=null;this.stats={active:false};
  }
  release(root,mixer){
    if(!root)return;root.removeFromParent();mixer.stopAllAction();mixer.uncacheRoot(root);
    const skins=new Set();root.traverse(n=>{if(n.isSkinnedMesh)skins.add(n.skeleton);});skins.forEach(s=>s.dispose());
  }
  build(lod){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;
    this.release(this.root,this.mixer);this.armGeometry?.dispose();this.lod=lod;
    this.root=clone(this.characters.sources.get(`pl:${lod}`).scene);this.scene.add(this.root);
    this.root.traverse(n=>{if(n.isMesh){n.visible=['body','rifle','clip'].includes(n.name);n.frustumCulled=false;n.castShadow=false;n.receiveShadow=false;}});
    const body=this.root.getObjectByName('body');
    this.armGeometry=viewModelArmsGeometry(body.geometry,body.skeleton.bones.map(b=>b.name));
    body.geometry=this.armGeometry;
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
    const lod=characters.sources.has('pl:0')?0:1;
    if(!characters.sources.has(`pl:${lod}`)||!['aim','reload_clip','fire_bolt','carry_wounded','carried'].every(name=>characters.clips.has(name)))return false;
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
    // The world reload lowers the rifle to the chest, behind the forward-leaning eye. Pivot the first-person
    // presentation about that eye to see the same action, keeping upper arms below the frame and the camera free.
    const reloadDown=w.reloading?THREE.MathUtils.smoothstep(sample,0,.3)-THREE.MathUtils.smoothstep(sample,2.75,3.3):0;
    if(!carry)this.root.rotation.x=reloadDown*Math.PI*.25;
    this.root.position.copy(eye.applyQuaternion(this.root.quaternion)).multiplyScalar(-1);
    if(!carry){
      this.root.position.z-=p.aiming?.24:.16;
      if(!p.aiming)this.root.position.addScaledVector(new THREE.Vector3(.16,-.23,.02),1-reloadDown);
      // Keep forearms clear of the near plane while showing the world rig's reload.
      this.root.position.addScaledVector(new THREE.Vector3(.06,.07,-.38),reloadDown);
    }
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
    this.stats={active:true,visible:true,lod,clip,clipTime:sample,carrying:carry,singleRound:this.round.visible,
      armTriangles:this.armGeometry.index.count/3};
    return true;
  }
  dispose(){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;this.release(this.root,this.mixer);this.root=null;
    this.armGeometry?.dispose();this.armGeometry=null;
    this.flash.material.dispose();this.roundGeometry.dispose();this.round.material.dispose();
  }
}
