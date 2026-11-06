// M01 soldier draw-call batching (package R8-a). Presentation only: nothing here decides damage, visibility, events or mission state.
//
// A rigged soldier is authored as 8 (German) to 26 (Polish) skinned meshes that share ONE skin (same bones, same inverse bind
// matrices; WP4 `shareSkeletons()` already gives them one Skeleton) and one atlas material, so each visible part used to cost
// one draw call (~6 for a plain rifleman). At instantiation time the parts that are visible for good are concatenated into ONE
// SkinnedMesh (body, one head, helmet, gear, rank/sapper badges...) and the parts that switch together with `armed` (rifle +
// cartridge clip, wz.98a, rkm) into a second one. Nothing is resampled: the merged geometry keeps the very same vertices, the
// same skinIndex / skinWeight, the same UVs and vertex colours, the same bind matrix and the same Skeleton, so every skinned
// vertex lands exactly where it did. Run at create() only; update() allocates nothing for it.
//
// Ownership: merged BufferGeometries live in a SoldierMergeCache owned by M01Characters and are disposed once by it
// (threejs-conventions "Disposal"). Source geometries, materials and atlases stay with their owners (asset cache, variations).
import * as THREE from 'three';

const IDENTITY=new THREE.Matrix4();
const SKIP_SUBTREE=function(){};
const ATTRIBUTES=['position','normal','uv','skinIndex','skinWeight'];
// glTF attributes arrive interleaved (byteStride): the typed array of the underlying buffer, not a per-attribute one.
const arrayType=a=>(a.isInterleavedBufferAttribute?a.data.array:a.array).constructor;
/** Raw (not denormalised) copy of the components of `attribute` into `out` from `at`: bit-identical values, normalised flag kept by the caller. */
function copyRaw(attribute,out,at){
  const n=attribute.count,size=attribute.itemSize;
  if(attribute.isInterleavedBufferAttribute){
    const {array,stride}=attribute.data,offset=attribute.offset;
    for(let i=0;i<n;i++){const from=i*stride+offset,to=at+i*size;for(let k=0;k<size;k++)out[to+k]=array[from+k];}
  }else out.set(attribute.array.subarray(0,n*size),at);
}

/** Material the merged part may share with `reference` without changing a pixel: the very same material, or the vertex-colour
 *  clone that SoldierVisualVariations made from it (same shading and the same program key; an unvaried part then carries white). */
export function sharesShading(reference,material,visuals){
  if(reference===material)return true;
  if(!reference||!material||Array.isArray(reference)||Array.isArray(material))return false;
  if(reference.vertexColors===material.vertexColors)return false;
  const [colored,plain]=reference.vertexColors?[reference,material]:[material,reference];
  if(!visuals?.materials||visuals.materials.get(plain)!==colored)return false;
  return colored.customProgramCacheKey?.()===plain.customProgramCacheKey?.();
}

/** True when `mesh` can be concatenated with `reference`: same skeleton, parent, local and bind matrices, one plain index range. */
function compatible(mesh,reference){
  const g=mesh.geometry;
  if(!mesh.isSkinnedMesh||mesh.skeleton!==reference.skeleton||mesh.parent!==reference.parent)return false;
  if(!mesh.matrix.equals(IDENTITY)||!mesh.bindMatrix.equals(reference.bindMatrix)||mesh.bindMode!==reference.bindMode)return false;
  if(!g.index||g.groups.length||g.morphAttributes&&Object.keys(g.morphAttributes).length)return false;
  for(const name of ATTRIBUTES){const a=g.getAttribute(name),r=reference.geometry.getAttribute(name);
    if(!a||!r||a.itemSize!==r.itemSize||a.normalized!==r.normalized||arrayType(a)!==arrayType(r))return false;}
  return true;
}

/** Concatenates indexed geometries with identical attribute layout. Vertex order is the part order; indices are offset. A `color`
 *  attribute is written for all parts (white where a part has none) as soon as one part has it. */
