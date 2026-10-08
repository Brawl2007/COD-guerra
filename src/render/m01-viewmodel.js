import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import wz29Profile from '../../research/weapons/kb_wz29.profile.json' with {type:'json'};
import {WZ29_VISUAL,reloadEnvelope,advanceVisualBlend,presentationPose,placeWz29,placeViewArms,riflePresentationMaterial,viewAtlasMaterial} from './m01-wz29-presentation.js';
import {WEAPON_PRESENTATION,WeaponViewFx,advanceLookLag,mechanicalPulse,viewPointToWorld,viewUp} from './first-person-weapon-fx.js';
import {visualNoise} from './m01-atmosphere.js';

const PROFILE=WEAPON_PRESENTATION.wz29,BOLT_SECONDS=wz29Profile.gameplay.boltCycleSec,RELOAD_CLIP_SECONDS=3.4;
// GLB socket fallback (weapon bone frame). The clip path is the asset's own reload_clip ejection curve.
const PORT=[.012,.045,-.07],CLIP_EJECT=Object.freeze({from:2.4,to:2.6,local:[0,.027,-.085]});

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
  // worldFx (optional) receives world-space brass, clips and muzzle smoke; texture stays for caller compatibility.
  constructor(scene,characters,texture,worldFx=null){
    this.scene=scene;this.characters=characters;this.root=null;this.lod=null;this.mixer=null;this.worldFx=worldFx;
    // Layered flash, muzzle light and barrel/chamber smoke. `flash` remains the core sprite on the real muzzle socket.
    this.fx=new WeaponViewFx(scene,PROFILE);this.flash=this.fx.core;
    this.flash.position.fromArray(WZ29_VISUAL.muzzle);this.flash.scale.set(.105,.105,1);
    this.roundGeometry=new THREE.CylinderGeometry(.0056,.0056,.064,8);this.roundGeometry.rotateX(Math.PI/2);
    this.round=new THREE.Mesh(this.roundGeometry,new THREE.MeshStandardMaterial({color:'#b99b4e',metalness:.65,roughness:.45}));
    this.round.position.z=-.03;this.round.visible=false;
    this.wounded=null;this.armGeometry=null;this.rifleMaterial=null;this.atlasMaterial=null;this.visual=null;this.stats={active:false};
    this.tmp={a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3(),q:new THREE.Quaternion(),r:new THREE.Quaternion(),up:new THREE.Vector3()};
  }
  release(root,mixer){
    if(!root)return;root.removeFromParent();mixer.stopAllAction();mixer.uncacheRoot(root);
    const skins=new Set();root.traverse(n=>{if(n.isSkinnedMesh)skins.add(n.skeleton);});skins.forEach(s=>s.dispose());
  }
  build(lod){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;
    this.release(this.root,this.mixer);this.armGeometry?.dispose();this.rifleMaterial?.dispose();this.atlasMaterial?.dispose();this.lod=lod;this.visual=null;this.sampleKey=null;
    this.root=clone(this.characters.sources.get(`pl:${lod}`).scene);this.scene.add(this.root);
    this.root.traverse(n=>{if(n.isMesh){n.visible=['body','rifle','clip'].includes(n.name);n.frustumCulled=false;n.castShadow=false;n.receiveShadow=false;}});
    const body=this.root.getObjectByName('body');
    this.root.updateMatrixWorld(true);
    this.root.userData.viewArmBind=Object.fromEntries(['l','r'].map(side=>[side,this.root.getObjectByName(`upperarm_${side}`).position.toArray()]));
    this.armGeometry=viewModelArmsGeometry(body.geometry,body.skeleton.bones.map(b=>b.name));
    body.geometry=this.armGeometry;
    const rifle=this.root.getObjectByName('rifle');this.rifleMaterial=riflePresentationMaterial(rifle.material);rifle.material=this.rifleMaterial;
    this.atlasMaterial=viewAtlasMaterial(body.material);body.material=this.atlasMaterial;this.root.getObjectByName('clip').material=this.atlasMaterial;
    this.mixer=new THREE.AnimationMixer(this.root);
    let sockets=null;this.root.traverse(n=>{sockets??=n.userData?.sockets??null;});
    this.port=sockets?.ejection_port?[...sockets.ejection_port]:PORT;
    this.fx.attach(this.root.getObjectByName('weapon'),WZ29_VISUAL.muzzle);this.root.getObjectByName('weapon_clip').add(this.round);
  }
  /** Presentation-only ejection/smoke spawns in world space, keyed by authoritative shot/reload ids. */
  emitWorld(sim,view,weapon,clip,sample){
    const w=sim.weapon,t=sim.clock,{a,b,c,q,r}=this.tmp,camera=view.camera,fov=view.viewFov??58;
    this.worldFx.sync(sim.world);camera.updateMatrixWorld();weapon.updateWorldMatrix(true,false);weapon.getWorldQuaternion(q);
    const toWorldDir=(local,target)=>target.fromArray(local).applyQuaternion(q).applyQuaternion(camera.quaternion);
    const toWorldQuat=(local,target)=>target.copy(camera.quaternion).multiply(local);
    const shotAt=w.lastShot/1000,shot=w.shotCount;
    if(shot>0&&Number.isFinite(shotAt)){
      const seed=(0x5eed^Math.imul(shot,0x9e3779b1)^Math.floor(w.lastShot))>>>0,n=i=>visualNoise(seed,i);
      if(t-shotAt>=0&&t-shotAt<.3)this.worldFx.spawnPuffs({id:`wz29:puff:${shot}:${w.lastShot}`,start:shotAt,
        origin:viewPointToWorld(weapon.localToWorld(a.fromArray(WZ29_VISUAL.muzzle)),camera,fov,a),direction:toWorldDir([0,0,-1],b),profile:PROFILE.smoke,seed});
      const ejectAt=shotAt+PROFILE.mechanics.eject*BOLT_SECONDS;
      if(t>=ejectAt&&t-ejectAt<.35){
        const v=PROFILE.casing.velocity,jitter=[v[0]*(.85+.3*n(1)),v[1]*(.85+.3*n(2)),v[2]*(.6+.8*n(3))];
        // The case leaves the chamber along the bore, mouth forward (lathe +Y -> weapon -Z).
        r.setFromAxisAngle(c.set(1,0,0),-Math.PI/2);
        this.worldFx.spawnEjecta({id:`wz29:case:${shot}:${w.lastShot}`,kind:PROFILE.casing.kind,start:ejectAt,
          origin:viewPointToWorld(weapon.localToWorld(a.fromArray(this.port)),camera,fov,a),velocity:toWorldDir(jitter,b),
          rotation:toWorldQuat(q.clone().multiply(r),r),spinAxis:toWorldDir([.25+.2*n(4),1,.3],c),spin:PROFILE.casing.spin*(.8+.4*n(5)),
          ground:sim.player.y??0,rest:PROFILE.casing.rest,seed:n(6)});
      }
    }
    // Clip reload: the bolt closing pushes the empty stripper clip out (asset curve 2,40-2,60 s), then it falls away.
    if(clip==='reload_clip'&&w.state==='RELOAD_CLIP'&&sample>=PROFILE.mechanics.clipEjected&&sample<RELOAD_CLIP_SECONDS){
      const duration=(w.until-w.started)/1000,start=w.started/1000+PROFILE.mechanics.clipEjected/RELOAD_CLIP_SECONDS*duration;
      const e=(PROFILE.mechanics.clipEjected-CLIP_EJECT.from)/(CLIP_EJECT.to-CLIP_EJECT.from),[lx,ly,lz]=CLIP_EJECT.local;
      const seed=(0xc11b^Math.floor(w.started))>>>0,v=PROFILE.clip.velocity;
      r.setFromAxisAngle(c.set(0,0,1),-200*Math.PI/180*e);
      this.worldFx.spawnEjecta({id:`wz29:clip:${w.started}`,kind:'clip',start,
        origin:viewPointToWorld(weapon.localToWorld(a.set(lx+.12*e,ly+.1*e-.15*e*e,lz+.02*e)),camera,fov,a),
        velocity:toWorldDir([v[0]*(.85+.3*visualNoise(seed,1)),v[1]*(.85+.3*visualNoise(seed,2)),v[2]],b),
        rotation:toWorldQuat(q.clone().multiply(r),r),spinAxis:toWorldDir([0,0,1],c),spin:-PROFILE.clip.spin,
        ground:sim.player.y??0,rest:PROFILE.clip.rest,seed:visualNoise(seed,3)});
    }
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
  // view (optional): {camera, viewFov} lets brass/clips/smoke leave the visible port into the world.
  update(sim,quality,flashUntil,view=null){
    const characters=this.characters;
    const lod=characters.sources.has('pl:0')?0:1;
    if(!characters.sources.has(`pl:${lod}`)||!['aim','reload_clip','fire_bolt','carry_wounded','carried'].every(name=>characters.clips.has(name)))return false;
    if(this.lod!==lod)this.build(lod);
    // Restore replaces the data world; reconstruct visual flags/phase at that safe
    // boundary instead of blending from an old menu/checkpoint presentation.
    if(this.sourceWorld!==sim.world){this.sourceWorld=sim.world;this.visual=null;this.sampleKey=null;}
    const p=sim.player,w=sim.weapon,t=sim.clock,carry=p.carrying==='jozef_bak';
    const key=JSON.stringify([t,p.aiming,p.moveBlend,p.sprinting,p.carrying,sim.renderState.weaponVisible,w.state,w.started,w.until,w.lastShot,w.shotCount,flashUntil,p.angle,p.pitch]);
    if(this.sampleKey===key)return true;
    this.sampleKey=key;
    this.root.visible=sim.renderState.weaponVisible||carry;
    if(!this.root.visible){this.fx.hide();this.stats={active:true,visible:false,lod};return true;}
    let clip='aim',sample=0;
    if(carry){clip='carry_wounded';sample=t%characters.clips.get(clip).duration;}
    else if(w.reloading){clip='reload_clip';sample=w.reloadProgress(t*1000)*characters.clips.get(clip).duration;}
    else if(w.boltCycling){clip='fire_bolt';sample=Math.min(1,(t*1000-w.started)/(w.until-w.started))*characters.clips.get(clip).duration;}
    this.root.position.set(0,0,0);this.root.rotation.set(0,0,0);
    this.play(this.root,this.mixer,clip,sample);
    // Carry presentation is preserved; the rifle path uses measured sight landmarks.
    const eye=new THREE.Vector3();this.root.getObjectByName('eye_r').getWorldPosition(eye);
    let mechanical=0,stroke=0;
    if(carry){
      this.root.position.copy(eye).multiplyScalar(-1);
      this.root.position.y+=Math.abs(p.moveBlend*Math.sin(t*(p.sprinting?14:9))*.014);
      this.visual=null;
    }else{
      const dt=this.visual?Math.min(.05,Math.max(0,t-this.visual.clock)):0;
      // A new rig/restore reconstructs immediately from authoritative flags. No mixer
      // or blend state enters schema 2; a repeated clock cannot advance a transition.
      if(!this.visual||t<this.visual.clock)this.visual={clock:t,aim:Number(Boolean(p.aiming)),move:p.moveBlend??0,run:Number(Boolean(p.sprinting)),phase:t*9,
        look:advanceLookLag(null,p.angle??0,p.pitch??0,0)};
      const v=this.visual;
      // A 4 kg rifle comes up to the eye a touch slower than it drops; the pose eases the blend in/out.
      v.aim=advanceVisualBlend(v.aim,Number(Boolean(p.aiming)),dt,.055);
      v.move=advanceVisualBlend(v.move,p.moveBlend??0,dt,.09);
      v.run=advanceVisualBlend(v.run,Number(Boolean(p.sprinting)),dt,.10);
      v.phase+=dt*(9+5*v.run);v.clock=t;v.look=advanceLookLag(v.look,p.angle??0,p.pitch??0,dt);
      // Weight at the authored mechanical markers: bolt stop/slam (fire_bolt 0,70/1,00 s), clip seated/bolt closed (1,00/2,70 s).
      mechanical=clip==='fire_bolt'?mechanicalPulse(sample,1,.12)+.45*mechanicalPulse(sample,.7,.1):
        w.state==='RELOAD_CLIP'?mechanicalPulse(sample,PROFILE.mechanics.boltClosed,.14)+.35*mechanicalPulse(sample,1,.1):0;
      // Bolt-action convention: the stroke takes the rifle off the eye, canted to show the bolt and the ejection,
      // and it is back on the sights before the weapon is READY. player.aiming and authoritative spread are untouched.
      stroke=clip==='fire_bolt'?THREE.MathUtils.smoothstep(sample,.10,.30)*(1-THREE.MathUtils.smoothstep(sample,.92,1.12))*v.aim:0;
      const pose=presentationPose({clock:t,lastShot:w.lastShot,aim:v.aim*(1-.6*stroke),move:v.move,run:v.run,reload:w.reloading?reloadEnvelope(sample):0,phase:v.phase,
        shot:w.shotCount??0,look:v.look,mechanical,stroke,profile:PROFILE});
      placeWz29(this.root,this.root.getObjectByName('weapon'),pose);
      const gripWeight=w.reloading?1-reloadEnvelope(sample):w.boltCycling?
        1-THREE.MathUtils.smoothstep(sample,.12,.25)+THREE.MathUtils.smoothstep(sample,1.08,characters.clips.get('fire_bolt').duration):1;
      placeViewArms(this.root,this.root.getObjectByName('weapon'),gripWeight);
    }
    this.root.getObjectByName('rifle').visible=!carry;
    // From clip_ejected the empty clip continues as a world object; the asset's short arc would otherwise vanish mid-air.
    const clipEjected=this.worldFx&&view&&sample>=PROFILE.mechanics.clipEjected;
    this.root.getObjectByName('clip').visible=!carry&&w.state==='RELOAD_CLIP'&&!clipEjected;
    // Partial reload inserts one cartridge. The five-round clip mesh stays hidden.
    this.round.visible=w.state==='RELOAD_SINGLE'&&sample>.7&&sample<2.3;
    if(carry&&!this.wounded){
      const root=clone(characters.sources.get(`pl:${lod}`).scene);
      root.traverse(n=>{if(n.isMesh){n.visible=['body','head_bak','helmet_wz31','gear'].includes(n.name);n.frustumCulled=false;n.castShadow=false;n.material=this.atlasMaterial;}});
      this.root.getObjectByName('carry_socket').add(root);
      this.wounded={root,mixer:new THREE.AnimationMixer(root)};
    }
    if(this.wounded){
      this.wounded.root.visible=carry;
      if(carry)this.play(this.wounded.root,this.wounded.mixer,'carried',t%characters.clips.get('carried').duration);
    }
    this.root.updateMatrixWorld(true);
    const weapon=this.root.getObjectByName('weapon'),{a,b,c,up}=this.tmp,shotAt=Number.isFinite(w.lastShot)?w.lastShot/1000:-Infinity;
    const fx=carry?this.fx.hide():this.fx.update({clock:t,shotAt,gate:t<flashUntil,aim:this.visual?.aim??0,shot:w.shotCount??0,
      muzzle:weapon.localToWorld(a.fromArray(WZ29_VISUAL.muzzle)),axis:b.set(0,0,-1).transformDirection(weapon.matrixWorld),
      port:weapon.localToWorld(c.fromArray(this.port)),up:viewUp(p.pitch??0,up),chamberAt:shotAt+PROFILE.mechanics.chamberOpen*BOLT_SECONDS});
    if(this.worldFx&&view&&!carry)this.emitWorld(sim,view,weapon,clip,sample);
    this.stats={active:true,visible:true,lod,clip,clipTime:sample,carrying:carry,singleRound:this.round.visible,
      armTriangles:this.armGeometry.index.count/3,aimBlend:this.visual?.aim??null,runBlend:this.visual?.run??null,
      phase:this.visual?.phase??null,visualMuzzle:this.flash.getWorldPosition(new THREE.Vector3()).toArray(),
      visualSights:Object.fromEntries(['rear','front'].map(name=>[name,weapon.localToWorld(new THREE.Vector3(...WZ29_VISUAL[name])).toArray()])),
      presentation:{profile:PROFILE.id,mechanical:+mechanical.toFixed(4),boltStroke:+stroke.toFixed(4),lookYaw:+(this.visual?.look?.yaw??0).toFixed(5),
        lookPitch:+(this.visual?.look?.pitchLag??0).toFixed(5),clipEjected:Boolean(clipEjected),...fx}};
    return true;
  }
  dispose(){
    this.release(this.wounded?.root,this.wounded?.mixer);this.wounded=null;this.release(this.root,this.mixer);this.root=null;
    this.armGeometry?.dispose();this.armGeometry=null;
    this.rifleMaterial?.dispose();this.rifleMaterial=null;this.atlasMaterial?.dispose();this.atlasMaterial=null;
    this.fx.dispose();this.roundGeometry.dispose();this.round.material.dispose();
  }
}
