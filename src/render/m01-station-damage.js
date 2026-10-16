import * as THREE from 'three';
// Separate reversible presentation layer; never edits Station V3's protected geometry/materials/colliders.
export class M01StationDamage{
  constructor(scene){
    this.group=new THREE.Group();this.group.name='m01_station_bomb_damage';scene.add(this.group);
    this.geometry=new THREE.PlaneGeometry(1,1);this.sootMaterial=new THREE.MeshBasicMaterial({color:'#252826',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    this.glassMaterial=new THREE.MeshBasicMaterial({color:'#101717',side:THREE.DoubleSide});
    this.soot=new THREE.InstancedMesh(this.geometry,this.sootMaterial,6);this.glass=new THREE.InstancedMesh(this.geometry,this.glassMaterial,12);
    this.soot.frustumCulled=this.glass.frustumCulled=false;this.group.add(this.soot,this.glass);this.dummy=new THREE.Object3D();
    for(let i=0;i<6;i++){this.dummy.position.set(-412+i*5,2+(i%2)*1.5,27.97);this.dummy.scale.set(4.6,6.5,1);this.dummy.updateMatrix();this.soot.setMatrixAt(i,this.dummy.matrix);}
    for(let i=0;i<12;i++){this.dummy.position.set(-428+i*6.3,i%2?4.65:-.55,27.96);this.dummy.scale.set(1.05,1.55,1);this.dummy.updateMatrix();this.glass.setMatrixAt(i,this.dummy.matrix);}
    this.group.visible=false;this.age=0;
  }
  update(damage,clock){const bomb=damage.find(d=>d.id==='station_bomb');this.group.visible=Boolean(bomb);this.age=bomb?Math.max(0,clock-bomb.started):0;
    this.sootMaterial.opacity=this.group.visible?.35+.45*Math.min(1,this.age/60):0;}
  get diagnostics(){return {visible:this.group.visible,age:this.age,soot:this.sootMaterial.opacity,brokenPanes:this.group.visible?12:0,drawCalls:this.group.visible?2:0,collidersAdded:0};}
  dispose(){this.group.removeFromParent();this.soot.dispose();this.glass.dispose();this.geometry.dispose();this.sootMaterial.dispose();this.glassMaterial.dispose();}
}
