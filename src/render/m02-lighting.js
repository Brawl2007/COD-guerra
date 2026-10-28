import * as THREE from 'three';
import {lightingModel,cascadePlan,splitIntensity,SUN_DISTANCE} from './m01-lighting.js';
import {M01Grading} from './m01-grading.js';

// M02 supplies its authored time of day; colours, key direction, cascades and
// postprocess come from M01. This adapter never changes the mission clock.
export function m02LightingModel(temporalState,preset){
  const selected=preset.temporalId??temporalState;
  const night=selected==='T1',morning=selected==='T2';
  const model=lightingModel(night?-12:morning?7:14,morning?95:255);
  if(night||preset.id==='neutral_review'){
    const rgb=hex=>new THREE.Color(hex).toArray();
    model.hemi={color:rgb(preset.hemiSky),groundColor:rgb(preset.hemiGround),intensity:preset.hemiIntensity};
    model.sun={...model.sun,color:rgb(preset.sunColor),intensity:preset.sunIntensity,keyDir:new THREE.Vector3(...preset.sunPosition).normalize().toArray()};
    model.fog.color=rgb(preset.fogColor);model.exposure=1.04;
    if(night){model.daylight=0;model.sky.zenith=[.008,.015,.035];model.sky.horizon=model.fog.color;model.sky.glow=.1;model.sky.discStrength=0;}
  }
  return model;
}

export class M02Lighting {
  constructor(scene,engine,sun,hemi,atmosphere){
    Object.assign(this,{scene,engine,sun,hemi,atmosphere});this.grading=new M01Grading();
    this.near=new THREE.DirectionalLight(0xffffff,0);this.near.visible=false;scene.add(this.near,this.near.target,sun.target);
    // Same shadow volumes/bias as M01; both follow the observer, including P1.
    for(const [light,half,bias,normalBias]of [[sun,65,-.0003,.025],[this.near,25,-.0002,.02]]){
      light.castShadow=true;Object.assign(light.shadow.camera,{left:-half,right:half,top:half,bottom:-half,near:.5,far:450});
      light.shadow.camera.updateProjectionMatrix();light.shadow.bias=bias;light.shadow.normalBias=normalBias;
    }
    const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
    this.contactMaterial=new THREE.MeshBasicMaterial({map:atmosphere.texture,color:0x000000,transparent:true,opacity:.24,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    this.contacts=new THREE.InstancedMesh(geometry,this.contactMaterial,128);this.contacts.count=0;this.contacts.frustumCulled=false;
    this.contacts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.contacts);this.dummy=new THREE.Object3D();
  }
  update(sim,preset,quality){
    const key=`${sim.horizon.temporalState}:${preset.id}`;
    if(key!==this.key){this.model=m02LightingModel(sim.horizon.temporalState,preset);this.key=key;}
    const m=this.model,p=sim.player,plan=cascadePlan(quality),two=plan.cascades===2;
    this.near.visible=two;const intensities=splitIntensity(m.sun.intensity,plan);
    for(const [light,mapSize,intensity]of [[this.sun,plan.wideMap,intensities[0]],[this.near,plan.nearMap,intensities[1]]]){
      if(mapSize&&light.shadow.mapSize.x!==mapSize){light.shadow.mapSize.set(mapSize,mapSize);light.shadow.map?.dispose();light.shadow.map=null;}
      light.target.position.set(p.x,p.y,p.z);light.position.set(p.x+m.sun.keyDir[0]*SUN_DISTANCE,p.y+m.sun.keyDir[1]*SUN_DISTANCE,p.z+m.sun.keyDir[2]*SUN_DISTANCE);
      light.target.updateMatrixWorld();light.color.setRGB(...m.sun.color);light.intensity=intensity;
    }
    this.hemi.color.setRGB(...m.hemi.color);this.hemi.groundColor.setRGB(...m.hemi.groundColor);this.hemi.intensity=m.hemi.intensity;
    this.engine.toneMappingExposure=m.exposure;this.scene.fog?.color.setRGB(...m.fog.color);
    this.atmosphere.lighting(p,m,sim.clock);
    let count=0;
    for(const a of [...sim.allies,...sim.enemies,...(sim.areaC?.c10Started?sim.areaC.lastGroup:[])]){
      if(a.detachedOutOfCell||a.evacuated||a.carriedBy||Math.hypot(a.x-p.x,a.z-p.z)>90||count>=128)continue;
      const fallen=!a.alive||a.state==='WOUNDED_UNARMED';
      this.dummy.position.set(a.x,sim.world.terrainHeightAt(a.x,a.z)+.018,a.z);this.dummy.rotation.set(0,-(a.facing??0),0);this.dummy.scale.set(fallen?1.8:.7,1,.8);
      this.dummy.updateMatrix();this.contacts.setMatrixAt(count++,this.dummy.matrix);
    }
    this.contacts.count=count;this.contacts.instanceMatrix.needsUpdate=true;
    this.cascades=two?2:1;return m;
  }
  begin(camera,quality,softwareRasterizer=false){
    const target=this.grading.begin(this.engine,quality,this.model,camera);
    // Preserve the renderer's existing software-GPU policy. AO/grade remain on;
    // only hardware receives multisampling, as in the canvas pass.
    if(target&&softwareRasterizer)target.samples=0;
    this.engine.setRenderTarget(target);return Boolean(target);
  }
  get diagnostics(){return {cascades:this.cascades,contactShadows:this.contacts.count,shadowTarget:this.sun.target.position.toArray(),daylight:this.model?.daylight,grading:this.grading.diagnostics};}
  dispose(){for(const light of [this.near]){light.removeFromParent();light.target.removeFromParent();light.shadow.map?.dispose();}this.contacts.removeFromParent();this.contacts.geometry.dispose();this.contactMaterial.dispose();this.grading.dispose();}
}
