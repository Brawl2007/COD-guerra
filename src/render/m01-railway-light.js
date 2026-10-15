import * as THREE from 'three';

// Presentation only (T24). Lamp, halo and firebox parts share one vertex-colour mesh per train: RGBA per vertex lets a soft halo and a
// faint dawn beam live in the same draw call as the solid lamp lenses. Every part must carry the same attribute set to be merged.
export function rgbaGeometry(geometry,rgb,alpha=1,alphaAt=null){
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();
  const position=g.attributes.position,count=position.count,colors=new Float32Array(count*4);
  for(let i=0;i<count;i++){
    colors[i*4]=rgb[0];colors[i*4+1]=rgb[1];colors[i*4+2]=rgb[2];
    colors[i*4+3]=alphaAt?Math.max(0,Math.min(1,alphaAt(position.getX(i),position.getY(i),position.getZ(i)))):alpha;
  }
  g.setAttribute('color',new THREE.BufferAttribute(colors,4));
  return g;
}

/** Soft round halo facing local -Z (the travel direction): opaque core fading to nothing at the rim. */
export function haloGeometry(radius,y,z,rgb,peakAlpha,segments=16){
  const disc=new THREE.CircleGeometry(radius,segments);disc.rotateY(Math.PI);disc.translate(0,y,z);
  return rgbaGeometry(disc,rgb,1,(px,py)=>peakAlpha*(1-Math.min(1,Math.hypot(px,py-y)/radius)));
}
