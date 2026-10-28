import manifest from '../../assets/models/provisional/m01/vegetation/manifest.json' with {type:'json'};
import * as THREE from 'three';
import { AssetManager } from '../assets/asset-manager.js';
import { M01TerrainMaterial } from './m01-terrain-material.js';
import { bakeTerrainMask } from './m01-terrain-mask.js';
import { mergeVegetationGeometry, chooseVegetationTier } from './m01-vegetation-runtime.js';
import { vegetationKitMaterial } from './m01-vegetation-material.js';
import { M01Atmosphere } from './m01-atmosphere.js';
import { m02EnvironmentLayout, m02TerrainSources } from './m02-environment-layout.js';

// Keep the M01 terrain shader, texture tiers, anti-tiling, normals and lifetime
// management. Only its macro mask describes a different mission.
export class M02TerrainMaterial extends M01TerrainMaterial {
  bakeMask() {
    if(!this.world||this.disposed)return;
    const extent={x0:-170,x1:170,z0:-235,z1:105};
    const size={width:this.tier==='high'?512:256,height:this.tier==='high'?512:256};
    const data=bakeTerrainMask(m02TerrainSources(this.world),{...size,extent});
    const texture=new THREE.DataTexture(data,size.width,size.height,THREE.RGBAFormat);
    texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;texture.needsUpdate=true;
    this.mask?.dispose();this.mask=texture;this.maskSize=size;this.uniforms.m01Mask.value=texture;
    this.uniforms.m01Extent.value.set(extent.x0,extent.z0,1/(extent.x1-extent.x0),1/(extent.z1-extent.z0));
  }
}

export class M02Environment {
  constructor(scene,world,quality) {
    this.scene=scene;this.world=world;this.quality=quality;this.assets=new AssetManager();
    this.root=new THREE.Group();this.root.name='M02 M01 vegetation adapter';scene.add(this.root);
    this.batches=[];this.materials=[];this.geometries=[];this.damage=new Map();
    this.terrain=new M02TerrainMaterial({quality});this.terrain.setWorld(world);
    this.atmosphere=new M01Atmosphere(scene);
    this.ready=this.assets.load('m02-vegetation','assets/models/provisional/m01/vegetation/vegetation-kit.glb').then(asset=>this.install(asset)).catch(error=>{this.failure=error.message;});
  }
  install(asset) {
    const sources=new Map();let leaf,wood;
    const modelIds=new Set(manifest.models.map(m=>m.id));
    asset.scene.traverse(n=>{if(!n.isMesh)return;const key=modelIds.has(n.parent.name)?n.parent.name:n.name;
      const parts=sources.get(key)??[];parts.push(n);sources.set(key,parts);
      if(n.material.map)leaf=n.material;else wood=n.material;
    });
    if(!leaf||!wood)throw Error('Vegetation kit missing authored materials');
    const species=['oak','lime','poplar'];
    const make=(names,wantLeaf,ground=false,tier=0)=>{
      const parts=names.flatMap((name,index)=>(sources.get(name)??[]).filter(n=>Boolean(n.material.map)===wantLeaf).map(n=>({geometry:n.geometry,species:index})));
      if(!parts.length)return;
      const geometry=mergeVegetationGeometry(parts),material=vegetationKitMaterial(wantLeaf?leaf:wood,{ground});
      const capacity=ground?11000:150;
      for(const [key,value] of [['instanceSpecies',0],['instancePhysical',0],['instanceFade',1]])geometry.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(value),1));
      const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;
      mesh.receiveShadow=true;this.root.add(mesh);this.batches.push({mesh,ground,tier});this.geometries.push(geometry);this.materials.push(material);
    };
    for(let tier=0;tier<4;tier++)for(const leaves of [false,true])make(species.map(s=>`${s}-lod${tier}`),leaves,false,tier);
    make(['ground-meadow','ground-dry','ground-weed'],true,true);
    this.rebind(this.world);this.loaded=true;
  }
  rebind(world) {
    this.world=world;this.layout=m02EnvironmentLayout(world);this.terrain.setWorld(world);this.key=null;
  }
  consume(events,sim) {
    for(const event of events) {
      if(event.type==='grenade-exploded')this.damage.set(`m01_grenade_${event.id??sim.clock}`,{id:`m01_grenade_${sim.clock}`,x:event.center.x,y:event.center.y??0,z:event.center.z,started:sim.clock,smokeVisible:true});
    }
    if(sim.areaC?.artilleryDetonated&&!this.damage.has('artillery'))this.damage.set('artillery',{id:'m02_bomb',x:4,y:0,z:18,started:sim.areaC.artilleryImpactAt??sim.clock,smokeVisible:true});
  }
  update(sim,quality) {
    if(this.world!==sim.world){this.damage.clear();this.rebind(sim.world);}
    if(sim.clock<this.clock){this.damage.clear();this.key=null;}
    for(const event of sim.horizon.hsA2.events)if(event.smokeActive)this.damage.set(event.id,{id:`m02_bomb_${event.id}`,x:event.x,y:event.y,z:event.z,started:event.flashAt,smokeVisible:true});
    this.clock=sim.clock;this.quality=quality;this.terrain.sync(quality);
    for(const material of this.materials)material.userData.m01Vegetation.m01Time.value=sim.clock;
    this.atmosphere.update({damage:[...this.damage.values()]},sim.clock,quality,{railwaySmoke:false});
    const key=`${quality}:${Math.round(sim.player.x/2)}:${Math.round(sim.player.z/2)}`;
    if(!this.loaded||key===this.key)return;this.key=key;
    const dummy=new THREE.Object3D(),species=['oak','lime','poplar'];
    for(const {mesh,ground,tier} of this.batches) {
      let count=0;
      const list=ground?this.layout.ground:this.layout.trees;
      for(let i=0;i<list.length;i++) {
        const p=list[i],distance=Math.hypot(p.x-sim.player.x,p.z-sim.player.z);
        if(ground?(distance>38||i%(quality==='low'?6:quality==='medium'?3:1)!==0):chooseVegetationTier(distance,quality)!==tier)continue;
        dummy.position.set(p.x,this.world.terrainHeightAt(p.x,p.z),p.z);dummy.rotation.set(0,p.yaw,0);
        if(ground)dummy.scale.set(1,p.h/([.56,.56,.36][p.species]??.56),1);else dummy.scale.set(p.width,p.height,p.width);
        dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);mesh.geometry.attributes.instanceSpecies.setX(count,ground?p.species:species.indexOf(p.species));count++;
      }
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.instanceSpecies.needsUpdate=true;
      mesh.castShadow=!ground&&tier===0&&quality!=='low';
    }
  }
  get diagnostics(){return {loaded:this.loaded??false,failure:this.failure??null,trees:this.layout?.trees.length??0,ground:this.layout?.ground.length??0,batches:this.batches.length,terrain:this.terrain.diagnostics};}
  dispose(){this.root.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.assets.dispose();this.terrain.dispose();this.atmosphere.dispose();}
}
