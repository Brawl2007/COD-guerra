import * as THREE from 'three';
import {TRAIN_963_ARRIVAL,trainArrivalOffset,isTrain963Visible} from './m01-locomotive.js';
import {PANZERZUG_ARRIVAL,panzerzugArrivalOffset,isPanzerzugVisible} from './m01-panzerzug.js';
import {RAILWAY_PUFF_BUDGET,RAILWAY_SMOKE_ANCHOR_X} from './m01-atmosphere.js';
// T24 reconciliation: ONE canonical arrival (Gemini/Argon brake-to-stop: enters moving, quadratic deceleration to rest).
// 963: 1435 -> 1075 m, 04:43:30 -> 04:45:00; Panzerzug: 1359 -> 1119 m, 04:51:00 -> 04:52:00. This table only mirrors those constants.
const ARRIVAL_CURVES=Object.freeze({
  train963:{arrival:TRAIN_963_ARRIVAL,offset:trainArrivalOffset,visible:isTrain963Visible},
  panzerzug:{arrival:PANZERZUG_ARRIVAL,offset:panzerzugArrivalOffset,visible:isPanzerzugVisible},
});
export const TRAIN_ARRIVALS=Object.freeze(Object.fromEntries(Object.entries(ARRIVAL_CURVES).map(([id,{arrival:a}])=>
  [id,Object.freeze({from:a.startClock,until:a.stopClock,distance:a.approachDistanceM,finalX:a.stopX,z:a.trackZ})])));
