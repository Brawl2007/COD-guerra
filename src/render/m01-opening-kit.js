import * as THREE from 'three';
import {OPENING} from '../game/m01-opening.js';
import {PROP_KEYS} from './m01-opening-pose.js';

// M01 opening life, presentation (R1-b, 2026-10-25): the small things the men of Act I hold, on the bones of the rig so that they follow the clips and the arm IK (m01-opening-ik.js): the binoculars at the
// eyes, the cigarette in the fingers (an ember with a soft glow, and the smoke that rises from it), the mug, the map, the sergeant's note, the field telephone and its handset, the open ammunition box he holds at
// the belly, the medic's bag, the sapper's meter and the coil of cable. Original procedural shapes (boxes and cylinders; no third-party asset, no file). A prop exists only on the men whose plan
// uses it and is visible only while the act asks for it (m01-opening-pose.js `openingProps`); geometry and materials are shared and owned by the kit (disposed with the characters). Nothing here is
// saved or decides anything. Where each prop sits is tuned on captures of the fixture and of the game (tools/verification/m01-opening-r1b-fixture.html).
const deg=d=>d*Math.PI/180;
/** Where each prop sits in the local frame of its bone (the bind pose of the rig has no bone rotation: +x is the soldier's right, +y up, -z forward). Metres and degrees. */
export const OPENING_FIT=Object.freeze({
  binoculars:{bone:'head',pos:[0,.012,-.185],rot:[0,0,0]},
  cigarette:{bone:'hand_r',pos:[.01,-.012,-.07],rot:[75,0,0]},
  mug:{bone:'hand_r',pos:[.0,-.02,-.075],rot:[0,0,0]},
  map:{bone:'spine_03',pos:[0,-.01,-.4],rot:[-38,0,0]},
  note:{bone:'hand_r',pos:[.0,-.015,-.075],rot:[80,0,0]},
  handset:{bone:'hand_r',pos:[.0,.0,-.06],rot:[0,0,90]},
  phone:{bone:'spine_03',pos:[-.1,-.13,-.2],rot:[0,0,0]},
  box:{bone:'spine_02',pos:[0,-.12,-.3],rot:[0,0,0]},
  bag:{bone:'hips',pos:[-.24,.02,-.12],rot:[0,0,0]},
  meter:{bone:'hand_l',pos:[-.02,-.035,-.07],rot:[-10,0,-10]},
  coil:{bone:'hand_l',pos:[-.03,-.06,-.07],rot:[70,0,0]},
});
/** Which props a man can ever show: the union over the acts of his plans (a man who never smokes carries no cigarette). */
const ACT_PROPS={binoculars:['binoculars'],smoke:['cigarette'],coffee:['mug'],map:['map'],phone:['handset','phone'],phone_dead:['handset','phone'],ammo_check:['box'],aid_kit:['bag'],deliver:['note'],errand:['note'],
  cable_inspect:['meter'],cable_hold:['coil'],cable_walk:['meter','coil'],cable_wait:['meter','coil'],cable_watch:['binoculars']};
export function propsOf(id){
  const m=OPENING.men[id];if(!m)return [];
  const acts=new Set();
  for(const list of Object.values(m.plans))for(const e of list)acts.add(e.act);
  if(m.driver==='courier'){acts.add('errand');acts.add('deliver');}
  if(m.driver==='sappers'){for(const a of ['cable_inspect','cable_hold','cable_walk','cable_wait','cable_watch'])acts.add(a);}
  const out=new Set();
  for(const a of acts)for(const p of ACT_PROPS[a]??[])out.add(p);
  if(m.driver==='sappers'){   // the leader carries the meter, the helper the coil; the watch neither
    if(id!==OPENING.sappers.leader)out.delete('meter');
    if(id!==OPENING.sappers.helper)out.delete('coil');
    if(id===OPENING.sappers.watch){out.delete('meter');out.delete('coil');}else out.delete('binoculars');
  }
  return PROP_KEYS.filter(k=>out.has(k));
}
function glowTexture(){
  const n=32,data=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const d=Math.hypot((x+.5)/n*2-1,(y+.5)/n*2-1),a=Math.max(0,1-d),i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*a*a);}
  const t=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;
}

