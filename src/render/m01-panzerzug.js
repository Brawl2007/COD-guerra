import * as THREE from 'three';

const BASE='assets/models/production/m01/panzerzug/';
export const PANZERZUG_PLACEMENT=Object.freeze({position:Object.freeze([1119,0,2.5]),rotationY:Math.PI/2});
export function panzerzugLOD(distance,current=null){
  if(current===0&&distance<66)return 0;
  if(current===1&&distance>=54&&distance<198)return 1;
  if(current===2&&distance>=162)return 2;
  return distance<60?0:distance<180?1:2;
}

// Presentation only. The existing train event owns visibility; the train is stationary.
export class M01Panzerzug {
  constructor(parent,assets,box,cylinder,metal){
    this.assets=assets;this.root=new THREE.Group();this.root.name='panzerzug_visual';parent.add(this.root);
    this.root.position.fromArray(PANZERZUG_PLACEMENT.position);this.root.rotation.y=PANZERZUG_PLACEMENT.rotationY;
    this.proxy=new THREE.Group();this.proxy.name='original_panzerzug_fallback';this.root.add(this.proxy);
    for(let i=0;i<5;i++){const body=new THREE.Mesh(box,metal);body.position.set(0,2,i*19);body.scale.set(2.9,3.1,17);this.proxy.add(body);}
    for(const z of [1,78]){const cap=new THREE.Mesh(cylinder,metal);cap.position.set(0,4,z);cap.scale.set(1,1,1);this.proxy.add(cap);}
    this.proxy.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});
    this.models=new Map();this.revision=0;this.disposed=false;this.requestedLOD=2;this.selectedLOD=null;
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
  update(player){
    const distance=Math.min(...[0,1,2,3,4].map(i=>Math.hypot(player.x-(1119+i*19),player.z-2.5)));
    this.requestedLOD=panzerzugLOD(distance,this.requestedLOD);this.select();
  }
  get diagnostics(){return {loaded:[...this.models.keys()].sort(),lod:this.selectedLOD,requestedLOD:this.requestedLOD,
    fallback:this.proxy.visible,position:this.root.position.toArray(),rotationY:this.root.rotation.y,
    visible:this.root.parent?.visible??false,motion:'stationary; no synthetic wheel rotation'};}
  dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();this.models.clear();}
}
