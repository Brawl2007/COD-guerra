import * as THREE from 'three';
const vector=a=>new THREE.Vector3(...a),worldQ=bone=>bone.getWorldQuaternion(new THREE.Quaternion());
const setWorldQ=(bone,q)=>bone.quaternion.copy(worldQ(bone.parent).invert().multiply(q));
// Private camera-space cradle arrangement of the already sampled T08 poses.
// Accepted clips supply phase, bend timing and finger articulation. Private cradle
// contacts fold the shoulder-carry patient's limbs below this eye; no TP pose is changed.
export function frameFirstPersonCarry(root,patient,{phase='carry',age=0}={}){
 const update=()=>{root.updateMatrixWorld(true);patient.updateMatrixWorld(true);};
 const u=THREE.MathUtils.clamp(age/1.6,0,1),ease=u*u*(3-2*u),lift=phase==='pickup'?ease:phase==='putdown'?1-ease:1,drop=(1-lift)*.46;
 update();
 const hips=patient.getObjectByName('hips'),head=patient.getObjectByName('head'),l=patient.getObjectByName('upperarm_l'),r=patient.getObjectByName('upperarm_r');
 const hp=hips.getWorldPosition(new THREE.Vector3()),up=head.getWorldPosition(new THREE.Vector3()).sub(hp).normalize(),right=r.getWorldPosition(new THREE.Vector3()).sub(l.getWorldPosition(new THREE.Vector3()));
 right.addScaledVector(up,-right.dot(up)).normalize();const back=right.clone().cross(up).normalize();
 const targetHip=vector([.22,-.44-drop,-1.15-(1-lift)*.12]),targetHead=vector([-.43,-.30-drop,-1.20-(1-lift)*.12]),newUp=targetHead.sub(targetHip).normalize();
 const newRight=newUp.clone().cross(vector([0,-.5,-.86])).normalize(),newBack=newRight.clone().cross(newUp).normalize();
 const delta=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(newRight,newUp,newBack)).multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,back)).invert());
 const rootPosition=patient.getWorldPosition(new THREE.Vector3()),q=delta.clone().multiply(worldQ(patient)),position=targetHip.clone().sub(hp.sub(rootPosition).applyQuaternion(delta));
 patient.position.copy(patient.parent.worldToLocal(position));setWorldQ(patient,q);update();
 // The world clip is a fireman's shoulder carry. In this private cradle view the
 // same limbs fold close to the torso, with knees and boots down/right.
 const fold=(first,second,end,target,pole)=>{
  const start=first.getWorldPosition(new THREE.Vector3()),mid=second.getWorldPosition(new THREE.Vector3()),tip=end.getWorldPosition(new THREE.Vector3()),fq=worldQ(first),sq=worldQ(second),eq=worldQ(end),a=start.distanceTo(mid),b=mid.distanceTo(tip),direction=target.clone().sub(start).normalize();
  const distance=Math.min(start.distanceTo(target),a+b-.001),contact=start.clone().addScaledVector(direction,distance),along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
  pole.addScaledVector(direction,-pole.dot(direction)).normalize();const bend=start.clone().addScaledVector(direction,along).addScaledVector(pole,height);
  setWorldQ(first,new THREE.Quaternion().setFromUnitVectors(mid.clone().sub(start).normalize(),bend.clone().sub(start).normalize()).multiply(fq));update();
  setWorldQ(second,new THREE.Quaternion().setFromUnitVectors(tip.clone().sub(mid).normalize(),contact.clone().sub(bend).normalize()).multiply(sq));update();setWorldQ(end,eq);update();
 };
 for(const side of ['l','r']){
  fold(patient.getObjectByName(`thigh_${side}`),patient.getObjectByName(`calf_${side}`),patient.getObjectByName(`foot_${side}`),vector([.87,-.82-drop,-1.18+(side==='l'?-.07:.07)]),vector([.6,-1,.1]));
  fold(patient.getObjectByName(`upperarm_${side}`),patient.getObjectByName(`lowerarm_${side}`),patient.getObjectByName(`hand_${side}`),vector([side==='l'?-.08:.10,-.43-drop,-1.02]),vector([-.1,-1,.1]));
 }

 for(const side of ['l','r']){
  const upper=root.getObjectByName(`upperarm_${side}`),lower=root.getObjectByName(`lowerarm_${side}`),hand=root.getObjectByName(`hand_${side}`),finger=root.getObjectByName(`middle_01_${side}`);
  const oldShoulder=upper.getWorldPosition(new THREE.Vector3()),oldElbow=lower.getWorldPosition(new THREE.Vector3()),oldHand=hand.getWorldPosition(new THREE.Vector3()),oldFinger=finger.getWorldPosition(new THREE.Vector3()).sub(oldHand).normalize();
  const uq=worldQ(upper),lq=worldQ(lower),hq=worldQ(hand),a=oldShoulder.distanceTo(oldElbow),b=oldElbow.distanceTo(oldHand);
  const target=vector([side==='l'?-.26:.28,-.47-drop,-.94-(1-lift)*.12]),shoulder=vector([side==='l'?-.34:.34,-.53,-.04]),direction=target.clone().sub(shoulder).normalize();
  let distance=shoulder.distanceTo(target);const reach=a+b-.001;if(distance>reach){shoulder.addScaledVector(direction,distance-reach);distance=reach;}
  const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along)),pole=vector([side==='l'?-.5:.5,-1,.1]);pole.addScaledVector(direction,-pole.dot(direction)).normalize();
  const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,height);
  upper.position.copy(upper.parent.worldToLocal(shoulder.clone()));setWorldQ(upper,new THREE.Quaternion().setFromUnitVectors(oldElbow.clone().sub(oldShoulder).normalize(),elbow.clone().sub(shoulder).normalize()).multiply(uq));update();
  setWorldQ(lower,new THREE.Quaternion().setFromUnitVectors(oldHand.clone().sub(oldElbow).normalize(),target.clone().sub(elbow).normalize()).multiply(lq));update();
  const forward=vector([side==='l'?.35:-.15,.25,-1]).normalize();setWorldQ(hand,new THREE.Quaternion().setFromUnitVectors(oldFinger,forward).multiply(hq));update();
 }
 return {lift,patientJoints:Object.fromEntries(['head','hips','calf_l','calf_r','foot_l','foot_r'].map(name=>[name,patient.getObjectByName(name).getWorldPosition(new THREE.Vector3()).toArray()])),patientHip:targetHip.toArray(),hands:['l','r'].map(s=>root.getObjectByName(`hand_${s}`).getWorldPosition(new THREE.Vector3()).toArray())};
}