export function mergeSoldierGeometries(geometries){
  const out=new THREE.BufferGeometry();let vertices=0,indices=0,color=false;
  for(const g of geometries){vertices+=g.getAttribute('position').count;indices+=g.index.count;color||=Boolean(g.getAttribute('color'));}
  for(const name of ATTRIBUTES){
    const first=geometries[0].getAttribute(name),array=new (arrayType(first))(vertices*first.itemSize);let at=0;
    for(const g of geometries){const a=g.getAttribute(name);copyRaw(a,array,at);at+=a.count*a.itemSize;}
    out.setAttribute(name,new THREE.BufferAttribute(array,first.itemSize,first.normalized));
  }
  if(color){
    const array=new Float32Array(vertices*3);let at=0;
    for(const g of geometries){const a=g.getAttribute('color'),n=g.getAttribute('position').count;
      if(a){for(let i=0;i<n;i++){array[at+i*3]=a.getX(i);array[at+i*3+1]=a.getY(i);array[at+i*3+2]=a.getZ(i);}}else array.fill(1,at,at+n*3);
      at+=n*3;}
    out.setAttribute('color',new THREE.BufferAttribute(array,3));
  }
  const index=vertices>65535?new Uint32Array(indices):new Uint16Array(indices);let at=0,base=0;
  for(const g of geometries){const ix=g.index,n=g.getAttribute('position').count;for(let i=0;i<ix.count;i++)index[at+i]=ix.getX(i)+base;at+=ix.count;base+=n;}
  out.setIndex(new THREE.BufferAttribute(index,1));
  out.computeBoundingBox();out.computeBoundingSphere();
  return out;
}

/** Merged geometries by part list, owned here (disposed once by the owner of the cache). A soldier variant (head, helmet, profile)
 *  repeats across actors and LOD swaps, so the merge happens once per distinct part list. */
export class SoldierMergeCache{
  constructor(){this.geometries=new Map();this.disposed=false;this.builds=0;}
  geometry(parts){
    const key=parts.map(p=>`${p.name}:${p.geometry.uuid}`).join('|');
    let g=this.geometries.get(key);
    if(!g){g=mergeSoldierGeometries(parts.map(p=>p.geometry));g.name=`soldier_batch:${key.length}`;this.geometries.set(key,g);this.builds++;}
    return g;
  }
  get diagnostics(){let bytes=0;for(const g of this.geometries.values()){for(const a of Object.values(g.attributes))bytes+=a.array.byteLength;bytes+=g.index.array.byteLength;}return {geometries:this.geometries.size,builds:this.builds,bytes};}
  dispose(){this.disposed=true;for(const g of this.geometries.values())g.dispose();this.geometries.clear();}
}

function build(parts,name,cache,visuals,holder){
  // Parts with vertex colours decide the material; an unvaried part (white colour) may join it only if it is its source material.
  const lead=parts.find(p=>p.material.vertexColors)??parts[0];
  const groups=[{material:lead.material,parts:[]}];
  for(const p of parts){
    const g=groups.find(x=>sharesShading(x.material,p.material,visuals));
    if(g)g.parts.push(p);else groups.push({material:p.material,parts:[p]});
  }
  return groups.filter(g=>g.parts.length).map((g,i)=>{
    const ref=g.parts[0],geometry=g.parts.length>1?cache.geometry(g.parts):ref.geometry;
    const mesh=g.parts.length>1?new THREE.SkinnedMesh(geometry,g.material):ref;
    if(mesh!==ref){
      mesh.name=`${name}${i?`_${i}`:''}`;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.matrixAutoUpdate=true;
      ref.parent.add(mesh);mesh.bind(ref.skeleton,ref.bindMatrix);
      for(const p of g.parts)holder.add(p);   // logical part: keeps its name, geometry, material and `visible` (diagnostics, update rules, getObjectByName) but sits under an invisible holder, so it is not drawn
    }
    return {mesh,parts:g.parts,merged:mesh!==ref};
  });
}

/**
 * Merges the parts of one instantiated soldier. `staticParts` are skinned meshes drawn whenever the soldier is (visibility fixed at create),
 * `switchedParts` follow one boolean (`armed`). Returns the renderable batch records, or [] when the parts cannot be merged safely.
 * Parts that fail the compatibility check simply stay as they are (own draw call). The merged-away parts move under an invisible `holder` Group.
 */
export function batchSoldier(staticParts,switchedParts,cache,visuals){
  const reference=staticParts[0]??switchedParts[0];
  if(!reference)return {fixed:[],switched:[],holder:null};
  const ok=list=>list.filter(m=>compatible(m,reference));
  const a=ok(staticParts),b=ok(switchedParts);
  // One invisible holder per soldier next to the parts: three skips the whole subtree when rendering (projectObject / shadow pass).
  const holder=new THREE.Group();holder.name='m01_batched_parts';holder.visible=false;reference.parent.add(holder);
  // Nothing under the holder is drawn, so its world matrices (and the bindMatrixInverse inversions of its skinned parts) are never needed: skip the subtree.
  // The bones, which drive the merged meshes, are not below it.
  holder.updateMatrixWorld=SKIP_SUBTREE;
  return {fixed:a.length?build(a,'batch_body',cache,visuals,holder):[],switched:b.length?build(b,'batch_weapon',cache,visuals,holder):[],holder};
}
