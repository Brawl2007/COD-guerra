import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {visualNoise} from './m01-atmosphere.js';

// PRESENTATION ONLY. Everything here is sampled after the simulation has decided a shot, a bolt
// stroke or a reload: it never feeds damage, authoritative spread, cadence, ammunition or hits.
const smooth=THREE.MathUtils.smoothstep,clamp=THREE.MathUtils.clamp;
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return Object.freeze(o);};
const blend=(v,aim)=>typeof v==='number'?v:v.hip+(v.ads-v.hip)*clamp(aim,0,1);

// Visual identity per weapon. Values are look-and-feel tuning in metres/radians/seconds, not ballistics.
// Bolt timings are the authored GLB markers (fire_bolt eject 0,6/1,17 s, reload_clip clip_ejected 2,45 s).
export const WEAPON_PRESENTATION=freeze({
  wz29:{id:'wz29',label:'Karabinek wz.29, 7,92×57 mm',action:'bolt',
    // One heavy shove into the shoulder, muzzle climb, slight cant to the right and a slow settle.
    recoil:{attack:.012,decay:.085,end:.42,back:{hip:.024,ads:.013},rise:{hip:.013,ads:.006},pitch:{hip:.030,ads:.011},
      roll:{hip:-.020,ads:-.006},yaw:{hip:.007,ads:.0022},settle:{pitch:.0055,freq:15,delay:.06,decay:.11}},
    // 600 mm barrel: compact white core, short tongue and a four-point star; the 60 ms event window is kept.
    flash:{life:.06,hold:.024,core:{hip:.12,ads:.095},tongue:{length:.20,width:.07},star:.17,
      color:'#ffd18b',tongueColor:'#ffab55',light:{color:'#ffb466',intensity:1.0,distance:1.6,decay:2}},
    smoke:{wisps:4,wispLife:1.3,wispSize:.07,wispOpacity:{hip:.26,ads:.13},chamber:{life:.75,size:.05,opacity:.24},
      puffs:4,puffLife:2.3,puffSize:.30,puffSpeed:3.4,puffOpacity:.34},
    casing:{kind:'7.92x57',velocity:[1.5,1.7,.35],spin:26,rest:24},
    clip:{velocity:[1.2,2.4,.4],spin:17,rest:24},
    // Fractions of the authoritative bolt cycle / absolute reload_clip seconds where the asset shows the action.
    mechanics:{eject:.6/1.17,chamberOpen:.43/1.17,chambered:1/1.17,clipEjected:2.45,boltClosed:2.7}},
  m1_carbine:{id:'m1_carbine',label:'M1 Carbine, .30 Carbine',action:'semi',
    // Light carbine: quick snap, little shove, fast return so 180 ms follow-ups stay readable.
    recoil:{attack:.008,decay:.045,end:.24,back:{hip:.016,ads:.009},rise:{hip:.008,ads:.004},pitch:{hip:.022,ads:.008},
      roll:{hip:-.010,ads:-.003},yaw:{hip:.006,ads:.0018},settle:{pitch:.003,freq:24,delay:.035,decay:.05}},
    // Short 457 mm barrel: proportionally larger, bushier flash than the long rifle.
    flash:{life:.05,hold:.018,core:{hip:.13,ads:.11},tongue:{length:.15,width:.09},star:.21,
      color:'#ffd9a0',tongueColor:'#ffbe6a',light:{color:'#ffc27a',intensity:1.0,distance:1.5,decay:2}},
    smoke:{wisps:3,wispLife:.9,wispSize:.055,wispOpacity:{hip:.22,ads:.11},chamber:{life:.45,size:.035,opacity:.2},
      puffs:3,puffLife:1.7,puffSize:.22,puffSpeed:2.6,puffOpacity:.28},
    casing:{kind:'.30-carbine',velocity:[2.3,2.1,-.15],spin:34,rest:18},
    mechanics:{eject:0,chamberOpen:0}},
});

