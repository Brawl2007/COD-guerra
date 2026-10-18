import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {rgbaGeometry,haloGeometry} from './m01-railway-light.js';
import {selectConsumerLod,createLodCounters,tallyLod,lodCounterTotals} from './m01-lod-policy.js';
import {M01LodFade} from './m01-lod-dither.js';

const BASE='assets/models/production/m01/locomotive/';
export const LOCOMOTIVE_PLACEMENT=Object.freeze({position:Object.freeze([1075,0,-2.5]),rotationY:Math.PI/2});
export const TRAIN_963_ARRIVAL=Object.freeze({
  startClock:4*3600+43*60+30, // 04:43:30 (17010 s)
  stopClock:4*3600+45*60,     // 04:45:00 (17100 s)
  duration:90,
  approachDistanceM:360,
  stopX:LOCOMOTIVE_PLACEMENT.position[0],
  trackZ:LOCOMOTIVE_PLACEMENT.position[2],
  wheelRadiusM:0.65,
});

export function trainArrivalOffset(battleClock=null){
  if(battleClock===null||battleClock===undefined||!Number.isFinite(battleClock)||battleClock>=TRAIN_963_ARRIVAL.stopClock)return 0;
  if(battleClock<=TRAIN_963_ARRIVAL.startClock)return TRAIN_963_ARRIVAL.approachDistanceM;
  const u=(battleClock-TRAIN_963_ARRIVAL.startClock)/TRAIN_963_ARRIVAL.duration;
  const rem=1-u;
  return +(TRAIN_963_ARRIVAL.approachDistanceM*rem*rem).toFixed(6);
}

export function trainX(battleClock=null){
  return LOCOMOTIVE_PLACEMENT.position[0]+trainArrivalOffset(battleClock);
}

export function isTrain963Visible(battleClock=null,flagActive=false){
  if(flagActive)return true;
  return Number.isFinite(battleClock)&&battleClock>=TRAIN_963_ARRIVAL.startClock;
}

export function train963Kinematics(battleClock=null,flagActive=false){
  const visible=isTrain963Visible(battleClock,flagActive);
  const offset=trainArrivalOffset(battleClock);
  const x=LOCOMOTIVE_PLACEMENT.position[0]+offset;
  const arriving=Number.isFinite(battleClock)&&battleClock>=TRAIN_963_ARRIVAL.startClock&&battleClock<TRAIN_963_ARRIVAL.stopClock;
  const stopped=visible&&offset===0;
  const u=arriving?(battleClock-TRAIN_963_ARRIVAL.startClock)/TRAIN_963_ARRIVAL.duration:(stopped?1:0);
  const speed=arriving?+(2*TRAIN_963_ARRIVAL.approachDistanceM*(1-u)/TRAIN_963_ARRIVAL.duration).toFixed(4):0;
  const distanceTravelled=TRAIN_963_ARRIVAL.approachDistanceM-offset;
  const wheelPhaseRad=+(distanceTravelled/TRAIN_963_ARRIVAL.wheelRadiusM).toFixed(4);
  const pistonOffsetM=+(Math.sin(wheelPhaseRad)*0.32).toFixed(4);
  const brakeIntensity=arriving&&u>0.62?+Math.min(1,(u-0.62)/0.38).toFixed(4):0;
  const chuffRateHz=arriving?+(Math.max(0.8,speed*1.35)).toFixed(3):0;
  const whistleActive=arriving&&((battleClock>=17012&&battleClock<=17016)||(battleClock>=17088&&battleClock<=17092));
  const clockVal=Number.isFinite(battleClock)?battleClock:17100;
  const fireboxPulse=+(0.78+0.22*(0.5+0.5*Math.sin(clockVal*3.7)*Math.cos(clockVal*2.3))).toFixed(4);
  return {
    visible,arriving,stopped,x,z:LOCOMOTIVE_PLACEMENT.position[2],
    offset,speed,wheelPhaseRad,pistonOffsetM,brakeIntensity,chuffRateHz,whistleActive,fireboxPulse
  };
}

export function locomotiveLOD(distance,current=null){return selectConsumerLod('locomotive',distance,'medium',current);}

