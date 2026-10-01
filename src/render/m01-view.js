import * as THREE from 'three';
import { AssetManager } from '../assets/asset-manager.js';
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import { eyePosition, aimDirection } from '../world/spatial.js';
import { seconds } from '../game/m01-simulation.js';

// Presentation only: all actors, visible pieces, damage and clocks come from M01Simulation.
// Characters, trains, aircraft, terrain and the wz.29 are original procedural placeholders.
export class M01View {
  constructor(renderer){
    this.owner=renderer;this.engine=renderer.engine;this.assets=new AssetManager();this.disposed=false;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#88979e',650,2800);
    this.camera=new THREE.PerspectiveCamera(70,1,.05,7500);this.weaponCamera=new THREE.PerspectiveCamera(58,1,.03,6);
    this.weaponScene=new THREE.Scene();this.weaponRoot=new THREE.Group();this.weaponScene.add(this.weaponRoot);
    this.weaponScene.add(new THREE.HemisphereLight('#bfd0d5','#58422d',2.7));
    this.skyLight=new THREE.HemisphereLight('#bac9d5','#625846',1.25);this.scene.add(this.skyLight);
    this.sun=new THREE.DirectionalLight('#ffd6a0',.45);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-55,right:55,top:55,bottom:-55,near:.5,far:450});this.sun.shadow.bias=-.0005;
    this.scene.add(this.sun,this.sun.target);
    this.weaponScene.add(new THREE.DirectionalLight('#ffe0b0',2));
    this.materials={
      ground:new THREE.MeshStandardMaterial({color:'#77765c',roughness:1}),
      stone:new THREE.MeshStandardMaterial({color:'#827d70',roughness:1}),
      brick:new THREE.MeshStandardMaterial({color:'#8a614c',roughness:1}),
      wood:new THREE.MeshStandardMaterial({color:'#66503a',roughness:.95}),
      metal:new THREE.MeshStandardMaterial({color:'#414740',roughness:.65,metalness:.35}),
      dark:new THREE.MeshStandardMaterial({color:'#202622',roughness:.8}),
      skin:new THREE.MeshStandardMaterial({color:'#b99375',roughness:.95}),
      brass:new THREE.MeshStandardMaterial({color:'#bfa66a',roughness:.55,metalness:.6}),
      water:new THREE.MeshStandardMaterial({color:'#526b73',roughness:.45,metalness:.15}),
      cloth:new THREE.MeshStandardMaterial({color:'#75765e',roughness:1}),
      glow:new THREE.MeshBasicMaterial({color:'#ffb14b',toneMapped:false}),
      smoke:new THREE.MeshBasicMaterial({color:'#454744',transparent:true,opacity:.3,depthWrite:false})};
    this.box=new THREE.BoxGeometry(1,1,1);this.sphere=new THREE.SphereGeometry(1,8,6);
    this.cylinder=new THREE.CylinderGeometry(1,1,1,8);this.geometry=[this.box,this.sphere,this.cylinder];
    this.kit=[];this.batches=new Map();this.solidGroup=new THREE.Group();this.effects=new THREE.Group();
    this.scene.add(this.solidGroup,this.effects);this.smokes=new Map();this.grenadeViews=new Map();this.world=null;this.revision=-1;
    this.flashUntil=0;this.shakeUntil=0;this.lastClock=0;
    this.createWeapon();this.createActors();this.createAircraft();this.createTrains();this.ready=this.loadKit();
  }
  mesh(shape,material,p,size,parent=this.scene){
    const m=new THREE.Mesh(this[shape],this.materials[material]);m.position.set(...p);m.scale.set(...size);
    m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  async loadKit(){
    await Promise.allSettled(manifest.files.filter(f=>typeof f.lod==='number').map(async(file)=>{
      try{
        const asset=await this.assets.load(file.file,file.file);if(this.disposed)return;
        asset.scene.traverse(n=>{if(n.isMesh)n.castShadow=n.receiveShadow=true;});
        const pieces=file.nodes.map(n=>({name:n.name,node:asset.scene.getObjectByName(n.name)})).filter(n=>n.node);
        this.kit.push({file,root:asset.scene,pieces});this.scene.add(asset.scene);
      }catch(error){if(!this.disposed)console.warn(`Ponte M01: ${error.message}`);}
    }));
  }
  buildTerrain(world){
    this.world=world;
    const geometry=new THREE.PlaneGeometry(2000,650,250,82);geometry.rotateX(-Math.PI/2);geometry.translate(300,0,40);
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,world.terrainHeightAt(pos.getX(i),pos.getZ(i)));
    geometry.computeVertexNormals();this.geometry.push(geometry);
    this.scene.add(new THREE.Mesh(geometry,this.materials.ground));
    this.mesh('box','ground',[-900,-4,0],[400,.5,6500]);
    this.mesh('box','ground',[2050,-1.3,0],[1500,.5,6500]);
    this.mesh('box','ground',[665,-5.3,0],[790,.5,6500]);
    this.mesh('box','water',[145,-9.94,0],[240,.08,6500]);
    const lines=['rail_embankment_west','rail_line_southwest','rail_line_east'];
    for(const name of lines){const points=world.features.get(name).polyline;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);if(length>1800)continue;
        for(const offset of [-.72,.72]){
          const track=this.mesh('box','metal',[(a[0]+b[0])/2,a[1]+.12,(a[2]+b[2])/2+offset],[length,.12,.08]);track.rotation.y=-Math.atan2(dz,dx);
        }
      }
    }
    // Empty windows sit on the station's solid wall, rather than implying open paths.
    for(let x=-450;x<-340;x+=10)this.mesh('box','dark',[x,3,27.97],[2.2,2.8,.05]);
    this.mesh('box','dark',[-262,.57,20],[21,.18,13]);
    // Signals identify the barracão, sapper station and shelter without minimap arrows.
    this.mesh('box','wood',[-263,-2.5,22],[1.2,1,.8]);
    this.mesh('box','metal',[-120,-2.65,9],[1.4,.7,.8]);
    this.mesh('box','ground',[-260,-4.5,70],[8,.4,9]);
    this.mesh('box','stone',[-260,-1.8,75],[10,.8,3]);
    this.mesh('box','stone',[-264,-2.5,71],[1,3,9]);
    this.mesh('box','stone',[-256,-2.5,71],[1,3,9]);
  }
  syncSolids(world){
    if(this.world!==world){if(!this.world)this.buildTerrain(world);else this.world=world;}
    if(this.revision===world.revision&&this.solidWorld===world)return;
    this.revision=world.revision;this.solidWorld=world;
    for(const m of this.solidGroup.children)if(m.isInstancedMesh)m.dispose();this.solidGroup.clear();
    const byMaterial=new Map();
    for(const b of [...world.buildings,...world.covers,...world.joints]){
      const key=b.material??'stone';if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(b);
    }
    for(const [material,boxes]of byMaterial){
      const batch=new THREE.InstancedMesh(this.box,this.materials[material]??this.materials.stone,boxes.length),dummy=new THREE.Object3D();
      boxes.forEach((b,i)=>{dummy.position.set((b.min.x+b.max.x)/2,(b.min.y+b.max.y)/2,(b.min.z+b.max.z)/2);
        dummy.scale.set(b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
      batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();this.solidGroup.add(batch);
    }
  }
  createActors(){
    for(const [name,shape,material]of [['torso','cylinder','cloth'],['head','sphere','skin'],['helmet','sphere','metal'],
      ['limbs','cylinder','cloth'],['rifle','box','wood'],['flash','sphere','glow']]){
      const capacity=name==='limbs'?360:90;
      const batch=new THREE.InstancedMesh(this[shape],this.materials[material],capacity);
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.frustumCulled=false;
      batch.castShadow=name!=='flash';this.scene.add(batch);this.batches.set(name,batch);
    }
  }
  updateActors(actors,time){
    const counts={},dummy=new THREE.Object3D(),root=new THREE.Object3D();
    const put=(name,p,size,color,rotation=0)=>{
      const batch=this.batches.get(name),i=counts[name]??0;counts[name]=i+1;
      dummy.position.set(...p);dummy.scale.set(...size);dummy.rotation.set(rotation,0,0);dummy.updateMatrix();
      batch.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(root.matrix,dummy.matrix));if(color)batch.setColorAt(i,new THREE.Color(color));
    };
    for(const a of actors){
      if(!a.active)continue;
      root.position.set(a.x,a.y,a.z);root.rotation.set(0,-a.facing,a.alive?(a.state==='WOUNDED'?-1.25:0):1.45);root.updateMatrix();
      const cloth=a.civilian?'#404c56':a.team==='enemy'?'#657273':'#858065',helmet=a.team==='enemy'?'#465252':'#635f47';
      const walk=a.alive&&['ADVANCE','RETREAT'].includes(a.state),phase=time*7+Number(a.id.match(/\d+$/)?.[0]??0);
      put('torso',[0,1.08,0],[.26,.65,.21],cloth);put('head',[0,1.63,0],[.17,.2,.15]);
      put('helmet',[0,1.77,0],[.21,.12,.19],helmet);
      for(const [i,z]of [-.14,.14].entries()){
        put('limbs',[0,.43,z],[.105,.72,.10],cloth,walk?Math.sin(phase+i*Math.PI)*.48:0);
        put('limbs',[.14,1.05,z*1.8],[.08,.58,.08],cloth,-.65+(walk?Math.sin(phase+i*Math.PI)*.2:0));
      }
      if(!a.civilian&&a.role!=='MEDIC')put('rifle',[.43,1.12,.18],[.9,.07,.06]);
      if(a.alive&&a.shot>0)put('flash',[.93,1.13,.18],[.2,.07,.07]);
    }
    for(const [name,batch]of this.batches){batch.count=counts[name]??0;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
  }
  createWeapon(){
    const r=this.weaponRoot;
    this.mesh('box','wood',[0,-.035,.18],[.07,.12,.53],r);
    this.mesh('box','wood',[0,.01,-.17],[.065,.065,.4],r);
    this.mesh('box','metal',[0,.045,-.02],[.048,.047,.22],r);
    const barrel=this.mesh('cylinder','metal',[0,.045,-.34],[.012,.59,.012],r);barrel.rotation.x=Math.PI/2;
    this.mesh('box','metal',[0,.102,-.06],[.045,.012,.012],r);
    this.mesh('box','metal',[-.019,.115,-.06],[.008,.025,.01],r);this.mesh('box','metal',[.019,.115,-.06],[.008,.025,.01],r);
    this.mesh('box','metal',[0,.11,-.60],[.009,.025,.015],r);
    this.bolt=new THREE.Group();r.add(this.bolt);this.mesh('box','metal',[.058,.033,.02],[.055,.012,.012],this.bolt);
    this.mesh('sphere','metal',[.085,.015,.02],[.015,.015,.015],this.bolt);
    this.rightArm=this.mesh('cylinder','cloth',[.18,-.16,.23],[.055,.5,.055],r);this.rightArm.rotation.x=-1;
    this.leftArm=this.mesh('cylinder','cloth',[-.13,-.15,-.18],[.055,.46,.055],r);this.leftArm.rotation.x=-1;
    this.mesh('sphere','skin',[.055,-.06,.10],[.055,.07,.075],r);
    this.loadingHand=this.mesh('sphere','skin',[-.055,-.04,-.2],[.055,.07,.075],r);
    this.clip=new THREE.Group();r.add(this.clip);
    for(let i=0;i<5;i++)this.mesh('cylinder','brass',[(i-2)*.012,.14,-.03],[.006,.075,.006],this.clip);
    this.flash=this.mesh('sphere','glow',[0,.045,-.65],[.045,.045,.15],r);this.flash.visible=false;
  }
  createAircraft(){
    this.planes=[];for(let i=0;i<3;i++){
      const plane=new THREE.Group();this.scene.add(plane);
      this.mesh('box','dark',[0,0,0],[1.2,1.3,11],plane);
      this.mesh('box','dark',[0,-.3,.2],[13.8,.18,2.5],plane);
      this.mesh('box','dark',[0,.3,4],[4.4,.12,1.3],plane);
      this.mesh('box','dark',[0,1,4],[.12,2,1.8],plane);
      this.planes.push(plane);
    }
    this.raidPlane=new THREE.Group();this.scene.add(this.raidPlane);
    this.mesh('box','dark',[0,0,0],[1.4,1.8,15.8],this.raidPlane);
    this.mesh('box','dark',[0,0,0],[18,.3,3],this.raidPlane);
    for(const x of [-4,4])this.mesh('box','dark',[x,-.5,-.6],[1.3,1.5,3.7],this.raidPlane);
  }
  createTrains(){
    this.train=new THREE.Group();this.panzerzug=new THREE.Group();this.scene.add(this.train,this.panzerzug);
    for(let i=0;i<32;i++){
      this.mesh('box',i===0?'dark':'wood',[1075+i*20,2,-2.5],[17,3.2,2.8],this.train);
      for(const x of [-5,5])this.mesh('cylinder','metal',[1075+i*20+x,.4,-2.5],[.6,3.1,.6],this.train).rotation.x=Math.PI/2;
    }
    for(let i=0;i<5;i++)this.mesh('box','metal',[1119+i*19,2,2.5],[17,3.1,2.9],this.panzerzug);
    for(const x of [1120,1197])this.mesh('cylinder','metal',[x,4,2.5],[1,1,1],this.panzerzug);
  }
  syncDamage(sim,state){
    const active=new Set();
    for(const d of state.damage){
      active.add(d.id);let smoke=this.smokes.get(d.id);
      if(!smoke){smoke=new THREE.Group();for(let i=0;i<5;i++)this.mesh('sphere','smoke',[Math.sin(i*3)*3,i*6,Math.cos(i*4)*3],[5+i,4+i*2,5+i],smoke);
        this.effects.add(smoke);this.smokes.set(d.id,smoke);}
      smoke.position.set(d.x,d.y+3,d.z);smoke.rotation.y=(sim.clock-d.started)*.015;
      smoke.visible=d.smokeVisible;
    }
    for(const [id,m]of this.smokes)if(!active.has(id)){this.effects.remove(m);this.smokes.delete(id);}
    const live=new Set(sim.grenades.active.map(g=>g.id));
    for(const g of sim.grenades.active){let m=this.grenadeViews.get(g.id);if(!m){m=this.mesh('sphere','metal',[0,0,0],[.07,.07,.07],this.effects);this.grenadeViews.set(g.id,m);}m.position.set(g.x,g.y,g.z);}
    for(const [id,m]of this.grenadeViews)if(!live.has(id)){this.effects.remove(m);this.grenadeViews.delete(id);}
  }
  lighting(sim){
    const keys=sim.world.layout.sun.keyframes,after=keys.findIndex(k=>seconds(k.clock)>sim.battleClock);
    const a=keys[Math.max(0,after<0?keys.length-1:after-1)],b=keys[after<0?keys.length-1:after];
    const t=Math.max(0,Math.min(1,(sim.battleClock-seconds(a.clock))/(seconds(b.clock)-seconds(a.clock)||1)));
    const alt=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.altitudeDeg,b.altitudeDeg,t));
    const az=THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.azimuthDeg,b.azimuthDeg,t));
    const p=sim.player;this.sun.target.position.set(p.x,p.y,p.z);
    this.sun.position.set(p.x+Math.sin(az)*Math.cos(alt)*200,p.y+Math.sin(alt)*200,p.z-Math.cos(az)*Math.cos(alt)*200);
    this.sun.intensity=Math.max(.12,Math.sin(alt)*3.5);this.sun.castShadow=alt>0;
    const daylight=Math.max(0,Math.min(1,(alt+.08)/.4));this.skyLight.intensity=1.1+daylight*.9;
    this.scene.background=new THREE.Color('#738393').lerp(new THREE.Color('#adb9bc'),daylight);this.scene.fog.color.copy(this.scene.background);
  }
  render(sim){
    this.syncSolids(sim.world);const state=sim.renderState,time=sim.clock,dt=Math.min(.05,Math.max(0,time-this.lastClock));this.lastClock=time;
    for(const kit of this.kit)for(const piece of kit.pieces){const s=state.parts[piece.name];piece.node.visible=Boolean(s&&s.visible&&s.lod===kit.file.lod);}
    this.updateActors(sim.actors,time);this.syncDamage(sim,state);this.lighting(sim);
    this.train.visible=state.train963;this.panzerzug.visible=state.panzerzug;
    const planes=state.stukas;
    this.planes.forEach((p,i)=>{p.visible=planes;p.position.set(80+Math.sin(time*.02+i)*250,160+i*20,240-time%90*4+i*30);p.rotation.y=.1;});
    this.raidPlane.visible=state.secondRaid;this.raidPlane.position.set(-700,1100,800-(time%150)*8);
    const player=sim.player,eye=eyePosition(player),dir=aimDirection(player.angle,player.pitch);
    const bob=player.moveBlend*Math.sin(time*(player.sprinting?14:9))*.014;
    const shake=time<this.shakeUntil?Math.sin(time*85)*.012:0;
    this.camera.position.set(eye.x,eye.y+bob+shake,eye.z);this.camera.lookAt(eye.x+dir.x,eye.y+bob+shake+dir.y,eye.z+dir.z);
    const width=this.owner.canvas.clientWidth,height=this.owner.canvas.clientHeight,aspect=width/height;
    const fov=player.aiming?48:70;
    this.camera.aspect=this.weaponCamera.aspect=aspect;this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,fov,Math.min(1,dt*12));
    this.camera.updateProjectionMatrix();this.weaponCamera.updateProjectionMatrix();
    const w=sim.weapon,reload=w.reloadProgress(time*1000),bolt=w.boltCycling?Math.min(1,(time*1000-w.started)/1050):0;
    this.weaponRoot.position.set(player.aiming?0:.20,player.aiming?-.11:-.24,-.60);
    this.weaponRoot.position.y+=Math.abs(bob)-Math.sin(reload*Math.PI)*.10;
    this.weaponRoot.position.z+=Math.max(0,.055*(1-(time*1000-player.weaponShotAt)/160));
    this.weaponRoot.rotation.set(Math.sin(reload*Math.PI)*.18,0,player.sprinting?.1:0);
    this.weaponRoot.visible=state.weaponVisible;
    this.bolt.position.z=Math.sin(bolt*Math.PI)*.065;this.bolt.rotation.z=bolt>0&&bolt<.85?-.9:0;
    this.clip.visible=w.state==='RELOAD_CLIP'&&reload>.2&&reload<.85;this.clip.position.y=.08-Math.sin(reload*Math.PI)*.13;
    this.loadingHand.position.set(-.055+Math.sin(reload*Math.PI)*.06,-.04+Math.sin(reload*Math.PI)*.16,-.2+Math.sin(reload*Math.PI)*.15);
    this.flash.visible=time<this.flashUntil;
    this.engine.info.autoReset=false;this.engine.info.reset();this.engine.clear();this.engine.render(this.scene,this.camera);
    this.engine.clearDepth();this.engine.render(this.weaponScene,this.weaponCamera);
  }
  muzzle(clock){this.flashUntil=clock+.06;this.shakeUntil=clock+.1;}
  blast(clock){this.shakeUntil=clock+.4;}
  resetEffects(){this.flashUntil=0;this.shakeUntil=0;this.lastClock=0;}
  get diagnostics(){return {models:this.kit.map(k=>k.file.file),assetFailures:this.assets.failures,
    visiblePieces:this.kit.reduce((n,k)=>n+k.pieces.filter(p=>p.node.visible).length,0)};}
  dispose(){
    this.disposed=true;this.assets.dispose();this.geometry.forEach(g=>g.dispose());Object.values(this.materials).forEach(m=>m.dispose());
    this.scene.traverse(n=>{if(n.isInstancedMesh)n.dispose();});this.scene.clear();this.weaponScene.clear();
  }
}