// Finite damped impulse sampled from an authoritative shot time: no integration drift, timers or RNG.
export function recoilImpulse(age,{attack=.012,decay=.085,end=.42}={}){
  if(!(age>0)||age>=end)return 0;
  return (1-Math.exp(-age/attack))*Math.exp(-age/decay)*(1-smooth(age,end*.66,end));
}
const ZERO_RECOIL=Object.freeze({kick:0,back:0,rise:0,pitch:0,yaw:0,roll:0});
/** Per-weapon recoil pose offsets. Shot count only varies the side/cant by a presentation hash. */
export function weaponRecoil(profile,age,aim=0,shot=0){
  const r=profile.recoil,kick=recoilImpulse(age,r);if(!kick)return ZERO_RECOIL;
  const side=visualNoise(0x9e37^shot,1)*2-1,cant=.8+.4*visualNoise(0x9e37^shot,2),s=r.settle;
  // After the climb the muzzle dips once below rest and returns: weight, not a spring loop.
  const settle=age>s.delay?Math.sin((age-s.delay)*s.freq)*Math.exp(-(age-s.delay)/s.decay)*s.pitch*(1-smooth(age,r.end*.66,r.end)):0;
  return {kick,back:kick*blend(r.back,aim),rise:kick*blend(r.rise,aim),pitch:kick*blend(r.pitch,aim)-settle*(1-.6*clamp(aim,0,1)),
    yaw:kick*blend(r.yaw,aim)*side,roll:kick*blend(r.roll,aim)*cant};
}
/** Hip-only hold sway from incommensurate frequencies: it never visibly loops and never moves the ADS line. */
export function idleSway(clock){
  return {x:.0021*Math.sin(clock*.53+1.1)+.0011*Math.sin(clock*1.31+.3),y:.0015*Math.sin(clock*.71+.6)+.0008*Math.sin(clock*1.83+2.1),
    pitch:.0026*Math.sin(clock*.61+.2)+.0012*Math.sin(clock*1.57+1.4),yaw:.0030*Math.sin(clock*.47+.9)+.0011*Math.sin(clock*1.21+2.6),
    roll:.0036*Math.sin(clock*.37+.5)};
}
/** Short one-sided jolt after a mechanical marker (bolt slam, clip seated), sampled on the clip timeline. */
export function mechanicalPulse(sample,at,width=.14){const t=sample-at;return t>0&&t<width?Math.sin(t/width*Math.PI)*(1-t/width):0;}

/**
 * Weapon lag behind mouse look. Driven by the rendered mission clock: a frozen clock or a repeated
 * sample cannot advance it, and a restored world rebuilds it at rest. Turning right (+angle) lets
 * the muzzle trail left (+yaw); looking up (+pitch) lets it trail low (-pitch).
 */
export function advanceLookLag(state,angle,pitch,dt){
  if(!state||!Number.isFinite(state.angle))return {angle,pitch,yaw:0,pitchLag:0};
  if(dt>0){
    const da=Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle)),dp=pitch-state.pitch,k=1-Math.exp(-dt/.075);
    const yaw=clamp(da/dt*.012,-.045,.045),lag=clamp(-dp/dt*.009,-.035,.035);
    state.yaw+=(yaw-state.yaw)*k;state.pitchLag+=(lag-state.pitchLag)*k;
    if(Math.abs(state.yaw)<1e-6)state.yaw=0;if(Math.abs(state.pitchLag)<1e-6)state.pitchLag=0;
  }
  state.angle=angle;state.pitch=pitch;return state;
}

// Weapon-scene points are drawn by a narrower viewmodel camera at the eye. Map one to the world point that
// lands on the same pixel at the same depth, so world-space brass/smoke leaves exactly from the visible port.
export function viewPointToWorld(point,camera,viewFov,target=new THREE.Vector3()){
  const k=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/Math.tan(THREE.MathUtils.degToRad(viewFov)/2);
  return target.set(point.x*k,point.y*k,point.z).applyMatrix4(camera.matrixWorld);
}
/** World up expressed in the eye frame for a camera pitched by `pitch` (positive looks up). */
export const viewUp=(pitch,target=new THREE.Vector3())=>target.set(0,Math.cos(pitch),-Math.sin(pitch));

// ——— Procedural textures (pure data: no canvas, identical in Node and browser) ———
function dataTexture(width,height,pixel){
  const data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=pixel((x+.5)/width,(y+.5)/height,x,y),i=(y*width+x)*4;
    for(let c=0;c<4;c++)data[i+c]=clamp(Math.round(p[c]*255),0,255);}
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
const hashNoise=(x,y,seed)=>visualNoise(seed,(x&1023)*1024+(y&1023));
function valueNoise(u,v,scale,seed){
  const x=u*scale,y=v*scale,i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const a=hashNoise(i,j,seed),b=hashNoise(i+1,j,seed),c=hashNoise(i,j+1,seed),d=hashNoise(i+1,j+1,seed);
  return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;
}
/** White-hot radial core with a ragged edge. */
export function flashCoreTexture(size=64){
  return dataTexture(size,size,(u,v)=>{
    const dx=u-.5,dy=v-.5,r=Math.hypot(dx,dy)*2,a=Math.atan2(dy,dx);
    const ragged=.82+.18*Math.sin(a*7+1.3)*Math.sin(a*3-.4),k=clamp(1-r/ragged,0,1),hot=Math.pow(k,3.2);
    return [1,.78+.22*hot,.42+.58*hot,Math.pow(k,1.6)];
  });
}
/** Four-point star with thin uneven petals, the face-on look of a rifle muzzle. */
export function flashStarTexture(size=64){
  return dataTexture(size,size,(u,v)=>{
    const dx=u-.5,dy=v-.5,r=Math.hypot(dx,dy)*2,a=Math.atan2(dy,dx);let ray=0;
    for(let i=0;i<4;i++){const d=a-i*Math.PI/2,perp=Math.abs(Math.sin(d))*r,along=Math.cos(d)*r;
      if(along>0)ray=Math.max(ray,Math.exp(-Math.pow(perp/(.05+.07*(1-along)),2))*Math.pow(1-clamp(along/(.78+.22*((i*37)%5)/5),0,1),1.3));}
    const core=Math.exp(-r*r*9);return [1,.86,.6,clamp(Math.max(ray,core),0,1)];
  });
}
/** Flame tongue: hot at u≈0 (the muzzle), lengthening and fraying towards u=1. */
export function flashTongueTexture(width=64,height=32){
  return dataTexture(width,height,(u,v)=>{
    const half=.12+.30*Math.sin(Math.min(1,u*1.3)*Math.PI*.5)*(1-u*.35),off=(v-.5)/half,frayed=valueNoise(u,v,9,0x51a3)*.35;
    const body=Math.exp(-off*off*2.2)*smooth(u,0,.08)*Math.pow(1-u,1.15)*(.75+frayed),hot=Math.pow(clamp(1-u*1.6,0,1),2);
    return [1,.72+.28*hot,.35+.6*hot,clamp(body,0,1)];
  });
}
/** Soft unlit smoke puff for barrel wisps and world gun smoke. */
export function weaponSmokeTexture(size=64){
  return dataTexture(size,size,(u,v)=>{
    const r=Math.hypot(u-.5,v-.5)*2,n=valueNoise(u,v,5,0x2c1b)*.65+valueNoise(u,v,13,0x77f1)*.35;
    return [.72+.28*n,.72+.28*n,.70+.28*n,clamp(Math.pow(Math.max(0,1-r*r),1.7)*(.25+.75*n),0,1)];
  });
}

