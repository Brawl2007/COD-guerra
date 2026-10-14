import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildTerrainEnvelope} from './m01-terrain-envelope.js';

// Original silhouettes, estimated scenery: no claim to surveyed 1939 buildings or distant anchor cities.
export const M01_FAR_BANDS=Object.freeze({west:Object.freeze({minX:-1450,maxX:-650,minZ:-1100,maxZ:450}),east:Object.freeze({minX:1850,maxX:2450,minZ:-620,maxZ:760})});
const roof=(x,y,z,w,h,d)=>{
  const g=new THREE.BufferGeometry(),p=[x-w/2,y,z-d/2,x+w/2,y,z-d/2,x,y+h,z-d/2,x-w/2,y,z+d/2,x+w/2,y,z+d/2,x,y+h,z+d/2];
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4]);g.computeVertexNormals();return g;
};
const box=(x,y,z,w,h,d)=>new THREE.BoxGeometry(w,h,d).translate(x,y+h/2,z);
const merge=parts=>{const g=mergeGeometries(parts,false);for(const p of parts)p.dispose();g.computeBoundingBox();g.computeBoundingSphere();return g;};

export function farLandscapeGeometry(world,surfaceY=(x,z)=>world.terrainHeightAt(x,z)){
  const envelope=buildTerrainEnvelope(world),bodies=[],roofs=[],towers=[],trees=[],mist=[];
  // Rows occupy both the north-west section view and the east-bank/train view in production framing.
  for(const [side,band]of Object.entries(M01_FAR_BANDS)){
    for(let i=0;i<36;i++){
      const west=side==='west';
      // Two original tall houses follow the northern field edge with the towers; other town rows keep their grid.
      const x=west?-700-(i%4)*135:i===3?1840:i===7?1890:1885+(i%4)*120,z=west?-1080+Math.floor(i/4)*175:i===3?-260:i===7?-250:-540+Math.floor(i/4)*135,w=24+i%5*4,d=18+i%3*6,h=9+i%4*3,y=surfaceY(x,z);
      bodies.push(box(x,y,z,w,h,d));roofs.push(roof(x,y+h,z,w+2,5+i%3,d+2));
      if(i%11===0){
        // Estimated tower sites follow each town edge, retaining the original 32..44 m sizes.
        // Read-only production rays locate the northern Lisewo skyline between the immutable portal masses.
        const k=i/11,tx=west?[-690,-780,-920,-1060][k]:[1860,1855,1875,1900][k],tz=west?[-440,-530,-820,-1030][k]:[-300,0,-300,-290][k],base=surfaceY(tx,tz),height=32+i%3*6;
        towers.push(box(tx,base,tz,9,height,9));roofs.push(roof(tx,base+height,tz,11,9,11));
      }
      if(i%13===0)towers.push(new THREE.CylinderGeometry(2.6,3.6,34,7).translate(x-32,y+17,z+16));
    }
    for(let i=0;i<80;i++){
      const west=side==='west',x=west?-660-(i%4)*120:1840+(i%4)*135,z=(west?-1120:-650)+Math.floor(i/4)*75,y=surfaceY(x,z),height=12+i%5*2;
      trees.push(new THREE.ConeGeometry(5+i%3, height,5).translate(x,y+height/2,z));
    }
    // Vertical, altitude-faded volumes, wholly outside the complete ground envelope. No sprite/texture allocation.
    const x=side==='west'?-1060:2210,z=side==='west'?-330:60;
    mist.push(new THREE.BoxGeometry(650,26,1500).translate(x,8,z));
  }
  const result={bodies:merge(bodies),roofs:merge(roofs),towers:merge(towers),trees:merge(trees),mist:merge(mist)};
  // Fail closed if future participant data grows into these immutable scenery bands.
  for(const [kind,g]of Object.entries(result)){const p=g.attributes.position;for(let i=0;i<p.count;i++)if(envelope.contains(p.getX(i),p.getZ(i)))throw new Error(`Far ${kind} intersects protected participant envelope`);}
  return result;
}

