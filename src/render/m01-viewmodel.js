import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {WZ29_VISUAL,reloadEnvelope,advanceVisualBlend,presentationPose,placeWz29,placeViewArms,riflePresentationMaterial} from './m01-wz29-presentation.js';

// World uniforms include torso/legs. A first-person camera inside that body must only draw its arms.
export function viewModelArmsGeometry(source,jointNames){
  const joints=source.getAttribute('skinIndex'),weights=source.getAttribute('skinWeight');
  const armBones=new Set(jointNames.map((name,i)=>/^(upperarm|lowerarm|hand|thumb|index|middle|ring|pinky)_/.test(name)?i:-1));
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
  const geometry=source.clone();geometry.setIndex(selected);
  // The cut sleeve edge must follow the view arm, without a residual clavicle
  // weight pulling it back towards the world rig's shoulder beside this camera.
  const targetJ=geometry.getAttribute('skinIndex'),targetW=geometry.getAttribute('skinWeight');
  for(const i of new Set(selected)){
    const j=[targetJ.getX(i),targetJ.getY(i),targetJ.getZ(i),targetJ.getW(i)];
    const w=[targetW.getX(i),targetW.getY(i),targetW.getZ(i),targetW.getW(i)].map((v,k)=>armBones.has(j[k])?v:0);
    const total=w.reduce((a,b)=>a+b,0);targetW.setXYZW(i,...w.map(v=>v/total));
  }
  return geometry;
}