// ——— Geometry: authored lathe profiles (metres) ———
const CASING_PROFILES={
  // 7,92×57 mm: rimless bottleneck, 57 mm long, 11,95 mm head, extractor groove.
  '7.92x57':[[0,0],[.00595,0],[.00595,.0012],[.0052,.0019],[.0052,.0030],[.0059,.0036],[.00555,.0442],[.0049,.0482],[.00445,.0492],[.00445,.057],[.0039,.057],[.0039,.053]],
  // .30 Carbine: straight tapered case, 32,8 mm long, 9,1 mm rim.
  '.30-carbine':[[0,0],[.00457,0],[.00457,.0013],[.0039,.0019],[.0039,.0029],[.00452,.0034],[.00428,.0328],[.0038,.0328],[.0038,.030]],
};
export function casingGeometry(kind){
  const profile=CASING_PROFILES[kind];if(!profile)throw new Error(`Cartucho sem perfil: ${kind}`);
  const length=profile.reduce((m,p)=>Math.max(m,p[1]),0),geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),10);
  geometry.translate(0,-length/2,0);Object.assign(geometry.userData,{length,radius:profile[1][0],attitude:'side'});return geometry;
}
/** Empty five-round stripper clip: thin folded steel channel, 55 mm long along Z (stood upright in the guide at spawn).
 * It rests flat on its 0,8 mm base plate (origin 0,3 mm above the surface: a hair into the soil) or upside down on its 4,2 mm walls. */
export function stripperClipGeometry(){
  const base=new THREE.BoxGeometry(.0128,.0008,.055),left=new THREE.BoxGeometry(.0008,.0042,.055),right=left.clone();
  left.translate(-.006,.0021,0);right.translate(.006,.0021,0);
  const geometry=mergeGeometries([base,left,right]);[base,left,right].forEach(g=>g.dispose());
  Object.assign(geometry.userData,{radius:.003,attitude:'flat',restLift:.0003,restLiftFlipped:.0041});return geometry;
}

const additive=(map,color)=>new THREE.SpriteMaterial({map,color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false});

/**
 * Weapon-scene (eye-space) shot presentation: layered flash on the muzzle socket, muzzle light on the
 * hands/weapon and barrel/chamber smoke. Every value is a function of the authoritative shot times and the
 * rendered clock, so pause and repeated frames reproduce the same frame; restore calls reset().
 */
