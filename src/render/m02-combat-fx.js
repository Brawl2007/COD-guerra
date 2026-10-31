import * as THREE from 'three';
import {visualNoise} from './m01-atmosphere.js';
import {impactProfile,battlefieldProfile,fxLayerCount,staggeredLife,sampleMuzzleEnvironmentLight} from './m01-battlefield-fx-profile.js';
import {SHOT_FLASH_SEC,CLOCK_EPS,SMOKE_SEC as SHOT_SMOKE_SEC,flashRadius,flashTint,smokeRadius} from './m01-shot-fx.js';
import {flashStarTexture} from './first-person-weapon-fx.js';
import {traceObstruction} from '../world/spatial.js';

const surface=material=>/metal/.test(material)?'metal':/wood/.test(material)?'wood':/brick/.test(material)?'brick':/stone/.test(material)?'stone':material;
const finitePoint=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);

// A model socket can place the flash on the animated barrel without moving
// the authoritative shot, tracer or impact. Never bridge a solid surface or
// use a distant/stale model as a cosmetic replacement for the real origin.
export function m02VisibleMuzzleFlash(world,origin,socket){
 if(!finitePoint(origin)||!finitePoint(socket)||!world)return null;
 const dx=origin.x-socket.x,dy=origin.y-socket.y,dz=origin.z-socket.z,d=Math.hypot(dx,dy,dz);
 if(d>.6)return null;
 if(d>.02&&traceObstruction(world,socket,{x:dx/d,y:dy/d,z:dz/d},d-.01))return null;
 return {x:socket.x,y:socket.y,z:socket.z};
}

