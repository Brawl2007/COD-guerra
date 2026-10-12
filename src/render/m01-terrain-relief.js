import * as THREE from 'three';
import {buildTerrainEnvelope} from './m01-terrain-envelope.js';
import {M01_FOG_RANGE} from './m01-lighting.js';

export const M01_LEGACY_GROUND=Object.freeze({minX:-700,maxX:1300,minZ:-285,maxZ:365,step:5,triangles:104000});
export const M01_RELIEF_SEED=19390901;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Fixed presentation seed, never the simulation RNG. Broad low fields + narrower dike/berm shapes.
export function reliefOffset(envelope,x,z,seed=M01_RELIEF_SEED){
  if(x>25&&x<265)return 0; // preserve the river channel at every distance
  const fade=smooth((envelope.distance(x,z)-30)/90);if(!fade)return 0;
  const phase=(seed%4093)*.001;
  const fields=2.8*Math.sin(x*.008+phase)*Math.cos(z*.009-phase)+1.4*Math.sin(x*.021+z*.013+phase);
  const bank=4.5*Math.exp(-(((x-1075)/68)**2))*(1+.22*Math.sin(z*.023));
  const berm=2.2*Math.exp(-(((z+240+35*Math.sin(x*.003))/32)**2));
  // The extracted legacy perimeter and the coarser skirt meet on the same analytic flat/ramp surface.
  // A 30 m transition brings relief to zero there, so different outside tessellations cannot open a crack.
  const edgeDistance=x>=-700&&x<=1300&&z>=-285&&z<=365?Math.min(x+700,1300-x,z+285,365-z):Math.hypot(Math.max(-700-x,0,x-1300),Math.max(-285-z,0,z-365));
  return fade*smooth(edgeDistance/30)*(fields+bank+berm);
}

export function createLegacyGround(world){
  const geometry=new THREE.PlaneGeometry(2000,650,400,130);geometry.rotateX(-Math.PI/2);geometry.translate(300,0,40);
  const pos=geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,world.terrainHeightAt(pos.getX(i),pos.getZ(i)));
  geometry.computeVertexNormals();return geometry;
}
const intersects=(envelope,minX,maxX,minZ,maxZ,halo=10)=>envelope.regions.some(r=>minX<=r.maxX+20+halo&&maxX>=r.minX-20-halo&&minZ<=r.maxZ+20+halo&&maxZ>=r.minZ-20-halo);

/** A collapse is allowed only for a constant source plane, constant exact source normals and affine original UVs.
 * All vertices are checked (including interior vertices), so interpolation over both retained triangles is proved.
 * Non-flat patches, seams and their legacy averaged-normal halo retain the source indices and attributes verbatim.
 */
export function legacyFlatBlock(legacy,x0,z0,w,h){
  const p=legacy.attributes.position,n=legacy.attributes.normal,uv=legacy.attributes.uv,stride=401,start=z0*stride+x0,y=p.getY(start);
  for(let z=0;z<=h;z++)for(let x=0;x<=w;x++){
    const i=(z0+z)*stride+x0+x;
    if(p.getY(i)!==y||n.getX(i)!==0||n.getY(i)!==1||n.getZ(i)!==0)return false;
    // UVs are the immutable PlaneGeometry affine lattice, including its Float32 rounding.
    if(uv.getX(i)!==Math.fround((x0+x)/400)||uv.getY(i)!==Math.fround(1-(z0+z)/130))return false;
  }return true;
}

