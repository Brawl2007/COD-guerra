import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rgbaGeometry,haloGeometry} from './m01-railway-light.js';
import {selectConsumerLod} from './m01-lod-policy.js';

const BASE='assets/models/production/m01/panzerzug/';
export const PANZERZUG_PLACEMENT=Object.freeze({position:Object.freeze([1119,0,2.5]),rotationY:Math.PI/2});
export const PANZERZUG_ARRIVAL=Object.freeze({
  startClock:4*3600+51*60, // 04:51:00 (17460 s)
  stopClock:4*3600+52*60,  // 04:52:00 (17520 s)
  duration:60,
  approachDistanceM:240,
  stopX:PANZERZUG_PLACEMENT.position[0],
  trackZ:PANZERZUG_PLACEMENT.position[2],
  wheelRadiusM:0.52,
});

export function panzerzugArrivalOffset(battleClock=null){
  if(battleClock===null||battleClock===undefined||!Number.isFinite(battleClock)||battleClock>=PANZERZUG_ARRIVAL.stopClock)return 0;
  if(battleClock<=PANZERZUG_ARRIVAL.startClock)return PANZERZUG_ARRIVAL.approachDistanceM;
  const u=(battleClock-PANZERZUG_ARRIVAL.startClock)/PANZERZUG_ARRIVAL.duration;
  const rem=1-u;
  return +(PANZERZUG_ARRIVAL.approachDistanceM*rem*rem).toFixed(6);
}

export function panzerzugX(battleClock=null){
  return PANZERZUG_PLACEMENT.position[0]+panzerzugArrivalOffset(battleClock);
}

export function isPanzerzugVisible(battleClock=null,flagActive=false){
  if(flagActive)return true;
  return Number.isFinite(battleClock)&&battleClock>=PANZERZUG_ARRIVAL.startClock;
}

export function panzerzugKinematics(battleClock=null,flagActive=false){
  const visible=isPanzerzugVisible(battleClock,flagActive);
  const offset=panzerzugArrivalOffset(battleClock);
  const x=PANZERZUG_PLACEMENT.position[0]+offset;
  const arriving=Number.isFinite(battleClock)&&battleClock>=PANZERZUG_ARRIVAL.startClock&&battleClock<PANZERZUG_ARRIVAL.stopClock;
  const stopped=visible&&offset===0;
  const u=arriving?(battleClock-PANZERZUG_ARRIVAL.startClock)/PANZERZUG_ARRIVAL.duration:(stopped?1:0);
  const speed=arriving?+(2*PANZERZUG_ARRIVAL.approachDistanceM*(1-u)/PANZERZUG_ARRIVAL.duration).toFixed(4):0;
  const distanceTravelled=PANZERZUG_ARRIVAL.approachDistanceM-offset;
  const wheelPhaseRad=+(distanceTravelled/PANZERZUG_ARRIVAL.wheelRadiusM).toFixed(4);
  const brakeIntensity=arriving&&u>0.65?+Math.min(1,(u-0.65)/0.35).toFixed(4):0;
  const hornActive=arriving&&((battleClock>=17461&&battleClock<=17465)||(battleClock>=17514&&battleClock<=17518));
  return {
    visible,arriving,stopped,x,z:PANZERZUG_PLACEMENT.position[2],
    offset,speed,wheelPhaseRad,brakeIntensity,hornActive
  };
}

export function panzerzugLOD(distance,current=null){return selectConsumerLod('panzerzug',distance,'medium',current);}

function buildPanzerzugLampFixture(){
  const slit=new THREE.BoxGeometry(0.95,0.16,0.18);
  slit.translate(0,1.75,-7.2);   // flush on the hull's end face (model z -7.2, root y 1.75), not floating ahead of it
  const merged=mergeGeometries([rgbaGeometry(slit,[1.0,0.89,0.66]),haloGeometry(1.0,1.75,-7.34,[1.0,0.89,0.66],0.62,12)],false);
  merged.computeBoundingSphere();
  const mat=new THREE.MeshBasicMaterial({
    vertexColors:true,
    transparent:true,
    opacity:0.88,
    fog:false,
    depthWrite:false,
    side:THREE.DoubleSide,
  });
  const mesh=new THREE.Mesh(merged,mat);
  mesh.name='panzerzug_headlamp_slit';
  mesh.frustumCulled=false;
  return mesh;
}