export class OpeningKit {
  constructor(){
    this.geometry={
      barrel:new THREE.CylinderGeometry(.027,.03,.14,10),bridge:new THREE.BoxGeometry(.05,.022,.03),eyecup:new THREE.CylinderGeometry(.022,.022,.02,10),
      cigarette:new THREE.CylinderGeometry(.0035,.0035,.085,6),ember:new THREE.SphereGeometry(.006,6,4),
      mug:new THREE.CylinderGeometry(.037,.034,.09,12),mugRim:new THREE.TorusGeometry(.037,.003,5,12),
      map:new THREE.BoxGeometry(.32,.003,.23),mapFold:new THREE.BoxGeometry(.003,.004,.23),
      note:new THREE.BoxGeometry(.13,.002,.09),
      handsetBar:new THREE.BoxGeometry(.045,.03,.17),handsetCup:new THREE.CylinderGeometry(.034,.034,.025,10),
      phoneBox:new THREE.BoxGeometry(.24,.16,.12),phoneCrank:new THREE.CylinderGeometry(.008,.008,.04,6),phoneKnob:new THREE.SphereGeometry(.014,6,4),
      boxBase:new THREE.BoxGeometry(.34,.12,.22),boxLid:new THREE.BoxGeometry(.34,.012,.2),clip:new THREE.BoxGeometry(.075,.03,.022),
      bag:new THREE.BoxGeometry(.28,.2,.1),bagFlap:new THREE.BoxGeometry(.28,.015,.11),crossA:new THREE.BoxGeometry(.075,.006,.02),crossB:new THREE.BoxGeometry(.02,.006,.075),
      meterBody:new THREE.BoxGeometry(.075,.035,.11),meterLamp:new THREE.SphereGeometry(.02,8,6),meterProbe:new THREE.CylinderGeometry(.003,.003,.14,5),
      coil:new THREE.TorusGeometry(.065,.014,6,14),
    };
    this.material={
      steel:new THREE.MeshStandardMaterial({color:'#4a4d4f',roughness:.45,metalness:.6}),rubber:new THREE.MeshStandardMaterial({color:'#1f1b17',roughness:.9}),
      paper:new THREE.MeshStandardMaterial({color:'#d9d2b6',roughness:.95,side:THREE.DoubleSide}),white:new THREE.MeshStandardMaterial({color:'#ece8dc',roughness:.9}),
      enamel:new THREE.MeshStandardMaterial({color:'#dcdfe0',roughness:.35}),blue:new THREE.MeshStandardMaterial({color:'#2f4f8a',roughness:.5}),
      bakelite:new THREE.MeshStandardMaterial({color:'#1b1a18',roughness:.4}),drab:new THREE.MeshStandardMaterial({color:'#4c5238',roughness:.85}),
      wood:new THREE.MeshStandardMaterial({color:'#7d5d38',roughness:.95}),woodDark:new THREE.MeshStandardMaterial({color:'#5d4528',roughness:.95}),brass:new THREE.MeshStandardMaterial({color:'#b88a3a',roughness:.4,metalness:.7}),
      canvas:new THREE.MeshStandardMaterial({color:'#8c8a68',roughness:.95}),red:new THREE.MeshStandardMaterial({color:'#a8352b',roughness:.8}),
      tester:new THREE.MeshStandardMaterial({color:'#3d4a33',roughness:.7}),cable:new THREE.MeshStandardMaterial({color:'#25231f',roughness:.9}),
      lamp:new THREE.MeshBasicMaterial({color:'#e0a020',toneMapped:false,fog:false}),
    };
    this.texture=glowTexture();this.clones=[];
  }
  /** The props of one man, parented to his bones (or to his root), invisible until an act asks for them. Returns null for a man with none. */
  attach(root,id){
    const keys=propsOf(id);if(!keys.length)return null;
    const g=this.geometry,m=this.material,kit={};
    const mesh=(geo,mat)=>{const x=new THREE.Mesh(geo,mat);x.castShadow=false;x.receiveShadow=false;x.frustumCulled=false;return x;};
    const make={
      binoculars:()=>{const r=new THREE.Group();for(const s of [-1,1]){const b=mesh(g.barrel,m.steel);b.rotation.x=Math.PI/2;b.position.set(s*.036,0,0);const c=mesh(g.eyecup,m.rubber);c.rotation.x=Math.PI/2;c.position.set(s*.036,0,.075);r.add(b,c);}
        const br=mesh(g.bridge,m.rubber);br.position.set(0,0,.01);r.add(br);return r;},
      cigarette:()=>{const r=new THREE.Group(),c=mesh(g.cigarette,m.white),e=mesh(g.ember,new THREE.MeshBasicMaterial({color:'#ff7a2a',toneMapped:false,fog:false}));
        this.clones.push(e.material);c.rotation.x=Math.PI/2;e.position.set(0,0,-.045);
        const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:'#ff8a3a',blending:THREE.AdditiveBlending,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,fog:false}));
        this.clones.push(glow.material);glow.scale.set(.07,.07,1);glow.position.copy(e.position);glow.name='opening_ember';e.name='opening_ember_core';r.add(c,e,glow);
        // two puffs of smoke that rise and fade from the tip, in the local frame of the prop's parent (animated in sync())
        for(let i=0;i<2;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:'#c7c7c2',transparent:true,opacity:0,depthWrite:false,fog:true}));this.clones.push(s.material);s.name=`opening_smoke_${i}`;s.scale.set(.1,.1,1);r.add(s);}
        return r;},
      mug:()=>{const r=new THREE.Group(),b=mesh(g.mug,m.enamel),rim=mesh(g.mugRim,m.blue);rim.rotation.x=Math.PI/2;rim.position.y=.045;r.add(b,rim);return r;},
      map:()=>{const r=new THREE.Group(),p=mesh(g.map,m.paper),f=mesh(g.mapFold,m.white);f.position.y=.002;r.add(p,f);return r;},
      note:()=>{const r=new THREE.Group();r.add(mesh(g.note,m.white));return r;},
      handset:()=>{const r=new THREE.Group(),bar=mesh(g.handsetBar,m.bakelite);r.add(bar);for(const s of [-1,1]){const c=mesh(g.handsetCup,m.bakelite);c.rotation.x=Math.PI/2;c.position.set(0,.02,s*.085);r.add(c);}return r;},
      phone:()=>{const r=new THREE.Group(),b=mesh(g.phoneBox,m.drab),k=mesh(g.phoneCrank,m.steel),n=mesh(g.phoneKnob,m.bakelite);k.rotation.z=Math.PI/2;k.position.set(.13,0,0);n.position.set(.15,0,.0);r.add(b,k,n);return r;},
      // the open ammunition box the man holds at his belly: a wooden box, its lid hinged up and back, the stripper clips in two rows inside (rotation.x of a lid hinged at the back edge: 100 degrees stands it up and a little back)
      box:()=>{const r=new THREE.Group(),b=mesh(g.boxBase,m.wood),lid=mesh(g.boxLid,m.woodDark);
        lid.position.set(0,.06+.098,.11+.017);lid.rotation.x=deg(100);r.add(b,lid);
        for(let i=0;i<6;i++){const k=mesh(g.clip,m.brass);k.position.set(-.1+(i%3)*.1,.065,-.04+Math.floor(i/3)*.08);r.add(k);}
        return r;},
      bag:()=>{const r=new THREE.Group(),b=mesh(g.bag,m.canvas),f=mesh(g.bagFlap,m.canvas),a=mesh(g.crossA,m.red),c=mesh(g.crossB,m.red);f.position.set(0,.1,0);a.position.set(0,.103,.0);c.position.set(0,.103,.0);r.add(b,f,a,c);return r;},
      meter:()=>{const r=new THREE.Group(),b=mesh(g.meterBody,m.tester),l=mesh(g.meterLamp,m.lamp.clone()),p=mesh(g.meterProbe,m.steel);this.clones.push(l.material);l.position.set(0,.03,-.03);p.position.set(.03,0,-.12);p.rotation.x=deg(90);r.add(b,l,p);return r;},
      coil:()=>mesh(g.coil,m.cable),
    };
    const find=n=>n==='root'?root:root.getObjectByName(n);
    for(const k of keys){
      const fit=OPENING_FIT[k],bone=find(fit.bone);if(!bone)continue;
      const o=make[k]();o.position.set(...fit.pos);o.rotation.set(deg(fit.rot[0]),deg(fit.rot[1]),deg(fit.rot[2]));o.visible=false;o.name=`opening_${k}`;bone.add(o);kit[k]=o;
    }
    return Object.keys(kit).length?kit:null;   // (a rig without the bones the fits name gets none)
  }
  /** Shows the props the act asks for (`wanted`: the record of openingProps) and animates the cigarette's ember and smoke. */
  sync(kit,wanted,time){
    if(!kit)return;
    for(const k of PROP_KEYS){const o=kit[k];if(o)o.visible=Boolean(wanted[k]);}
    const c=kit.cigarette;
    if(c?.visible){
      const e=wanted.ember??0,glow=c.getObjectByName('opening_ember');
      if(glow){glow.material.opacity=.15+.85*e;glow.scale.setScalar(.04+.05*e);}
      for(let i=0;i<2;i++){   // smoke: a puff every ~3 s from each, rising 0.35 m and spreading as it fades
        const s=c.getObjectByName(`opening_smoke_${i}`);if(!s)continue;
        const u=((time*.33+i*.5)%1+1)%1;s.position.set(0,.06+.35*u,-.045);s.scale.setScalar(.04+.12*u);s.material.opacity=.32*e*Math.sin(Math.PI*u);
      }
    }
  }
  dispose(){for(const o of [...Object.values(this.geometry),...Object.values(this.material),...this.clones,this.texture])o.dispose();}
}