export class WeaponViewFx {
  /** light: an existing muzzle PointLight to drive instead of adding one (two FX of one weapon pass share it). */
  constructor(scene,profile,{light=null}={}){
    this.scene=scene;this.profile=profile;const f=profile.flash;
    this.textures={core:flashCoreTexture(),star:flashStarTexture(),tongue:flashTongueTexture(),smoke:weaponSmokeTexture()};
    this.core=new THREE.Sprite(additive(this.textures.core,f.color));this.core.name='muzzle_flash_core';
    this.star=new THREE.Sprite(additive(this.textures.star,f.color));this.star.name='muzzle_flash_star';
    this.tongue=new THREE.Sprite(additive(this.textures.tongue,f.tongueColor));this.tongue.name='muzzle_flash_tongue';
    this.layers=[this.core,this.star,this.tongue];
    for(const s of this.layers){s.visible=false;s.frustumCulled=false;s.renderOrder=12;}
    // Looking down the sights the rear sight hides the muzzle: only the star's thin rays may show around it.
    this.star.material.depthTest=false;this.star.renderOrder=13;
    // Always present with intensity 0 at rest: a constant light count never forces shader recompiles.
    this.ownsLight=!light;this.lightColor=new THREE.Color(f.light.color);
    this.light=light??new THREE.PointLight(f.light.color,0,f.light.distance,f.light.decay);
    if(this.ownsLight){this.light.name='muzzle_light';this.light.castShadow=false;scene.add(this.light);}
    // Barrel wisps for the latest and the previous shot (a quick follow-up must not cut the old smoke off), then the chamber puff.
    this.wisps=[];
    for(let i=0;i<2*profile.smoke.wisps+1;i++){
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.textures.smoke,color:'#d2cdc3',transparent:true,depthWrite:false,opacity:0,fog:false}));
      sprite.name=i<2*profile.smoke.wisps?'barrel_smoke':'chamber_smoke';sprite.visible=false;sprite.frustumCulled=false;sprite.renderOrder=11;scene.add(sprite);this.wisps.push(sprite);
    }
    this.v={a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3(),d:new THREE.Vector3()};this.stats=null;this.history=null;
  }
  /** Parent the flash layers to a weapon frame at its muzzle socket (local -Z along the bore). */
  attach(parent,muzzle){for(const s of [this.core,this.star]){parent.add(s);s.position.fromArray(muzzle);}parent.add(this.tongue);this.muzzle=[...muzzle];this.tongue.position.fromArray(muzzle);}
  /** light=false leaves a shared muzzle light to the FX that is drawing this frame. */
  hide(light=true){for(const s of [...this.layers,...this.wisps])s.visible=false;if(light)this.light.intensity=0;this.stats={flash:0,layers:0,light:0,wisps:0};return this.stats;}
  /** A restored world: forget the previous shot (its smoke belonged to another timeline). */
  reset(){this.history=null;}
  /** Objects whose programs prewarmWeaponFx compiles (flash layers, wisps). */
  get warmObjects(){return [...this.layers,...this.wisps];}
  /**
   * @param {object} o clock, shotAt (s, authoritative), gate (event-window flag), aim (0..1), shot (count),
   *   muzzle/axis/port/up (eye-space Vector3), chamberAt (s or null), visible, and fresh: the first rendered
   *   frame of a shot event, drawn at full strength even when a slow frame already passed the 60 ms window.
   */
  update({clock,shotAt,gate=true,aim=0,shot=0,muzzle,axis,port=null,up,chamberAt=null,visible=true,fresh=false}){
    if(!visible)return this.hide();
    // History keyed by the authoritative shot time: a later shot keeps the previous one; an earlier time (a restore) drops it.
    const h=this.history;
    if(!h||!(shotAt>=h.shotAt))this.history={shotAt,shot,previous:null};
    else if(shotAt>h.shotAt)this.history={shotAt,shot,previous:{shotAt:h.shotAt,shot:h.shot}};
    const p=this.profile,f=p.flash,age=clock-shotAt,noise=id=>{const seed=(0x6d2b^Math.imul(id+1,0x9e3779b1))>>>0;return i=>visualNoise(seed,i);},n=noise(shot);
    let k=0;if(fresh)k=1;else if(gate&&age>=0&&age<f.life)k=age<f.hold?1:1-smooth(age,f.hold,f.life);
    for(const s of this.layers)s.visible=k>0;
    if(k>0){
      const core=blend(f.core,aim)*(.85+.3*n(1))*(.78+.22*k);this.core.scale.set(core,core,1);this.core.material.opacity=k;this.core.material.rotation=n(2)*Math.PI*2;
      const star=f.star*(.8+.45*n(3))*Math.sqrt(k)*(1+.45*clamp(aim,0,1));this.star.scale.set(star,star,1);this.star.material.opacity=.9*k;this.star.material.rotation=n(4)*Math.PI*2;
      // Screen-aligned tongue along the projected bore: long at the hip, a short bloom when looking down the sights.
      const length=f.tongue.length*(.75+.5*n(5))*(.55+.45*k),width=f.tongue.width*(.8+.4*n(6));
      const center=this.v.a.copy(axis).multiplyScalar(length/2).add(muzzle),ray=this.v.b.copy(center).normalize();
      const across=this.v.c.copy(axis).addScaledVector(ray,-axis.dot(ray));
      this.tongue.parent?.worldToLocal(this.v.d.copy(center));this.tongue.position.copy(this.v.d);
      this.tongue.scale.set(width+length*across.length(),width,1);this.tongue.material.rotation=Math.atan2(across.y,across.x);this.tongue.material.opacity=.95*k;
    }
    this.light.color.copy(this.lightColor);this.light.distance=f.light.distance;this.light.decay=f.light.decay;
    this.light.position.copy(muzzle);this.light.intensity=k*f.light.intensity*(.85+.3*n(7));
    // Barrel wisps leave the muzzle after the flash and rise in world-up; the last sprite is the chamber puff.
    let wisps=0;const s=p.smoke,opacity=blend(s.wispOpacity,aim),side=this.v.c.crossVectors(axis,up).normalize();
    for(const [g,shotTime,id]of [[0,shotAt,shot],[1,this.history.previous?.shotAt,this.history.previous?.shot]]){
      const gn=g?noise(id):n,gage=clock-shotTime;
      for(let j=0;j<s.wisps;j++){
        const sprite=this.wisps[g*s.wisps+j],start=.02+.045*j,life=s.wispLife*(.8+.4*gn(10+j)),t=gage-start,q=t/life;
        if(!(t>=0&&q<1)){sprite.visible=false;continue;}
        sprite.position.copy(muzzle).addScaledVector(up,.015+.17*Math.pow(q,.75)*(.8+.4*gn(20+j))).addScaledVector(axis,.035*q)
          .addScaledVector(side,Math.sin(t*4.2+gn(30+j)*6.28)*.018*q);
        const size=s.wispSize*(.35+1.3*q)*(.85+.3*gn(40+j));sprite.scale.set(size,size,1);
        sprite.material.opacity=opacity*Math.pow(1-q,1.4)*Math.min(1,t/.1);sprite.material.rotation=gn(50+j)*6.28+t*.6;sprite.visible=true;wisps++;
      }
    }
    const chamber=this.wisps[2*s.wisps],c=s.chamber,ct=chamberAt===null?-1:clock-chamberAt,cq=ct/c.life;
    if(port&&ct>=0&&cq<1){
      chamber.position.copy(port).addScaledVector(up,.01+.07*cq).addScaledVector(side,-.02*cq);
      const size=c.size*(.6+1.6*cq);chamber.scale.set(size,size,1);chamber.material.opacity=c.opacity*Math.pow(1-cq,1.3)*Math.min(1,ct/.06);
      chamber.material.rotation=n(60)*6.28+ct;chamber.visible=true;wisps++;
    }else chamber.visible=false;
    this.stats={flash:+k.toFixed(4),layers:k>0?3:0,light:+this.light.intensity.toFixed(4),wisps};return this.stats;
  }
  dispose(){
    for(const s of [...this.layers,...this.wisps]){s.removeFromParent();s.material.dispose();}
    if(this.ownsLight){this.light.removeFromParent();this.light.dispose?.();}for(const t of Object.values(this.textures))t.dispose();
  }
}

