import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Area acts (VII-b): the stretcher the two bearers carry. Presentation only, procedural, no third-party asset: two wooden poles, two spreaders and a sagging canvas. The simulation (src/game/m01-area-sim.js
// stepMedics) walks the bearers in line, STRETCHER_GAP_M apart, and keeps the carried man (`actor.carriedBy` is an np_maqueiro_N) between them at carrying height: those are the positions rounds are traced against
// (traceShot, germanTargets), so NO body is drawn anywhere else. The renderer draws the stretcher where the simulation has the pair (centred on the carried man, its long axis along the line from the rear bearer to
// the front one) and draws the man lying on it: the only copy is his own record with `carriedBy` cleared (same x/y/z), so he keeps his `WOUNDED` lying pose instead of the shoulder one. Nothing here decides anything.
// If any record is missing or not finite, nothing is replaced and the old shoulder carry is drawn exactly as before.
export const STRETCHER=Object.freeze({gapM:2.0,lengthM:2.3,halfWidthM:.29,heightM:.8,liftSec:1.2,restHeightM:.12,canvasBelowM:.01});   // gapM, heightM, liftSec, restHeightM: the simulation's STRETCHER_* (a test pins them)
const BEARER=/^np_maqueiro_\d+$/;
const finite=a=>a!==undefined&&a!==null&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Number.isFinite(a.facing);

/**
 * Pure layout of the drawn stretcher from the simulation's records (nothing is moved): centred under the carried man (`patient`: his x/y/z), the long axis along the line from the `rear` bearer to the `front` one
 * (the front bearer's heading when they coincide). Writes into `out` (no allocation) and returns it, or null when a record is unusable.
 */
export function stretcherPose(front,rear,patient,out={}){
  if(!finite(front)||!finite(rear)||patient===undefined||patient===null||!Number.isFinite(patient.x)||!Number.isFinite(patient.z)||!Number.isFinite(patient.y))return null;
  const dx=front.x-rear.x,dz=front.z-rear.z;
  out.yaw=Math.hypot(dx,dz)>1e-6?Math.atan2(dz,dx):front.facing;
  out.x=patient.x;out.z=patient.z;out.y=patient.y+STRETCHER.canvasBelowM;
  return out;
}

/** The stretcher's geometry: [wood (poles, spreaders), canvas]. The long axis is local X, the canvas hangs a little below the poles. Owned by the caller. */
export function buildStretcherGeometry(){
  const L=STRETCHER.lengthM,W=STRETCHER.halfWidthM;
  const poles=[-W,W].map(z=>new THREE.CylinderGeometry(.022,.022,L,6).rotateZ(Math.PI/2).translate(0,0,z));
  const spreaders=[-.82,.82].map(x=>new THREE.BoxGeometry(.035,.03,W*2+.06).translate(x,-.02,0));
  const grips=[-L/2,L/2].flatMap(x=>[-W,W].map(z=>new THREE.CylinderGeometry(.03,.03,.16,6).rotateZ(Math.PI/2).translate(x+(x<0?.05:-.05),0,z)));
  const wood=mergeGeometries([...poles,...spreaders,...grips]);
  for(const g of [...poles,...spreaders,...grips])g.dispose();
  const canvas=new THREE.BoxGeometry(L-.38,.014,W*2-.03,10,1,4),p=canvas.attributes.position;
  for(let i=0;i<p.count;i++){const u=p.getZ(i)/(W-.015);p.setY(i,p.getY(i)-.045*(1-u*u)-.03);}   // the canvas sags between the poles
  canvas.computeVertexNormals();
  return [wood,canvas];
}

export class M01AreaStretcher{
  constructor(parent){
    this.group=new THREE.Group();this.group.name='m01-area-stretcher';this.group.visible=false;parent.add(this.group);
    const [wood,canvas]=buildStretcherGeometry();
    this.geometries=[wood,canvas];
    this.materials=[new THREE.MeshStandardMaterial({color:'#5e4a30',roughness:.92}),new THREE.MeshStandardMaterial({color:'#7d7556',roughness:1,side:THREE.DoubleSide})];
    for(const [g,m,name] of [[wood,this.materials[0],'poles'],[canvas,this.materials[1],'canvas']]){const mesh=new THREE.Mesh(g,m);mesh.name=`m01-area-stretcher-${name}`;mesh.castShadow=false;mesh.receiveShadow=true;this.group.add(mesh);}
    this.list=[];this.patientCopy={};this.pose={};this.active=false;this.frames=0;
  }
  /**
   * `actors` = the simulation's actor list. (`medics` and `clock` are no longer needed: the lift is the simulation's, in the carried man's y.) Returns the list to draw: the same array when nobody is carried on a
   * stretcher, else a reused display list where only the carried man is replaced by a drawn copy (`carriedBy` cleared, same position). The bearers are the simulation's own objects.
   */
  present(actors){
    let patient=null,front=null,rear=null;
    for(let i=0;i<actors.length;i++){const a=actors[i];if(a.active&&a.carriedBy&&BEARER.test(a.carriedBy)){patient=a;break;}}
    if(patient){
      for(let i=0;i<actors.length;i++){const a=actors[i];if(!a.active)continue;if(a.id===patient.carriedBy)front=a;else if(BEARER.test(a.id))rear=a;}
    }
    const pose=patient&&front&&rear?stretcherPose(front,rear,patient,this.pose):null;
    if(!pose){this.active=false;this.group.visible=false;return actors;}
    this.active=true;this.frames++;
    this.group.visible=true;this.group.position.set(pose.x,pose.y,pose.z);this.group.rotation.set(0,-pose.yaw,0);
    // the man lies on the canvas: his own lying pose (WOUNDED, no carrier), head towards the rear bearer's end; where he is does not change
    const pc=Object.assign(this.patientCopy,patient);pc.carriedBy=null;pc.facing=pose.yaw+Math.PI;
    const list=this.list;list.length=actors.length;
    for(let i=0;i<actors.length;i++){const a=actors[i];list[i]=a===patient?pc:a;}
    return list;
  }
  get diagnostics(){return {active:this.active,frames:this.frames,x:this.group.position.x,y:this.group.position.y,z:this.group.position.z,yaw:this.pose.yaw??null};}
  dispose(){this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.group.clear();this.list.length=0;}
}