export class M01FarLandscape {
  constructor(parent,world,{onUpdate=()=>{},surfaceY}={}){
    this.group=new THREE.Group();this.group.name='m01-far-landscape';parent.add(this.group);this.world=world;this.worldRevision=world.revision;this.onUpdate=onUpdate;this.enabled=true;this.revision=1;this.builds=1;this.disposed=false;this.draws=0;this.triangles=0;this.meshes=[];this.clock=0;
    this.materials={bodies:new THREE.MeshStandardMaterial({color:'#766e60',roughness:1}),roofs:new THREE.MeshStandardMaterial({color:'#645148',roughness:1}),towers:new THREE.MeshStandardMaterial({color:'#655d50',roughness:1}),trees:new THREE.MeshStandardMaterial({color:'#3d4940',roughness:1}),
      mist:new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{fogColor:{value:new THREE.Color()},density:{value:.12},clock:{value:0}},vertexShader:'varying vec3 worldPos; void main(){vec4 p=modelMatrix*vec4(position,1.0);worldPos=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:'uniform vec3 fogColor;uniform float density;uniform float clock;varying vec3 worldPos;void main(){float altitude=1.0-smoothstep(-4.0,21.0,worldPos.y);float ripple=.88+.12*sin(worldPos.z*.006+clock*.015);gl_FragColor=vec4(fogColor,density*altitude*ripple);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'})};
    for(const [kind,geometry]of Object.entries(farLandscapeGeometry(world,surfaceY))){const mesh=new THREE.Mesh(geometry,this.materials[kind]);mesh.userData.m01FarKind=kind;mesh.renderOrder=kind==='mist'?3:0;mesh.onBeforeRender=(_renderer,_scene,camera,g)=>{if(camera!==this.camera)return;this.draws++;this.triangles+=(g.index?.count??g.attributes.position.count)/3;};this.meshes.push(mesh);this.group.add(mesh);}
    this.anchors=world.layout.farAnchors.map(a=>({id:a.id,bearingDeg:a.bearingDeg,distanceKm:a.distanceKm,direction:[Math.sin(a.bearingDeg*Math.PI/180),0,-Math.cos(a.bearingDeg*Math.PI/180)]}));
  }
  setEnabled(value){value=Boolean(value);if(this.disposed||value===this.enabled)return this.enabled;this.enabled=value;this.group.visible=value;this.revision++;this.onUpdate();return value;}
  sync(world,quality,clock,lighting){if(this.disposed)return;if(world!==this.world||world.revision!==this.worldRevision||this.quality!==quality){this.world=world;this.worldRevision=world.revision;this.quality=quality;this.revision++;}this.clock=clock;
    const m=this.materials.mist;if(lighting){const c=lighting.fog.color;m.uniforms.fogColor.value.setRGB(c[0],c[1],c[2]);m.uniforms.density.value=.14*(1-.45*lighting.daylight);}m.uniforms.clock.value=clock;
  }
  beginFrame(camera){this.camera=camera;this.draws=0;this.triangles=0;}
  get diagnostics(){return {enabled:this.enabled,revision:this.revision,builds:this.builds,worldRevision:this.worldRevision,quality:this.quality,clock:this.clock,lod:'single',draws:this.draws,triangles:this.triangles,drawCeiling:10,meshes:this.meshes.length,geometry:this.meshes.map(m=>({kind:m.userData.m01FarKind,triangles:(m.geometry.index?.count??m.geometry.attributes.position.count)/3})),mistDensity:this.materials.mist.uniforms.density.value,skirtOwner:'terrain-relief',anchors:this.anchors};}
  dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();for(const m of this.meshes)m.geometry.dispose();for(const m of Object.values(this.materials))m.dispose();this.group.clear();this.meshes.length=0;}
}
