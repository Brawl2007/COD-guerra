import * as THREE from 'three';

// R6-b: a tiny deterministic software rasteriser of what the weapon camera sees of the first-person view model (rifle, clip, hands, sleeves),
// with a depth test and the 0.03 m near plane. It exists to MEASURE the sight picture without a browser: which parts cover how much of a region
// of the frame (the stock wood under the sights, the receiver, the hands). It is not a renderer: no lighting, no texture, no anti-aliasing, no
// back-face culling (closed meshes: the nearest surface wins the depth test). The camera is the weapon pass camera: eye at the origin, -Z
// forward, 58 degrees vertical field of view, 16:9 by default.

export const PART={none:0,stock:1,metal:2,hands:3,sleeves:4,rear:5,front:6,handguard:7,comb:8,bolt:9};
const Q=2/.45;
// Stock loft of the wz.29 (tools/assets/m01-soldiers/src/weapon.mjs STOCK.wz29): [z, centre y, width, height]. A rifle vertex lies on the stock
// surface when it satisfies the section's superellipse equation at its own z; that separates the wood of the stock from the steel parts that
// share the single `rifle` mesh (receiver, barrel, rear sight, bolt, guard, butt plate).
const STOCK=[[.335,-.045,.042,.128],[.30,-.042,.043,.124],[.2,-.032,.040,.100],[.09,-.018,.036,.062],[.035,-.012,.034,.048],[-.01,-.006,.040,.056],
  [-.08,-.004,.044,.060],[-.25,.004,.044,.050],[-.45,.010,.040,.040],[-.62,.014,.036,.034],[-.685,.016,.032,.030]];
function onStockSurface(x,y,z,tolerance=.04){
  for(let k=0;k+1<STOCK.length;k++){
    const [z0,y0,w0,h0]=STOCK[k],[z1,y1,w1,h1]=STOCK[k+1];if(z>z0+1e-4||z<z1-1e-4)continue;
    const t=Math.min(1,Math.max(0,(z0-z)/(z0-z1))),yc=y0+(y1-y0)*t,hw=(w0+(w1-w0)*t)/2,hh=(h0+(h1-h0)*t)/2;
    const r=(Math.abs(x)/hw)**Q+(Math.abs(y-yc)/hh)**Q;if(Math.abs(r-1)<tolerance)return true;
  }
  return false;
}

// Axis-aligned boxes (weapon frame, metres) that hold exactly the vertices of the rear sight block and of the front sight (base, ears, blade)
// in tools/assets/m01-soldiers/src/weapon.mjs: rifle_rearsight at (0, .048, -.29), 26 x 14 x 70 mm; rifle_frontsight_base / ears / blade at z = -.752.
const REAR_BOX={x:.0135,y0:.040,y1:.0555,z0:-.3255,z1:-.2545},FRONT_BOX={x:.0095,y0:.037,y1:.0665,z0:-.7625,z1:-.7415};
// Upper handguard (wood, rifle_handguard): rings at z = -.27, -.45, -.62, 30 x 18 mm, centre y = .036.
const HANDGUARD_BOX={x:.0155,y0:.0265,y1:.0455,z0:-.6205,z1:-.2695};
const inside=(x,y,z,b)=>Math.abs(x)<=b.x&&y>=b.y0&&y<=b.y1&&z>=b.z0&&z<=b.z1;

/**
 * Per-triangle class of the `rifle` mesh in the pose it is in now (all of these parts are rigid on the weapon bone): PART.stock for the wood of the stock
 * from the receiver forward (wrist and forend) and PART.comb for the wood behind the receiver ring (weapon z >= 0.035: the comb, the heel and the butt, the part
 * that rises as a triangle under the sights), PART.rear for the rear sight block, PART.front for the front sight, PART.bolt for the bolt, PART.metal for everything else (receiver, barrel, bands, guard, butt plate).
 */
