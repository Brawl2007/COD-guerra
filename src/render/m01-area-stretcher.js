import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Area acts (VII-b): the stretcher the two bearers carry. Presentation only, procedural, no third-party asset: two wooden poles, two spreaders and a sagging canvas. The simulation's bearers walk abreast and
// the wounded man rides on the first one's shoulder (act 1's `carriedBy`; src/game/m01-area-sim.js stepMedics, which this file does not touch). When the simulation says a man is carried by a bearer
// (`actor.carriedBy` is an np_maqueiro_N) the renderer DRAWS the pair fore-and-aft with the man lying on the canvas between them: the rear bearer is drawn behind the first one (a copy of his record with
// another x/z, never written back), the wounded man is drawn lying (`carriedBy` cleared in his copy, so he keeps his own `WOUNDED` lying pose instead of the shoulder one), and the poles run between their
// hands. Nothing here decides anything: positions, who is carried and when the lift began (`timers.medics.since`) are all the simulation's. If any record is missing or not finite, nothing is replaced and
// the old shoulder carry is drawn exactly as before.
export const STRETCHER=Object.freeze({gapM:2.0,lengthM:2.3,halfWidthM:.29,heightM:.8,liftSec:1.2,restHeightM:.12});
const BEARER=/^np_maqueiro_\d+$/;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const finite=a=>a!==undefined&&a!==null&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Number.isFinite(a.facing);

/**
 * Pure layout of the drawn pair. `front` = the bearer who carries (his x/z/y/facing), `rear` = the other, `lift` = 0..1 (0: the bearers have just reached the man, abreast on either side of him;
 * 1: the stretcher is up and they walk in line). Writes into `out` (no allocation) and returns it, or null when a record is unusable.
 */
export function stretcherPose(front,rear,lift,out={}){
  if(!finite(front)||!finite(rear))return null;
  const k=smooth(Number.isFinite(lift)?lift:1),dx=Math.cos(front.facing),dz=Math.sin(front.facing),y0=Number.isFinite(front.y)?front.y:0;
  out.yaw=front.facing;out.lift=k;
  // the rear bearer: from where the simulation has him (beside the first, at the pick-up) to GAP behind the first along the heading
  out.rearX=rear.x+(front.x-dx*STRETCHER.gapM-rear.x)*k;out.rearZ=rear.z+(front.z-dz*STRETCHER.gapM-rear.z)*k;
  out.rearY=Number.isFinite(rear.y)?rear.y:y0;
  out.x=(front.x+out.rearX)/2;out.z=(front.z+out.rearZ)/2;
  out.y=y0+STRETCHER.restHeightM+(STRETCHER.heightM-STRETCHER.restHeightM)*k;
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
    this.list=[];this.rearCopy={};this.patientCopy={};this.pose={};this.active=false;this.frames=0;
  }
  /**
   * `actors` = the simulation's actor list, `medics` = its `timers.medics` record (read), `clock` = the simulation clock. Returns the list to draw: the same array when nobody is carried on a stretcher,
   * else a reused display list where the rear bearer and the patient are replaced by drawn copies. The copies are the only objects ever changed.
   */
  present(actors,medics,clock){
    let patient=null,front=null,rear=null;
    for(let i=0;i<actors.length;i++){const a=actors[i];if(a.active&&a.carriedBy&&BEARER.test(a.carriedBy)){patient=a;break;}}
    if(patient){
      for(let i=0;i<actors.length;i++){const a=actors[i];if(!a.active)continue;if(a.id===patient.carriedBy)front=a;else if(BEARER.test(a.id))rear=a;}
    }
    const since=medics&&medics.state==='carry'&&Number.isFinite(medics.since)?medics.since:null;
    const pose=patient&&front&&rear?stretcherPose(front,rear,since===null?1:(clock-since)/STRETCHER.liftSec,this.pose):null;
    if(!pose){this.active=false;this.group.visible=false;return actors;}
    this.active=true;this.frames++;
    this.group.visible=true;this.group.position.set(pose.x,pose.y,pose.z);this.group.rotation.set(0,-pose.yaw,0);
    const rc=Object.assign(this.rearCopy,rear),pc=Object.assign(this.patientCopy,patient);
    rc.x=pose.rearX;rc.z=pose.rearZ;rc.y=pose.rearY;rc.facing=front.facing;
    // the man lies on the canvas: his own lying pose (WOUNDED, no carrier), head towards the rear bearer's end, his body on the canvas
    pc.carriedBy=null;pc.x=pose.x;pc.z=pose.z;pc.y=pose.y-.01;pc.facing=pose.yaw+Math.PI;
    const list=this.list;list.length=actors.length;
    for(let i=0;i<actors.length;i++){const a=actors[i];list[i]=a===patient?pc:a===rear?rc:a;}
    return list;
  }
  get diagnostics(){return {active:this.active,frames:this.frames,x:this.group.position.x,y:this.group.position.y,z:this.group.position.z,yaw:this.pose.yaw??null,lift:this.pose.lift??null};}
  dispose(){this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.group.clear();this.list.length=0;}
}