function legacyChunk(legacy,envelope,x0,z0,w,h,enabled,seed){
  const p=legacy.attributes.position,n=legacy.attributes.normal,uv=legacy.attributes.uv,vertices=[],normals=[],uvs=[],indices=[],sourceIndices=[],map=new Map();
  const put=i=>{let k=map.get(i);if(k!==undefined)return k;k=vertices.length/3;map.set(i,k);sourceIndices.push(i);
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);vertices.push(x,y+(enabled?reliefOffset(envelope,x,z,seed):0),z);normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(uv.getX(i),uv.getY(i));return k;};
  const cell=(x,z,w=1,h=1)=>{const a=z*401+x,b=(z+h)*401+x,c=b+w,d=a+w;indices.push(put(a),put(b),put(d),put(b),put(c),put(d));};
  let collapsed=0;
  for(let z=z0;z<z0+h;z+=5)for(let x=x0;x<x0+w;x+=5){
    const bw=Math.min(5,x0+w-x),bh=Math.min(5,z0+h-z);
    // 25 m blocks: all corners of a protected/crossing cell retain old geometry, including averaged normals.
    const minX=p.getX(z*401+x),maxX=p.getX(z*401+x+bw),minZ=p.getZ(z*401+x),maxZ=p.getZ((z+bh)*401+x);
    const outside=!intersects(envelope,minX,maxX,Math.min(minZ,maxZ),Math.max(minZ,maxZ));
    // Retaining even planar protected blocks also preserves the exact Float32-rounded source UV field.
    if(outside&&legacyFlatBlock(legacy,x,z,bw,bh)){cell(x,z,bw,bh);collapsed+=bw*bh-1;}
    else for(let dz=0;dz<bh;dz++)for(let dx=0;dx<bw;dx++)cell(x+dx,z+dz);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);
  // Relief normals outside the envelope only; protected source normals survive bit for bit.
  if(enabled){g.computeVertexNormals();const normals=g.attributes.normal;for(let i=0;i<sourceIndices.length;i++){const original=sourceIndices[i];if(envelope.distance(p.getX(original),p.getZ(original))<=30)normals.setXYZ(i,n.getX(original),n.getY(original),n.getZ(original));}}
  g.computeBoundingBox();g.computeBoundingSphere();g.userData={sourceIndices,collapsed,kind:'legacy-lattice'};return g;
}

const axis=(lo,from,to,hi)=>{const values=[lo,from,to,hi];for(let v=Math.ceil(lo/100)*100;v<hi;v+=100)if(v<from||v>to)values.push(v);return [...new Set(values)].sort((a,b)=>a-b);};
function skirtChunks(world,envelope,enabled,seed){
  // Authored fog 2800 m, measured from either bank's playable cameras. Extent exceeds its far range.
  const xs=axis(-3500,-700,1300,4500),zs=axis(-3200,-285,365,3200);xs.push(25,30,260,265,1035,1050,1055);xs.sort((a,b)=>a-b);
  const blocked=new Set();
  for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++)if(intersects(envelope,xs[i],xs[i+1],zs[j],zs[j+1]))for(const [a,b]of [[i,j],[i+1,j],[i,j+1],[i+1,j+1]])blocked.add(b*xs.length+a);
  const chunks=[];
  for(let j0=0;j0<zs.length-1;j0+=8)for(let i0=0;i0<xs.length-1;i0+=8){const position=[],uv=[],indices=[],map=new Map();
    const put=(i,j)=>{const key=j*xs.length+i;let v=map.get(key);if(v!==undefined)return v;v=position.length/3;map.set(key,v);const x=xs[i],z=zs[j];position.push(x,world.terrainHeightAt(x,z)+(enabled&&!blocked.has(key)?reliefOffset(envelope,x,z,seed):0),z);uv.push((x+700)/2000,1-(z+285)/650);return v;};
    for(let j=j0;j<Math.min(j0+8,zs.length-1);j++)for(let i=i0;i<Math.min(i0+8,xs.length-1);i++){
      if(xs[i]>=-700&&xs[i+1]<=1300&&zs[j]>=-285&&zs[j+1]<=365)continue;
      const a=put(i,j),b=put(i,j+1),c=put(i+1,j+1),d=put(i+1,j);indices.push(a,b,d,b,c,d);
    }
    if(!indices.length)continue;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();g.userData.kind='fog-skirt';chunks.push(g);
  }return chunks;
}