const GRAVITY=9.81,AXIS=new THREE.Vector3(),LONG=new THREE.Vector3(),TARGET=new THREE.Vector3(),
  LAND=new THREE.Quaternion(),SPIN=new THREE.Quaternion(),TIP=new THREE.Quaternion(),IDENTITY=new THREE.Quaternion();
/** Height of the piece's origin above the surface when it rests (cases sink a little into soft ground). */
export const restLift=item=>item.restLift??item.radius*.85;
/**
 * Resting attitude reached from the touchdown orientation: the spin winds down to a stop while the piece tips, by at
 * most 90°, into the nearest way to lie. 'side': a lathe case with its axis (geometry Y) flat. 'flat': the stripper
 * clip on its base plate (geometry Y up) or, if it came down the other way, upside down on its side walls.
 */
function settle(item,t1,t2){
  LAND.setFromAxisAngle(AXIS,item.spin*t1).multiply(item.rotation);SPIN.setFromAxisAngle(AXIS,.2*item.spin*t2).multiply(LAND);
  LONG.set(0,1,0).applyQuaternion(SPIN);const flat=item.attitude==='flat',flipped=flat&&LONG.y<0;
  if(flat)TARGET.set(0,flipped?-1:1,0);
  else{TARGET.set(LONG.x,0,LONG.z);if(TARGET.lengthSq()<1e-8)TARGET.set(Math.cos(item.seed*Math.PI*2),0,Math.sin(item.seed*Math.PI*2));TARGET.normalize();}
  TIP.setFromUnitVectors(LONG,TARGET);
  return flipped?item.restLiftFlipped??restLift(item):restLift(item);
}
/**
 * Analytic brass/clip flight with one damped bounce on a flat ground plane, then rest. Pure in age:
 * no integration, so pause, repeated frames and late first frames sample the same trajectory, and the
 * orientation never jumps (touchdown, bounce and rest are one continuous motion).
 */
export function ejectaPose(item,age,position=new THREE.Vector3(),quaternion=new THREE.Quaternion()){
  const o=item.origin,v=item.velocity,ground=item.ground+item.radius;
  const c=o[1]-ground,disc=v[1]*v[1]+2*GRAVITY*Math.max(0,c),t1=c<=0?0:(v[1]+Math.sqrt(disc))/GRAVITY;
  AXIS.fromArray(item.spinAxis);
  if(age<t1){
    position.set(o[0]+v[0]*age,o[1]+v[1]*age-GRAVITY*age*age/2,o[2]+v[2]*age);
    quaternion.setFromAxisAngle(AXIS,item.spin*age).multiply(item.rotation);return {position,quaternion,phase:'flight'};
  }
  const land=[o[0]+v[0]*t1,o[2]+v[2]*t1],bounce=[v[0]*.35,Math.max(.25,(GRAVITY*t1-v[1])*.26),v[2]*.35],t2=2*bounce[1]/GRAVITY;
  const lift=settle(item,t1,t2);
  if(age<t1+t2){
    // Spin rate drops at the impact and winds down to zero by the end of the bounce while the tip blends in.
    const t=age-t1,s=smooth(t,0,t2),turn=.4*item.spin*(t-t*t/(2*t2));
    position.set(land[0]+bounce[0]*t,ground+(lift-item.radius)*s+bounce[1]*t-GRAVITY*t*t/2,land[1]+bounce[2]*t);
    quaternion.copy(IDENTITY).slerp(TIP,s).multiply(SPIN.setFromAxisAngle(AXIS,turn).multiply(LAND));return {position,quaternion,phase:'bounce'};
  }
  position.set(land[0]+bounce[0]*t2,item.ground+lift,land[1]+bounce[2]*t2);quaternion.copy(TIP).multiply(SPIN);
  return {position,quaternion,phase:'rest'};
}

