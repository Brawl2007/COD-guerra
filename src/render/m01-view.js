import * as THREE from 'three';
import { AssetManager } from '../assets/asset-manager.js';
import manifest from '../../assets/models/provisional/m01/bridges.manifest.json' with {type:'json'};
import { eyePosition, aimDirection } from '../world/spatial.js';
import { roundPoint } from '../game/m01-fire.js';
import { m01StukaPosition, m01StukaSince, m01StukaPathTime, m01StukaActive, m01RaidPlanePosition, m01RaidSince, m01RaidPlaneActive, M01_STUKA_DIVE_FROM, M01_STUKA_DIVE_TO } from '../world/m01-aircraft-path.js';
import { actorPose } from './m01-actor-pose.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { texturedSurface,weatheredBridgeSurface } from './m01-surfaces.js';
import { M01Atmosphere, visualNoise } from './m01-atmosphere.js';
import { applyLighting, viewLightingDiagnostics, M01_FOG_RANGE } from './m01-lighting.js';
import { M01Water } from './m01-water.js';
import {battlefieldBlastKind,battlefieldProfile,fxLayerCount,staggeredLife,impactProfile,fxDistanceBand} from './m01-battlefield-fx-profile.js';
import { M01Environment } from './m01-environment.js';
import { M01Characters } from './m01-characters.js';
import { M01ViewModel } from './m01-viewmodel.js';
import { M01TrainWagons } from './m01-train-wagons.js';
import { M01YardWagons, yardWagonFireDamage } from './m01-yard-wagons.js';
import { M01Locomotive } from './m01-locomotive.js';
import { M01Panzerzug } from './m01-panzerzug.js';
import {JU87_LOD_DISTANCES,JU87_QUALITY_FLOOR,JU87_BOMB_POOL,ju87Attitude,ju87Fade,ju87HeardAt,ju87PropellerTime,selectJu87Level,ju87SkyEnvironment,instanceJu87Materials,setJu87Fade,m01BombFlights} from './m01-aircraft.js';
import {soldierVisualVariant} from './m01-soldier-variation.js';
import { M01CombatFeedback } from './m01-combat-feedback.js';
import {M01BridgePortalPolish,bridgeMaterialSlot} from './m01-bridge-portal-polish.js';
import {M01DamageDecals} from './m01-damage-decals.js';
import {WEAPON_PRESENTATION,WeaponViewFx,WeaponWorldFx,WeaponLighting,viewUp,prewarmWeaponFx} from './first-person-weapon-fx.js';
import {M01BridgeStructure,M01_TRACK_CENTRES} from './m01-bridge-structure.js';
import {isDemolitionDamage,collapseTwinName,collapseDamageId,collapseSeed,collapsePose,collapseProgress,demolitionFlash,demolitionFallPoints,demolitionSilenceWindow,
  farFeedback,farFeedbackApplies,M01_COLLAPSE_DURATION,M01_BLAST_CHIP_MATERIALS,M01_DEMOLITION_BUDGET} from './m01-demolition.js';

export const M01_BATTLEFIELD_FX_LIMITS=Object.freeze({bursts:16,flash:16,core:48,fire:96,smoke:128,dust:128,shards:96,lights:1});
const FX_DENSITY={low:.55,medium:.78,high:1};
const BOMB_NOSE=new THREE.Vector3(0,0,-1);
const fxSeed=(p,clock)=>((Math.floor((p.x+2048)*73)^Math.floor(((p.y??0)+128)*151)^Math.floor((p.z+2048)*197)^Math.floor(clock*1000))>>>0);
const fxCount=(n,quality)=>Math.max(1,Math.round(n*(FX_DENSITY[quality]??FX_DENSITY.low)));