// The same licensed rig supplies the hands, wz.29 and mechanical animation. Never edits weapon state.
export class M01ViewModel {
  constructor(scene,characters,texture){
    this.scene=scene;this.characters=characters;this.root=null;this.lod=null;this.mixer=null;
    this.flash=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#ffd18b',transparent:true,
      blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    this.flash.position.fromArray(WZ29_VISUAL.muzzle);this.flash.scale.set(.105,.105,1);
    this.roundGeometry=new THREE.CylinderGeometry(.0056,.0056,.064,8);this.roundGeometry.rotateX(Math.PI/2);
    this.round=new THREE.Mesh(this.roundGeometry,new THREE.MeshStandardMaterial({color:'#b99b4e',metalness:.65,roughness:.45}));
    this.round.position.z=-.03;this.round.visible=false;
    this.wounded=null;this.armGeometry=null;this.rifleMaterial=null;this.visual=null;this.stats={active:false};
  }
  release(root,mixer){
    if(!root)return;root.removeFromParent();mixer.stopAllAction();mixer.uncacheRoot(root);
    const skins=new Set();root.traverse(n=>{if(n.isSkinnedMesh)skins.add(n.skeleton);});skins.forEach(s=>s.dispose());
  }
  build(lod){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;
    this.release(this.root,this.mixer);this.armGeometry?.dispose();this.rifleMaterial?.dispose();this.lod=lod;this.visual=null;this.sampleKey=null;
    this.root=clone(this.characters.sources.get(`pl:${lod}`).scene);this.scene.add(this.root);
    this.root.traverse(n=>{if(n.isMesh){n.visible=['body','rifle','clip'].includes(n.name);n.frustumCulled=false;n.castShadow=false;n.receiveShadow=false;}});
    const body=this.root.getObjectByName('body');
    this.root.updateMatrixWorld(true);
    this.root.userData.viewArmBind=Object.fromEntries(['l','r'].map(side=>[side,this.root.getObjectByName(`upperarm_${side}`).position.toArray()]));
    this.armGeometry=viewModelArmsGeometry(body.geometry,body.skeleton.bones.map(b=>b.name));
    body.geometry=this.armGeometry;
    const rifle=this.root.getObjectByName('rifle');this.rifleMaterial=riflePresentationMaterial(rifle.material);rifle.material=this.rifleMaterial;
    this.mixer=new THREE.AnimationMixer(this.root);
    this.root.getObjectByName('weapon').add(this.flash);this.root.getObjectByName('weapon_clip').add(this.round);
  }
  play(root,mixer,clip,time){
    for(const [side,position]of Object.entries(root.userData.viewArmBind??{}))root.getObjectByName(`upperarm_${side}`).position.fromArray(position);
    // Absolute mechanical sampling must reapply constant tracks after local arm
    // posing (PropertyMixer otherwise skips unchanged values). ADS/run interpolation
    // lives in the presentation pose, never in a wall-clock mixer crossfade.
    mixer.stopAllAction();const action=mixer.clipAction(this.characters.clips.get(clip));
    action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.reset().play();
    mixer.setTime(time);
    root.updateMatrixWorld(true);
  }
  update(sim,quality,flashUntil){
    const characters=this.characters;
    const lod=characters.sources.has('pl:0')?0:1;
    if(!characters.sources.has(`pl:${lod}`)||!['aim','reload_clip','fire_bolt','carry_wounded','carried'].every(name=>characters.clips.has(name)))return false;
    if(this.lod!==lod)this.build(lod);
    // Restore replaces the data world; reconstruct visual flags/phase at that safe
    // boundary instead of blending from an old menu/checkpoint presentation.
    if(this.sourceWorld!==sim.world){this.sourceWorld=sim.world;this.visual=null;this.sampleKey=null;}
    const p=sim.player,w=sim.weapon,t=sim.clock,carry=p.carrying==='jozef_bak';
    const key=JSON.stringify([t,p.aiming,p.moveBlend,p.sprinting,p.carrying,sim.renderState.weaponVisible,w.state,w.started,w.until,w.lastShot,flashUntil]);
    if(this.sampleKey===key)return true;
    this.sampleKey=key;
    this.root.visible=sim.renderState.weaponVisible||carry;
    if(!this.root.visible){this.stats={active:true,visible:false,lod};return true;}
    let clip='aim',sample=0;
    if(carry){clip='carry_wounded';sample=t%characters.clips.get(clip).duration;}
    else if(w.reloading){clip='reload_clip';sample=w.reloadProgress(t*1000)*characters.clips.get(clip).duration;}
    else if(w.boltCycling){clip='fire_bolt';sample=Math.min(1,(t*1000-w.started)/(w.until-w.started))*characters.clips.get(clip).duration;}
    this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);
    this.play(this.root,this.mixer,clip,sample);
    // Carry presentation is preserved; the rifle path uses measured sight landmarks.
    const eye=new THREE.Vector3();this.root.getObjectByName('eye_r').getWorldPosition(eye);
    if(carry){
      this.root.position.copy(eye).multiplyScalar(-1);
      this.root.position.y+=Math.abs(p.moveBlend*Math.sin(t*(p.sprinting?14:9))*.014);
      this.visual=null;
    }else{
      const dt=this.visual?Math.min(.05,Math.max(0,t-this.visual.clock)):0;
      // A new rig/restore reconstructs immediately from authoritative flags. No mixer
      // or blend state enters schema 2; a repeated clock cannot advance a transition.
      if(!this.visual||t<this.visual.clock)this.visual={clock:t,aim:Number(Boolean(p.aiming)),move:p.moveBlend??0,run:Number(Boolean(p.sprinting)),phase:t*9};
      const v=this.visual;
      v.aim=advanceVisualBlend(v.aim,Number(Boolean(p.aiming)),dt,.045);
      v.move=advanceVisualBlend(v.move,p.moveBlend??0,dt,.09);
      v.run=advanceVisualBlend(v.run,Number(Boolean(p.sprinting)),dt,.10);
      v.phase+=dt*(9+5*v.run);v.clock=t;
      const pose=presentationPose({clock:t,lastShot:w.lastShot,aim:v.aim,move:v.move,run:v.run,reload:w.reloading?reloadEnvelope(sample):0,phase:v.phase});
      placeWz29(this.root,this.root.getObjectByName('weapon'),pose);
      const gripWeight=w.reloading?1-reloadEnvelope(sample):w.boltCycling?
        1-THREE.MathUtils.smoothstep(sample,.12,.25)+THREE.MathUtils.smoothstep(sample,1.08,characters.clips.get('fire_bolt').duration):1;
      placeViewArms(this.root,this.root.getObjectByName('weapon'),gripWeight);
    }
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
      armTriangles:this.armGeometry.index.count/3,aimBlend:this.visual?.aim??null,runBlend:this.visual?.run??null,
      phase:this.visual?.phase??null,visualMuzzle:this.flash.getWorldPosition(new THREE.Vector3()).toArray(),
      visualSights:Object.fromEntries(['rear','front'].map(name=>[name,this.root.getObjectByName('weapon').localToWorld(new THREE.Vector3(...WZ29_VISUAL[name])).toArray()]))};
    return true;
  }
  dispose(){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;this.release(this.root,this.mixer);this.root=null;
    this.armGeometry?.dispose();this.armGeometry=null;
    this.rifleMaterial?.dispose();this.rifleMaterial=null;
    this.flash.material.dispose();this.roundGeometry.dispose();this.round.material.dispose();
  }
}
