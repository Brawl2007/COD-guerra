// M01 sapper operation, presentation (R3-a, 2026-10-24): the small things the sappers hold, on the bones of the rig so that they follow the clips: the pliers in the leader's right hand while
// he examines and splices, the continuity tester in his left hand while the line is tested (its lamp shows no passage, then passage), a coil of spare cable in the helper's left hand while he
// holds the splice, and the crate on the helper's shoulder (the carry_socket bone) on the walk to the second cut. Original procedural shapes (boxes and cylinders; no third-party asset, no
// file): the game shows no connections, charges or procedures (HISTORICAL_RESEARCH.md §79), only the damaged line and the sappers' abstract work. Geometry and materials are shared by the
// three men and owned by the kit (disposed with the characters); a prop is visible only in the phases that ask for it (sim.sapperOps). Nothing here is saved or decides anything.
import * as THREE from 'three';

const deg=d=>d*Math.PI/180;
/** Where each prop sits in the local frame of its bone (the bind pose of the rig has no bone rotation: +x is the soldier's right, +y up, -z forward). Metres and degrees; tuned on captures. */
export const KIT_FIT=Object.freeze({
  pliers:{bone:'hand_r',pos:[.02,-.02,-.075],rot:[-20,0,10]},
  tester:{bone:'hand_l',pos:[-.02,-.035,-.07],rot:[-10,0,-10]},
  coil:{bone:'hand_l',pos:[-.03,-.06,-.07],rot:[70,0,0]},
  crate:{bone:'carry_socket',pos:[.04,.12,-.02],rot:[0,-10,0]},
});
export const LAMP_COLOR=Object.freeze({idle:'#3a2f16',testing:'#c98a1f',fail:'#a3261a',pass:'#4fe07c'});

export class SapperKit {
  constructor(){
    this.geometry={
      plierHandle:new THREE.BoxGeometry(.012,.012,.15),plierHead:new THREE.BoxGeometry(.03,.012,.05),
      testerBody:new THREE.BoxGeometry(.075,.035,.11),testerLamp:new THREE.SphereGeometry(.012,8,6),probe:new THREE.CylinderGeometry(.003,.003,.14,5),
      coil:new THREE.TorusGeometry(.065,.014,6,14),
      crate:new THREE.BoxGeometry(.42,.24,.26),crateStripe:new THREE.BoxGeometry(.43,.04,.005),crateLid:new THREE.BoxGeometry(.42,.02,.26),
    };
    this.material={
      steel:new THREE.MeshStandardMaterial({color:'#6b6e70',roughness:.45,metalness:.6}),rubber:new THREE.MeshStandardMaterial({color:'#2a2118',roughness:.9}),
      tester:new THREE.MeshStandardMaterial({color:'#3d4a33',roughness:.7}),cable:new THREE.MeshStandardMaterial({color:'#25231f',roughness:.9}),
      wood:new THREE.MeshStandardMaterial({color:'#7d5d38',roughness:.95}),white:new THREE.MeshStandardMaterial({color:'#e7e2cf',roughness:.9}),
      lamp:new THREE.MeshBasicMaterial({color:LAMP_COLOR.idle,toneMapped:false,fog:false}),
    };
  }
  /** The props of one sapper, parented to the bones of his rig (invisible until a phase asks for them). Returns null for a man without the bones. */
  attach(root){
    const find=n=>root.getObjectByName(n),kit={};
    const place=(mesh,fit)=>{const bone=find(fit.bone);if(!bone)return false;mesh.position.set(...fit.pos);mesh.rotation.set(deg(fit.rot[0]),deg(fit.rot[1]),deg(fit.rot[2]));mesh.visible=false;mesh.frustumCulled=false;mesh.name='sapper_kit';bone.add(mesh);return true;};
    const g=this.geometry,m=this.material;
    const pliers=new THREE.Group(),a=new THREE.Mesh(g.plierHandle,m.rubber),b=new THREE.Mesh(g.plierHandle,m.rubber),head=new THREE.Mesh(g.plierHead,m.steel);
    a.position.set(.012,0,.075);a.rotation.y=deg(-5);b.position.set(-.012,0,.075);b.rotation.y=deg(5);head.position.set(0,0,-.012);pliers.add(a,b,head);
    const tester=new THREE.Group(),body=new THREE.Mesh(g.testerBody,m.tester),lamp=new THREE.Mesh(g.testerLamp,m.lamp.clone()),probe=new THREE.Mesh(g.probe,m.steel);
    lamp.position.set(0,.024,-.03);probe.position.set(.03,.0,-.12);probe.rotation.x=deg(90);tester.add(body,lamp,probe);
    const coil=new THREE.Mesh(g.coil,m.cable);
    const crate=new THREE.Group(),box=new THREE.Mesh(g.crate,m.wood),stripe=new THREE.Mesh(g.crateStripe,m.white);stripe.position.set(0,0,.133);crate.add(box,stripe);
    if(!(place(pliers,KIT_FIT.pliers)&place(tester,KIT_FIT.tester)&place(coil,KIT_FIT.coil)&place(crate,KIT_FIT.crate)))return null;
    kit.pliers=pliers;kit.tester=tester;kit.lamp=lamp;kit.coil=coil;kit.crate=crate;
    return kit;
  }
  /** Which props a sapper shows in this phase (a pure function of the role and the phase; the renderer applies it). */
  static visibility(role,ops){
    const id=ops?.phase,work=id==='inspect'||id==='splice'||id==='inspect2'||id==='splice2',test=id==='test'||id==='test2'||id==='fail';
    return {pliers:role==='leader'&&work,tester:role==='leader'&&(test||(id==='report'&&(ops.t??0)<3)),
      coil:role==='helper'&&(id==='splice'||id==='splice2'),crate:role==='helper'&&ops?.box?.state==='carried'};
  }
  /** The colour of the tester's lamp: dim while it works, red when there is no passage, green when there is. */
  static lamp(ops){
    const r=ops?.lamp?.result;
    return r==='pass'?LAMP_COLOR.pass:r==='fail'?LAMP_COLOR.fail:(ops?.lamp?.on?LAMP_COLOR.testing:LAMP_COLOR.idle);
  }
  sync(kit,role,ops){
    if(!kit)return;
    const v=SapperKit.visibility(role,ops);
    kit.pliers.visible=v.pliers;kit.tester.visible=v.tester;kit.coil.visible=v.coil;kit.crate.visible=v.crate;
    if(v.tester)kit.lamp.material.color.set(SapperKit.lamp(ops));
  }
  dispose(){for(const o of [...Object.values(this.geometry),...Object.values(this.material)])o.dispose();}
}