export class M01TerrainRelief {
  constructor(parent,world,material,{onUpdate=()=>{},seed=M01_RELIEF_SEED,terrainMeshes=[]}={}){
    this.parent=parent;this.world=world;this.worldRevision=world.revision;this.seed=seed;this.envelope=buildTerrainEnvelope(world);this.material=material;this.onUpdate=onUpdate;this.terrainMeshes=terrainMeshes;this.enabled=true;this.revision=1;this.builds=1;this.disposed=false;this.draws=0;this.triangles=0;this.clock=0;
    this.group=new THREE.Group();this.group.name='m01-terrain-relief';parent.add(this.group);this.meshes=[];this.geometries=[];const legacy=createLegacyGround(world);
    const plain=[],relief=[];
    for(let z=0;z<130;z+=20)for(let x=0;x<400;x+=20){plain.push(legacyChunk(legacy,this.envelope,x,z,20,Math.min(20,130-z),false,seed));relief.push(legacyChunk(legacy,this.envelope,x,z,20,Math.min(20,130-z),true,seed));}
    plain.push(...skirtChunks(world,this.envelope,false,seed));relief.push(...skirtChunks(world,this.envelope,true,seed));legacy.dispose();
    this.geometries.push(...plain,...relief);
    for(let i=0;i<relief.length;i++){const mesh=new THREE.Mesh(relief[i],material);mesh.receiveShadow=true;mesh.userData.m01Ground=true;mesh.userData.m01TerrainKind=relief[i].userData.kind;mesh.userData.m01PlainGeometry=plain[i];mesh.userData.m01ReliefGeometry=relief[i];
      mesh.onBeforeRender=(_renderer,_scene,camera,geometry)=>{if(camera!==this.camera)return;this.draws++;this.triangles+=(geometry.index?.count??geometry.attributes.position.count)/3;};this.meshes.push(mesh);this.terrainMeshes.push(mesh);this.group.add(mesh);}
  }
  setEnabled(value){value=Boolean(value);if(this.disposed||this.enabled===value)return this.enabled;this.enabled=value;for(const m of this.meshes)m.geometry=value?m.userData.m01ReliefGeometry:m.userData.m01PlainGeometry;this.revision++;this.onUpdate();return value;}
  trackAuxiliaryGround(mesh){mesh.onBeforeRender=(_renderer,_scene,camera,g)=>{if(camera!==this.camera)return;this.draws++;this.triangles+=(g.index?.count??g.attributes.position.count)/3;};}
  sync(world,quality){if(this.disposed)return;if(this.world!==world||this.worldRevision!==world.revision||this.quality!==quality){this.world=world;this.worldRevision=world.revision;this.quality=quality;this.revision++;}}
  beginFrame(camera,clock){this.camera=camera;this.clock=clock;this.draws=0;this.triangles=0;}
  visualHeightAt(x,z){return this.envelope.contains(x,z)?this.world.heightAt(x,z):this.world.terrainHeightAt(x,z)+(this.enabled?reliefOffset(this.envelope,x,z,this.seed):0);}
  get diagnostics(){return {enabled:this.enabled,revision:this.revision,builds:this.builds,worldRevision:this.worldRevision,quality:this.quality,seed:this.seed,chunks:this.meshes.length,draws:this.draws,triangles:this.triangles,baselineTriangles:M01_LEGACY_GROUND.triangles,ceiling:M01_LEGACY_GROUND.triangles/2,fogFar:M01_FOG_RANGE.far,skirtOwner:'terrain-relief',envelope:{margin:this.envelope.margin,regions:this.envelope.regions.length,extent:this.envelope.extent},geometries:this.geometries.length};}
  dispose(){if(this.disposed)return;this.disposed=true;this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const mesh of this.meshes){const i=this.terrainMeshes.indexOf(mesh);if(i>=0)this.terrainMeshes.splice(i,1);}this.group.clear();this.meshes.length=0;this.geometries.length=0;}
}
