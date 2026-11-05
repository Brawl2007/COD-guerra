import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Area acts (VII-c, the withdrawal at dusk): diegetic guidance in the world, not only a HUD marker. Presentation only, procedural, no light source that costs a pass: sprites and unlit meshes.
//  - two hooded lanterns on posts at the south edge of the exit band (the plan's `withdrawal.exit`): in a blackout the light is dim and shielded, so each has a hood and a small amber window, a
//    faint pool of light on the ground and a halo whose size grows with the distance (a minimum angular size, so the pair reads as the gate from the parapet, 200 m away, and does not glare at 5 m);
//  - the glow of the town burning to the south-west (additive sprites low on the horizon, behind the town silhouette of the far landscape) with a thin plume;
//  - a slightly lifted ambient (`duskLift`) for the dusk act only, a function of the sun the act's own keyframes give.
// Nothing here is read by the simulation, and nothing is built for an act without a withdrawal plan. The quality tier never removes the lanterns and their halos (they are the guidance); it removes the
// ground pools and the plume on Low.
export const DUSK=Object.freeze({postM:2.6,lanternM:.4,haloMin:2.2,haloMax:16,haloPerM:.045,liftHemi:.22,liftExposure:.06});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

/** 0 at the first minutes after sunset (alt >= -0.6 deg), 1 from -3.2 deg down: how far the dusk lift is applied. Pure. */
export const duskLift=altDeg=>Number.isFinite(altDeg)?smooth((-altDeg-.6)/2.6):0;
/** The two lantern posts: on the south edge of the exit band, inset from its ends. Pure; null when the exit record is unusable. */
export function exitLanternSites(exit){
  if(!exit||![exit.minX,exit.maxX,exit.minZ,exit.maxZ].every(Number.isFinite))return null;
  const inset=Math.min(4,(exit.maxX-exit.minX)/4),z=exit.maxZ+1.5;
  return [{x:exit.minX+inset,z},{x:exit.maxX-inset,z}];
}
/** The halo's size in metres at a viewing distance: a minimum angular size, bounded. Pure. */
export const haloSize=distance=>Math.max(DUSK.haloMin,Math.min(DUSK.haloMax,(Number.isFinite(distance)?distance:0)*DUSK.haloPerM));
/** The halo's opacity: it is a lamp seen from afar; close up it does not glare. Pure. */
export const haloOpacity=distance=>.28+.6*smooth((distance-4)/40);

function glowTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,255,255,.62)');r.addColorStop(.5,'rgba(255,255,255,.16)');r.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=r;g.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export class M01AreaDusk{
  /** `exit` = plan.withdrawal.exit, `groundY(x,z)` = the ground under a point. */
  constructor(parent,{exit,groundY=()=>0,quality='low'}={}){
    this.group=new THREE.Group();this.group.name='m01-area-dusk';parent.add(this.group);this.quality=quality;
    this.geometries=[];this.materials=[];this.textures=[];this.sites=exitLanternSites(exit)??[];this.halos=[];this.flicker=[];this.pools=null;this.plume=null;this.townGlows=[];
    const geometry=g=>{this.geometries.push(g);return g;},material=m=>{this.materials.push(m);return m;};
    const glow=glowTexture();this.textures.push(glow);
    const centre=exit&&this.sites.length?{x:(exit.minX+exit.maxX)/2,z:(exit.minZ+exit.maxZ)/2}:{x:0,z:0};
    // The posts: dark wood post + hood (cone) + crossbar bracket in one mesh; the amber windows (unlit) in another.
    const darkParts=[],windows=[];
    for(const s of this.sites){
      const y=groundY(s.x,s.z),L=DUSK.lanternM,top=y+DUSK.postM;
      darkParts.push(new THREE.CylinderGeometry(.05,.065,DUSK.postM,6).translate(s.x,y+DUSK.postM/2,s.z));
      darkParts.push(new THREE.BoxGeometry(.32,.025,.025).translate(s.x+.16,top-.04,s.z));   // the bracket the lantern hangs from
      darkParts.push(new THREE.BoxGeometry(L*.8,.03,L*.8).translate(s.x+.32,top-.12-L-.015,s.z));   // base plate
      darkParts.push(new THREE.ConeGeometry(L*.62,.2,8).translate(s.x+.32,top-.12+.1,s.z));   // the hood: the light is kept from the sky
      for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])darkParts.push(new THREE.BoxGeometry(.02,L,.02).translate(s.x+.32+dx*L*.38,top-.12-L/2,s.z+dz*L*.38));
      windows.push(new THREE.BoxGeometry(L*.72,L*.9,L*.72).translate(s.x+.32,top-.12-L/2,s.z));
    }
    if(darkParts.length){
      const dark=mergeGeometries(darkParts),lit=mergeGeometries(windows);for(const g of [...darkParts,...windows])g.dispose();
      const dm=new THREE.Mesh(geometry(dark),material(new THREE.MeshStandardMaterial({color:'#26211b',roughness:.9,metalness:.2}))),
        lm=new THREE.Mesh(geometry(lit),material(new THREE.MeshBasicMaterial({color:'#ffb45c',fog:false})));
      dm.name='m01-area-dusk-posts';lm.name='m01-area-dusk-windows';dm.castShadow=false;dm.receiveShadow=false;lm.castShadow=false;
      this.group.add(dm,lm);
      for(const s of this.sites){
        const sprite=new THREE.Sprite(material(new THREE.SpriteMaterial({map:glow,color:'#ffa84a',blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false,opacity:.8})));
        sprite.position.set(s.x+.32,groundY(s.x,s.z)+DUSK.postM-.12-DUSK.lanternM/2,s.z);sprite.name='m01-area-dusk-halo';this.group.add(sprite);this.halos.push(sprite);
      }
      // faint pools of light on the ground under the lanterns: Low drops them
      const discs=this.sites.map(s=>new THREE.CircleGeometry(3.4,20).rotateX(-Math.PI/2).translate(s.x+.32,groundY(s.x,s.z)+.05,s.z));
      this.pools=new THREE.Mesh(geometry(mergeGeometries(discs)),material(new THREE.MeshBasicMaterial({map:glow,color:'#ff9c3c',blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false,opacity:.3,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-8})));
      for(const d of discs)d.dispose();this.pools.name='m01-area-dusk-pools';this.pools.renderOrder=1;this.group.add(this.pools);
    }
    // The town to the south-west burns low: glows behind its silhouette and one thin plume. Offsets from the exit band, in metres (+x east, +z south).
    for(const [dx,dz,w,h,o,color] of [[-190,70,150,70,.42,'#ff7a30'],[-255,-15,200,90,.34,'#ff8c3c'],[-170,150,110,50,.28,'#ff6a28']]){
      const s=new THREE.Sprite(material(new THREE.SpriteMaterial({map:glow,color,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,fog:false,opacity:o})));
      s.position.set(centre.x+dx,groundY(centre.x+dx,centre.z+dz)+h*.32,centre.z+dz);s.scale.set(w,h,1);s.name='m01-area-dusk-town-glow';s.userData.base=o;this.group.add(s);this.townGlows.push(s);
    }
    this.plume=new THREE.Sprite(material(new THREE.SpriteMaterial({map:glow,color:'#4a3a31',transparent:true,depthWrite:false,fog:false,opacity:.3})));
    this.plume.position.set(centre.x-195,groundY(centre.x-195,centre.z+70)+70,centre.z+70);this.plume.scale.set(34,150,1);this.plume.name='m01-area-dusk-plume';this.group.add(this.plume);
    this.setQuality(quality);
  }
  setQuality(quality){this.quality=quality;if(this.pools)this.pools.visible=quality!=='low';if(this.plume)this.plume.visible=quality!=='low';}
  /** Per frame: the halos follow the distance to the camera, everything breathes a little with the simulation clock (the light of a flame, not a strobe). */
  update(camera,clock){
    for(let i=0;i<this.halos.length;i++){
      const h=this.halos[i],d=Math.hypot(h.position.x-camera.x,h.position.y-camera.y,h.position.z-camera.z),f=1+.05*Math.sin(clock*7.3+i*2.1)+.03*Math.sin(clock*13.1+i);
      const s=haloSize(d);h.scale.set(s*f,s*f,1);h.material.opacity=haloOpacity(d)*f;
    }
    for(let i=0;i<this.townGlows.length;i++){const g=this.townGlows[i];g.material.opacity=g.userData.base*(1+.12*Math.sin(clock*.9+i*1.7)+.06*Math.sin(clock*2.3+i));}
  }
  get diagnostics(){return {lanterns:this.sites.length,halos:this.halos.length,townGlows:this.townGlows.length,pools:Boolean(this.pools?.visible),plume:Boolean(this.plume?.visible),quality:this.quality,
    sites:this.sites.map(s=>({x:s.x,z:s.z})),haloScale:this.halos.map(h=>+h.scale.x.toFixed(2))};}
  dispose(){this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.group.clear();this.halos.length=0;this.townGlows.length=0;}
}
