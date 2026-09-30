import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { TextureLoader, AnimationMixer, MeshStandardMaterial } from 'three';
import { repairOriginalRoundedPart } from './mesh-repair.js';

export const assetUrl=path=>`${import.meta.env?.BASE_URL??'/COD-guerra/'}${path.replace(/^\/+/, '')}`;

export class AssetManager {
  constructor(){this.assets=new Map();this.disposed=false;this.epoch=0;this.failures=[];}
  beginSession(){return ++this.epoch;}
  current(epoch){return !this.disposed&&epoch===this.epoch;}
  async load(name,path){
    if(this.disposed)throw new Error('AssetManager foi descartado.');
    const key=`${name}:${path}`;
    if(this.assets.has(key))return this.assets.get(key).promise;
    const record={value:null,promise:null};
    record.promise=this.fetchAsset(path).then(value=>{
      if(this.disposed){this.release([value]);throw new Error('Carregamento cancelado.');}
      record.value=value;return value;
    }).catch(error=>{this.assets.delete(key);this.failures.push({path,message:error.message});throw error;});
    this.assets.set(key,record);return record.promise;
  }
  async fetchAsset(path){
    const url=assetUrl(path);
    if(/\.gltf$|\.glb$/i.test(path))return new GLTFLoader().loadAsync(url);
    if(/\.obj$/i.test(path)){
      const mtlUrl=url.replace(/\.obj$/i,'.mtl');
      const materials=await new MTLLoader().loadAsync(mtlUrl);
      materials.preload();
      const group=await new OBJLoader().setMaterials(materials).loadAsync(url);
      const upgraded=new Map();
      group.traverse(node=>{
        if(!node.isMesh)return;
        if(/(?:allied|axis)-rifleman\.obj$/.test(path)&&['Uniform','Face','Helmet'].includes(node.material?.name))
          repairOriginalRoundedPart(node);
        const upgrade=old=>{
          if(!upgraded.has(old))upgraded.set(old,new MeshStandardMaterial({
            name:old.name,color:old.color,map:old.map,roughness:.88,metalness:old.name==='Metal'?.65:0,
          }));
          return upgraded.get(old);
        };
        node.material=Array.isArray(node.material)?node.material.map(upgrade):upgrade(node.material);
      });
      for(const old of upgraded.keys())old.dispose();
      return {scene:group,animations:[]};
    }
    if(/\.(png|jpe?g|webp)$/i.test(path))return new TextureLoader().loadAsync(url);
    throw new Error(`Formato de asset não suportado: ${path}`);
  }
  get(name){return [...this.assets.entries()].find(([key])=>key.startsWith(`${name}:`))?.[1].value??null;}
  animate(asset){return {mixer:new AnimationMixer(asset.scene),clips:asset.animations??[]};}
  release(values){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    for(const asset of values){
      if(asset?.isTexture)textures.add(asset);
      asset?.scene?.traverse(node=>{
        if(node.geometry)geometries.add(node.geometry);
        for(const material of (Array.isArray(node.material)?node.material:[node.material]).filter(Boolean)){
          materials.add(material);
          for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
        }
      });
    }
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  dispose(){this.disposed=true;this.epoch++;this.release([...this.assets.values()].map(r=>r.value));this.assets.clear();}
}
