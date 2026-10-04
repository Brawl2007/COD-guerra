import * as THREE from 'three';
import wagonManifest from '../../assets/models/provisional/m01-wagons/manifest.json' with {type:'json'};

const INTACT_BASE='assets/models/provisional/m01-wagons/';
const DAMAGE_BASE='assets/models/provisional/m01-wagon-damage/';

export const M01_YARD_WAGON_PLAN=Object.freeze([
  Object.freeze({id:'yard_wagon_1',type:'covered',position:Object.freeze([-320,0,-6]),cover:'cv_wagon_1'}),
  Object.freeze({id:'yard_wagon_2',type:'open',position:Object.freeze([-340,0,8]),cover:'cv_wagon_2'}),
  Object.freeze({id:'yard_wagon_3',type:'covered',position:Object.freeze([-352,0,8]),damageKey:'station_wagon_fire'}),
]);

export const yardWagonLod=quality=>quality==='low'?1:0;
export const yardWagonState=(wagon,destruction=[])=>wagon.damageKey&&destruction.includes(wagon.damageKey)?'burned':'intact';
export const yardWagonPosition=(wagon,world)=>[wagon.position[0],world?.heightAt?world.heightAt(wagon.position[0],wagon.position[2]):wagon.position[1],wagon.position[2]];
export const yardWagonFireDamage=(destruction,world,started=0)=>{
  const wagon=M01_YARD_WAGON_PLAN.find(w=>w.damageKey==='station_wagon_fire');
  if(!wagon||yardWagonState(wagon,destruction)!=='burned')return null;
  const [x,y,z]=yardWagonPosition(wagon,world),sockets=wagonManifest.types[wagon.type].sockets;
  return {id:'station_wagon_fire',x,y:y+sockets.smoke_top[1]-3,z,fireY:y+sockets.fire[1],started,smokeVisible:true};
};

const sourceKey=(type,state,lod)=>`${type}:${state}:${lod}`;
const sourcePath=(type,state,lod)=>state==='burned'
  ?`${DAMAGE_BASE}m01_wagon_${type}_burned_lod${lod}.glb`
  :`${INTACT_BASE}m01_wagon_${type}_lod${lod}.glb`;

export class M01YardWagons{
  constructor(parent,assets,box,cylinder,wood,metal){
    this.assets=assets;this.sources=new Map();this.pending=new Map();this.revision=0;this.disposed=false;this.lod=null;
    this.group=new THREE.Group();this.group.name='m01_yard_wagons';parent.add(this.group);
    this.slots=M01_YARD_WAGON_PLAN.map(wagon=>{
      const root=new THREE.Group();root.name=wagon.id;root.position.set(...wagon.position);this.group.add(root);
      const fallback=new THREE.Group();fallback.name=`${wagon.id}_fallback`;root.add(fallback);
      const body=new THREE.Mesh(box,wood);body.position.y=wagon.type==='open'?1.45:2;body.scale.set(2.8,wagon.type==='open'?1.7:3.2,7.86);
      body.castShadow=body.receiveShadow=true;fallback.add(body);
      for(const z of [-2,2]){
        const wheel=new THREE.Mesh(cylinder,metal);wheel.position.set(0,.5,z);wheel.rotation.z=Math.PI/2;wheel.scale.set(.5,1.55,.5);
        wheel.castShadow=wheel.receiveShadow=true;fallback.add(wheel);
      }
      return {wagon,root,fallback,model:null,key:null,state:'intact'};
    });
  }
  async ensure(type,state,lod){
    const key=sourceKey(type,state,lod);if(this.sources.has(key))return this.sources.get(key);
    if(this.pending.has(key))return this.pending.get(key);
    const promise=this.assets.load(`yard-wagon:${key}`,sourcePath(type,state,lod)).then(source=>{
      if(!this.disposed){this.sources.set(key,source);this.revision++;this.rebuild();}
      return source;
    }).catch(()=>null).finally(()=>this.pending.delete(key));
    this.pending.set(key,promise);return promise;
  }
  async load(quality){
    const lod=yardWagonLod(quality);this.lod=lod;
    await Promise.allSettled([
      this.ensure('covered','intact',lod),
      this.ensure('open','intact',lod),
      this.ensure('covered','burned',lod),
    ]);
    if(!this.disposed)this.rebuild();
  }
  update(destruction,quality,world){
    const lod=yardWagonLod(quality);if(lod!==this.lod){this.lod=lod;void this.load(quality);}
    let changed=false;
    for(const slot of this.slots){
      slot.root.position.fromArray(yardWagonPosition(slot.wagon,world));
      const state=yardWagonState(slot.wagon,destruction);
      if(slot.state!==state){slot.state=state;changed=true;}
    }
    if(changed)this.rebuild();
  }
  rebuild(){
    if(this.disposed)return;
    for(const slot of this.slots){
      const desired=sourceKey(slot.wagon.type,slot.state,this.lod??0);
      const fallbackKey=sourceKey(slot.wagon.type,'intact',this.lod??0);
      const source=this.sources.get(desired)??this.sources.get(fallbackKey)??null;
      const actual=source?this.sources.has(desired)?desired:fallbackKey:'fallback';
      if(slot.key===actual)continue;
      if(slot.model){slot.model.removeFromParent();slot.model=null;}
      slot.key=actual;slot.fallback.visible=!source;
      if(source){
        const model=source.scene.clone(true);model.name=`${slot.wagon.id}_${slot.state}`;
        model.traverse(node=>{if(node.isMesh){node.castShadow=node.receiveShadow=true;}});
        slot.root.add(model);slot.model=model;
      }
      this.revision++;
    }
  }
  get diagnostics(){
    return {lod:this.lod,loaded:[...this.sources.keys()].sort(),wagons:this.slots.map(slot=>({
      id:slot.wagon.id,type:slot.wagon.type,state:slot.state,position:slot.root.position.toArray(),key:slot.key,cover:slot.wagon.cover??null,
      fallbackVisible:slot.fallback.visible,modelVisible:Boolean(slot.model?.visible),
    }))};
  }
  dispose(){
    if(this.disposed)return;this.disposed=true;
    for(const slot of this.slots)if(slot.model)slot.model.removeFromParent();
    this.group.removeFromParent();this.sources.clear();this.pending.clear();
  }
}
