import * as THREE from 'three';
import wagonManifest from '../../assets/models/provisional/m01-wagons/manifest.json' with {type:'json'};

const INTACT_BASE='assets/models/provisional/m01-wagons/';
const DAMAGE_BASE='assets/models/provisional/m01-wagon-damage/';

export const M01_YARD_WAGON_PLAN=Object.freeze([
  Object.freeze({id:'yard_wagon_1',type:'covered',position:Object.freeze([-320,0,-6]),cover:'cv_wagon_1'}),
  Object.freeze({id:'yard_wagon_2',type:'open',position:Object.freeze([-340,0,8]),cover:'cv_wagon_2'}),
  Object.freeze({id:'yard_wagon_3',type:'covered',position:Object.freeze([-352,0,8]),damageKey:'station_wagon_fire'}),
]);

export const M01_YARD_WAGON_LOD=Object.freeze({
  low:Object.freeze({near:35,mid:140,hysteresis:10}),
  medium:Object.freeze({near:60,mid:220,hysteresis:14}),
  high:Object.freeze({near:90,mid:300,hysteresis:18}),
});
export function chooseYardWagonLod(distance,quality='medium',previous=null){
  const q=M01_YARD_WAGON_LOD[quality]??M01_YARD_WAGON_LOD.medium,h=q.hysteresis;
  if(previous===0&&distance<=q.near+h)return 0;
  if(previous===1){if(distance<q.near-h)return 0;if(distance<=q.mid+h)return 1;return 2;}
  if(previous===2&&distance>=q.mid-h)return 2;
  return distance<q.near?0:distance<q.mid?1:2;
}
export const yardWagonState=(wagon,destruction=[])=>wagon.damageKey&&destruction.includes(wagon.damageKey)?'burned':'intact';
export const yardWagonPosition=(wagon,world)=>[wagon.position[0],world?.heightAt?world.heightAt(wagon.position[0],wagon.position[2]):wagon.position[1],wagon.position[2]];
export const yardWagonFireDamage=(destruction,world)=>{
  const wagon=M01_YARD_WAGON_PLAN.find(w=>w.damageKey==='station_wagon_fire');
  if(!wagon||yardWagonState(wagon,destruction)!=='burned')return null;
  const [x,y,z]=yardWagonPosition(wagon,world),sockets=wagonManifest.types[wagon.type].sockets;
  return {id:'station_wagon_fire',x,y:y+sockets.smoke_top[1]-3,z,fireY:y+sockets.fire[1],started:0,smokeVisible:true};
};

const sourceKey=(type,state,lod)=>`${type}:${state}:${lod}`;
const sourcePath=(type,state,lod)=>state==='burned'
  ?`${DAMAGE_BASE}m01_wagon_${type}_burned_lod${lod}.glb`
  :`${INTACT_BASE}m01_wagon_${type}_lod${lod}.glb`;
export const yardWagonSourceCandidates=(type,state,lod)=>{
  const lods=lod===0?[0,1,2]:lod===1?[1,2,0]:[2,1,0];
  const states=state==='burned'?['burned','intact']:['intact'];
  return states.flatMap(s=>lods.map(l=>sourceKey(type,s,l)));
};