/**
 * Rest height h where a piece landing on plane h meets the real surface under it: bisection on
 * surface(landing(h)) - h. Neither buried in a slope nor hovering; non-finite answers keep the start height.
 */
export function settleGround(item,groundAt){
  const top=item.origin[1]-item.radius,f=h=>{item.ground=h;const p=ejectaPose(item,60).position,g=groundAt(p.x,p.z);return Number.isFinite(g)?g-h:NaN;};
  const start=item.ground;let lo=start,hi=start,v=f(start);
  if(!Number.isFinite(v)){item.ground=start;return start;}
  if(Math.abs(v)<.001)return item.ground=start+v;
  if(v>0){lo=start;hi=Math.min(top,start+v+.5);if(!(f(hi)<=0)){item.ground=Math.min(top,start+v);return item.ground;}}
  else{hi=start;lo=start+v-.5;if(!(f(lo)>=0)){item.ground=start+v;return item.ground;}}
  for(let i=0;i<14;i++){const mid=(lo+hi)/2,m=f(mid);if(!Number.isFinite(m))break;if(m>0)lo=mid;else hi=mid;}
  return item.ground=hi;
}

/**
 * World-space consequences of the player's shots: brass and clips that fall and lie for a while, and
 * the muzzle cloud that hangs where the shot was fired. Emissions are keyed by authoritative shot/reload
 * ids, so a repeated or late frame can never duplicate one; a restored world discards them.
 */