// Presentation only: all actors, visible pieces, damage and clocks come from M01Simulation.
// Original procedural art: textured environment and articulated humans; final scanned/rigged art remains pending.
export class M01View {
  constructor(renderer){
    this.owner=renderer;this.engine=renderer.engine;this.assets=new AssetManager();this.disposed=false;
    this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#a0a7a8',M01_FOG_RANGE.near,M01_FOG_RANGE.far);
    this.camera=new THREE.PerspectiveCamera(70,1,.05,7500);this.weaponCamera=new THREE.PerspectiveCamera(58,1,.03,6);
    this.weaponScene=new THREE.Scene();this.weaponRoot=new THREE.Group();this.weaponScene.add(this.weaponRoot);
    // Weapon-pass fill/key start from the old tuned values; every frame they follow the world's sky, sun and daylight
    // (dimmer at dawn than the old constant 2,7/2,0, so the rifle sits in the same light as the world around it).
    this.weaponLighting=new WeaponLighting(this.weaponScene,{fill:['#bfd0d5','#58422d',2.7],key:['#ffe0b0',2]});
    this.skyLight=new THREE.HemisphereLight('#bac9d5','#625846',1.25);this.scene.add(this.skyLight);
    this.sun=new THREE.DirectionalLight('#ffd6a0',.45);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:.5,far:450});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.025;
    // Near cascade (Medium/High): tight ±25 m shadow camera for contact shadows; hidden (no cost) on Low. Intensity is split in applyLighting.
    this.sunNear=new THREE.DirectionalLight('#ffd6a0',0);this.sunNear.castShadow=true;this.sunNear.visible=false;this.sunNear.shadow.mapSize.set(1024,1024);
    Object.assign(this.sunNear.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:450});this.sunNear.shadow.bias=-.0002;this.sunNear.shadow.normalBias=.02;
    this.scene.add(this.sun,this.sun.target,this.sunNear,this.sunNear.target);
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
      water:(this.water=new M01Water()).material,   // T42: lit river material (fresnel + T16 sky reflection, flow, pier foam, wet banks)
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
    this.battlefieldFxCounts={flash:0,core:0,fire:0,smoke:0,dust:0,shard:0};this.battlefieldFxMeta={kinds:{small:0,bombing:0,demolition:0},bands:{near:0,mid:0,far:0}};
    this.combatFeedback=new M01CombatFeedback();
    this.demolitionState={entries:[],pieces:[],flash:null};this.collapseTilt=new THREE.Quaternion();this.collapseEuler=new THREE.Euler();
    this.portalPolish=new M01BridgePortalPolish({stone:this.materials.bridgeStone});
    this.bridgeStructure=new M01BridgeStructure({steel:this.materials.bridgeSteel,rail:this.materials.metal,timber:this.materials.wood,stone:this.materials.bridgeStone});
    this.atmosphere=new M01Atmosphere(this.scene);
    this.damageDecals=new M01DamageDecals(this.scene);
    this.createWeapon();this.createActors();this.createContactShadows();this.createFireEffects();this.createAircraft();this.createTrains();
    this.weaponWorldFx=new WeaponWorldFx(this.effects);
    // One muzzle light in the weapon pass: the licensed rig drives the procedural fallback's light.
    this.characters=new M01Characters(this.scene);
    this.viewModel=new M01ViewModel(this.weaponScene,this.characters,this.atmosphere.texture,this.weaponWorldFx,{muzzleLight:this.fallbackFx.light});
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
        const pieces=file.nodes.map(n=>({name:n.name,node:asset.scene.getObjectByName(n.name),show:n.showAfterEvent??null})).filter(n=>n.node);
        this.setupCollapse(pieces);
        for(const piece of pieces)this.portalPolish.attach(piece.node);
        this.bridgeStructure.attachKit(asset.scene,file);
        this.kit.push({file,root:asset.scene,pieces});this.scene.add(asset.scene);
      }catch(error){if(!this.disposed)console.warn(`Ponte M01: ${error.message}`);}
    }));
  }
  /**
   * Demolition set-piece: every LOD's collapsed/rubble node caches its stored transform, so a per-frame SET (never an accumulation)
   * can animate it from the intact pose and always land on exactly this pose. offset = intact node - stored node.
   */
  setupCollapse(pieces){
    for(const piece of pieces){
      const source=pieces.find(p=>p.name===collapseTwinName(piece.name)),damageId=collapseDamageId(piece.show);
      if(!source||!damageId)continue;
      piece.collapse={damageId,seed:collapseSeed(piece.name),applied:'base',base:{position:piece.node.position.clone(),quaternion:piece.node.quaternion.clone()},
        offset:[source.node.position.x-piece.node.position.x,source.node.position.y-piece.node.position.y,source.node.position.z-piece.node.position.z]};
    }
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
    // Instance colours (setColorAt) tint these; vertexColors must stay off (no `color` attribute on the tetrahedra: it rendered black).
    this.materials.chip=new THREE.MeshStandardMaterial(M01_BLAST_CHIP_MATERIALS.chip);
    this.materials.blastShard=new THREE.MeshStandardMaterial(M01_BLAST_CHIP_MATERIALS.blastShard);
    this.fireBatches={};this.fireDummy=new THREE.Object3D();this.fireColor=new THREE.Color();
    for(const [name,material,capacity]of [['muzzle','flash',96],['tracer','tracer',48],['puff','puff',144],['spark','flash',96],['smoke','gunSmoke',64],['chip','chip',128]]){
      const soft=name==='smoke'||name==='puff',geometry=name==='chip'?this.atmosphere.debrisGeometry:this.sphere;
      const batch=soft?this.atmosphere.billboardBatch(capacity,this.materials[material].color,this.effects,name==='puff'?'dust':'smoke'):
        new THREE.InstancedMesh(geometry,this.materials[material],capacity);
      batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.frustumCulled=false;this.effects.add(batch);this.fireBatches[name]=batch;
    }
    // Allocate instance colours before the first chip, keeping its shader variant stable.
    this.fireBatches.chip.setColorAt(0,this.fireColor.set('#ffffff'));
    this.battlefieldFxBatches={};this.battlefieldDummy=new THREE.Object3D();this.battlefieldColor=new THREE.Color();
    for(const [name,capacity,color]of [
      ['flash',M01_BATTLEFIELD_FX_LIMITS.flash,'#fff0c2'],['core',M01_BATTLEFIELD_FX_LIMITS.core,'#ffc45d'],
      ['fire',M01_BATTLEFIELD_FX_LIMITS.fire,'#e97831'],['smoke',M01_BATTLEFIELD_FX_LIMITS.smoke,'#4e4b45'],['dust',M01_BATTLEFIELD_FX_LIMITS.dust,'#8d7c67']]){
      const batch=this.atmosphere.billboardBatch(capacity,color,this.effects,name==='dust'?'dust':'smoke');batch.count=0;this.battlefieldFxBatches[name]=batch;
    }
    this.battlefieldShards=new THREE.InstancedMesh(this.atmosphere.debrisGeometry,this.materials.blastShard,M01_BATTLEFIELD_FX_LIMITS.shards);
    this.battlefieldShards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.battlefieldShards.count=0;this.battlefieldShards.frustumCulled=false;this.effects.add(this.battlefieldShards);
    this.battlefieldShards.setColorAt(0,this.battlefieldColor.set('#665747'));   // allocate instance colours up front: stable shader variant
    this.explosionLight=new THREE.PointLight('#ff9e45',0,80,2);this.explosionLight.visible=false;this.explosionLight.castShadow=false;this.effects.add(this.explosionLight);
  }
  updateFire(sim){
    const time=sim.clock,cam=this.camera.position,dummy=this.fireDummy,counts={muzzle:0,tracer:0,puff:0,spark:0,smoke:0,chip:0};
    const far=p=>Math.hypot(p.x-cam.x,p.y-cam.y,p.z-cam.z);
    const put=(name,p,scale,dir=null,opacity=1,color=null,styleSeed=null,variant=0)=>{
      const batch=this.fireBatches[name],index=counts[name];if(index>=batch.instanceMatrix.count)return;
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);
      if(dir){dummy.lookAt(p.x+dir.x,p.y+dir.y,p.z+dir.z);dummy.scale.set(scale[0],scale[1],scale[2]);}
      else if(Array.isArray(scale))dummy.scale.set(...scale);else dummy.scale.setScalar(scale);
      dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);
      batch.geometry.attributes.puffOpacity?.setX(index,opacity);
      if(batch.geometry.attributes.puffSpin)this.atmosphere.stylePuff(batch,index,styleSeed??fxSeed(p,time),variant);
      if(color)batch.setColorAt(index,this.fireColor.set(color));counts[name]++;
    };
    const root=new THREE.Object3D(),muzzle=new THREE.Vector3();
    for(const a of sim.actors)if(a.team==='enemy'&&a.alive&&a.active){
      const age=time-(a.firedAt??-1e9);if(a.shot<=0&&age>2.2)continue;
      const pose=actorPose(a,time);root.position.set(a.x,a.y+pose.root.offsetY,a.z);
      root.rotation.set(pose.root.pitch,-a.facing,pose.root.roll,'YXZ');root.updateMatrix();
      muzzle.fromArray(pose.rifle.muzzle);muzzle.y-=pose.root.pivotY;muzzle.applyMatrix4(root.matrix);
      const skinnedMuzzle=this.characters?.muzzle(a.id);if(skinnedMuzzle)muzzle.copy(skinnedMuzzle);
      const p={x:muzzle.x,y:muzzle.y,z:muzzle.z},d=far(p),seed=fxSeed(p,a.firedAt??time);
      if(a.mg34Prone?pose.firing:(pose.firing||pose.aiming&&age>=0&&age<.25))put('muzzle',p,Math.max(.12,d*.008)*(.8+.2*Math.sin(time*90)));
      if(age>=0&&age<2.2){
        const k=age/2.2,n0=visualNoise(seed,1),n1=visualNoise(seed,2);
        put('smoke',{x:p.x+(n0-.5)*.22*k,y:p.y+.34+k*(1.3+n1*.55),z:p.z+(n1-.5)*.18*k},
          Math.max(.22,d*.0065)*(.55+k*.95)*(1-k*k),null,.60*Math.pow(1-k,1.15),'#b9b8ae',seed,4);
      }
    }
    for(const r of sim.enemyFire.rounds){
      const t=(time-r.firedAt)/(r.arriveAt-r.firedAt);if(!r.tracer||t<0||t>1)continue;
      const p=roundPoint(r,t),q=roundPoint(r,Math.min(1.02,t+.01)),len=Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)||1,d=far(p);
      put('tracer',p,[Math.max(.025,d*.0016),Math.max(.025,d*.0016),Math.max(.6,d*.012)],{x:(q.x-p.x)/len,y:(q.y-p.y)/len,z:(q.z-p.z)/len});
    }
    this.impacts=this.impacts.filter(i=>{const p=impactProfile(i.material);return time>=i.start&&time-i.start<Math.max(1.15,p.life);});
    for(const i of this.impacts){
      const age=time-i.start,d=far(i),seed=i.seed,quality=this.owner.quality,profile=impactProfile(i.material);
      if(profile.sparks&&age<profile.life){
        const life=Math.max(0,1-age/profile.life),n=fxCount(profile.sparks,quality);
        for(let j=0;j<n;j++){
          const a=visualNoise(seed,j*4)*Math.PI*2,r=(.08+age*profile.spread)*(1+visualNoise(seed,j*4+1)*.8),s=Math.max(.028,d*.00155)*(1-age/profile.life);
          put('spark',{x:i.x+Math.cos(a)*r,y:i.y+.03+age*(profile.rise+visualNoise(seed,j*4+2)*2.4),z:i.z+Math.sin(a)*r},s,null,.92*life,'#ffd27a');
        }
      }
      if(profile.dust&&age<profile.life){
        const fadeIn=Math.min(1,age/.08),fadeOut=Math.max(0,1-age/profile.life),life=fadeIn*Math.pow(fadeOut,1.18),n=fxCount(profile.dust,quality);
        for(let j=0;j<n&&life>0;j++){
          const n0=visualNoise(seed,30+j*4),n1=visualNoise(seed,31+j*4),n2=visualNoise(seed,32+j*4),a=n0*Math.PI*2;
          const r=age*profile.spread*(.45+n1*.75),sx=Math.max(.24,d*.0028)*(.58+n2*.7)*(1+age*.42),sy=sx*(.42+.24*n1);
          put('puff',{x:i.x+Math.cos(a)*r,y:i.y+.06+age*(profile.rise+.20*n2),z:i.z+Math.sin(a)*r},[sx,sy,1],null,.60*life,profile.color,seed,30+j);
        }
      }
      if(profile.chips&&age<Math.min(.86,profile.life)){
        const n=fxCount(profile.chips,quality),life=Math.max(.16,1-age/Math.min(.86,profile.life));
        for(let j=0;j<n;j++){
          const a=visualNoise(seed,70+j*4)*Math.PI*2,v=.65+visualNoise(seed,71+j*4)*profile.spread,s=(.04+visualNoise(seed,72+j*4)*.075)*life;
          const elong=profile.elongation*(.82+visualNoise(seed,73+j*4)*.42);
          put('chip',{x:i.x+Math.cos(a)*v*age,y:i.y+.05+(1.0+visualNoise(seed,100+j)*1.9)*age-2.8*age*age,z:i.z+Math.sin(a)*v*age},
            [s*elong,s*(.38+visualNoise(seed,120+j)*.48),s*.62],null,1,profile.color);
        }
      }
    }
    for(const [name,batch]of Object.entries(this.fireBatches)){
      batch.count=counts[name];batch.instanceMatrix.needsUpdate=true;
      if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
      for(const attr of ['puffOpacity','puffSpin','puffShape'])if(batch.geometry.attributes[attr])batch.geometry.attributes[attr].needsUpdate=true;
    }
    this.fx=counts;
  }
  /**
   * Demolition set-piece (presentation only). Every number is a pure function of `time - damage.started` (simulation clock, never
   * wall time): the collapsed/rubble nodes are SET each frame from their cached stored transform plus the pose offset (never
   * accumulated), exactly the stored transform before the blast and from M01_COLLAPSE_DURATION on. `renderState.parts` (which
   * node is visible) is not touched. Far-field exposure/tremor is registered once per damage entry and replayed by age.
   */
  updateDemolition(state,time,sim){
    const byId=new Map(),player=sim.player,entries=[];
    for(const d of state.damage)if(isDemolitionDamage(d.id)&&(!byId.has(d.id)||d.started>=byId.get(d.id).started))byId.set(d.id,d);
    for(const [id,d] of byId){
      const age=time-d.started,distance=Math.hypot(d.x-player.x,d.z-player.z),silence=demolitionSilenceWindow(d);
      this.combatFeedback.demolition({id,started:d.started,clock:time,distance});
      entries.push({id,started:d.started,age,progress:collapseProgress(age),duration:M01_COLLAPSE_DURATION,distance,far:farFeedback(age,distance),
        farActive:farFeedbackApplies(distance),silence:{...silence,active:time>=silence.from&&time<silence.to},fall:demolitionFallPoints(d)});
    }
    const euler=this.collapseEuler,tilt=this.collapseTilt,pieces=[];
    for(const kit of this.kit)for(const piece of kit.pieces){
      const c=piece.collapse;if(!c)continue;
      const d=byId.get(c.damageId),age=d?time-d.started:NaN,pose=collapsePose({age,offset:c.offset,seed:c.seed}),node=piece.node;
      if(pose.active){
        node.position.set(c.base.position.x+pose.offset[0],c.base.position.y+pose.offset[1],c.base.position.z+pose.offset[2]);
        node.quaternion.copy(c.base.quaternion).slerp(tilt.setFromEuler(euler.set(pose.tilt[0],pose.tilt[1],pose.tilt[2])),pose.remaining);
        c.applied='animated';
      }else if(c.applied!=='base'){node.position.copy(c.base.position);node.quaternion.copy(c.base.quaternion);c.applied='base';}
      if(node.visible)pieces.push({name:piece.name,lod:kit.file.lod,damageId:c.damageId,phase:pose.active?'falling':pose.progress>=1?'settled':'idle',progress:pose.progress,
        position:node.position.toArray(),basePosition:c.base.position.toArray(),quaternion:node.quaternion.toArray(),baseQuaternion:c.base.quaternion.toArray()});
    }
    this.demolitionState={entries,pieces,flash:this.demolitionState.flash};
  }
  updateBattlefieldFx(state,time){
    const findDamage=b=>state.damage.find(d=>Math.abs(d.started-b.start)<.08&&Math.hypot(d.x-b.x,d.z-b.z)<2);
    this.bursts=this.bursts.filter(b=>{const d=findDamage(b),profile=battlefieldProfile(d?.id??'',b.aerial);return time>=b.start&&time-b.start<profile.duration;});
    const counts={flash:0,core:0,fire:0,smoke:0,dust:0},dummy=this.battlefieldDummy,quality=this.owner.quality,cam=this.camera.position;
    const meta={kinds:{small:0,bombing:0,demolition:0},bands:{near:0,mid:0,far:0}};let shardCount=0,strongest=null,demolitionFlashState=null;
    const put=(name,p,sx,sy,opacity,color,seed,variant=0)=>{
      const batch=this.battlefieldFxBatches[name],index=counts[name];if(index>=batch.instanceMatrix.count||opacity<=.004)return;
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(sx,sy,1);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);
      batch.geometry.attributes.puffOpacity.setX(index,opacity);this.atmosphere.stylePuff(batch,index,seed,variant);
      batch.setColorAt(index,this.battlefieldColor.set(color));counts[name]++;
    };
    for(const b of this.bursts){
      const age=time-b.start,match=findDamage(b),id=match?.id??'',kind=battlefieldBlastKind(id,b.aerial),profile=battlefieldProfile(id,b.aerial);
      const distance=Math.hypot(b.x-cam.x,b.y-cam.y,b.z-cam.z),band=fxDistanceBand(distance);meta.kinds[kind]++;meta.bands[band]++;
      const farScale=band==='far'?1.12:band==='mid'?1.04:1;
      // Demolition only: minimum angular size/duration of the flash and reach of the light by viewer distance (identical below 85 m).
      const demolition=kind==='demolition'?demolitionFlash(distance,{scale:profile.scale,flashEnd:profile.flashEnd,lightRange:profile.lightDistance}):null;
      const flashEnd=demolition?demolition.duration:profile.flashEnd,flashScale=demolition?demolition.scale:profile.scale;
      if(demolition)demolitionFlashState={id:match?.id??'',age,...demolition};
      // Far demolition viewers get stacked flash billboards (see M01_FLASH_FAR_LAYERS): one soft puff is too faint over the horizon haze.
      const flashN=Math.min(M01_BATTLEFIELD_FX_LIMITS.flash,fxLayerCount(profile.counts.flash,quality,distance)+(demolition?demolition.extraLayers:0));
      for(let j=0;j<flashN;j++){
        const n0=visualNoise(b.seed,2+j*3),life=staggeredLife(age,0,flashEnd,n0,.08);if(!life.life)continue;
        const s=flashScale*(.70+.34*life.t)*(.82+visualNoise(b.seed,3+j*3)*.28)*farScale;
        put('flash',{x:b.x+(n0-.5)*profile.scale*.08,y:b.y+profile.scale*(.11+.08*life.t),z:b.z+(visualNoise(b.seed,4+j*3)-.5)*profile.scale*.08},
          s,s*(.58+.18*visualNoise(b.seed,5+j*3)),.94*life.life,kind==='small'?'#fff1c7':demolition?demolition.color:'#fff0c0',b.seed,2+j);
      }
      const coreN=fxLayerCount(profile.counts.core,quality,distance);
      for(let j=0;j<coreN;j++){
        const n0=visualNoise(b.seed,20+j*5),n1=visualNoise(b.seed,21+j*5),life=staggeredLife(age,0,profile.coreEnd,n0,.24);if(!life.life)continue;
        const a=n0*Math.PI*2,r=profile.scale*(.025+.21*life.t)*(.35+n1*.8),s=profile.scale*(.15+.38*life.t)*(.58+visualNoise(b.seed,22+j*5)*.65)*farScale;
        put('core',{x:b.x+Math.cos(a)*r,y:b.y+profile.scale*(.10+.15*life.t)+Math.sin(a*1.7)*r*.13,z:b.z+Math.sin(a)*r},
          s,s*(.68+visualNoise(b.seed,23+j*5)*.55),.86*life.life,j%3===0?'#ffd777':j%2?'#ffad42':'#ff8732',b.seed,20+j);
      }
      const fireN=fxLayerCount(profile.counts.fire,quality,distance);
      for(let j=0;j<fireN;j++){
        const n0=visualNoise(b.seed,60+j*5),n1=visualNoise(b.seed,61+j*5),n2=visualNoise(b.seed,62+j*5),life=staggeredLife(age,profile.fireStart,profile.fireEnd,n0,.34);if(!life.life)continue;
        const a=n0*Math.PI*2,r=profile.scale*(.07+.33*life.t)*(.28+n1*.82),rise=profile.scale*(.10+.25*life.t)*profile.vertical*(.65+n2*.52);
        const pulse=.82+.18*Math.sin(age*(17+n1*7)+j*2.1),s=profile.scale*(.10+.28*Math.sin(Math.min(1,life.t)*Math.PI))*(.54+n2*.68)*pulse*farScale;
        put('fire',{x:b.x+Math.cos(a)*r,y:b.y+rise,z:b.z+Math.sin(a)*r},s,s*(.78+n1*.58),.72*life.life,
          j%4===0?'#ffd35c':j%3===0?'#f07b2c':'#ff9a37',b.seed,60+j);
      }
      const dustN=fxLayerCount(profile.counts.dust,quality,distance);
      for(let j=0;j<dustN;j++){
        const n0=visualNoise(b.seed,120+j*5),n1=visualNoise(b.seed,121+j*5),n2=visualNoise(b.seed,122+j*5),life=staggeredLife(age,profile.dustStart,profile.dustEnd,n1,.30);if(!life.life)continue;
        const a=(j/Math.max(1,dustN))*Math.PI*2+(n0-.5)*.72,r=profile.scale*(.06+profile.dustReach*Math.pow(life.t,.72))*(.70+n1*.46);
        const sx=profile.scale*(.09+.22*life.t)*(.58+n2*.72)*farScale,sy=sx*(.28+.20*visualNoise(b.seed,123+j*5));
        put('dust',{x:b.x+Math.cos(a)*r,y:b.y+.10+profile.scale*.017*life.t+visualNoise(b.seed,124+j*5)*.22,z:b.z+Math.sin(a)*r},
          sx,sy,.52*life.life,kind==='demolition'?(j%3?'#94816a':'#aa9577'):kind==='bombing'?(j%2?'#9f8a70':'#b09a7d'):'#aa967b',b.seed,120+j);
      }
      const smokeN=fxLayerCount(profile.counts.smoke,quality,distance);
      for(let j=0;j<smokeN;j++){
        const n0=visualNoise(b.seed,190+j*6),n1=visualNoise(b.seed,191+j*6),n2=visualNoise(b.seed,192+j*6),life=staggeredLife(age,profile.smokeStart,profile.smokeEnd,n0,.38);if(!life.life)continue;
        const a=n0*Math.PI*2,r=profile.scale*(.035+.18*life.t)*(.35+n1*.88),curl=Math.sin(age*(.35+n2*.28)+j*1.47);
        const rise=profile.scale*(.10+profile.smokeRise*.66*Math.pow(life.t,.78))*(.72+n2*.48),drift=age*(.18+n1*.36);
        const s=profile.scale*(.10+.34*Math.pow(life.t,.68))*(.55+visualNoise(b.seed,193+j*6)*.72)*farScale;
        const color=life.t<.24?(kind==='demolition'?'#4c4540':'#454542'):life.t<.62?'#5e5c56':'#77756f';
        put('smoke',{x:b.x+Math.cos(a)*r+drift+curl*s*.08,y:b.y+rise,z:b.z+Math.sin(a)*r+curl*s*.10},
          s*(.86+n1*.34),s*(.98+n2*.62),.54*life.life,color,b.seed,190+j);
      }
      const shardN=fxLayerCount(profile.counts.shard,quality,distance);
      for(let j=0;j<shardN&&shardCount<M01_BATTLEFIELD_FX_LIMITS.shards;j++){
        const n0=visualNoise(b.seed,280+j*5),n1=visualNoise(b.seed,281+j*5),n2=visualNoise(b.seed,282+j*5),life=staggeredLife(age,profile.shardStart,profile.shardEnd,n0,.16);
        if(!life.life)continue;
        const a=n0*Math.PI*2,v=(kind==='demolition'?15:kind==='bombing'?10.5:6.2)*(.40+n1*.92),t=age-life.start;
        dummy.position.set(b.x+Math.cos(a)*v*t,b.y+.18+(4+n2*(kind==='demolition'?9:6))*t-4.9*t*t,b.z+Math.sin(a)*v*t);
        dummy.rotation.set(t*(3+j*.71),a+n1,t*(5+n0*4));const s=(.05+n2*.17)*(kind==='demolition'?1.24:1)*Math.max(.15,life.life);
        dummy.scale.set(s*(.65+n1*.8),s*(.32+n0*.48),s*(.62+n2*.55));dummy.updateMatrix();this.battlefieldShards.setMatrixAt(shardCount,dummy.matrix);
        this.battlefieldShards.setColorAt(shardCount,this.battlefieldColor.set(j%4===0?'#88745c':j%2?'#51483d':'#665747'));shardCount++;
      }
      const light=staggeredLife(age,0,demolition?demolition.lightSeconds:Math.min(.34,profile.coreEnd),.08,.05);
      if(light.life){
        const intensity=profile.lightPeak*light.life;if(!strongest||intensity>strongest.intensity)strongest={b,intensity,distance:demolition?demolition.lightRange:profile.lightDistance,decay:demolition?demolition.lightDecay:2,kind};
      }
    }
    for(const [name,batch]of Object.entries(this.battlefieldFxBatches)){
      batch.count=counts[name];batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;
      for(const attr of ['puffOpacity','puffSpin','puffShape'])if(batch.geometry.attributes[attr])batch.geometry.attributes[attr].needsUpdate=true;
    }
    this.battlefieldShards.count=shardCount;this.battlefieldShards.instanceMatrix.needsUpdate=true;if(this.battlefieldShards.instanceColor)this.battlefieldShards.instanceColor.needsUpdate=true;
    this.explosionLight.visible=Boolean(strongest);if(strongest){this.explosionLight.position.set(strongest.b.x,strongest.b.y+3,strongest.b.z);this.explosionLight.intensity=Math.min(5,strongest.intensity);this.explosionLight.distance=strongest.distance;this.explosionLight.decay=strongest.decay;this.explosionLight.color.set(strongest.kind==='small'?'#ffb15a':'#ff9340');}
    this.battlefieldFxCounts={...counts,shard:shardCount};this.battlefieldFxMeta=meta;this.demolitionState.flash=demolitionFlashState;
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
    // Procedural fallback keeps the wz.29 flash identity (layers, light, barrel smoke) at its own barrel tip.
    this.fallbackFx=new WeaponViewFx(this.weaponScene,WEAPON_PRESENTATION.wz29);this.fallbackFx.attach(r,[0,.045,-.66]);this.flash=this.fallbackFx.core;
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
    // Bounded pool (one bomb per carrier), hidden until a flight is due. Nose is -Z like the aircraft; SC 500-class (~2 m).
    this.bombs=[];this.bombState={visible:0,flights:[]};
    for(let i=0;i<JU87_BOMB_POOL;i++){
      const bomb=new THREE.Group();bomb.visible=false;this.scene.add(bomb);
      // SC 500-class bomb (~2 m, 0.45 m across), dark with cruciform tail fins: body z -0.6..0.6, nose to -0.9, fins at z 0.65..1.1.
      const body=this.mesh('cylinder','dark',[0,0,0],[.45,1.2,.45],bomb);body.rotation.x=Math.PI/2;
      this.mesh('sphere','dark',[0,0,-.6],[.45,.45,.6],bomb);
      for(const rotation of [0,Math.PI/2]){const fin=this.mesh('box','dark',[0,0,.88],[.95,.04,.44],bomb);fin.rotation.z=rotation;}
      this.bombs.push(bomb);
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
    const floor=JU87_QUALITY_FLOOR[this.owner.quality]??0,fade=ju87Fade(time,heardAt),since=m01StukaSince(time,state);
    this.planes.forEach((plane,i)=>{
      // Pure function of the mission clock: path and attitude come from stukaPath anchored to evt_m01_bombing_0434 (no loop).
      const path=m01StukaPosition(since,i);plane.visible=Boolean(state.stukas)&&m01StukaActive(since,i);plane.position.set(path.x,path.y,path.z);
      const {yaw,pitch,bank}=ju87Attitude(since,i);plane.rotation.set(pitch,yaw,bank,'YXZ');
      const distance=Math.hypot(plane.position.x-player.x,plane.position.y-player.y,plane.position.z-player.z);
      const level=selectJu87Level(plane.levels,distance,floor,plane.userData.level),selected=plane.levels[level]?.object;
      plane.userData.level=level;plane.userData.fade=fade;
      // The selected level stays visible (and reported) at any fade; opacity/alpha hash do the hiding.
      for(const {object} of plane.levels)object.visible=object===selected;
      if(selected?.userData.materials)setJu87Fade(selected.userData.materials,fade);
      // Deterministic presentation at an estimated ~1500 rpm; pause and restore sample the same saved clock.
      selected?.userData.propellerMixer?.setTime(ju87PropellerTime(time,i));
    });
    // Second raid: one high pass from the raid's own start (damage raid_0530), hidden once it has crossed.
    const raidSince=m01RaidSince(time,state),raid=m01RaidPlanePosition(raidSince);
    this.raidPlane.visible=Boolean(state.secondRaid)&&m01RaidPlaneActive(raidSince);this.raidPlane.position.set(raid.x,raid.y,raid.z);
    const lead=m01StukaPathTime(since,0);
    this.aircraftPath={since,leadPathTime:lead,raidSince,
      phase:!state.stukas?'absent':lead<M01_STUKA_DIVE_FROM?'approach':lead<=M01_STUKA_DIVE_TO?'dive':this.planes.some((_,i)=>m01StukaActive(since,i))?'departure':'departed'};
  }
  /** Falling bombs: flights come from m01BombFlights (damage `started`/point once emitted, schedule before); the pool only draws them. */
  updateBombs(state,time,player,world){
    const flights=state.stukas?m01BombFlights({clock:time,state,world,player}):[];
    this.bombs.forEach((bomb,i)=>{
      const flight=flights.find(f=>f.plane===i);bomb.visible=Boolean(flight);if(!flight)return;
      bomb.position.set(flight.position.x,flight.position.y,flight.position.z);
      const v=flight.velocity,speed=Math.hypot(v.x,v.y,v.z);
      if(speed>1e-6)bomb.quaternion.setFromUnitVectors(BOMB_NOSE,new THREE.Vector3(v.x/speed,v.y/speed,v.z/speed));
    });
    this.bombState={visible:flights.length,flights:flights.map(f=>({id:f.id,plane:f.plane,s:f.s,predicted:f.predicted,releaseAt:f.releaseAt,at:f.at,position:[f.position.x,f.position.y,f.position.z],target:[f.target.x,f.target.y,f.target.z]}))};
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
    this.atmosphere.update(yardFire?{...state,damage:[...state.damage,yardFire]}:state,sim.clock,this.owner.quality,{surfaceY:(x,z)=>sim.world.terrainHeightAt(x,z)});
    const live=new Set(sim.grenades.active.map(g=>g.id));
    for(const g of sim.grenades.active){let m=this.grenadeViews.get(g.id);if(!m){m=this.mesh('sphere','metal',[0,0,0],[.07,.07,.07],this.effects);this.grenadeViews.set(g.id,m);}m.position.set(g.x,g.y,g.z);}
    for(const [id,m]of this.grenadeViews)if(!live.has(id)){this.effects.remove(m);this.grenadeViews.delete(id);}
  }
  lighting(sim){
    // Sky, sun, hemisphere, fog and exposure come from the pure model in m01-lighting.js (twilight key, per-phase exposure).
    applyLighting(this,sim);
    this.environment?.sync(sim.world,this.owner.quality,sim.player,sim.clock);
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
      wagons:this.wagons.revision,yardWagons:this.yardWagons.revision,locomotive:this.locomotive.revision,panzerzug:this.panzerzugArt.revision,waterDetail:this.water.detail};   // T42: the ?debug water A/B toggle is part of the paused-frame key
    if(previous&&Object.keys(frame).every(k=>frame[k]===previous[k]))return;
    this.lastFrame=frame;this.renderedFrames=(this.renderedFrames??0)+1;
    for(const material of Object.values(this.materials))if(material.userData.m01LowDetail)material.userData.m01LowDetail.value=this.owner.quality==='low'?1:0;
    for(const material of Object.values(this.materials))if(material.userData.m01Time)material.userData.m01Time.value=sim.clock;
    this.syncSolids(sim.world);this.portalPolish.sync(this.owner.quality);this.bridgeStructure.sync(this.owner.quality,this.camera.position,sim.world);const dt=Math.min(.05,Math.max(0,time-this.lastClock));this.lastClock=time;
    for(const kit of this.kit)for(const piece of kit.pieces){const s=state.parts[piece.name];piece.node.visible=Boolean(s&&s.visible&&s.lod===kit.file.lod);}
    this.updateDemolition(state,time,sim);
    this.updateActors(sim.actors,time,sim.player,sim.battleClock);this.syncDamage(sim,state);this.lighting(sim);this.water.sync(this.lightingModel,sim.clock,this.owner.quality);
    this.train.visible=state.train963;this.panzerzug.visible=state.panzerzug;
    this.updateAircraft(state,time,sim.player,ju87HeardAt(sim));this.updateBombs(state,time,sim.player,sim.world);
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
    this.carryBody.visible=sim.player.carrying==='jozef_bak';this.carryCrate.visible=sim.player.carrying==='sapper_crate';
    this.carryBody.position.y=this.carryCrate.position.y=bob*1.5;
    this.weaponLighting.sync({sky:this.skyLight,sun:this.lightingModel?{position:this.sun.position,target:this.sun.target,color:this.sun.color,intensity:this.lightingModel.sun.intensity}:this.sun,camera:this.camera,daylight:this.daylight??1,pitch:player.pitch});
    if(this.viewModel.update(sim,this.owner.quality,this.flashUntil,{camera:this.camera,viewFov:this.weaponCamera.fov})){this.weaponRoot.visible=false;this.carryBody.visible=false;this.fallbackFx.hide(false);}
    else this.updateFallbackWeapon(sim);
    this.weaponWorldFx.update(time,sim.world);
    // Once, before any shot: compile and link the shot-FX programs now instead of stalling the first shot frame.
    this.weaponFxWarm??=prewarmWeaponFx(this.engine,[{scene:this.weaponScene,camera:this.weaponCamera,objects:[...this.fallbackFx.warmObjects,...this.viewModel.fx.warmObjects]},
      {scene:this.scene,camera:this.camera,objects:this.weaponWorldFx.warmObjects([WEAPON_PRESENTATION.wz29.casing.kind])}]);
    this.updateBattlefieldFx(state,time);
    try{this.damageDecals.update({state,time,world:sim.world,trees:this.environment?.treeDescriptors,quality:this.owner.quality,camera:this.camera.position,renderer:this.engine,view:this.camera,warm:[this.fireBatches.chip]});}
    catch(error){this.damageDecals.fail(error);}   // presentation only: never stops the frame
    this.engine.info.autoReset=false;this.engine.info.reset();this.engine.clear();this.engine.render(this.scene,this.camera);
    if(this.fx.muzzle>0){this.muzzlePresentation.frames++;this.muzzlePresentation.lastClock=time;this.muzzlePresentation.lastFrame=this.renderedFrames??0;}
    this.engine.clearDepth();this.engine.render(this.weaponScene,this.weaponCamera);this.engine.toneMappingExposure=1.15;
  }
  updateFallbackWeapon(sim){
    // Restore replaces the world; previous-shot smoke belongs to the old timeline.
    if(this.fallbackWorld!==sim.world){this.fallbackWorld=sim.world;this.fallbackFx.reset();}
    const time=sim.clock,w=sim.weapon,player=sim.player,r=this.weaponRoot,shotAt=Number.isFinite(w.lastShot)?w.lastShot/1000:-Infinity;r.updateMatrixWorld(true);
    const fresh=this.flashUntil>0&&w.shotCount!==this.fallbackShot&&time<this.flashUntil+.2&&time-shotAt>=0&&time-shotAt<.25;if(fresh)this.fallbackShot=w.shotCount;
    return this.fallbackFx.update({clock:time,shotAt,gate:time<this.flashUntil,fresh,aim:player.aiming?1:0,shot:w.shotCount??0,visible:r.visible&&!player.carrying,
      muzzle:r.localToWorld(new THREE.Vector3(0,.045,-.66)),axis:new THREE.Vector3(0,0,-1).transformDirection(r.matrixWorld),
      port:r.localToWorld(new THREE.Vector3(.03,.05,-.03)),up:viewUp(player.pitch),chamberAt:shotAt+WEAPON_PRESENTATION.wz29.mechanics.chamberOpen*(this.viewModel?.boltSeconds??1.05)});
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
  /** Authoritative round-impact / player-shot event → bounded surface mark; the player's own hit also gets the impact FX. */
  surfaceDamage(event,sim){
    const shooter=event.type==='round-impact'?sim.actor?.(event.by)??null:sim.player;
    let result=null;this.lastSurface=null;
    // Runs before Game's own handlers for this event: a decal failure is counted, never allowed to skip them.
    try{result=this.damageDecals.impact(event,{world:sim.world,trees:this.environment?.treeDescriptors,player:sim.player,shooter,clock:sim.clock,quality:this.owner.quality});}
    catch(error){this.damageDecals.fail(error);}
    this.lastSurface=result;   // read by Game for the matching impact sound (water); presentation only
    if(!result)return;
    // The player's own shot had no impact FX: it gets the one matching the drawn surface (sparks off a rail the
    // simulation calls 'earth'). German rounds keep Game's FX for the simulation material, plus that one if different.
    if(event.type==='player-shot')this.impact(result.fxPoint,result.secondaryFx??event.material,sim.clock);
    else if(result.secondaryFx)this.impact(result.fxPoint,result.secondaryFx,sim.clock);
    this.lastFrame=null;
  }
  resetEffects(){
    for(const plane of this.planes??[])plane.userData.level=null;
    for(const bomb of this.bombs??[])bomb.visible=false;
    this.lastFrame=null;this.flashUntil=0;this.fallbackShot=null;this.shakeUntil=0;this.lastClock=0;this.impacts=[];this.bursts=[];this.combatFeedback.reset();this.damageDecals.reset();
    for(const b of Object.values(this.fireBatches))b.count=0;for(const b of Object.values(this.battlefieldFxBatches))b.count=0;
    this.battlefieldShards.count=0;this.explosionLight.visible=false;this.explosionLight.intensity=0;
    this.demolitionState={entries:[],pieces:[],flash:null};
    this.fx={muzzle:0,tracer:0,puff:0,spark:0,smoke:0,chip:0};this.muzzlePresentation={frames:0,lastClock:null,lastFrame:null};this.battlefieldFxCounts={flash:0,core:0,fire:0,smoke:0,dust:0,shard:0};this.battlefieldFxMeta={kinds:{small:0,bombing:0,demolition:0},bands:{near:0,mid:0,far:0}};
  }
  get diagnostics(){return {models:this.kit.map(k=>k.file.file),assetFailures:this.assets.failures,
    requiredAssetFailures:this.assets.failures.filter(f=>manifest.files.some(m=>typeof m.lod==='number'&&m.file===f.path)),
    characters:this.characters?.diagnostics,viewModel:this.viewModel?.stats,weaponFx:this.weaponWorldFx.diagnostics,weaponLighting:this.weaponLighting.state,lighting:viewLightingDiagnostics(this),water:this.water.diagnostics,
    locomotive:this.locomotive.diagnostics,panzerzug:this.panzerzugArt.diagnostics,wagons:this.wagons.diagnostics,yardWagons:this.yardWagons.diagnostics,
    aircraft:{loaded:[...this.aircraftSources.keys()].sort(),planes:this.planes.map(p=>{const model=(p.levels[p.userData.level]??p.levels.find(l=>l.object.visible))?.object,prop=model?.getObjectByName('propeller');return {visible:p.visible,lod:model?.userData.lod,position:p.position.toArray(),attitude:[p.rotation.x,p.rotation.y,p.rotation.z],fade:p.userData.fade,propeller:prop?.quaternion.toArray()};}),
      path:this.aircraftPath?{...this.aircraftPath,planeSeconds:[0,1,2].map(i=>m01StukaPathTime(this.aircraftPath.since,i))}:null,
      bombs:{visible:this.bombState?.visible??0,pool:this.bombs?.length??0,flights:this.bombState?.flights??[]},
      raid:{visible:this.raidPlane.visible,position:this.raidPlane.position.toArray()}},
    renderedFrames:this.renderedFrames??0,smokePuffs:this.atmosphere.count,environmentInstances:this.environment?.resources.reduce((n,b)=>n+(b.visible===false?0:b.count),0)??0,
    stationArchitecture:this.environment?.station?.diagnostics??{ready:false,failure:this.environment?.stationFailure??null},
    environmentProps:this.environment?.propDiagnostics,bridgePortalPolish:this.portalPolish?.diagnostics,bridgeStructure:this.bridgeStructure?.diagnostics,vegetation:this.environment?.diagnostics,actorPoses:{...this.actorPoses},actorAnimations:{...this.actorAnimations},
    damageDecals:this.damageDecals.diagnostics,
    visiblePieces:this.kit.reduce((n,k)=>n+k.pieces.filter(p=>p.node.visible).length,0),fireEffects:{...this.fx},muzzlePresentation:{...this.muzzlePresentation},
    combatFeedback:this.combatFeedback.diagnostics(this.lastClock,this.owner.quality),
    demolition:{clock:this.lastClock,collapseSeconds:M01_COLLAPSE_DURATION,budget:M01_DEMOLITION_BUDGET,entries:this.demolitionState.entries,pieces:this.demolitionState.pieces,flash:this.demolitionState.flash,
      far:this.combatFeedback.diagnostics(this.lastClock,this.owner.quality).farDemolitions,
      // The camera of the last drawn frame (read-only): lets the browser spec project a world point onto the screenshot.
      camera:{position:this.camera.position.toArray(),quaternion:this.camera.quaternion.toArray(),fov:this.camera.fov,aspect:this.camera.aspect,
        near:this.camera.near,far:this.camera.far,width:this.owner.canvas.width,height:this.owner.canvas.height}},
    battlefieldFx:{active:this.bursts.length,counts:{...this.battlefieldFxCounts},meta:structuredClone(this.battlefieldFxMeta),limits:M01_BATTLEFIELD_FX_LIMITS,extraLights:this.explosionLight?.visible?1:0,atmosphere:this.atmosphere.diagnostics}};}
  dispose(){
    this.disposed=true;this.bombs?.forEach(b=>b.removeFromParent());if(this.bombs)this.bombs.length=0;for(const mixer of this.aircraftMixers){mixer.stopAllAction();mixer.uncacheRoot(mixer.getRoot());}for(const m of this.aircraftMaterials??[])m.dispose();this.aircraftSky?.dispose();this.viewModel?.dispose();this.characters?.dispose();
    this.fallbackFx.dispose();this.weaponWorldFx.dispose();this.weaponLighting.dispose();
    this.yardWagons.dispose();this.wagons.dispose();this.locomotive.dispose();this.panzerzugArt.dispose();this.portalPolish?.dispose();this.bridgeStructure?.dispose();this.damageDecals.dispose();this.assets.dispose();this.environment?.dispose();this.atmosphere.dispose();this.contactMaterial?.dispose();this.geometry.forEach(g=>g.dispose());
    const textures=new Set();for(const m of Object.values(this.materials)){if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);m.dispose();}textures.forEach(t=>t.dispose());
    this.scene.traverse(n=>{if(n.isInstancedMesh)n.dispose();});this.scene.clear();this.weaponScene.clear();
  }
}