export function classifyRifle(rig){
  const R=rig.skinned(rig.rifle,new Float32Array(rig.rifle.geometry.getAttribute('position').count*3)),index=rig.rifle.geometry.index.array,out=new Uint8Array(index.length/3);
  const centroidZ=t=>(R[index[t]*3+2]+R[index[t+1]*3+2]+R[index[t+2]*3+2])/3;
  // Triangles skinned to the bolt bone (shroud, body, handle, knob): the head clip never touches them.
  const names=rig.rifle.skeleton.bones.map(b=>b.name),skinIndex=rig.rifle.geometry.getAttribute('skinIndex'),skinWeight=rig.rifle.geometry.getAttribute('skinWeight');
  const boltVertex=i=>{let best=-1,bw=0;for(let k=0;k<4;k++){const w=[skinWeight.getX,skinWeight.getY,skinWeight.getZ,skinWeight.getW][k].call(skinWeight,i);if(w>bw){bw=w;best=[skinIndex.getX,skinIndex.getY,skinIndex.getZ,skinIndex.getW][k].call(skinIndex,i);}}return names[best]==='weapon_bolt';};
  const all=(t,test)=>{for(let k=0;k<3;k++){const i=index[t+k];if(!test(R[i*3],R[i*3+1],R[i*3+2]))return false;}return true;};
  for(let t=0;t<index.length;t+=3){
    out[t/3]=[0,1,2].every(k=>boltVertex(index[t+k]))?PART.bolt:all(t,(x,y,z)=>inside(x,y,z,REAR_BOX))?PART.rear:all(t,(x,y,z)=>inside(x,y,z,FRONT_BOX))?PART.front:all(t,onStockSurface)?(centroidZ(t)>=.035?PART.comb:PART.stock):all(t,(x,y,z)=>inside(x,y,z,HANDGUARD_BOX))?PART.handguard:PART.metal;
  }
  return out;
}

const MESHES=[['rifle',null],['clip',PART.metal],['fp_hands',PART.hands],['body',PART.sleeves],['fp_cuffs',PART.sleeves],['fp_sleeve_caps',PART.sleeves],['fp_straps',PART.sleeves]];

/**
 * Rasterises every visible view model mesh. `classes` is classifyRifle(rig). Returns {cols, rows, part (Uint8Array, PART.*), depth (Float32Array, m)},
 * row 0 at the top of the frame. `faceClip` (m) is the rifle material's head clip (FACE_CLIP in m01-wz29-presentation.js): rifle fragments closer to the eye than
 * this, bolt excepted, are skipped, exactly as the shader discards them.
 */
export function sightPicture(rig,classes,{cols=640,rows=360,fov=58,near=.03,faceClip=0}={}){
  rig.root.updateMatrixWorld(true);
  const part=new Uint8Array(cols*rows),depth=new Float32Array(cols*rows).fill(Infinity),aspect=cols/rows,ty=Math.tan(THREE.MathUtils.degToRad(fov)/2),tx=ty*aspect;
  const poly=[[0,0,0],[0,0,0],[0,0,0],[0,0,0]];
  for(const [name,fixed] of MESHES){
    const mesh=rig.root.getObjectByName(name);if(!mesh?.visible)continue;
    const pos=mesh.geometry.getAttribute('position'),index=mesh.geometry.index.array,buf=rig.skinned(mesh,new Float32Array(pos.count*3),'view');
    for(let t=0;t<index.length;t+=3){
      const kind=fixed??classes[t/3],clipped=name==='rifle'&&kind!==PART.bolt;
      // Clip the triangle against z <= -near (Sutherland-Hodgman, one plane): at most four vertices.
      let n=0;
      for(let k=0;k<3;k++){const a=index[t+k],b=index[t+(k+1)%3],za=buf[a*3+2],zb=buf[b*3+2],ina=za<=-near,inb=zb<=-near;
        if(ina){poly[n][0]=buf[a*3];poly[n][1]=buf[a*3+1];poly[n][2]=za;n++;}
        if(ina!==inb){const u=(-near-za)/(zb-za);poly[n][0]=buf[a*3]+(buf[b*3]-buf[a*3])*u;poly[n][1]=buf[a*3+1]+(buf[b*3+1]-buf[a*3+1])*u;poly[n][2]=-near;n++;}}
      if(n<3)continue;
      for(let f=1;f+1<n;f++){
        const tri=[poly[0],poly[f],poly[f+1]];let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        const P=tri.map(v=>{const w=-v[2],sx=(v[0]/w/tx*.5+.5)*cols,sy=(.5-v[1]/w/ty*.5)*rows;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);return [sx,sy,1/w];});
        const den=(P[1][1]-P[2][1])*(P[0][0]-P[2][0])+(P[2][0]-P[1][0])*(P[0][1]-P[2][1]);if(Math.abs(den)<1e-12)continue;
        const x0=Math.max(0,Math.floor(minX)),x1=Math.min(cols-1,Math.ceil(maxX)),y0=Math.max(0,Math.floor(minY)),y1=Math.min(rows-1,Math.ceil(maxY));
        for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
          const px=x+.5,py=y+.5,l0=((P[1][1]-P[2][1])*(px-P[2][0])+(P[2][0]-P[1][0])*(py-P[2][1]))/den,l1=((P[2][1]-P[0][1])*(px-P[2][0])+(P[0][0]-P[2][0])*(py-P[2][1]))/den,l2=1-l0-l1;
          if(l0<0||l1<0||l2<0)continue;
          const d=1/(l0*P[0][2]+l1*P[1][2]+l2*P[2][2]);
          if(clipped&&d<faceClip)continue;
          if(d<depth[y*cols+x]){depth[y*cols+x]=d;part[y*cols+x]=kind;}
        }
      }
    }
  }
  return {cols,rows,part,depth};
}