export class WeaponWorldFx {
  constructor(parent,{casings=10,clips=3,puffs=16}={}){
    this.parent=parent;this.items=[];this.puffItems=[];this.world=null;this.capacity={casings,clips,puffs};
    this.brass=new THREE.MeshStandardMaterial({color:'#c39a52',metalness:.62,roughness:.36,name:'ejected_brass'});
    this.steel=new THREE.MeshStandardMaterial({color:'#5e5d55',metalness:.55,roughness:.5,name:'ejected_clip'});
    this.meshes=new Map();this.clipGeometry=stripperClipGeometry();
    this.clips=this.instanced('clip',this.clipGeometry,this.steel,clips);
    this.smokeTexture=weaponSmokeTexture();this.sprites=[];
    for(let i=0;i<puffs;i++){
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.smokeTexture,color:'#c9c5bb',transparent:true,depthWrite:false,opacity:0}));
      sprite.visible=false;sprite.name='shot_smoke';parent.add(sprite);this.sprites.push(sprite);
    }
    this.dummy=new THREE.Object3D();this.counts={casings:0,clips:0,puffs:0,resting:0};
  }
  instanced(name,geometry,material,capacity){
    const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=`ejected_${name}`;mesh.count=0;mesh.frustumCulled=false;
    mesh.castShadow=false;mesh.receiveShadow=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.parent.add(mesh);this.meshes.set(name,mesh);return mesh;
  }
  casingMesh(kind){return this.meshes.get(kind)??this.instanced(kind,casingGeometry(kind),this.brass,this.capacity.casings);}
  has(id){return this.items.some(i=>i.id===id)||this.puffItems.some(i=>i.id===id);}
  /**
   * kind: casing kind or 'clip'. origin/velocity in world metres; rotation = initial world quaternion.
   * groundAt(x,z) (optional, read-only world query) settles the rest height where the piece actually lands.
   */
  spawnEjecta({id,kind,start,origin,velocity,rotation,spinAxis,spin,ground,rest,seed,groundAt=null}){
    if(this.has(id))return false;
    const mesh=kind==='clip'?this.clips:this.casingMesh(kind),{radius=.005,attitude='side',restLift,restLiftFlipped}=mesh.geometry.userData;
    const item={id,kind,start,origin:origin.toArray(),velocity:velocity.toArray(),rotation:rotation.clone(),spinAxis:spinAxis.clone().normalize().toArray(),
      spin,ground,rest,seed,radius,attitude,...(restLift===undefined?{}:{restLift}),...(restLiftFlipped===undefined?{}:{restLiftFlipped})};
    if(groundAt)settleGround(item,groundAt);
    this.items.push(item);
    const limit=kind==='clip'?this.capacity.clips:this.capacity.casings,same=this.items.filter(i=>(i.kind==='clip')===(kind==='clip'));
    if(same.length>limit)this.items.splice(this.items.indexOf(same[0]),1);return true;
  }
  /**
   * aim: the authoritative aiming flag at the shot. Down the sights the cloud lies along the line of sight, over
   * the target: smokeless powder leaves a thin haze there, so it is drawn thinner and a little smaller.
   */
  spawnPuffs({id,start,origin,direction,profile,seed,aim=0}){
    if(this.has(id))return false;
    const ads=clamp(aim,0,1);
    this.puffItems.push({id,start,origin:origin.toArray(),direction:direction.clone().normalize().toArray(),count:profile.puffs,life:profile.puffLife,
      size:profile.puffSize*(1-.25*ads),speed:profile.puffSpeed,opacity:profile.puffOpacity*(1-.6*ads),seed});
    while(this.puffItems.reduce((n,p)=>n+p.count,0)>this.capacity.puffs)this.puffItems.shift();return true;
  }
  /** Bind to the simulation's world before spawning: a restored/replaced world discards presentation history. */
  sync(world){if(world!==this.world){this.world=world;this.reset();}return this;}
  reset(){this.items=[];this.puffItems=[];for(const mesh of this.meshes.values())mesh.count=0;for(const s of this.sprites)s.visible=false;this.counts={casings:0,clips:0,puffs:0,resting:0};}
  update(clock,world=null){
    // A restored/replaced world or a clock moved backwards discards presentation history.
    this.sync(world);
    this.items=this.items.filter(i=>clock>=i.start-1e-6&&clock-i.start<i.rest+.6);
    this.puffItems=this.puffItems.filter(p=>clock>=p.start-1e-6&&clock-p.start<p.life);
    const counters=new Map([...this.meshes.keys()].map(k=>[k,0]));let resting=0;const pose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion()};
    for(const item of this.items){
      const mesh=item.kind==='clip'?this.clips:this.meshes.get(item.kind),index=counters.get(mesh===this.clips?'clip':item.kind);
      const age=clock-item.start,state=ejectaPose(item,age,pose.position,pose.quaternion),sink=smooth(age,item.rest,item.rest+.6);
      if(state.phase==='rest')resting++;
      this.dummy.position.copy(state.position).y-=sink*item.radius*2.2;this.dummy.quaternion.copy(state.quaternion);this.dummy.scale.setScalar(1-sink*.6);
      this.dummy.updateMatrix();mesh.setMatrixAt(index,this.dummy.matrix);counters.set(mesh===this.clips?'clip':item.kind,index+1);
    }
    for(const [name,mesh]of this.meshes){mesh.count=counters.get(name);mesh.instanceMatrix.needsUpdate=true;}
    let used=0;
    for(const p of this.puffItems){
      const age=clock-p.start,[ox,oy,oz]=p.origin,[dx,dy,dz]=p.direction;
      for(let j=0;j<p.count&&used<this.sprites.length;j++){
        const n0=visualNoise(p.seed,j*4),n1=visualNoise(p.seed,j*4+1),n2=visualNoise(p.seed,j*4+2),delay=j*.012,t=age-delay;if(t<0)continue;
        const life=p.life*(.75+.4*n0),q=t/life;if(q>=1)continue;
        // Muzzle gas: fast along the bore, braked by drag, then buoyant and carried by a light breeze.
        const speed=p.speed*(.45+.75*n1),travel=speed*.32*(1-Math.exp(-t/.32)),spread=(n2-.5)*.35*travel;
        const sprite=this.sprites[used++];
        sprite.position.set(ox+dx*travel-dz*spread+.22*t,oy+dy*travel+.10*t+.05*t*t,oz+dz*travel+dx*spread+.09*t);
        const size=p.size*(.3+1.7*(1-Math.exp(-t/.55)))*(.8+.4*n0);sprite.scale.set(size,size,1);
        sprite.material.opacity=p.opacity*Math.min(1,t/.05)*Math.pow(1-q,1.6);sprite.material.rotation=n2*6.28+t*.35;sprite.visible=true;
      }
    }
    for(let i=used;i<this.sprites.length;i++)this.sprites[i].visible=false;
    this.counts={casings:this.items.filter(i=>i.kind!=='clip').length,clips:this.items.filter(i=>i.kind==='clip').length,puffs:used,resting};
    return this.counts;
  }
  get diagnostics(){return {...this.counts,capacity:{...this.capacity}};}
  /** Objects whose programs prewarmWeaponFx compiles: muzzle-cloud sprites, the clip pool and the case pools of `kinds` (created here). */
  warmObjects(kinds=[]){for(const kind of kinds)this.casingMesh(kind);return [...this.sprites,...this.meshes.values()];}
  dispose(){
    for(const mesh of this.meshes.values()){mesh.removeFromParent();mesh.dispose();if(mesh.geometry!==this.clipGeometry)mesh.geometry.dispose();}
    this.clipGeometry.dispose();this.brass.dispose();this.steel.dispose();
    for(const s of this.sprites){s.removeFromParent();s.material.dispose();}this.smokeTexture.dispose();this.items=[];this.puffItems=[];
  }
}