function buildLocomotiveLightingFixture(){
  const parts=[];
  const warmBeam=[1.0,0.91,0.68];
  const coreWhite=[1.0,0.97,0.88];
  const fireboxAmber=[0.62,0.17,0.03];
  const brakeSpark=[0.55,0.21,0.04];

  // Heights are root-frame metres: the locomotive GLB sits at y=-.82 on the rail, so its own smokebox lamp bracket (model y 2.71, z -8.09)
  // is at y 1.89 here and the buffer beam top (model y 1.29, front z -8.41) at y 0.47. The source placed the lamps ~0.9 m too high.
  // Central smokebox headlamp + fog-free soft halo facing West (local -Z = world -X)
  const mainLamp=new THREE.CylinderGeometry(0.22,0.24,0.24,10);
  mainLamp.rotateX(Math.PI/2);mainLamp.translate(0,1.78,-8.22);
  parts.push(rgbaGeometry(mainLamp,coreWhite));
  parts.push(haloGeometry(1.5,1.78,-8.36,warmBeam,0.78));

  // Twin Reichsbahn buffer-beam lamps
  for(const s of [-0.68,0.68]){
    const bufferLamp=new THREE.CylinderGeometry(0.16,0.18,0.20,8);
    bufferLamp.rotateX(Math.PI/2);bufferLamp.translate(s,0.72,-8.30);
    parts.push(rgbaGeometry(bufferLamp,coreWhite));
  }

  // Dawn light cone towards the bridge gates: apex at the lamp, widening ahead (local -Z = world -X), faint and fading to nothing.
  // (The Gemini source had the apex pointing away from the lamp and an opaque fill; corrected after the in-game capture.)
  const cone=new THREE.ConeGeometry(2.6,15.5,12,1,true);
  cone.rotateX(Math.PI/2);cone.translate(0,1.78,-16.1);
  parts.push(rgbaGeometry(cone,[0.62,0.55,0.38],1,(px,py,pz)=>0.20*(1-Math.min(1,Math.max(0,(-8.35-pz)/15.5)))));

  // Under-cab firebox coal-bed glow (local +Z = cab end)
  const firebox=new THREE.BoxGeometry(1.65,0.44,1.95);
  firebox.translate(0,0.82,5.15);
  parts.push(rgbaGeometry(firebox,fireboxAmber,0.85));

  // Subtle brake-shoe ember strips along lower wheel frame
  for(const s of [-1.15,1.15]){
    const spark=new THREE.BoxGeometry(0.08,0.10,4.2);
    spark.translate(s,0.38,-1.5);
    parts.push(rgbaGeometry(spark,brakeSpark,0.6));
  }

  const merged=mergeGeometries(parts,false);
  for(const p of parts)p.dispose();
  merged.computeBoundingSphere();

  const material=new THREE.MeshBasicMaterial({
    vertexColors:true,
    transparent:true,
    opacity:0.92,
    fog:false,
    depthWrite:false,
    side:THREE.DoubleSide,
  });
  const mesh=new THREE.Mesh(merged,material);
  mesh.name='locomotive_963_headlamp_firebox';
  mesh.frustumCulled=false;
  return mesh;
}

// The firebox pulse is a pure function of the running clock; diagnostics omit it so a paused/restored stopped train reports identical state.
const stableKinematics=({fireboxPulse,...rest})=>rest;