/** Fraction of the pixels of an ndc rectangle (x0..x1, y0..y1; +y up) that show the given part(s). */
export function regionShare(picture,{x0,x1,y0,y1},kinds){
  const {cols,rows,part}=picture,list=Array.isArray(kinds)?kinds:[kinds];let hit=0,total=0;
  for(let y=0;y<rows;y++){const ny=1-(y+.5)/rows*2;if(ny<y0||ny>y1)continue;
    for(let x=0;x<cols;x++){const nx=(x+.5)/cols*2-1;if(nx<x0||nx>x1)continue;total++;if(list.includes(part[y*cols+x]))hit++;}}
  return total?hit/total:0;
}
/** Fraction of the whole frame showing the given part(s). */
export const frameShare=(picture,kinds)=>regionShare(picture,{x0:-1,x1:1,y0:-1,y1:1},kinds);

/** The lower-centre region of the sight picture (ndc, +y up): the central half of the frame's width, from just under the aim point to the bottom edge. */
export const LOWER_CENTRE=Object.freeze({x0:-.25,x1:.25,y0:-1,y1:-.05});

/** Top of the stock (weapon frame y) at weapon z, from the loft table, or null off the stock. */
export function combTop(z){
  for(let k=0;k+1<STOCK.length;k++){
    const [z0,y0,,h0]=STOCK[k],[z1,y1,,h1]=STOCK[k+1];if(z>z0||z<z1)continue;
    const t=(z0-z)/(z0-z1);return y0+(y1-y0)*t+(h0+(h1-h0)*t)/2;
  }
  return null;
}
const BUTT_Z=.335;

/**
 * Where the eye (the weapon camera origin) is on the rifle, from the placed view model, in metres of the weapon bone frame: `eyeRelief` (eye to the rear
 * sight landmark), `eyeToLine` (distance of the eye from the line rear sight -> front sight: zero when the sights are aligned on the eye), `forwardOfButt` (how far
 * in front of the butt plate the eye is: negative is behind the butt), `aboveComb` (eye height over the top of the stock at the eye's own z, null when the eye
 * is not over the stock) and the eye position itself.
 */
export function eyeGeometry(rig,rear=[0,.056,-.29],front=[0,.065,-.752]){
  rig.root.updateMatrixWorld(true);
  const eye=rig.weapon.worldToLocal(new THREE.Vector3(0,0,0)),r=new THREE.Vector3(...rear),f=new THREE.Vector3(...front),line=f.clone().sub(r).normalize();
  const along=eye.clone().sub(r),perpendicular=along.clone().addScaledVector(line,-along.dot(line));
  const top=combTop(eye.z);
  return {eye:eye.toArray(),eyeRelief:eye.distanceTo(r),eyeToLine:perpendicular.length(),forwardOfButt:BUTT_Z-eye.z,aboveComb:top===null?null:eye.y-top};
}
