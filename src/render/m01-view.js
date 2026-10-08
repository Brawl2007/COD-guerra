import * as THREE from 'three';
import { AssetManager } from '../assets/asset-manager.js';
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import { eyePosition, aimDirection } from '../world/spatial.js';
import { seconds } from '../game/m01-simulation.js';
import { roundPoint } from '../game/m01-fire.js';
import { m01StukaPosition, m01RaidPlanePosition } from '../world/m01-aircraft-path.js';
import { actorPose } from './m01-actor-pose.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { texturedSurface,weatheredBridgeSurface } from './m01-surfaces.js';
import { M01Atmosphere, visualNoise } from './m01-atmosphere.js';
import { M01Environment } from './m01-environment.js';
import { M01Characters } from './m01-characters.js';
import { M01ViewModel } from './m01-viewmodel.js';
import { M01TrainWagons } from './m01-train-wagons.js';
import { M01YardWagons, yardWagonFireDamage } from './m01-yard-wagons.js';
import { M01Locomotive } from './m01-locomotive.js';
import { M01Panzerzug } from './m01-panzerzug.js';
import {JU87_LOD_DISTANCES,JU87_QUALITY_FLOOR,ju87Attitude,ju87Fade,ju87HeardAt,ju87PropellerTime,selectJu87Level,ju87SkyEnvironment,instanceJu87Materials,setJu87Fade} from './m01-aircraft.js';
import {soldierVisualVariant} from './m01-soldier-variation.js';
import { M01CombatFeedback } from './m01-combat-feedback.js';
import {M01BridgePortalPolish,bridgeMaterialSlot} from './m01-bridge-portal-polish.js';
import {M01BridgeStructure,M01_TRACK_CENTRES} from './m01-bridge-structure.js';

export const M01_BATTLEFIELD_FX_LIMITS=Object.freeze({bursts:16,flash:16,core:48,fire:96,smoke:128,dust:128,shards:96,lights:1});
const FX_DENSITY={low:.55,medium:.78,high:1};
const fxSeed=(p,clock)=>((Math.floor((p.x+2048)*73)^Math.floor(((p.y??0)+128)*151)^Math.floor((p.z+2048)*197)^Math.floor(clock*1000))>>>0);
const fxCount=(n,quality)=>Math.max(1,Math.round(n*(FX_DENSITY[quality]??FX_DENSITY.low)));