// M01 particle textures, material profiles and envelopes, driven by actual M02
// rounds. Fixed pools replace allocated full-length debug rays and hit spheres.
export class M02CombatFX {
  constructor(scene,atmosphere){
    this.atmosphere=atmosphere;this.root=new THREE.Group();this.root.name='M02 M01 combat effects';scene.add(this.root);
    this.shots=[];this.blasts=[];this.serial=0;this.dropped=0;this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.flashColor=new THREE.Color();
    this.geometry=new THREE.SphereGeometry(1,6,4);this.tracerGeometry=new THREE.BoxGeometry(1,1,1);
    this.flashMaterial=new THREE.MeshBasicMaterial({color:'#ffd98c',toneMapped:false,fog:false});
    this.tracerMaterial=new THREE.MeshBasicMaterial({color:'#ffb35a',toneMapped:false});
    this.batches={};
    for(const [name,capacity,style]of [['dust',192,'dust'],['smoke',96,'smoke'],['fire',48,'smoke'],['flash',64,'smoke']])this.batches[name]=atmosphere.billboardBatch(capacity,'#ffffff',this.root,style);
    this.starTexture=flashStarTexture();this.starMaterial=atmosphere.material.clone();this.starMaterial.uniforms.cloud.value=this.starTexture;this.starMaterial.blending=THREE.AdditiveBlending;this.starMaterial.toneMapped=false;this.batches.flash.material=this.starMaterial;
    for(const [name,capacity,geo,mat]of [['tracer',48,this.tracerGeometry,this.tracerMaterial],['spark',64,this.geometry,this.flashMaterial]]){
      const mesh=new THREE.InstancedMesh(geo,mat,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,new THREE.Color('#ffffff'));this.root.add(mesh);this.batches[name]=mesh;
    }
    this.light=new THREE.PointLight('#ffd68a',0,16,2);this.root.add(this.light);
  }
  sync(sim){
    if(this.player!==sim.player||this.world!==sim.world||sim.clock<this.clock){this.shots.length=0;this.blasts.length=0;for(const b of Object.values(this.batches))b.count=0;}
    this.player=sim.player;this.world=sim.world;this.clock=sim.clock;
  }
  shot(record,clock,{weapon='wz29',shooterId='player',roundIndex=0}={}){
    if(!finitePoint(record.origin)||!finitePoint(record.point))return;
    if(this.shots.length>=128){this.shots.shift();this.dropped++;}
    this.shots.push({...record,origin:{...record.origin},point:{...record.point},at:clock,weapon,shooterId,seed:++this.serial,tracer:weapon==='mg34'?roundIndex%2===0:['rkm_wz28','mp38'].includes(weapon)&&roundIndex%3===2});
  }
  consume(events,sim){
    this.sync(sim);
    for(const e of events){
      if(e.type==='shot-fired'&&e.shot)this.shot(e.shot,e.shot.clock??sim.clock);
      if(e.type==='actor-burst')for(const r of e.traces??[])this.shot(r,e.clock??sim.clock,e);
      if(e.type==='grenade-exploded'&&finitePoint(e.center)){
        if(this.blasts.length>=16)this.blasts.shift();this.blasts.push({point:{...e.center},at:e.clock??sim.clock,seed:++this.serial});
      }
    }
  }
  update(sim,camera,quality,model,viewportHeight=720,resolveMuzzle=null){
    this.sync(sim);const time=sim.clock,counts=Object.fromEntries(Object.keys(this.batches).map(k=>[k,0]));
    const put=(name,p,scale,color='#ffffff',opacity=1,seed=0,variant=0,dir=null)=>{
      const b=this.batches[name],i=counts[name];if(i>=b.instanceMatrix.count)return;
      const d=this.dummy;d.position.set(p.x,p.y,p.z);d.rotation.set(0,0,0);
      if(dir)d.lookAt(p.x+dir.x,p.y+dir.y,p.z+dir.z);
      if(Array.isArray(scale))d.scale.set(...scale);else d.scale.setScalar(scale);
      d.updateMatrix();b.setMatrixAt(i,d.matrix);b.setColorAt(i,this.color.set(color));
      b.geometry.attributes.puffOpacity?.setX(i,opacity);if(b.geometry.attributes.puffSpin)this.atmosphere.stylePuff(b,i,seed,variant);counts[name]++;
    };
    const distance=p=>Math.hypot(p.x-camera.position.x,p.y-camera.position.y,p.z-camera.position.z);
    this.shots=this.shots.filter(s=>time-s.at<2.1&&time>=s.at-CLOCK_EPS);
    const smokeShooters=new Map(),muzzles=new Map();
    for(const s of this.shots){
      const age=Math.max(0,time-s.at),p=s.origin,heavy=s.weapon==='mg34'||s.weapon==='rkm_wz28',dist=distance(p);
      if(s.shooterId!=='player'&&age<SHOT_FLASH_SEC&&counts.flash<this.batches.flash.instanceMatrix.count){
        if(!s.flashResolved&&resolveMuzzle){
          s.flashResolved=true;
          if(!muzzles.has(s.shooterId))muzzles.set(s.shooterId,resolveMuzzle(s.shooterId));
          s.flashOrigin=m02VisibleMuzzleFlash(sim.world,p,muzzles.get(s.shooterId));
        }
        const flash=s.flashOrigin??p,tint=flashTint(model?.daylight??1);
        put('flash',flash,flashRadius(heavy,distance(flash),camera.fov,viewportHeight,model?.daylight??1),this.flashColor.setRGB(tint,tint,tint));
      }
      if(s.shooterId!=='player')smokeShooters.set(s.shooterId,s);
      const dx=s.point.x-p.x,dy=s.point.y-p.y,dz=s.point.z-p.z,len=Math.hypot(dx,dy,dz);
      const head=Math.min(len,age*650),tail=Math.max(0,head-Math.max(.6,dist*.012));
      if(s.tracer&&len>.01&&age<len/650&&head>tail){
        const k=(head+tail)/2/len;
        put('tracer',{x:p.x+dx*k,y:p.y+dy*k,z:p.z+dz*k},[Math.max(.025,dist*.0016),Math.max(.025,dist*.0016),head-tail],'#ffffff',1,s.seed,0,{x:dx/len,y:dy/len,z:dz/len});
      }
      if(s.hitKind!=='world')continue;
      const profile=impactProfile(surface(s.material));if(age>=profile.life)continue;
      const fade=Math.min(1,age/.06)*Math.pow(1-age/profile.life,1.18);
      for(let j=0;j<fxLayerCount(profile.dust??0,quality,distance(s.point))&&profile.dust;j++){
        const a=visualNoise(s.seed,j*3)*Math.PI*2,r=age*profile.spread*(.45+visualNoise(s.seed,j*3+1)*.75);
        const size=(.18+age*.3)*(.7+visualNoise(s.seed,j*3+2));
        put('dust',{x:s.point.x+Math.cos(a)*r,y:s.point.y+.06+age*profile.rise,z:s.point.z+Math.sin(a)*r},[size,size*.7,1],profile.color,.6*fade,s.seed,j);
      }
      for(let j=0;j<(profile.sparks??0);j++){
        const a=visualNoise(s.seed,j)*Math.PI*2,r=age*profile.spread;
        put('spark',{x:s.point.x+Math.cos(a)*r,y:s.point.y+age*(profile.rise+visualNoise(s.seed,j+10)*2),z:s.point.z+Math.sin(a)*r},.025*(1-age/profile.life),'#ffd27a');
      }
    }
    for(const s of smokeShooters.values()){
      const heavy=s.weapon==='mg34'||s.weapon==='rkm_wz28',age=Math.max(0,time-s.at),k=age/(heavy?SHOT_SMOKE_SEC.mg:SHOT_SMOKE_SEC.rifle);
      if(k>=1)continue;const origin=s.flashOrigin??s.origin,p={x:origin.x+.3*k,y:origin.y+.1+k*(heavy?1.6:1.1),z:origin.z};
      put('smoke',p,smokeRadius(heavy,k,distance(p),camera.fov,viewportHeight),'#b9b8ae',.42*Math.pow(1-k,1.15),s.seed);
    }
    const profile=battlefieldProfile('grenade');this.blasts=this.blasts.filter(b=>time-b.at<profile.duration&&time>=b.at-CLOCK_EPS);
    for(const b of this.blasts){
      const age=Math.max(0,time-b.at),p=b.point;
      if(age<profile.flashEnd)put('flash',{...p,y:p.y+.2},.55*(1-age/profile.flashEnd),'#fff0c2');
      for(const [name,start,end,count,color,rise]of [['fire',profile.fireStart,profile.fireEnd,profile.counts.fire,'#e97831',1.8],['dust',profile.dustStart,profile.dustEnd,profile.counts.dust,'#8d7c67',.8]]){
        const n=fxLayerCount(count,quality,distance(p));
        for(let j=0;j<n;j++){
          const l=staggeredLife(age,start,end,j/Math.max(1,n-1)),a=visualNoise(b.seed,j)*Math.PI*2;
          if(l.life<=0)continue;const r=l.t*profile.scale*(name==='dust'?.42:.12);
          put(name,{x:p.x+Math.cos(a)*r,y:p.y+.2+l.t*rise,z:p.z+Math.sin(a)*r},(.45+l.t*(name==='dust'?2:.9)),color,l.life*(name==='dust'?.7:.9),b.seed,j);
        }
      }
    }
    const light=sampleMuzzleEnvironmentLight(this.shots.filter(s=>s.shooterId!=='player').map(s=>{const p=s.flashOrigin??s.origin;return {x:p.x,y:p.y-1.35,z:p.z,alive:true,active:true,firedAt:s.at,weapon:s.weapon};}),time,sim.player,quality);
    // Same policy as M01 weapon FX: keep the light count stable during combat,
    // varying intensity rather than switching light-count variants per flash.
    // Low has no muzzle light and pays no additional light loop.
    this.light.visible=quality!=='low';this.light.intensity=light.active?light.intensity:0;if(light.active)this.light.position.set(...light.position);
    for(const [name,b]of Object.entries(this.batches)){
      b.count=counts[name];b.instanceMatrix.needsUpdate=true;if(b.instanceColor)b.instanceColor.needsUpdate=true;
      for(const a of Object.values(b.geometry.attributes))if(a.isInstancedBufferAttribute)a.needsUpdate=true;
    }
    this.counts=counts;
  }
  get diagnostics(){return {shots:this.shots.length,blasts:this.blasts.length,dropped:this.dropped,drawn:this.counts??{},maxShots:128,maxBlasts:16};}
  dispose(){this.root.removeFromParent();for(const b of Object.values(this.batches))if(b.geometry.attributes.puffOpacity){b.geometry.dispose();this.atmosphere.puffBatches=this.atmosphere.puffBatches.filter(p=>p!==b);}this.geometry.dispose();this.tracerGeometry.dispose();this.flashMaterial.dispose();this.tracerMaterial.dispose();this.starMaterial.dispose();this.starTexture.dispose();}
}