// Presentation only. T24 (Gemini/Argon): the Panzerzug enters moving and brakes to rest at x=1119 by 04:52:00.
// The simulation's panzerzug_arrives flag still forces it visible; this class never decides events or damage.
export class M01Panzerzug {
  constructor(parent,assets,box,cylinder,metal){
    this.assets=assets;this.root=new THREE.Group();this.root.name='panzerzug_visual';parent.add(this.root);
    this.root.position.fromArray(PANZERZUG_PLACEMENT.position);this.root.rotation.y=PANZERZUG_PLACEMENT.rotationY;
    this.proxy=new THREE.Group();this.proxy.name='original_panzerzug_fallback';this.root.add(this.proxy);
    for(let i=0;i<5;i++){const body=new THREE.Mesh(box,metal);body.position.set(0,2,i*19);body.scale.set(2.9,3.1,17);this.proxy.add(body);}
    for(const z of [1,78]){const cap=new THREE.Mesh(cylinder,metal);cap.position.set(0,4,z);cap.scale.set(1,1,1);this.proxy.add(cap);}
    this.proxy.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});
    this.lampFixture=buildPanzerzugLampFixture();this.root.add(this.lampFixture);   // slit lantern: one draw call, fog:false
    this.models=new Map();this.revision=0;this.disposed=false;this.requestedLOD=2;this.selectedLOD=null;
    this.lastKinematics=panzerzugKinematics(null,true);
  }
  async load(){
    await Promise.allSettled([0,1,2].map(async lod=>{
      try{
        const source=await this.assets.load(`panzerzug:${lod}`,`${BASE}m01_panzerzug_visual_lod${lod}.glb`);
        if(this.disposed)return;
        const model=source.scene.clone(true);model.visible=false;
        // Existing east track: terrain -1 + rail centre .12 + half rail height .06 = -.82 m.
        // Offset art only; retain the original fixed presentation anchor and gameplay data.
        model.position.y=-.82;
        model.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});
        this.models.set(lod,model);this.root.add(model);this.revision++;this.select();
      }catch{/* Optional art: retain original proxy or another usable LOD. */}
    }));
  }
  select(){
    const available=[...this.models.keys()].sort((a,b)=>Math.abs(a-this.requestedLOD)-Math.abs(b-this.requestedLOD)||a-b);
    this.selectedLOD=available[0]??null;
    for(const [lod,model]of this.models)model.visible=lod===this.selectedLOD;
    this.proxy.visible=this.selectedLOD===null;
  }
  update(player,battleClock=null,flagActive=true){
    // Omitted battleClock keeps the anchor at x=1119 (stopped), exactly as before T24.
    const kin=panzerzugKinematics(battleClock,flagActive);this.lastKinematics=kin;
    this.root.position.set(kin.x,PANZERZUG_PLACEMENT.position[1],PANZERZUG_PLACEMENT.position[2]);
    const distance=Math.min(...[0,1,2,3,4].map(i=>Math.hypot(player.x-(kin.x+i*19),player.z-2.5)));
    this.requestedLOD=panzerzugLOD(distance,this.requestedLOD);this.select();
  }
  get diagnostics(){return {loaded:[...this.models.keys()].sort(),lod:this.selectedLOD,requestedLOD:this.requestedLOD,
    fallback:this.proxy.visible,position:this.root.position.toArray(),rotationY:this.root.rotation.y,
    visible:this.root.parent?.visible??false,motion:this.lastKinematics.arriving?'arriving_decelerating':'stationary',kinematics:this.lastKinematics,
    headlampFogFree:this.lampFixture?.material?.fog===false};}
  dispose(){
    if(this.disposed)return;this.disposed=true;
    if(this.lampFixture){this.lampFixture.removeFromParent();this.lampFixture.geometry.dispose();this.lampFixture.material.dispose();}
    this.root.removeFromParent();this.models.clear();
  }
}