export class M01YardWagons{
  constructor(parent,assets,box,cylinder,wood,metal,fireTexture){
    this.assets=assets;this.sources=new Map();this.pending=new Map();this.revision=0;this.disposed=false;this.lastQuality=null;
    this.group=new THREE.Group();this.group.name='m01_yard_wagons';parent.add(this.group);
    this.fireMaterial=new THREE.SpriteMaterial({map:fireTexture,color:'#ffb24a',transparent:true,opacity:.9,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
    this.slots=M01_YARD_WAGON_PLAN.map(wagon=>{
      const root=new THREE.Group();root.name=wagon.id;root.position.set(...wagon.position);this.group.add(root);
      const fallback=new THREE.Group();fallback.name=`${wagon.id}_fallback`;root.add(fallback);
      const body=new THREE.Mesh(box,wood);body.position.y=wagon.type==='open'?1.45:2;body.scale.set(2.8,wagon.type==='open'?1.7:3.2,7.86);body.castShadow=body.receiveShadow=true;fallback.add(body);
      for(const z of [-2,2]){const wheel=new THREE.Mesh(cylinder,metal);wheel.position.set(0,.5,z);wheel.rotation.z=Math.PI/2;wheel.scale.set(.5,1.55,.5);wheel.castShadow=wheel.receiveShadow=true;fallback.add(wheel);}
      const fire=new THREE.Sprite(this.fireMaterial);fire.name=`${wagon.id}_fire`;fire.visible=false;fire.scale.set(2.2,3.8,1);root.add(fire);
      return {wagon,root,fallback,model:null,key:null,state:'intact',lod:2,fire};
    });
  }
  async ensure(type,state,lod){
    const key=sourceKey(type,state,lod);if(this.sources.has(key))return this.sources.get(key);if(this.pending.has(key))return this.pending.get(key);
    const promise=this.assets.load(`yard-wagon:${key}`,sourcePath(type,state,lod)).then(source=>{
      if(this.disposed)return null;this.sources.set(key,source);this.revision++;this.rebuild();return source;
    }).catch(()=>null).finally(()=>this.pending.delete(key));
    this.pending.set(key,promise);return promise;
  }
  async load(){
    await Promise.allSettled([
      ...['covered','open'].flatMap(type=>[0,1,2].map(lod=>this.ensure(type,'intact',lod))),
      ...[0,1,2].map(lod=>this.ensure('covered','burned',lod)),
    ]);
    if(!this.disposed)this.rebuild();
  }
  update(destruction,quality,world,player,clock=0){
    let changed=quality!==this.lastQuality;this.lastQuality=quality;
    for(const slot of this.slots){
      slot.root.position.fromArray(yardWagonPosition(slot.wagon,world));
      const state=yardWagonState(slot.wagon,destruction),distance=Math.hypot(slot.root.position.x-player.x,slot.root.position.z-player.z);
      const lod=chooseYardWagonLod(distance,quality,slot.lod);
      if(slot.state!==state||slot.lod!==lod){slot.state=state;slot.lod=lod;changed=true;}
      const burning=slot.wagon.damageKey&&destruction.includes(slot.wagon.damageKey);slot.fire.visible=Boolean(burning);
      if(burning){const fireY=wagonManifest.types[slot.wagon.type].sockets.fire[1];slot.fire.position.set(0,fireY+.35,0);const pulse=.88+.12*Math.sin(clock*11+slot.root.position.x);slot.fire.scale.set(2.2*pulse,3.8*(1.08-pulse*.08),1);}
    }
    if(changed){this.rebuild();this.revision++;}
  }
  bestSource(slot){
    for(const candidate of yardWagonSourceCandidates(slot.wagon.type,slot.state,slot.lod)){const source=this.sources.get(candidate);if(source)return {source,key:candidate};}
    return null;
  }
  rebuild(){
    if(this.disposed)return;
    for(const slot of this.slots){
      const best=this.bestSource(slot),actual=best?.key??'fallback';if(slot.key===actual)continue;
      if(slot.model){slot.model.removeFromParent();slot.model=null;}slot.key=actual;slot.fallback.visible=!best;
      if(best){const model=best.source.scene.clone(true);model.name=`${slot.wagon.id}_${slot.state}_lod${slot.lod}`;model.traverse(node=>{if(node.isMesh){node.castShadow=slot.lod===0;node.receiveShadow=true;}});slot.root.add(model);slot.model=model;}
      this.revision++;
    }
  }
  get diagnostics(){return {loaded:[...this.sources.keys()].sort(),pending:[...this.pending.keys()].sort(),wagons:this.slots.map(slot=>({id:slot.wagon.id,type:slot.wagon.type,state:slot.state,lod:slot.lod,position:slot.root.position.toArray(),key:slot.key,cover:slot.wagon.cover??null,fire:slot.fire.visible}))};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const slot of this.slots)if(slot.model)slot.model.removeFromParent();this.group.removeFromParent();this.sources.clear();this.pending.clear();this.fireMaterial.dispose();}
}