// Presentation only. T24 (Gemini/Argon): the train enters moving and brakes to rest at the authoritative anchor (x=1075) by 04:45:00.
// The simulation's train963_arrives flag still forces the train visible; this class never decides events or damage.
export class M01Locomotive {
  constructor(parent,assets,box,cylinder,dark,metal){
    this.assets=assets;this.root=new THREE.Group();this.root.name='locomotive_963_visual';parent.add(this.root);
    this.root.position.fromArray(LOCOMOTIVE_PLACEMENT.position);this.root.rotation.y=LOCOMOTIVE_PLACEMENT.rotationY;
    this.proxy=new THREE.Group();this.proxy.name='original_locomotive_fallback';this.root.add(this.proxy);
    const body=new THREE.Mesh(box,dark);body.position.y=2;body.scale.set(2.8,3.2,17);this.proxy.add(body);
    this.proxyWheels=[];
    for(const z of [-5,5]){const wheel=new THREE.Mesh(cylinder,metal);wheel.position.set(0,.4,z);wheel.rotation.z=Math.PI/2;wheel.scale.set(.6,3.1,.6);this.proxy.add(wheel);this.proxyWheels.push(wheel);}
    this.proxy.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});
    this.lightingFixture=buildLocomotiveLightingFixture();this.root.add(this.lightingFixture);   // one merged draw call, fog:false
    this.models=new Map();this.revision=0;this.disposed=false;this.requestedLOD=2;this.selectedLOD=null;
    // T43 slice 2: whole-object LOD cross-fade (screen-door dither, 0.3 s) driven by the battle clock update() already receives.
    // The preset comes from the shared `m01LowDetail` uniform the view keeps on the metal material (or update()'s optional 4th argument).
    this.lodFade=new M01LodFade();this.lodCounters=createLodCounters();this.lodPreset='medium';this.lowDetail=metal?.userData?.m01LowDetail??null;
    this.lastKinematics=train963Kinematics(null,true);
  }
  async load(){
    await Promise.allSettled([0,1,2].map(async lod=>{
      try{
        const source=await this.assets.load(`locomotive:${lod}`,`${BASE}m01_locomotive_freight_lod${lod}.glb`);
        if(this.disposed)return;
        const model=source.scene.clone(true);model.visible=false;
        // Existing east track: terrain -1 + rail centre .12 + half rail height .06 = -.82 m.
        // Offset art only; retain the original fixed presentation anchor and gameplay data.
        model.position.y=-.82;
        model.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});
        this.models.set(lod,model);this.root.add(model);this.lodFade.register(lod,model);this.revision++;this.select(null,this.lodPreset,false);
      }catch{/* Optional art: retain original proxy or another usable LOD. */}
    }));
  }
  select(clock=null,preset=this.lodPreset,count=true){
    const available=[...this.models.keys()].sort((a,b)=>Math.abs(a-this.requestedLOD)-Math.abs(b-this.requestedLOD)||a-b);
    this.selectedLOD=available[0]??null;
    if(this.selectedLOD!==null){
      // No clock (asset arrival, tests) or the low preset => instant swap. A missing LOD asset can never be faded to or from.
      const before=this.lodFade.switches;this.lodFade.set(this.selectedLOD,clock,preset!=='low',count);
      if(this.lodFade.switches!==before)tallyLod(this.lodCounters,preset,this.selectedLOD);
    }
    for(const [lod,model]of this.models)model.visible=this.lodFade.shows(lod);
    this.proxy.visible=this.selectedLOD===null;
  }
  update(player,battleClock=null,flagActive=true,quality=null){
    // Omitted battleClock keeps the anchor at x=1075 (stopped), exactly as before T24.
    const kin=train963Kinematics(battleClock,flagActive);this.lastKinematics=kin;
    this.root.position.set(kin.x,LOCOMOTIVE_PLACEMENT.position[1],LOCOMOTIVE_PLACEMENT.position[2]);
    for(const w of this.proxyWheels)w.rotation.x=kin.wheelPhaseRad;
    if(this.lightingFixture?.material)this.lightingFixture.material.opacity=+(0.84+0.14*kin.fireboxPulse).toFixed(3);
    const distance=Math.hypot(player.x-kin.x,player.z+2.5);
    this.requestedLOD=locomotiveLOD(distance,this.requestedLOD);
    this.lodPreset=quality??(this.lowDetail?.value>.5?'low':'medium');this.select(battleClock,this.lodPreset);
  }
  get diagnostics(){return {loaded:[...this.models.keys()].sort(),lod:this.selectedLOD,requestedLOD:this.requestedLOD,
    fallback:this.proxy.visible,lodSwitches:this.lodFade.switches,fading:this.lodFade.active,lodLevel:this.lodFade.level,lodFadeProgress:this.lodFade.active?this.lodFade.progress.value:1,lodFades:this.lodFade.fades,lodSnaps:this.lodFade.snaps,lodPreset:this.lodPreset,
    lodCounters:{low:lodCounterTotals(this.lodCounters,'low'),medium:lodCounterTotals(this.lodCounters,'medium'),high:lodCounterTotals(this.lodCounters,'high')},position:this.root.position.toArray(),rotationY:this.root.rotation.y,
    visible:this.root.parent?.visible??false,motion:this.lastKinematics.arriving?'arriving_decelerating':'stationary',kinematics:stableKinematics(this.lastKinematics),
    headlampFogFree:this.lightingFixture?.material?.fog===false,fireboxActive:Boolean(this.lightingFixture?.visible)};}
  dispose(){
    if(this.disposed)return;this.disposed=true;this.lodFade.dispose();   // rebinds the shared materials, then frees the dither clones
    if(this.lightingFixture){this.lightingFixture.removeFromParent();this.lightingFixture.geometry.dispose();this.lightingFixture.material.dispose();}
    this.root.removeFromParent();this.models.clear();
  }
}