// Front-most original engine LOD2 vertex is -8.414942m (963), -8.108891m (Panzerzug).
// Keep the halo outside original body/buffers to avoid an occluded fog-free lamp.
export const TRAIN_HEADLAMP_OFFSET=-8.65;
// A 4m radial glow keeps an unresolved lamp rasterized at ~1km; the original lens/art stays intact.
export const TRAIN_HEADLAMP_DIAMETER=4;
// Lamp art LOD (T24 reconciliation): exactly one lamp mesh per train is drawn. Near, the train's own merged fixture
// (Gemini: lamp lenses, soft halo, dawn beam, firebox, brake glow; one draw call); far, this 4 m fog-free halo that stays
// rasterized at ~1 km. Hysteresis band in metres from the camera to the engine front.
export const TRAIN_LAMP_FAR_SWITCH=Object.freeze({toFar:160,toNear:140});
// One railway puff cap for the whole build (canonical constant lives with the single emitter in m01-atmosphere.js).
export const TRAIN_PUFF_CAP=RAILWAY_PUFF_BUDGET;
export function trainOffset(battleClock,id='train963'){return ARRIVAL_CURVES[id].offset(battleClock);}
export const trainX=(battleClock,id='train963')=>TRAIN_ARRIVALS[id].finalX+trainOffset(battleClock,id);
export class M01TrainLife{
  constructor(train,panzerzug,{fixtures=[]}={}){
    this.parents=[train,panzerzug];this.fixtures=[fixtures[0]??null,fixtures[1]??null];this.lampsEnabled=true;this.lampFar=[true,true];this.lampPoint=new THREE.Vector3();this.sources=[{id:'train963',x:0,y:3.8,z:-2.5,active:false},{id:'panzerzug',x:0,y:3.8,z:2.5,active:false}];this.offsets=[0,0];
    const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const n=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);pixels[n]=255;pixels[n+1]=228;pixels[n+2]=160;pixels[n+3]=Math.round(255*Math.pow(Math.max(0,1-r),1.4));}
    this.lampTexture=new THREE.DataTexture(pixels,32,32);this.lampTexture.needsUpdate=true;
    this.lamps=this.parents.map((parent,i)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(TRAIN_HEADLAMP_DIAMETER,TRAIN_HEADLAMP_DIAMETER),new THREE.MeshBasicMaterial({color:'#ffffff',map:this.lampTexture,transparent:true,depthWrite:false,fog:false,side:THREE.DoubleSide}));
      mesh.material.forceSinglePass=true;mesh.name='train_headlamp';mesh.position.set(TRAIN_ARRIVALS[this.sources[i].id].finalX+TRAIN_HEADLAMP_OFFSET,2.5,this.sources[i].z);mesh.rotation.y=Math.PI/2;parent.add(mesh);return mesh;});
    this.clock=0;
    this.observed=new Map();this.native={calls:0,triangles:0,byMesh:{}};this.sourceRevision=null;
  }
  observe(revision){if(this.sourceRevision===revision)return;this.sourceRevision=revision;
    for(const parent of this.parents)parent.traverse(mesh=>{if(!mesh.isMesh||this.observed.has(mesh))return;const before=mesh.onBeforeRender,owner=this;
      mesh.onBeforeRender=function(renderer,scene,camera,geometry,material,group){before.call(this,renderer,scene,camera,geometry,material,group);if(camera!==owner.mainCamera)return;
        owner.native.calls++;owner.native.byMesh[this.name]=(owner.native.byMesh[this.name]??0)+1;owner.native.triangles+=(group?.count??geometry.index?.count??geometry.attributes.position.count)/3*(this.isInstancedMesh?this.count:1);};
      this.observed.set(mesh,before);
    });
  }
  // Lamp visibility is owned here: enabled (debug A/B) AND the distance LOD pick between near fixture and far halo.
  selectLampArt(camera){for(let i=0;i<2;i++){const lamp=this.lamps[i],fixture=this.fixtures[i];
    if(camera&&fixture){this.parents[i].updateWorldMatrix(true,false);const d=this.lampPoint.copy(lamp.position).applyMatrix4(this.parents[i].matrixWorld).distanceTo(camera.position);
      this.lampFar[i]=this.lampFar[i]?d>TRAIN_LAMP_FAR_SWITCH.toNear:d>TRAIN_LAMP_FAR_SWITCH.toFar;}else this.lampFar[i]=true;
    lamp.visible=this.lampsEnabled&&this.lampFar[i];if(fixture)fixture.visible=this.lampsEnabled&&!this.lampFar[i];
  }}
  beginFrame(camera){this.mainCamera=camera;this.selectLampArt(camera);this.native.calls=0;this.native.triangles=0;for(const key of Object.keys(this.native.byMesh))this.native.byMesh[key]=0;}
  // The parent groups are NOT moved here (single transform owner per train: M01Locomotive/M01Panzerzug roots and the wagon group).
  // This owns only parent visibility (arrival started OR authoritative flag), its own halo position and the puff sources.
  update(battleClock,flags={}){this.clock=battleClock;for(let i=0;i<2;i++){
    const s=this.sources[i],p=TRAIN_ARRIVALS[s.id],offset=trainOffset(battleClock,s.id);this.offsets[i]=offset;
    this.parents[i].visible=ARRIVAL_CURVES[s.id].visible(battleClock,Boolean(flags[s.id]));s.active=this.parents[i].visible;
    s.x=p.finalX+offset+RAILWAY_SMOKE_ANCHOR_X[s.id];this.lamps[i].position.x=p.finalX+TRAIN_HEADLAMP_OFFSET+offset;
  }return this.sources;}
  get diagnostics(){return {battleClock:this.clock,trains:this.sources.map((s,i)=>({id:s.id,x:trainX(this.clock,s.id),offset:this.offsets[i],parentX:this.parents[i].position.x,lampX:this.lamps[i].position.x,
    visible:this.parents[i].visible,headlamp:this.lampsEnabled&&this.parents[i].visible,lampArt:this.lampFar[i]?'halo_1km':'fixture_near',fog:this.lamps[i].material.fog,arrival:TRAIN_ARRIVALS[s.id]})),native:{...this.native,byMesh:{...this.native.byMesh}},puffCaps:TRAIN_PUFF_CAP};}
  dispose(){for(const [mesh,before]of this.observed)mesh.onBeforeRender=before;this.observed.clear();for(const m of this.lamps){m.removeFromParent();m.geometry.dispose();m.material.dispose();}this.lampTexture.dispose();for(const f of this.fixtures)if(f)f.visible=true;}
}