// Presentation only: all actors, visible pieces, damage and clocks come from M01Simulation.
// Original procedural art: textured environment and articulated humans; final scanned/rigged art remains pending.
export class M01View {
  constructor(renderer){
    this.owner=renderer;this.engine=renderer.engine;this.assets=new AssetManager();this.disposed=false;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#a0a7a8',420,2800);
    this.camera=new THREE.PerspectiveCamera(70,1,.05,7500);this.weaponCamera=new THREE.PerspectiveCamera(58,1,.03,6);
    this.weaponScene=new THREE.Scene();this.weaponRoot=new THREE.Group();this.weaponScene.add(this.weaponRoot);
    this.weaponScene.add(new THREE.HemisphereLight('#bfd0d5','#58422d',2.7));
    this.skyLight=new THREE.HemisphereLight('#bac9d5','#625846',1.25);this.scene.add(this.skyLight);
    this.sun=new THREE.DirectionalLight('#ffd6a0',.45);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:.5,far:450});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.025;
    this.scene.add(this.sun,this.sun.target);
    this.weaponScene.add(new THREE.DirectionalLight('#ffe0b0',2));
    this.materials={
      ground:texturedSurface('soil',{worldScale:.42}),
      earth:texturedSurface('soil',{worldScale:.65}),
      stone:texturedSurface('stone',{worldScale:.5}),
      brick:texturedSurface('brick',{worldScale:1.4}),
      wood:texturedSurface('wood',{bump:.015}),
      metal:texturedSurface('metal',{bump:.012}),
      leather:texturedSurface('leather',{bump:.025}),
      dark:new THREE.MeshStandardMaterial({color:'#202622',roughness:.8}),
      skin:texturedSurface('skin',{bump:.006}),
      brass:new THREE.MeshStandardMaterial({color:'#bfa66a',roughness:.55,metalness:.6}),
      water:texturedSurface('water',{worldScale:.12,bump:.02}),
      cloth:texturedSurface('cloth',{bump:.018}),
      bridgeBrick:weatheredBridgeSurface('brick',{worldScale:.36,bump:.055,seed:1912}),
      bridgeStone:weatheredBridgeSurface('stone',{worldScale:.5,bump:.07,seed:1857}),
      bridgeGate:weatheredBridgeSurface('wood',{worldScale:1.0,bump:.025,seed:963,roughness:.9,metalness:.05}),
      // Painted truss steel reads as paint (dielectric, grey-green, weathered), not bare black metal. Colour of 1939 uncertain.
      bridgeSteel:weatheredBridgeSurface('metal',{worldScale:.8,bump:.018,seed:1891,roughness:.66,metalness:.15,color:'#d2d9d0'}),
      glow:new THREE.MeshBasicMaterial({color:'#ffb14b',toneMapped:false}),
      smoke:new THREE.MeshBasicMaterial({color:'#454744',transparent:true,opacity:.3,depthWrite:false}),
      dust:new THREE.MeshBasicMaterial({color:'#7d6f5c',transparent:true,opacity:.42,depthWrite:false})};
    this.box=new THREE.BoxGeometry(1,1,1);this.sphere=new THREE.SphereGeometry(1,20,14);this.roundBox=new RoundedBoxGeometry(1,1,1,2,.12);this.accessoryBox=new RoundedBoxGeometry(1,1,1,1,.10);
    this.featureSphere=new THREE.SphereGeometry(1,10,7);
    this.helmetGeometry=new THREE.SphereGeometry(1,20,8,0,Math.PI*2,0,Math.PI/2);
    this.cylinder=new THREE.CylinderGeometry(1,1,1,12);this.geometry=[this.box,this.sphere,this.cylinder,this.roundBox,this.accessoryBox,this.helmetGeometry,this.featureSphere];
    this.kit=[];this.batches=new Map();this.solidGroup=new THREE.Group();this.effects=new THREE.Group();
    this.scene.add(this.solidGroup,this.effects);this.smokes=new Map();this.grenadeViews=new Map();this.world=null;this.revision=-1;
    this.flashUntil=0;this.shakeUntil=0;this.lastClock=0;this.bursts=[];this.impacts=[];this.fx={muzzle:0,tracer:0,puff:0,spark:0,smoke:0,chip:0};this.muzzlePresentation={frames:0,lastClock:null,lastFrame:null};
    this.battlefieldFxCounts={flash:0,core:0,fire:0,smoke:0,dust:0,shard:0};
    this.combatFeedback=new M01CombatFeedback();
    this.portalPolish=new M01BridgePortalPolish({stone:this.materials.bridgeStone});
    this.bridgeStructure=new M01BridgeStructure({steel:this.materials.bridgeSteel,rail:this.materials.metal,timber:this.materials.wood,stone:this.materials.bridgeStone});
    this.atmosphere=new M01Atmosphere(this.scene);
    this.createWeapon();this.createActors();this.createContactShadows();this.createFireEffects();this.createAircraft();this.createTrains();
    this.characters=new M01Characters(this.scene);this.viewModel=new M01ViewModel(this.weaponScene,this.characters,this.atmosphere.texture);
    this.ready=Promise.all([this.loadKit(),this.characters.load(this.owner.quality),this.loadAircraft(),
      this.wagons.load(),this.yardWagons.load(),this.locomotive.load(),this.panzerzugArt.load()]);
  }
  mesh(shape,material,p,size,parent=this.scene){
    const m=new THREE.Mesh(this[shape],this.materials[material]);m.position.set(...p);m.scale.set(...size);
    m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  async loadKit(){
    await Promise.allSettled(manifest.files.filter(f=>typeof f.lod==='number').map(async(file)=>{
      try{
        const asset=await this.assets.load(file.file,file.file);if(this.disposed)return;
        const portalAsset=file.file.includes('portal_lisewo_1912');
        asset.scene.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;n.userData.m01SourceMaterial=n.material?.name;
          let cursor=n,context='';while(cursor){context+='|'+(cursor.name??'');cursor=cursor.parent;}
          const slot=bridgeMaterialSlot(n.material?.name,portalAsset||/portal|tower/i.test(context));
          const replacement=slot==='metal'&&n.material?.name==='steel_painted'?'bridgeSteel':slot;if(replacement)n.material=this.materials[replacement];
        }});
        const pieces=file.nodes.map(n=>({name:n.name,node:asset.scene.getObjectByName(n.name)})).filter(n=>n.node);
        for(const piece of pieces)this.portalPolish.attach(piece.node);
        this.bridgeStructure.attachKit(asset.scene,file);
        this.kit.push({file,root:asset.scene,pieces});this.scene.add(asset.scene);
      }catch(error){if(!this.disposed)console.warn(`Ponte M01: ${error.message}`);}
    }));
  }
  buildTerrain(world){
    this.world=world;
    const geometry=new THREE.PlaneGeometry(2000,650,400,130);geometry.rotateX(-Math.PI/2);geometry.translate(300,0,40);
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,world.terrainHeightAt(pos.getX(i),pos.getZ(i)));
    geometry.computeVertexNormals();this.geometry.push(geometry);
    const terrain=new THREE.Mesh(geometry,this.materials.ground);terrain.receiveShadow=true;this.scene.add(terrain);
    this.environment=new M01Environment(this.scene,world,this.materials);
    this.mesh('box','ground',[-900,-4,0],[400,.5,6500]);
    this.mesh('box','ground',[2050,-1.3,0],[1500,.5,6500]);
    this.mesh('box','ground',[665,-5.3,0],[790,.5,6500]);
    this.mesh('box','water',[145,-9.94,0],[240,.08,6500]);
    // Carris assentes no terreno, em troços de ~10 m numa só instância. A linha sudoeste não tem aterro no mapa:
    // desenhada à cota da polilinha, flutuava até 3 m acima da encosta e passava à altura dos olhos junto aos sapadores.
    const pieces=[];
    for(const name of ['rail_embankment_west','rail_line_southwest','rail_line_east']){const points=world.features.get(name).polyline;
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz);if(length>1800)continue;
        const n=Math.ceil(length/10);
        for(let k=0;k<n;k++)for(const centre of M01_TRACK_CENTRES[name])for(const offset of [centre-.72,centre+.72]){
          const x=a[0]+dx*(k+.5)/n-dz/length*offset,z=a[2]+dz*(k+.5)/n+dx/length*offset;
          pieces.push({x,y:world.heightAt(x,z)+.12,z,length:length/n+.05,angle:-Math.atan2(dz,dx)});
        }
      }
    }
    const tracks=new THREE.InstancedMesh(this.box,this.materials.metal,pieces.length),dummy=new THREE.Object3D();
    pieces.forEach((t,i)=>{dummy.position.set(t.x,t.y,t.z);dummy.rotation.set(0,t.angle,0);dummy.scale.set(t.length,.12,.08);dummy.updateMatrix();tracks.setMatrixAt(i,dummy.matrix);});
    tracks.receiveShadow=true;tracks.computeBoundingSphere();this.scene.add(tracks);
    // Station openings and their closed visual shells belong to M01Environment.
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
      if(b.id==='station'&&this.environment?.station?.ready)continue; // Visual replacement; collider remains in world.
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
    for(const [name,shape,material]of [['torso','roundBox','cloth'],['head','sphere','skin'],['helmet','helmetGeometry','metal'],
      ['limbs','cylinder','cloth'],['boots','accessoryBox','dark'],['rifle','accessoryBox','wood'],['flash','sphere','glow'],
      ['hands','featureSphere','skin'],['nose','featureSphere','skin'],['eyes','featureSphere','dark'],['ears','featureSphere','skin'],
      ['belt','accessoryBox','leather'],['pack','accessoryBox','cloth'],['pouches','accessoryBox','leather'],['buttons','featureSphere','brass'],['barrel','cylinder','metal'],['brim','featureSphere','metal'],['farHead','featureSphere','skin']]){
      const capacity={limbs:720,boots:180,hands:270,eyes:450,ears:180,pouches:360,buttons:540}[name]??90;
      const batch=new THREE.InstancedMesh(this[shape],this.materials[material],capacity);
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.frustumCulled=false;
      batch.castShadow=name!=='flash';batch.receiveShadow=true;this.scene.add(batch);this.batches.set(name,batch);
    }
  }
  createContactShadows(){
    const geometry=new THREE.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);this.geometry.push(geometry);
    this.contactMaterial=new THREE.MeshBasicMaterial({map:this.atmosphere.texture,color:0x000000,transparent:true,opacity:.24,
      depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    this.contactShadows=new THREE.InstancedMesh(geometry,this.contactMaterial,90);
    this.contactShadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.contactShadows.count=0;this.contactShadows.frustumCulled=false;this.scene.add(this.contactShadows);
  }
  updateActors(actors,time,player={x:0,z:0},battleClock){
    const skinned=this.characters?.update(actors,time,player,this.owner.quality,battleClock)??new Set();
    const counts={},dummy=new THREE.Object3D(),root=new THREE.Object3D(),matrix=new THREE.Matrix4();
    const up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),tint=new THREE.Color();
    this.actorPoses={standing:0,crouched:0,pinned:0,seated:0,wounded:0,carried:0,fallen:0,prone:0};
    this.actorAnimations={aiming:0,firing:0,moving:0,underFire:0};
    let pivot=0,shadowCount=0;
    const put=(name,p,size,color,bone=null)=>{
      const batch=this.batches.get(name),i=counts[name]??0;counts[name]=i+1;
      dummy.position.set(p[0],p[1]-pivot,p[2]);dummy.scale.set(...size);dummy.quaternion.identity();
      if(bone?.from){direction.set(bone.to[0]-bone.from[0],bone.to[1]-bone.from[1],bone.to[2]-bone.from[2]).normalize();dummy.quaternion.setFromUnitVectors(up,direction);}
      else if(bone?.roll)dummy.rotation.z=bone.roll;
      dummy.updateMatrix();batch.setMatrixAt(i,matrix.multiplyMatrices(root.matrix,dummy.matrix));
      if(color)batch.setColorAt(i,tint.set(color));
    };
    for(const a of actors){
      if(!a.active)continue;
      const pose=actorPose(a,time);this.actorPoses[pose.name]++;pivot=pose.root.pivotY;
      for(const key of Object.keys(this.actorAnimations))if(pose[key])this.actorAnimations[key]++;
      if(this.contactShadows&&!a.carriedBy&&Math.hypot(a.x-player.x,a.z-player.z)<90){
        dummy.position.set(a.x,a.y+.018,a.z);dummy.rotation.set(0,-a.facing,0);dummy.scale.set(pose.name==='fallen'||pose.name==='wounded'?1.8:.7,1,.8);dummy.updateMatrix();
        this.contactShadows.setMatrixAt(shadowCount++,dummy.matrix);
      }
      if(skinned.has(a.id))continue;
      root.position.set(a.x,a.y+pose.root.offsetY,a.z);
      root.rotation.set(pose.root.pitch,-a.facing,pose.root.roll,'YXZ');root.updateMatrix();
      const visual=!a.civilian&&this.characters?.visuals?soldierVisualVariant(a):null;
      const cloth=a.civilian?'#404c56':visual?'#'+visual.proxyCloth:a.team==='enemy'?'#b4c0b7':'#c9bea0',
        helmet=visual?'#'+visual.proxyHelmet:a.team==='enemy'?'#465252':'#635f47',skin=visual?'#'+visual.proxySkin:'#ffffff';
      const [hx,hy,hz]=pose.head,[tx,ty,tz]=pose.torso.position;
      const near=Math.hypot(a.x-player.x,a.z-player.z)<45;
      put('torso',pose.torso.position,pose.prone?pose.torso.size:[.30,pose.torso.size[1],.46],cloth,{roll:pose.torso.roll});put(near?'head':'farHead',pose.head,[.125,.18,.137],skin);
      put('helmet',[hx,hy+.105,hz],[.175,.14,.188],helmet);
      put('brim',[hx+.01,hy+.12,hz],[.186,.022,.2],helmet);
      if(near){put('nose',[hx+.126,hy+.005,hz],[.020,.039,.022],skin);
      put('eyes',[hx+.121,hy-.064,hz],[.004,.002,.021]);
      for(const side of [-1,1]){
        put('eyes',[hx+.112,hy+.055,hz+side*.066],[.008,.0045,.012]);
        put('ears',[hx,hy,hz+side*.137],[.026,.044,.017],skin);
        put('eyes',[hx+.109,hy+.077,hz+side*.067],[.006,.002,.020]);
      }
      if(!a.civilian){
        put('belt',[tx+.002,ty-.19,tz],[.319,.073,.48]);
        put('pack',[tx-.23,ty+.005,tz],[.18*(visual?.pack??1),.35,.32*(visual?.pack??1)],cloth);
        for(const side of [-1,1])for(let i=0;i<2;i++)put('pouches',[tx+.185,ty-.13,tz+side*(.09+i*.08)],[.082,.13,.072]);
        for(let i=0;i<5;i++)put('buttons',[tx+.156,ty+.20-i*.08,tz],[.009,.009,.009]);
      }}
      for(const bone of pose.limbs){
        const midpoint=bone.from.map((v,i)=>(v+bone.to[i])/2),length=Math.hypot(...bone.from.map((v,i)=>v-bone.to[i]));
        put('limbs',midpoint,[bone.radius,length,bone.radius],cloth,bone);
      }
      for(const foot of pose.boots)put('boots',foot,[.25,.11,.16]);
      if(near)put('hands',[hx-.005,hy-.17,hz],[.058,.072,.060],skin);
      if(near)for(const i of [3,7])put('hands',pose.limbs[i].to,[.043,.066,.048],skin);
      if(!a.civilian&&a.role!=='MEDIC'){
        put('rifle',pose.rifle.position,[.82,.095,.06],null,{roll:pose.rifle.pitch});
        const from=pose.rifle.barrelFrom,to=pose.rifle.muzzle;
        put('barrel',from.map((v,i)=>(v+to[i])/2),[.012,.57,.012],null,{from,to});
      }
      if(pose.firing)put('flash',pose.rifle.muzzle,a.weapon==='mg34'?[.6,.18,.18]:[.2,.07,.07]);
    }
    for(const [name,batch]of this.batches){batch.count=counts[name]??0;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
    if(this.contactShadows){this.contactShadows.count=shadowCount;this.contactShadows.instanceMatrix.needsUpdate=true;}
  }
  createFireEffects(){
    // Bounded presentation pools: muzzle/round impacts plus layered battlefield blasts. No gameplay RNG is consumed here.
    this.materials.flash=new THREE.MeshBasicMaterial({color:'#ffd98c',toneMapped:false,fog:false});
    this.materials.tracer=new THREE.MeshBasicMaterial({color:'#ffb35a',toneMapped:false,fog:false});
    this.materials.puff=new THREE.MeshBasicMaterial({color:'#8c7c66',transparent:true,opacity:.62,depthWrite:false});
    this.materials.gunSmoke=new THREE.MeshBasicMaterial({color:'#b9b8ae',transparent:true,opacity:.55,depthWrite:false,fog:false});
    this.materials.chip=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.88,vertexColors:true});
    this.materials.blastShard=new THREE.MeshStandardMaterial({color:'#5c5142',roughness:1,vertexColors:true});
    this.fireBatches={};this.fireDummy=new THREE.Object3D();this.fireColor=new THREE.Color();
    for(const [name,material,capacity]of [['muzzle','flash',96],['tracer','tracer',48],['puff','puff',144],['spark','flash',96],['smoke','gunSmoke',64],['chip','chip',128]]){
      const soft=name==='smoke'||name==='puff',geometry=name==='chip'?this.atmosphere.debrisGeometry:this.sphere;
      const batch=soft?this.atmosphere.billboardBatch(capacity,this.materials[material].color,this.effects):
        new THREE.InstancedMesh(geometry,this.materials[material],capacity);
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.frustumCulled=false;this.effects.add(batch);this.fireBatches[name]=batch;
    }
    this.battlefieldFxBatches={};this.battlefieldDummy=new THREE.Object3D();this.battlefieldColor=new THREE.Color();
    for(const [name,capacity,color]of [
      ['flash',M01_BATTLEFIELD_FX_LIMITS.flash,'#fff0c2'],['core',M01_BATTLEFIELD_FX_LIMITS.core,'#ffc45d'],
      ['fire',M01_BATTLEFIELD_FX_LIMITS.fire,'#e97831'],['smoke',M01_BATTLEFIELD_FX_LIMITS.smoke,'#4e4b45'],['dust',M01_BATTLEFIELD_FX_LIMITS.dust,'#8d7c67']]){
      const batch=this.atmosphere.billboardBatch(capacity,color,this.effects);batch.count=0;this.battlefieldFxBatches[name]=batch;
    }
    this.battlefieldShards=new THREE.InstancedMesh(this.atmosphere.debrisGeometry,this.materials.blastShard,M01_BATTLEFIELD_FX_LIMITS.shards);
    this.battlefieldShards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.battlefieldShards.count=0;this.battlefieldShards.frustumCulled=false;this.effects.add(this.battlefieldShards);
    this.explosionLight=new THREE.PointLight('#ff9e45',0,80,2);this.explosionLight.visible=false;this.explosionLight.castShadow=false;this.effects.add(this.explosionLight);
  }
  updateFire(sim){
    const time=sim.clock,cam=this.camera.position,dummy=this.fireDummy,counts={muzzle:0,tracer:0,puff:0,spark:0,smoke:0,chip:0};
    const far=p=>Math.hypot(p.x-cam.x,p.y-cam.y,p.z-cam.z);
    const put=(name,p,scale,dir=null,opacity=1,color=null)=>{
      const batch=this.fireBatches[name],index=counts[name];if(index>=batch.instanceMatrix.count)return;
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);
      if(dir){dummy.lookAt(p.x+dir.x,p.y+dir.y,p.z+dir.z);dummy.scale.set(scale[0],scale[1],scale[2]);}
      else if(Array.isArray(scale))dummy.scale.set(...scale);else dummy.scale.setScalar(scale);
      dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);
      batch.geometry.attributes.puffOpacity?.setX(index,opacity);if(color)batch.setColorAt(index,this.fireColor.set(color));counts[name]++;
    };
    const root=new THREE.Object3D(),muzzle=new THREE.Vector3();
    for(const a of sim.actors)if(a.team==='enemy'&&a.alive&&a.active){
      const age=time-(a.firedAt??-1e9);if(a.shot<=0&&age>2.2)continue;
      const pose=actorPose(a,time);root.position.set(a.x,a.y+pose.root.offsetY,a.z);
      root.rotation.set(pose.root.pitch,-a.facing,pose.root.roll,'YXZ');root.updateMatrix();
      muzzle.fromArray(pose.rifle.muzzle);muzzle.y-=pose.root.pivotY;muzzle.applyMatrix4(root.matrix);
      const skinnedMuzzle=this.characters?.muzzle(a.id);if(skinnedMuzzle)muzzle.copy(skinnedMuzzle);
      const p={x:muzzle.x,y:muzzle.y,z:muzzle.z},d=far(p);
      if(a.mg34Prone?pose.firing:(pose.firing||pose.aiming&&age>=0&&age<.25))put('muzzle',p,Math.max(.12,d*.008)*(.8+.2*Math.sin(time*90)));
      if(age>=0&&age<2.2){const k=age/2.2;put('smoke',{x:p.x,y:p.y+.4+k*1.6,z:p.z},Math.max(.25,d*.007)*(.6+k*.8)*(1-k*k),null,.65*(1-k));}
    }
    for(const r of sim.enemyFire.rounds){
      const t=(time-r.firedAt)/(r.arriveAt-r.firedAt);if(!r.tracer||t<0||t>1)continue;
      const p=roundPoint(r,t),q=roundPoint(r,Math.min(1.02,t+.01)),len=Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)||1,d=far(p);
      put('tracer',p,[Math.max(.025,d*.0016),Math.max(.025,d*.0016),Math.max(.6,d*.012)],{x:(q.x-p.x)/len,y:(q.y-p.y)/len,z:(q.z-p.z)/len});
    }
    this.impacts=this.impacts.filter(i=>time-i.start<1.05&&time>=i.start);
    for(const i of this.impacts){
      const age=time-i.start,d=far(i),seed=i.seed,quality=this.owner.quality,dustColor=i.material==='wood'?'#98744f':i.material==='stone'?'#b9b09c':'#8b7658';
      if(i.material==='metal'&&age<.18){
        const n=fxCount(5,quality);for(let j=0;j<n;j++){const a=visualNoise(seed,j*3)*Math.PI*2,r=(.12+age*3)*(1+visualNoise(seed,j*3+1));
          put('spark',{x:i.x+Math.cos(a)*r,y:i.y+.04+age*(.8+visualNoise(seed,j*3+2)*1.8),z:i.z+Math.sin(a)*r},Math.max(.035,d*.0018)*(1-age/.18));}
      }
      if(i.material!=='metal'){
        const life=i.material==='earth'?.95:.8,k=age<.12?age/.12:Math.max(0,1-(age-.12)/(life-.12)),n=fxCount(i.material==='earth'?4:3,quality);
        for(let j=0;j<n&&k>0;j++){const a=visualNoise(seed,30+j*3)*Math.PI*2,r=age*(.3+visualNoise(seed,31+j*3)*1.7),s=Math.max(.28,d*.0032)*(.65+visualNoise(seed,32+j*3)*.65)*Math.max(.1,k);
          put('puff',{x:i.x+Math.cos(a)*r,y:i.y+.15+age*(.35+visualNoise(seed,40+j)*.8),z:i.z+Math.sin(a)*r},s,null,.58*k,dustColor);}
      }
      if((i.material==='wood'||i.material==='stone')&&age<.72){
        const n=fxCount(i.material==='wood'?6:4,quality);for(let j=0;j<n;j++){const a=visualNoise(seed,70+j*3)*Math.PI*2,v=.7+visualNoise(seed,71+j*3)*2.4,s=(.045+visualNoise(seed,72+j*3)*.075)*Math.max(.18,1-age/.72);
          put('chip',{x:i.x+Math.cos(a)*v*age,y:i.y+.08+(1.1+visualNoise(seed,100+j)*1.8)*age-2.8*age*age,z:i.z+Math.sin(a)*v*age},[s,s*(.45+visualNoise(seed,120+j)*.5),s*.75],null,1,i.material==='wood'?'#9a6d3f':'#c6bfaf');}
      }
    }
    for(const [name,batch]of Object.entries(this.fireBatches)){batch.count=counts[name];batch.instanceMatrix.needsUpdate=true;
      if(batch.instanceColor)batch.instanceColor.needsUpdate=true;if(batch.geometry.attributes.puffOpacity)batch.geometry.attributes.puffOpacity.needsUpdate=true;}
    this.fx=counts;
  }
  updateBattlefieldFx(state,time){
    this.bursts=this.bursts.filter(b=>time>=b.start&&time-b.start<6.5);
    const counts={flash:0,core:0,fire:0,smoke:0,dust:0},dummy=this.battlefieldDummy,quality=this.owner.quality;let shardCount=0,strongest=null;
    const put=(name,p,sx,sy,opacity,color)=>{const batch=this.battlefieldFxBatches[name],index=counts[name];if(index>=batch.instanceMatrix.count)return;
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(sx,sy,1);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);
      batch.geometry.attributes.puffOpacity.setX(index,opacity);batch.setColorAt(index,this.battlefieldColor.set(color));counts[name]++;};
    for(const b of this.bursts){
      const age=time-b.start,match=state.damage.find(d=>Math.abs(d.started-b.start)<.08&&Math.hypot(d.x-b.x,d.z-b.z)<2),id=match?.id??'';
      const kind=id.endsWith('_demolition')?'demolition':b.aerial||/bomb|raid/.test(id)?'bombing':'small';
      const profile=kind==='demolition'?{scale:28,duration:5.8,fire:.95,dust:1.55}:kind==='bombing'?{scale:18,duration:4.5,fire:.78,dust:1.25}:{scale:9,duration:3.1,fire:.62,dust:.95};
      if(age>0&&age<.09){const k=1-age/.09;put('flash',{x:b.x,y:b.y+profile.scale*.18,z:b.z},profile.scale*(1+age*8),profile.scale*(.72+age*5),.92*k,'#fff3cf');}
      if(age>=0&&age<.34){const n=fxCount(3,quality);for(let j=0;j<n;j++){const n0=visualNoise(b.seed,j*4),n1=visualNoise(b.seed,j*4+1),a=n0*Math.PI*2,r=profile.scale*(.04+age*.24)*n1,k=Math.max(0,1-age/.34),s=profile.scale*(.18+age*.72)*(.65+visualNoise(b.seed,j*4+2)*.55);
        put('core',{x:b.x+Math.cos(a)*r,y:b.y+profile.scale*.12+Math.sin(a*1.7)*r*.18,z:b.z+Math.sin(a)*r},s,s*(.72+visualNoise(b.seed,j*4+3)*.5),.9*k,j%2?'#ffb43f':'#ffd36b');}}
      if(age>=.06&&age<profile.fire){const n=fxCount(kind==='demolition'?10:kind==='bombing'?8:6,quality),t=(age-.06)/(profile.fire-.06);
        for(let j=0;j<n;j++){const n0=visualNoise(b.seed,40+j*4),n1=visualNoise(b.seed,41+j*4),a=n0*Math.PI*2,r=profile.scale*(.10+.40*t)*(.35+n1*.8),rise=profile.scale*(.12+.32*t)*(1+visualNoise(b.seed,42+j*4)*.5),s=profile.scale*(.16+.42*Math.sin(Math.min(1,t)*Math.PI))*(.58+visualNoise(b.seed,43+j*4)*.7);
          put('fire',{x:b.x+Math.cos(a)*r,y:b.y+rise,z:b.z+Math.sin(a)*r},s,s*(.78+n1*.5),.78*(1-t),j%3===0?'#ffd15a':j%2?'#ff9b3f':'#df622d');}}
      if(age>=.08&&age<profile.dust){const n=fxCount(kind==='demolition'?10:kind==='bombing'?8:5,quality),t=(age-.08)/(profile.dust-.08);
        for(let j=0;j<n;j++){const n0=visualNoise(b.seed,100+j*3),n1=visualNoise(b.seed,101+j*3),a=(j/n)*Math.PI*2+n0*.8,r=profile.scale*(.10+.62*t)*(.65+n1*.5),sx=profile.scale*(.12+.22*t)*(.65+visualNoise(b.seed,102+j*3)*.6);
          put('dust',{x:b.x+Math.cos(a)*r,y:b.y+.18+profile.scale*.035*t,z:b.z+Math.sin(a)*r},sx,sx*(.38+n0*.28),.55*(1-t),kind==='demolition'?'#9a876d':'#a18e75');}}
      if(age>=.22&&age<profile.duration){const n=fxCount(kind==='demolition'?12:kind==='bombing'?9:6,quality),t=(age-.22)/(profile.duration-.22);
        for(let j=0;j<n;j++){const n0=visualNoise(b.seed,170+j*4),n1=visualNoise(b.seed,171+j*4),a=n0*Math.PI*2,r=profile.scale*(.08+.30*t)*(.5+n1*.8),rise=profile.scale*(.16+.72*t)*(1+visualNoise(b.seed,172+j*4)*.3),s=profile.scale*(.13+.42*t)*(.65+visualNoise(b.seed,173+j*4)*.65);
          put('smoke',{x:b.x+Math.cos(a)*r+age*(.25+n1*.4),y:b.y+rise,z:b.z+Math.sin(a)*r},s,s*(.85+n0*.55),.58*(1-t)*(t<.12?t/.12:1),t<.35?'#514943':t<.7?'#5c5953':'#73716b');}}
      if(age>=.03&&age<1.15){const n=fxCount(kind==='demolition'?14:kind==='bombing'?10:7,quality);for(let j=0;j<n&&shardCount<M01_BATTLEFIELD_FX_LIMITS.shards;j++){const n0=visualNoise(b.seed,260+j*4),n1=visualNoise(b.seed,261+j*4),n2=visualNoise(b.seed,262+j*4),a=n0*Math.PI*2,v=(kind==='demolition'?14:kind==='bombing'?10:6)*(.45+n1*.8);
        dummy.position.set(b.x+Math.cos(a)*v*age,b.y+.2+(4+n2*8)*age-4.9*age*age,b.z+Math.sin(a)*v*age);dummy.rotation.set(age*(3+j),a,age*(5+n0*4));const s=(.06+n2*.16)*(kind==='demolition'?1.25:1)*Math.max(.15,1-age/1.15);
        dummy.scale.set(s,s*(.45+n0*.55),s*(.7+n1*.5));dummy.updateMatrix();this.battlefieldShards.setMatrixAt(shardCount,dummy.matrix);this.battlefieldShards.setColorAt(shardCount,this.battlefieldColor.set(j%3?'#5b5042':'#81705b'));shardCount++;}}
      if(age>=0&&age<.22){const power=profile.scale*(1-age/.22);if(!strongest||power>strongest.power)strongest={b,power,profile};}
    }
    for(const [name,batch]of Object.entries(this.battlefieldFxBatches)){batch.count=counts[name];batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;batch.geometry.attributes.puffOpacity.needsUpdate=true;}
    this.battlefieldShards.count=shardCount;this.battlefieldShards.instanceMatrix.needsUpdate=true;if(this.battlefieldShards.instanceColor)this.battlefieldShards.instanceColor.needsUpdate=true;
    this.explosionLight.visible=Boolean(strongest);if(strongest){this.explosionLight.position.set(strongest.b.x,strongest.b.y+3,strongest.b.z);this.explosionLight.intensity=Math.min(5,strongest.power*.18);this.explosionLight.distance=Math.min(110,35+strongest.profile.scale*2.4);}
    this.battlefieldFxCounts={...counts,shard:shardCount};
  }
  /** Impacto de um tiro alemão (evento round-impact da simulação): poeira/faísca/chips conforme a superfície. */
  impact(point,material,clock){this.impacts.push({x:point.x,y:point.y,z:point.z,material:material??'earth',start:clock,seed:fxSeed(point,clock)});if(this.impacts.length>96)this.impacts.shift();}
  createWeapon(){
    const r=this.weaponRoot;
    const profile=new THREE.Shape();profile.moveTo(-.44,-.105);profile.lineTo(-.44,.032);
    profile.bezierCurveTo(-.27,.029,-.16,.032,-.095,.025);profile.lineTo(.36,.022);
    profile.lineTo(.37,-.032);profile.lineTo(-.035,-.041);
    profile.bezierCurveTo(-.07,-.052,-.075,-.090,-.13,-.079);profile.lineTo(-.44,-.105);
    this.stock=new THREE.ExtrudeGeometry(profile,{depth:.055,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:8});
    this.stock.rotateY(Math.PI/2).translate(-.0275,0,0);this.geometry.push(this.stock);
    this.mesh('stock','wood',[0,0,0],[1,1,1],r);
    this.mesh('roundBox','dark',[0,-.045,.44],[.073,.13,.022],r);
    this.mesh('roundBox','metal',[0,-.09,.052],[.028,.022,.10],r);
    this.mesh('roundBox','metal',[0,-.066,.007],[.027,.055,.012],r);
    this.mesh('roundBox','metal',[0,-.066,.095],[.027,.055,.012],r);
    for(const z of [-.24,-.36])this.mesh('roundBox','metal',[0,.01,z],[.065,.065,.018],r);
    for(const z of [-.37,.32])this.mesh('roundBox','leather',[0,-.045,z],[.07,.012,.017],r);
    this.mesh('roundBox','leather',[.022,-.09,-.01],[.013,.010,.59],r);
    this.mesh('box','metal',[0,.045,-.02],[.048,.047,.22],r);
    const barrel=this.mesh('cylinder','metal',[0,.045,-.34],[.012,.59,.012],r);barrel.rotation.x=Math.PI/2;
    this.mesh('box','metal',[0,.102,-.06],[.045,.012,.012],r);
    this.mesh('box','metal',[-.019,.115,-.06],[.008,.025,.01],r);this.mesh('box','metal',[.019,.115,-.06],[.008,.025,.01],r);
    this.mesh('box','metal',[0,.11,-.60],[.009,.025,.015],r);
    this.bolt=new THREE.Group();r.add(this.bolt);this.mesh('box','metal',[.058,.033,.02],[.055,.012,.012],this.bolt);
    this.mesh('sphere','metal',[.085,.015,.02],[.015,.015,.015],this.bolt);
    this.rightArm=this.mesh('cylinder','cloth',[.18,-.16,.23],[.055,.5,.055],r);this.rightArm.rotation.x=-1;
    this.leftArm=this.mesh('cylinder','cloth',[-.13,-.15,-.18],[.055,.46,.055],r);this.leftArm.rotation.x=-1;
    this.mesh('sphere','skin',[.055,-.06,.10],[.043,.055,.069],r);
    for(let i=0;i<4;i++){const finger=this.mesh('cylinder','skin',[.026,-.032-i*.016,.077],[.010,.060,.011],r);finger.rotation.z=-1.15;}
    const thumb=this.mesh('cylinder','skin',[.012,-.025,.116],[.013,.055,.013],r);thumb.rotation.x=.7;
    this.loadingHand=new THREE.Group();r.add(this.loadingHand);this.mesh('sphere','skin',[0,0,0],[.043,.052,.068],this.loadingHand);
    for(let i=0;i<4;i++){const finger=this.mesh('cylinder','skin',[.023,.032-i*.014,-.014],[.01,.057,.010],this.loadingHand);finger.rotation.z=.95;}
    this.clip=new THREE.Group();r.add(this.clip);
    for(let i=0;i<5;i++)this.mesh('cylinder','brass',[(i-2)*.012,.14,-.03],[.006,.075,.006],this.clip);
    this.flash=this.mesh('sphere','glow',[0,.045,-.65],[.045,.045,.15],r);this.flash.visible=false;
    // Bąk ao ombro: tronco e pernas atravessados à direita, mão esquerda a segurar; a caixa dos sapadores à frente.
    this.carryBody=new THREE.Group();this.weaponScene.add(this.carryBody);
    // Transporte ao ombro: na vista só se vêem as pernas à frente, no canto inferior direito, e a mão que as segura.
    for(const dx of [-.035,.035]){const leg=this.mesh('cylinder','cloth',[.27+dx,-.29,-.52],[.042,.34,.042],this.carryBody);leg.rotation.set(-.35,0,1.05);}
    for(const dx of [-.035,.035])this.mesh('box','dark',[.13+dx,-.36,-.6],[.05,.045,.09],this.carryBody);
    this.mesh('sphere','skin',[.33,-.25,-.47],[.04,.048,.055],this.carryBody);
    this.carryCrate=new THREE.Group();this.weaponScene.add(this.carryCrate);
    this.mesh('box','wood',[0,-.28,-.48],[.42,.24,.26],this.carryCrate);this.mesh('box','stone',[0,-.28,-.346],[.43,.04,.005],this.carryCrate);
    for(const x of [-.19,.19])this.mesh('sphere','skin',[x,-.2,-.42],[.05,.06,.07],this.carryCrate);
    this.carryBody.visible=this.carryCrate.visible=false;
  }
  createAircraft(){
    this.planes=[];this.aircraftSources=new Map();this.aircraftMixers=[];this.aircraftMaterials=[];this.aircraftRevision=0;
    for(let i=0;i<3;i++){
      const plane=new THREE.LOD(),proxy=new THREE.Group();plane.autoUpdate=false;proxy.userData.lod='proxy';this.scene.add(plane);
      this.mesh('box','dark',[0,0,0],[1.2,1.3,11],proxy);
      this.mesh('box','dark',[0,-.3,.2],[13.8,.18,2.5],proxy);
      this.mesh('box','dark',[0,.3,4],[4.4,.12,1.3],proxy);
      this.mesh('box','dark',[0,1,4],[.12,2,1.8],proxy);plane.addLevel(proxy,0);
      this.planes.push(plane);
    }
    this.raidPlane=new THREE.Group();this.scene.add(this.raidPlane);
    this.mesh('box','dark',[0,0,0],[1.4,1.8,15.8],this.raidPlane);
    this.mesh('box','dark',[0,0,0],[18,.3,3],this.raidPlane);
    for(const x of [-4,4])this.mesh('box','dark',[x,-.5,-.6],[1.3,1.5,3.7],this.raidPlane);
  }
  async loadAircraft(){
    await Promise.allSettled([0,1,2].map(async lod=>{
      const path=`assets/models/provisional/m01-aircraft/m01_ju87_b1_lod${lod}.glb`;
      try{
        const asset=await this.assets.load(`ju87:${lod}`,path);
        if(!this.disposed)this.aircraftSources.set(lod,asset);
      }catch{/* The existing silhouette keeps the raid visible when optional art is unavailable. */}
    }));
    if(this.disposed||!this.aircraftSources.size)return;
    const sky=this.aircraftSky??=ju87SkyEnvironment();
    this.planes.forEach((plane,i)=>{
      plane.clear();plane.levels.length=0;plane.userData.level=null;
      for(const lod of [0,1,2]){
        const source=this.aircraftSources.get(lod);if(!source)continue;
        const model=source.scene.clone(true);model.userData.lod=lod;
        // The raid's bomb type and individual releases are not established: keep the optional payload hidden.
        const bomb=model.getObjectByName('bomb_sc250');if(bomb)bomb.visible=false;
        model.userData.materials=instanceJu87Materials(model,i,sky);this.aircraftMaterials.push(...model.userData.materials);
        const mixer=new THREE.AnimationMixer(model),spin=source.animations.find(c=>c.name==='propeller_spin');
        if(spin)mixer.clipAction(spin).play();model.userData.propellerMixer=mixer;this.aircraftMixers.push(mixer);
        plane.addLevel(model,JU87_LOD_DISTANCES[lod]);
      }
      // Warm the aircraft programs and the sky PMREM now, so the raid's first visible frame does not stall.
      try{this.engine?.compileAsync?.(plane,this.camera,this.scene).catch(()=>{});}catch{/* Warm-up is optional. */}
    });
    this.aircraftRevision++;
  }
  updateAircraft(state,time,player,heardAt){
    const floor=JU87_QUALITY_FLOOR[this.owner.quality]??0,fade=ju87Fade(time,heardAt);
    this.planes.forEach((plane,i)=>{
      // The raid path and heading are unchanged; attitude, fade and LOD below are presentation only.
      const path=m01StukaPosition(time,i);plane.visible=state.stukas;plane.position.set(path.x,path.y,path.z);
      const {pitch,bank}=ju87Attitude(time,i);plane.rotation.set(pitch,.1,bank,'YXZ');
      const distance=Math.hypot(plane.position.x-player.x,plane.position.y-player.y,plane.position.z-player.z);
      const level=selectJu87Level(plane.levels,distance,floor,plane.userData.level),selected=plane.levels[level]?.object;
      plane.userData.level=level;plane.userData.fade=fade;
      // The selected level stays visible (and reported) at any fade; opacity/alpha hash do the hiding.
      for(const {object} of plane.levels)object.visible=object===selected;
      if(selected?.userData.materials)setJu87Fade(selected.userData.materials,fade);
      // Deterministic presentation at an estimated ~1500 rpm; pause and restore sample the same saved clock.
      selected?.userData.propellerMixer?.setTime(ju87PropellerTime(time,i));
    });
    const raid=m01RaidPlanePosition(time);this.raidPlane.visible=state.secondRaid;this.raidPlane.position.set(raid.x,raid.y,raid.z);
  }
  createTrains(){
    this.train=new THREE.Group();this.panzerzug=new THREE.Group();this.scene.add(this.train,this.panzerzug);
    this.locomotive=new M01Locomotive(this.train,this.assets,this.box,this.cylinder,this.materials.dark,this.materials.metal);
    this.wagons=new M01TrainWagons(this.train,this.assets,this.box,this.cylinder,this.materials.wood,this.materials.metal);
    this.yardWagons=new M01YardWagons(this.scene,this.assets,this.box,this.cylinder,this.materials.wood,this.materials.metal,this.atmosphere.texture);
    this.panzerzugArt=new M01Panzerzug(this.panzerzug,this.assets,this.box,this.cylinder,this.materials.metal);
  }
  syncDamage(sim,state){
    const yardFire=yardWagonFireDamage(sim.destruction,sim.world);
    this.atmosphere.update(yardFire?{...state,damage:[...state.damage,yardFire]}:state,sim.clock,this.owner.quality);
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
    this.sun.intensity=Math.max(.09,Math.sin(alt)*5.8);this.sun.castShadow=alt>0;
    const daylight=Math.max(0,Math.min(1,(alt+.08)/.4));this.skyLight.intensity=1.6+daylight*.22;
    this.scene.background=new THREE.Color('#727f8c').lerp(new THREE.Color('#a8b2b0'),daylight);this.scene.fog.color.copy(this.scene.background);
    this.engine.toneMappingExposure=1.08;
    this.sun.color.set('#ffe0b0');this.skyLight.color.set('#b4c8df');this.skyLight.groundColor.set('#4b4435');
    this.atmosphere.material.uniforms.fogColor.value.copy(this.scene.fog.color);
    this.atmosphere.lighting(p,daylight,alt,az,sim.clock);this.environment?.sync(sim.world,this.owner.quality,sim.player,sim.clock);
  }
  render(sim){
    // Apply authoritative train/wagon state before pause-frame caching so restore cannot freeze constructor defaults.
    const state=sim.renderState,time=sim.clock;
    this.wagons.update(sim.player,this.owner.quality);
    this.yardWagons.update(sim.destruction,this.owner.quality,sim.world,sim.player,time);
    this.locomotive.update(sim.player);this.panzerzugArt.update(sim.player);
    // Retain the last canvas frame while the mission clock is frozen (menu/pause).
    // Assets, world restore, quality and resizing still invalidate it.
    const canvas=this.owner.canvas,previous=this.lastFrame;
    const frame={clock:sim.clock,world:sim.world,revision:sim.world.revision,quality:this.owner.quality,
      width:canvas.width,height:canvas.height,models:this.kit.length,characters:this.characters?.revision,aircraft:this.aircraftRevision,
      wagons:this.wagons.revision,yardWagons:this.yardWagons.revision,locomotive:this.locomotive.revision,panzerzug:this.panzerzugArt.revision};
    if(previous&&Object.keys(frame).every(k=>frame[k]===previous[k]))return;
    this.lastFrame=frame;this.renderedFrames=(this.renderedFrames??0)+1;
    for(const material of Object.values(this.materials))if(material.userData.m01LowDetail)material.userData.m01LowDetail.value=this.owner.quality==='low'?1:0;
    for(const material of Object.values(this.materials))if(material.userData.m01Time)material.userData.m01Time.value=sim.clock;
    this.syncSolids(sim.world);this.portalPolish.sync(this.owner.quality);this.bridgeStructure.sync(this.owner.quality,this.camera.position,sim.world);const dt=Math.min(.05,Math.max(0,time-this.lastClock));this.lastClock=time;
    for(const kit of this.kit)for(const piece of kit.pieces){const s=state.parts[piece.name];piece.node.visible=Boolean(s&&s.visible&&s.lod===kit.file.lod);}
    this.updateActors(sim.actors,time,sim.player,sim.battleClock);this.syncDamage(sim,state);this.lighting(sim);
    this.train.visible=state.train963;this.panzerzug.visible=state.panzerzug;
    this.updateAircraft(state,time,sim.player,ju87HeardAt(sim));
    const player=sim.player,eye=eyePosition(player),dir=aimDirection(player.angle,player.pitch);
    const bob=player.moveBlend*Math.sin(time*(player.sprinting?14:9))*.014;
    const legacyShake=time<this.shakeUntil?Math.sin(time*85)*.012:0,feedback=this.combatFeedback.sample(time,this.owner.quality);
    // Presentation-only offsets: authoritative yaw/pitch and shot direction remain untouched.
    this.camera.position.set(eye.x+feedback.cameraX,eye.y+bob+legacyShake+feedback.cameraY,eye.z);
    this.camera.lookAt(eye.x+dir.x+feedback.cameraX,eye.y+bob+legacyShake+dir.y+feedback.cameraY,eye.z+dir.z);
    if(feedback.roll)this.camera.rotateZ(feedback.roll);
    this.updateFire(sim);
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
    this.carryBody.visible=sim.player.carrying==='jozef_bak';this.carryCrate.visible=sim.player.carrying==='sapper_crate';
    this.carryBody.position.y=this.carryCrate.position.y=bob*1.5;
    if(this.viewModel.update(sim,this.owner.quality,this.flashUntil)){this.weaponRoot.visible=false;this.carryBody.visible=false;}
    this.updateBattlefieldFx(state,time);
    this.engine.info.autoReset=false;this.engine.info.reset();this.engine.clear();this.engine.render(this.scene,this.camera);
    if(this.fx.muzzle>0){this.muzzlePresentation.frames++;this.muzzlePresentation.lastClock=time;this.muzzlePresentation.lastFrame=this.renderedFrames??0;}
    this.engine.clearDepth();this.engine.render(this.weaponScene,this.weaponCamera);this.engine.toneMappingExposure=1.15;
  }
  muzzle(clock){this.flashUntil=clock+.06;this.shakeUntil=clock+.1;}
  blast(clock){this.shakeUntil=clock+.4;}
  playerHit(clock,direction=null){this.combatFeedback.playerHit(clock,direction);this.lastFrame=null;}
  directionalHit(clock,direction){this.combatFeedback.directionalHit(clock,direction);this.lastFrame=null;}
  roundFeedback(event,clock,direction=null,weapon=null){
    this.combatFeedback.roundImpact({clock,distance:event.distance,crack:Boolean(event.crack),direction,weapon,material:event.material});this.lastFrame=null;
  }
  explosionFeedback(clock,distance,direction=null){this.combatFeedback.explosion({clock,distance,direction});this.lastFrame=null;}
  feedbackState(clock=this.lastClock){return this.combatFeedback.diagnostics(clock,this.owner.quality);}
  /** Layered visual-only blast. Scale is inferred later from the simulation-owned damage id. */
  explosion(point,clock,aerial){this.bursts.push({x:point.x,y:point.y??0,z:point.z,start:clock,aerial:Boolean(aerial),seed:fxSeed(point,clock)});if(this.bursts.length>M01_BATTLEFIELD_FX_LIMITS.bursts)this.bursts.shift();}
  resetEffects(){
    for(const plane of this.planes??[])plane.userData.level=null;
    this.lastFrame=null;this.flashUntil=0;this.shakeUntil=0;this.lastClock=0;this.impacts=[];this.bursts=[];this.combatFeedback.reset();
    for(const b of Object.values(this.fireBatches))b.count=0;for(const b of Object.values(this.battlefieldFxBatches))b.count=0;
    this.battlefieldShards.count=0;this.explosionLight.visible=false;this.explosionLight.intensity=0;
    this.fx={muzzle:0,tracer:0,puff:0,spark:0,smoke:0,chip:0};this.muzzlePresentation={frames:0,lastClock:null,lastFrame:null};this.battlefieldFxCounts={flash:0,core:0,fire:0,smoke:0,dust:0,shard:0};
  }
  get diagnostics(){return {models:this.kit.map(k=>k.file.file),assetFailures:this.assets.failures,
    requiredAssetFailures:this.assets.failures.filter(f=>manifest.files.some(m=>typeof m.lod==='number'&&m.file===f.path)),
    characters:this.characters?.diagnostics,viewModel:this.viewModel?.stats,
    locomotive:this.locomotive.diagnostics,panzerzug:this.panzerzugArt.diagnostics,wagons:this.wagons.diagnostics,yardWagons:this.yardWagons.diagnostics,
    aircraft:{loaded:[...this.aircraftSources.keys()].sort(),planes:this.planes.map(p=>{const model=(p.levels[p.userData.level]??p.levels.find(l=>l.object.visible))?.object,prop=model?.getObjectByName('propeller');return {visible:p.visible,lod:model?.userData.lod,position:p.position.toArray(),attitude:[p.rotation.x,p.rotation.y,p.rotation.z],fade:p.userData.fade,propeller:prop?.quaternion.toArray()};})},
    renderedFrames:this.renderedFrames??0,smokePuffs:this.atmosphere.count,environmentInstances:this.environment?.resources.reduce((n,b)=>n+(b.visible===false?0:b.count),0)??0,
    stationArchitecture:this.environment?.station?.diagnostics??{ready:false,failure:this.environment?.stationFailure??null},
    environmentProps:this.environment?.propDiagnostics,bridgePortalPolish:this.portalPolish?.diagnostics,bridgeStructure:this.bridgeStructure?.diagnostics,vegetation:this.environment?.diagnostics,actorPoses:{...this.actorPoses},actorAnimations:{...this.actorAnimations},
    visiblePieces:this.kit.reduce((n,k)=>n+k.pieces.filter(p=>p.node.visible).length,0),fireEffects:{...this.fx},muzzlePresentation:{...this.muzzlePresentation},
    combatFeedback:this.combatFeedback.diagnostics(this.lastClock,this.owner.quality),
    battlefieldFx:{active:this.bursts.length,counts:{...this.battlefieldFxCounts},limits:M01_BATTLEFIELD_FX_LIMITS,extraLights:this.explosionLight?.visible?1:0,atmosphere:this.atmosphere.diagnostics}};}
  dispose(){
    this.disposed=true;for(const mixer of this.aircraftMixers){mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());}for(const m of this.aircraftMaterials??[])m.dispose();this.aircraftSky?.dispose();this.viewModel?.dispose();this.characters?.dispose();
    this.yardWagons.dispose();this.wagons.dispose();this.locomotive.dispose();this.panzerzugArt.dispose();this.portalPolish?.dispose();this.bridgeStructure?.dispose();this.assets.dispose();this.environment?.dispose();this.atmosphere.dispose();this.contactMaterial?.dispose();this.geometry.forEach(g=>g.dispose());
    const textures=new Set();for(const m of Object.values(this.materials)){if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);m.dispose();}textures.forEach(t=>t.dispose());
    this.scene.traverse(n=>{if(n.isInstancedMesh)n.dispose();});this.scene.clear();this.weaponScene.clear();
  }
}