/**
 * Compile and link the shot-FX programs before they are needed. The flash layers, smoke wisps and muzzle-cloud sprites
 * are hidden at rest (and the case pool only exists from the first case), so the first shot used to build their
 * programs on that frame, and software WebGL (or a driver without parallel compile) finishes the compile/link only when
 * a program is first used: a stall of seconds in SwiftShader, a stutter on weak GPUs. Each object is compiled alone
 * against its own scene (`compile(object, camera, scene)`: that scene's visible lights, shadows, fog and environment,
 * so the programs the shot will use) and each program is used once (its uniform lookup), so the link happens now.
 * `lights` flicker while playing: every on/off combination is compiled, then their visibility is restored. Nothing is
 * drawn. Program keys follow the light and shadow setup (programStateKey), so callers run this again when it changes;
 * programs already linked are reused. Returns how many distinct programs the warmed materials hold, earlier setups
 * included (0 without a WebGL renderer).
 */
export function prewarmWeaponFx(engine,passes){
  if(typeof engine?.compile!=='function')return 0;const programs=new Set();
  for(const {scene,camera,objects,lights=[]}of passes){
    const saved=lights.map(l=>l.visible);
    try{
      for(let mask=0;mask<1<<lights.length;mask++){lights.forEach((l,i)=>{l.visible=Boolean(mask>>i&1);});
        for(const object of objects)for(const material of engine.compile(object,camera,scene)??[])
          for(const program of engine.properties?.get(material)?.programs?.values()??[])programs.add(program);}
    }finally{lights.forEach((l,i)=>{l.visible=saved[i];});}
  }
  for(const program of programs)program.getUniforms?.();
  return programs.size;
}
/**
 * Renderer state in every program's cache key that can change while playing: shadow maps on or off (quality) and their
 * type (three r186 rewrites a removed type inside the first shadow render). Callers append their scene's own setup; a
 * new key means the warmed programs no longer match, so both passes are warmed again.
 */
export const programStateKey=(engine,...scene)=>[engine?.shadowMap?.enabled,engine?.shadowMap?.type,...scene].join('|');

/** Equirect sky/ground gradient for weapon reflections; pitch-corrected through scene.environmentRotation. */
export function weaponEnvironmentTexture(){
  const texture=dataTexture(64,32,(u,v)=>{
    const elevation=(.5-v)*Math.PI,h=Math.sin(elevation),band=Math.exp(-Math.pow(h/.18,2));
    const sky=[.62+.18*h,.68+.16*h,.74+.14*h],ground=[.24,.21,.17];const k=smooth(h,-.08,.04);
    return [ground[0]+(sky[0]-ground[0])*k+.12*band,ground[1]+(sky[1]-ground[1])*k+.11*band,ground[2]+(sky[2]-ground[2])*k+.09*band,1];
  });
  texture.mapping=THREE.EquirectangularReflectionMapping;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;return texture;
}

/**
 * Eye-space lights for the weapon pass that follow the world: sky colour/intensity, the sun's direction
 * relative to the view and a low reflection environment for blued steel and varnished wood.
 */
export class WeaponLighting {
  constructor(scene,{fill=['#bfd0d5','#58422d',2.7],key=['#ffe0b0',2]}={}){
    this.scene=scene;this.fill=new THREE.HemisphereLight(...fill);this.key=new THREE.DirectionalLight(...key);
    this.fill.name='weapon_fill';this.key.name='weapon_key';scene.add(this.fill,this.key);
    this.environment=weaponEnvironmentTexture();scene.environment=this.environment;scene.environmentIntensity=.45;
    this.direction=new THREE.Vector3();this.inverse=new THREE.Quaternion();this.state=null;
  }
  /**
   * sky: world HemisphereLight; sun: world DirectionalLight (position/target); camera: world camera;
   * daylight 0..1; pitch: player pitch for the environment horizon.
   */
  sync({sky,sun,camera,daylight=1,pitch=0}){
    this.fill.color.copy(sky.color);this.fill.groundColor.copy(sky.groundColor);
    this.fill.intensity=clamp(sky.intensity*1.35,1.6,2.6);
    this.direction.subVectors(sun.position,sun.target.position).normalize().applyQuaternion(this.inverse.copy(camera.quaternion).invert());
    // Keep the key from grazing up from below the hands when the sun is on the horizon.
    const d=this.direction;if(d.y<.28){const k=Math.sqrt(1-.28*.28)/(Math.hypot(d.x,d.z)||1);d.set(d.x*k,.28,d.z*k);}
    this.key.position.copy(this.direction).multiplyScalar(5);this.key.color.copy(sun.color);
    this.key.intensity=clamp(.55+sun.intensity*.5,.55,2);
    this.scene.environmentIntensity=.32+.26*clamp(daylight,0,1);this.scene.environmentRotation.set(-pitch,0,0);
    this.state={fill:+this.fill.intensity.toFixed(3),key:+this.key.intensity.toFixed(3),environment:+this.scene.environmentIntensity.toFixed(3),
      keyDirection:this.direction.toArray().map(v=>+v.toFixed(3))};
    return this.state;
  }
  dispose(){this.fill.removeFromParent();this.key.removeFromParent();this.scene.environment=null;this.environment.dispose();}
}
