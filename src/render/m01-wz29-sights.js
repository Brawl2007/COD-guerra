import * as THREE from 'three';

// pkg4 (2026-11-04): the kb wz.29 sights of the first-person view model. The accepted GLB rifle has a flat 26 x 14 x 70 mm rear block whose top is 1 mm under the line of
// sight, so there is no notch to look through and the front post sits behind the block (tests/m01-fp-ads-sight.test.js documented both). The block is the 80 triangles of
// the rifle mesh inside REAR_BLOCK (weapon.mjs: rifle_rearsight); the view model leaves them out and draws this repo-authored rear sight in their place: a low base and
// an upright tangent leaf with a U notch, plus a slightly broader front post. Everything is expressed in the weapon bone frame (metres, -Z forward) on the SAME landmarks the
// ADS alignment uses (WZ29_VISUAL.rear [0,.056,-.29] and .front [0,.065,-.752]); nothing here moves a landmark, the camera or a gameplay value. The GLB, its manifest and
// its licence status are untouched: these meshes are procedural code, owned and disposed by M01ViewModel.

/** Box (weapon frame) holding exactly the vertices of the GLB's flat rear sight block. */
export const REAR_BLOCK=Object.freeze({x:.0135,y0:.040,y1:.0555,z0:-.3255,z1:-.2545});
/** Dimensions of the drawn rear sight and front post, metres. `line` is the ADS sight line height at the leaf (WZ29_VISUAL.rear[1]). */
export const WZ29_SIGHTS=Object.freeze({
  base:Object.freeze({width:.027,y0:.040,y1:.050,z:-.29,length:.07}),
  // Leaf: half width of the body, shoulder top, notch (U) centre height, half width at the bottom of the U and at the top (flared mouth), thickness along z.
  leaf:Object.freeze({half:.0105,y0:.048,shoulder:.0655,notchBottom:.052,notchHalf:.0034,mouthHalf:.0044,thickness:.006,z:-.29}),
  // Front post: flat top at the front landmark's height, tapered; the GLB blade (2 mm) stays inside it.
  post:Object.freeze({y0:.0525,tip:.065,halfBase:.0017,halfTip:.0012,thickness:.004,z:-.752}),
});

/** Triangles of the rifle mesh that belong to the GLB rear block, from the bind-pose positions of the geometry (the weapon bone is at `origin` at bind). */
export function rearBlockTriangles(geometry,origin,block=REAR_BLOCK,tolerance=5e-4){
  const pos=geometry.getAttribute('position'),index=geometry.index.array,out=[];
  const inside=i=>{const x=pos.getX(i)-origin.x,y=pos.getY(i)-origin.y,z=pos.getZ(i)-origin.z;
    return Math.abs(x)<=block.x+tolerance&&y>=block.y0-tolerance&&y<=block.y1+tolerance&&z>=block.z0-tolerance&&z<=block.z1+tolerance;};
  for(let t=0;t<index.length;t+=3)if(inside(index[t])&&inside(index[t+1])&&inside(index[t+2]))out.push(t/3);
  return out;
}
/** Bind-pose position of a bone in the geometry space of a skinned mesh. */
export function bindOrigin(mesh,boneName){
  if(!mesh?.isSkinnedMesh||!mesh.skeleton)return null;
  const i=mesh.skeleton.bones.findIndex(b=>b.name===boneName);if(i<0)return null;
  return new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(mesh.skeleton.boneInverses[i]).invert()).applyMatrix4(mesh.bindMatrixInverse);
}
/** A clone of the rifle geometry without the GLB's rear block (owned by the caller), or null when the block is not where the asset says it is. */
export function rifleWithoutRearBlock(mesh,boneName='weapon'){
  const origin=bindOrigin(mesh,boneName);if(!origin||!mesh.geometry.index||!mesh.geometry.getAttribute('position'))return null;
  const drop=new Set(rearBlockTriangles(mesh.geometry,origin));if(drop.size<40||drop.size>200)return null;
  const source=mesh.geometry.index.array,kept=[];
  for(let t=0;t<source.length/3;t++)if(!drop.has(t))kept.push(source[t*3],source[t*3+1],source[t*3+2]);
  const geometry=mesh.geometry.clone();geometry.setIndex(new THREE.BufferAttribute(source.constructor.from(kept),1));
  return {geometry,removed:drop.size};
}

const indexed=geometry=>{if(!geometry.index)geometry.setIndex([...Array(geometry.getAttribute('position').count).keys()]);return geometry;};
/** The U-notched tangent leaf: outline in the X-Y plane (Y up), extruded along z, centred on the leaf plane. */
export function leafGeometry(k=WZ29_SIGHTS.leaf){
  const shape=new THREE.Shape(),r=k.notchHalf,cy=k.notchBottom+r,rim=k.shoulder;
  shape.moveTo(-k.half,k.y0);shape.lineTo(k.half,k.y0);shape.lineTo(k.half,rim-.0055);shape.lineTo(k.half-.0018,rim);
  shape.lineTo(k.mouthHalf,rim);shape.lineTo(r,cy+.0045);shape.lineTo(r,cy);
  // U bottom: half circle from +x to -x through the lowest point.
  const steps=10;for(let i=1;i<=steps;i++){const a=Math.PI*i/steps;shape.lineTo(r*Math.cos(a),cy-r*Math.sin(a));}
  shape.lineTo(-r,cy+.0045);shape.lineTo(-k.mouthHalf,rim);shape.lineTo(-k.half+.0018,rim);shape.lineTo(-k.half,rim-.0055);shape.lineTo(-k.half,k.y0);
  const g=new THREE.ExtrudeGeometry(shape,{depth:k.thickness,bevelEnabled:false,curveSegments:1});
  g.translate(0,0,k.z-k.thickness/2);return indexed(g);
}
export function postGeometry(k=WZ29_SIGHTS.post){
  const shape=new THREE.Shape();shape.moveTo(-k.halfBase,k.y0);shape.lineTo(k.halfBase,k.y0);shape.lineTo(k.halfTip,k.tip);shape.lineTo(-k.halfTip,k.tip);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:k.thickness,bevelEnabled:false});g.translate(0,0,k.z-k.thickness/2);return indexed(g);
}
export function baseGeometry(k=WZ29_SIGHTS.base){
  const g=new THREE.BoxGeometry(k.width,k.y1-k.y0,k.length);g.translate(0,(k.y0+k.y1)/2,k.z);return g;
}

/** Owner of the sight meshes: build once per view model, parent them to the weapon bone, dispose with the view model. */
export class WeaponSights{
  constructor(weaponBone){
    this.material=new THREE.MeshStandardMaterial({name:'wz29_sights_blued',color:'#23272b',metalness:.45,roughness:.5});
    this.geometries=[baseGeometry(),leafGeometry(),postGeometry()];
    this.meshes=['wz29_rear_base','wz29_rear_leaf','wz29_front_post'].map((name,i)=>{
      const mesh=new THREE.Mesh(this.geometries[i],this.material);mesh.name=name;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;weaponBone.add(mesh);return mesh;
    });
  }
  set visible(value){for(const mesh of this.meshes)mesh.visible=value;}
  dispose(){for(const mesh of this.meshes)mesh.removeFromParent();for(const g of this.geometries)g.dispose();this.material.dispose();this.meshes.length=0;this.geometries.length=0;}
}
