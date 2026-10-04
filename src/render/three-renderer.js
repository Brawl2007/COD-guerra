import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CONFIG, UNITS_PER_METRE, EYE_HEIGHT } from '../config.js';
import { toScene, aimDirection } from '../world/spatial.js';
import { AssetManager } from '../assets/asset-manager.js';
import { surface } from './materials.js';
import { M01View } from './m01-view.js';

const QUALITY={low:{ratio:1,shadows:false,particles:70},medium:{ratio:1.25,shadows:true,particles:120},high:{ratio:1.5,shadows:true,particles:180}};
export function initialQuality({saved,cores=0,memory=0,renderer='',maxTexture=0}={}){
  if(Object.hasOwn(QUALITY,saved))return saved;
  return cores>=4&&memory>=4&&maxTexture>=8192&&renderer&&!/swiftshader|llvmpipe|software/i.test(renderer)?'medium':'low';
}
const matrix=new THREE.Object3D();

export class Renderer {
  constructor(canvas){
    this.canvas=canvas;
    const context=canvas.getContext('webgl2',{antialias:true,alpha:false});
    if(!context)throw new Error('O jogo precisa de WebGL 2. Ative a aceleração gráfica no Chrome e tente novamente.');
    this.engine=new THREE.WebGLRenderer({canvas,context,antialias:true});
    this.engine.outputColorSpace=THREE.SRGBColorSpace;
    this.engine.toneMapping=THREE.ACESFilmicToneMapping;this.engine.toneMappingExposure=1.15;
    this.engine.shadowMap.type=THREE.PCFSoftShadowMap;
    this.engine.autoClear=false;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#8d9da0');
    this.scene.fog=new THREE.Fog('#9ba9a8',35,320);
    this.camera=new THREE.PerspectiveCamera(70,1,.05,2000);
    this.weaponScene=new THREE.Scene();this.weaponCamera=new THREE.PerspectiveCamera(58,1,.03,6);
    this.weaponScene.add(new THREE.HemisphereLight('#d8e6ed','#54462f',2.7));
    this.weaponScene.add(new THREE.DirectionalLight('#ffe4bb',2));
    this.scene.add(new THREE.HemisphereLight('#c8d7e0','#5b5740',2.0));
    this.sun=new THREE.DirectionalLight('#ffddaa',2.8);this.sun.position.set(-18,35,-8);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);
    Object.assign(this.sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:.1,far:100});
    this.sun.shadow.bias=-.0004;this.scene.add(this.sun);this.scene.add(this.sun.target);
    this.materials={stone:surface('stone','#8b897e'),brick:surface('brick','#88614b'),wood:surface('wood','#69503a'),
      earth:surface('earth','#72705a'),metal:surface('metal','#454a46'),road:surface('earth','#615e50'),
      plaster:surface('plaster','#b4ab90'),skin:new THREE.MeshStandardMaterial({color:'#a57a59',roughness:.95}),
      cloth:new THREE.MeshStandardMaterial({color:'#666951',roughness:1}),dark:new THREE.MeshStandardMaterial({color:'#252921',roughness:.8}),
      glow:new THREE.MeshBasicMaterial({color:'#ffbc57',toneMapped:false}),
      smoke:new THREE.MeshBasicMaterial({color:'#555951',transparent:true,opacity:.32,depthWrite:false,fog:false})};
    this.geometries={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,8,6),cylinder:new THREE.CylinderGeometry(1,1,1,8)};
    this.assets=new AssetManager();this.models={};this.actorViews=new Map();this.mixers=[];
    this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
    this.effects=new THREE.Group();this.scene.add(this.effects);
    this.weaponRoot=new THREE.Group();this.weaponScene.add(this.weaponRoot);
    this.shake=0;this.muzzleUntil=0;this.lastTime=0;this.disposed=false;this.world=null;
    this.particles=[];this.smokeViews=new Map();this.quality='low';
    let saved;try{saved=localStorage.getItem('cod-guerra:visual-quality');}catch{}
    const debug=context.getExtension('WEBGL_debug_renderer_info');
    this.setQuality(initialQuality({saved,cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory,renderer:debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):'',maxTexture:context.getParameter(context.MAX_TEXTURE_SIZE)}));
    this.createWeapon();this.createHorizon();
    this.particleMesh=new THREE.InstancedMesh(this.geometries.sphere,this.materials.glow,180);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.particleMesh.count=0;
    this.particleMesh.frustumCulled=false;this.effects.add(this.particleMesh);
    this.assetsReady=this.loadModels();this.resize();
  }
  setQuality(quality){
    if(!QUALITY[quality])return;
    this.quality=quality;this.engine.shadowMap.enabled=QUALITY[quality].shadows;this.resize();
  }
  prepareM01(){if(!this.m01)this.m01=new M01View(this);return this.m01;}
  renderMission(sim){this.prepareM01().render(sim);}
  resize(){
    if(!this.engine)return;
    const width=this.canvas.clientWidth||innerWidth,height=this.canvas.clientHeight||innerHeight;
    this.engine.setPixelRatio(Math.min(devicePixelRatio||1,QUALITY[this.quality]?.ratio??1));
    this.engine.setSize(width,height,false);this.camera.aspect=this.weaponCamera.aspect=width/height;
    this.camera.updateProjectionMatrix();this.weaponCamera.updateProjectionMatrix();
  }
  mesh(shape,material,position,scale,parent=this.worldGroup){
    const mesh=new THREE.Mesh(this.geometries[shape],typeof material==='string'?this.materials[material]:material);
    mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=mesh.receiveShadow=true;
    parent.add(mesh);return mesh;
  }
  batchGroup(group){
    const batches=new Map();
    for(const mesh of [...group.children]){
      if(!mesh.isMesh||mesh.isInstancedMesh)continue;
      const key=`${mesh.geometry.uuid}:${mesh.material.uuid}`;
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
    }
    for(const meshes of batches.values()){
      if(meshes.length<2)continue;
      const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
      meshes.forEach((mesh,i)=>{mesh.updateMatrix();batch.setMatrixAt(i,mesh.matrix);group.remove(mesh);});
      batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();group.add(batch);
    }
  }
  async loadModels(){
    const epoch=this.assets.beginSession();
    await Promise.allSettled([['weapon','m1-carbine'],['ally','allied-rifleman'],['enemy','axis-rifleman']].map(async([name,path])=>{
      try{
        const asset=await this.assets.load(name,`assets/models/${path}.obj`);
        if(!this.assets.current(epoch)||this.disposed)return;
        this.models[name]=asset;
        if(name==='weapon')this.createWeapon();
        else{
          for(const [id,view] of this.actorViews)if(view.userData.team===name){this.releaseActor(view);this.actorViews.delete(id);}
        }
      }catch(error){if(!this.disposed)console.warn(`Modelo ${name}: fallback original ativo. ${error.message}`);}
    }));
  }
  buildWorld(world){
    this.world=world;this.worldGroup.traverse(node=>{if(node.isInstancedMesh)node.dispose();});this.worldGroup.clear();
    for(const view of this.actorViews.values())this.releaseActor(view);
    this.actorViews.clear();this.mixers.forEach(m=>m.stopAllAction());this.mixers=[];
    const groups=new Map();
    for(const box of world.obstacles){
      const key=box.material;
      if(!groups.has(key))groups.set(key,[]);groups.get(key).push(box);
    }
    for(const [material,boxes] of groups){
      const batch=new THREE.InstancedMesh(this.geometries.box,this.materials[material]??this.materials.stone,boxes.length);
      boxes.forEach((box,index)=>{
        matrix.position.set((box.min.x+box.max.x)/2,(box.min.y+box.max.y)/2,(box.min.z+box.max.z)/2);
        matrix.scale.set(box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z);matrix.rotation.set(0,0,0);
        matrix.updateMatrix();batch.setMatrixAt(index,matrix.matrix);
      });
      batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();this.worldGroup.add(batch);
    }
    this.mesh('box','earth',[20,-.1,18],[1000,.2,1000]);
    this.mesh('box','road',[20,.002,18],[4,.006,32]);
    // Decorative details sit on solid wall faces; they don't create invisible door openings.
    const tile=CONFIG.tile/UNITS_PER_METRE;
    for(let y=1;y<world.layout.length-1;y++)for(let x=1;x<world.layout[y].length-1;x++){
      if(world.layout[y][x]==='0')continue;
      if(world.layout[y][x-1]==='0'){
        this.mesh('box','dark',[x*tile-.004,1.8,(y+.5)*tile],[.018,.72,.55]);
        this.mesh('box','wood',[x*tile-.018,1.4,(y+.5)*tile-.35],[.025,1.1,.07]);
        this.mesh('box','wood',[x*tile-.018,1.4,(y+.5)*tile+.35],[.025,1.1,.07]);
      }
      if(world.layout[y-1]?.[x]==='0')this.mesh('box','dark',[(x+.5)*tile,1.8,y*tile-.008],[.6,.7,.02]);
    }
    const r=toScene(world.spawns.R?.[0]??{x:0,y:0});
    this.mesh('box','wood',[r.x,.38,r.z],[.8,.75,.5]);
    this.mesh('box','metal',[r.x,.91,r.z],[.48,.3,.34]);
    this.mesh('cylinder','metal',[r.x+.2,1.55,r.z],[.015,1.2,.015]);
    this.batchGroup(this.worldGroup);
    // Clear ephemeral effects after restoring; permanent sector damage is rebuilt from state.
    this.particles=[];for(const smoke of this.smokeViews.values())this.effects.remove(smoke);
    this.smokeViews.clear();this.lastTime=0;
  }
  createHorizon(){
    const backdrop=new THREE.Group();this.scene.add(backdrop);
    const foliage=new THREE.MeshStandardMaterial({color:'#424f39',roughness:1});this.horizonMaterial=foliage;
    for(let i=0;i<26;i++){
      const angle=i/26*Math.PI*2,r=55+i%5*9,x=20+Math.cos(angle)*r,z=18+Math.sin(angle)*r;
      this.mesh('cylinder','wood',[x,3,z],[.32,6,.32],backdrop);
      this.mesh('sphere',foliage,[x,6.2,z],[2.8+i%3,3.8,2.8],backdrop);
    }
    for(let i=0;i<14;i++)this.mesh('sphere',this.materials.earth,[-100+i*48,-9,340+i%3*30],[50,22,36],backdrop);
    this.batchGroup(backdrop);
    this.aircraft=new THREE.Group();
    this.mesh('box','metal',[0,0,0],[7,.4,.65],this.aircraft);
    this.mesh('box','metal',[0,0,0],[.55,.5,5],this.aircraft);
    this.mesh('box','metal',[0,.15,1.9],[2,.18,.55],this.aircraft);
    this.scene.add(this.aircraft);
  }
  createWeapon(){
    this.weaponRoot.clear();
    if(this.models.weapon){
      const model=SkeletonUtils.clone(this.models.weapon.scene);model.scale.setScalar(.48);this.weaponRoot.add(model);
    }else{
      this.mesh('box','wood',[0,-.05,.1],[.1,.09,.5],this.weaponRoot);
      const barrel=this.mesh('cylinder','metal',[0,.01,-.4],[.025,.5,.025],this.weaponRoot);barrel.rotation.x=Math.PI/2;
    }
    this.magazine=this.mesh('box','metal',[0,-.09,-.07],[.055,.12,.08],this.weaponRoot);
    this.leftArm=new THREE.Group();this.rightArm=new THREE.Group();
    this.weaponRoot.add(this.leftArm,this.rightArm);
    for(const [arm,x,z,rotation] of [[this.leftArm,-.13,-.2,-.5],[this.rightArm,.12,.22,.4]]){
      this.mesh('sphere','skin',[x,-.065,z],[.048,.034,.07],arm);
      for(let i=0;i<4;i++)this.mesh('box','skin',[x-.025+i*.016,-.08,z-.035],[.013,.025,.04],arm);
      const sleeve=this.mesh('cylinder','cloth',[x*1.5,-.16,z+.18],[.065,.36,.07],arm);sleeve.rotation.x=1.15;sleeve.rotation.z=rotation;
    }
    this.flash=this.mesh('sphere','glow',[0,.012,-.39],[.06,.045,.12],this.weaponRoot);this.flash.visible=false;
    this.weaponRoot.position.set(.2,-.24,-.65);
  }
  createActor(actor){
    const root=new THREE.Group();root.userData.team=actor.team;root.userData.id=actor.id;
    const variant=Number(actor.id?.match(/\d+$/)?.[0]??0);
    const cloth=new THREE.MeshStandardMaterial({color:actor.team==='enemy'?'#525a4d':'#74704d',roughness:.98});
    root.userData.owned=[cloth];
    if(this.models[actor.team]){
      const body=SkeletonUtils.clone(this.models[actor.team].scene);
      body.traverse(mesh=>{
        if(!mesh.isMesh)return;
        mesh.castShadow=true;
        const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        const adjusted=originals.map(material=>{
          const copy=material.clone();copy.color.offsetHSL((variant%3-.8)*.012,0,(variant%4-1.5)*.025);
          root.userData.owned.push(copy);return copy;
        });
        mesh.material=Array.isArray(mesh.material)?adjusted:adjusted[0];
      });
      root.add(body);
      if(this.models[actor.team].animations.length){
        const mixer=new THREE.AnimationMixer(body);mixer.clipAction(this.models[actor.team].animations[0]).play();this.mixers.push(mixer);
      }
    }else{
      this.mesh('sphere',cloth,[0,1.15,0],[.26,.4,.2],root);
      this.mesh('sphere','skin',[0,1.67,0],[.17,.2,.16],root);
      this.mesh('sphere',cloth,[0,1.84,0],[.22,.1,.2],root);
    }
    const limbs=[];
    for(const x of [-.13,.13]){
      const leg=new THREE.Group();leg.position.set(x,.88,0);
      this.mesh('cylinder',cloth,[0,-.35,0],[.09,.68,.095],leg);
      this.mesh('box','dark',[0,-.72,-.05],[.19,.18,.32],leg);root.add(leg);limbs.push(leg);
    }
    for(const x of [-.3,.3]){
      const arm=new THREE.Group();arm.position.set(x,1.38,0);
      this.mesh('cylinder',cloth,[0,-.24,-.07],[.075,.48,.075],arm);
      this.mesh('sphere','skin',[0,-.46,-.12],[.07,.07,.08],arm);root.add(arm);limbs.push(arm);
    }
    const rifle=this.mesh('box','wood',[.18,1.1,-.4],[.06,.08,.8],root);
    const flash=this.mesh('sphere','glow',[.18,1.1,-.84],[.08,.08,.15],root);flash.visible=false;
    root.userData.limbs=limbs;root.userData.flash=flash;root.userData.rifle=rifle;
    root.userData.phase=variant*1.83;this.scene.add(root);this.actorViews.set(actor.id,root);return root;
  }
  releaseActor(view){view.userData.owned?.forEach(m=>m.dispose());this.scene.remove(view);}
  render(world,player,actors,radio,weapon,grenades,time,battle){
    if(this.disposed)return;
    if(this.world!==world)this.buildWorld(world);
    const dt=Math.max(0,Math.min(.05,(time-this.lastTime)/1000));this.lastTime=time;
    const p=toScene(player),dir=aimDirection(player.angle,player.pitch);
    const bob=player.moveBlend*Math.sin(time*.011)*.012;
    const shake=Math.sin(time*.08)*this.shake*.001;
    this.shake=Math.max(0,this.shake-dt*28);
    this.camera.position.set(p.x,EYE_HEIGHT+bob+shake,p.z);
    this.camera.lookAt(p.x+dir.x,EYE_HEIGHT+bob+shake+dir.y,p.z+dir.z);
    const desiredFov=player.aiming?52:70;
    if(Math.abs(this.camera.fov-desiredFov)>.1){this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,desiredFov,Math.min(1,dt*10));this.camera.updateProjectionMatrix();}
    this.sun.target.position.set(p.x,0,p.z);this.sun.position.set(p.x-18,35,p.z-8);
    const ids=new Set();
    for(const actor of actors){
      if(actor.active===false)continue;
      ids.add(actor.id);const view=this.actorViews.get(actor.id)??this.createActor(actor),pos=toScene(actor);
      const crouch=actor.crouched&&actor.alive?.48:0;
      view.position.set(pos.x,actor.alive?-crouch:.22,pos.z);
      view.rotation.set(0,-actor.facing-Math.PI/2,actor.deathBlend*Math.PI*.48);
      const walk=['ADVANCE','MOVE_TO_COVER','FLANK','RETREAT'].includes(actor.state)&&actor.alive;
      const phase=time*.008+view.userData.phase;
      view.userData.limbs.forEach((limb,i)=>{limb.rotation.x=walk?Math.sin(phase+(i%2)*Math.PI)*.45:i>1&&actor.alive?-1.05:0;});
      view.userData.flash.visible=actor.alive&&actor.shot>0;
    }
    for(const [id,view] of this.actorViews)if(!ids.has(id)){this.releaseActor(view);this.actorViews.delete(id);}
    this.mixers.forEach(mixer=>mixer.update(dt));
    this.updateWeapon(player,weapon,time,dt);
    this.updateEffects(time,battle);
    const angle=time*.00001;this.aircraft.position.set(80-Math.sin(angle)*200,100,20+Math.cos(angle)*240);this.aircraft.rotation.y=-angle;
    if(!this.grenadeViews)this.grenadeViews=new Map();
    const grenadeIds=new Set(grenades.map(g=>g.id));
    for(const g of grenades){
      let view=this.grenadeViews.get(g.id);
      if(!view){view=this.mesh('sphere','metal',[0,0,0],[.075,.075,.075],this.effects);this.grenadeViews.set(g.id,view);}
      view.position.set(g.x/UNITS_PER_METRE,g.height/UNITS_PER_METRE,g.y/UNITS_PER_METRE);
    }
    for(const [id,view] of this.grenadeViews)if(!grenadeIds.has(id)){this.effects.remove(view);this.grenadeViews.delete(id);}
    this.engine.info.autoReset=false;this.engine.info.reset();this.engine.clear();
    this.engine.render(this.scene,this.camera);this.engine.clearDepth();this.engine.render(this.weaponScene,this.weaponCamera);
  }
  updateWeapon(player,weapon,time,dt){
    const progress=weapon.reloadProgress(time),arc=Math.sin(progress*Math.PI);
    const age=time-player.weaponShotAt,recoil=age>=0&&age<180?Math.exp(-age/60)*.06:0;
    const bob=player.moveBlend*Math.sin(time*(player.sprinting?.015:.01))*.012;
    const goal=player.aiming?0:.2;
    this.weaponRoot.position.x=THREE.MathUtils.lerp(this.weaponRoot.position.x,goal,Math.min(1,dt*12));
    this.weaponRoot.position.y=(player.aiming?-.1:-.24)-arc*.15+Math.abs(bob);
    this.weaponRoot.position.z=-.65+recoil;
    this.weaponRoot.rotation.set(arc*.24,0,arc*.35+(player.sprinting?.15:0));
    this.leftArm.position.y=-Math.sin(progress*Math.PI)*.08;
    this.magazine.position.y=-.09-arc*.1;
    this.flash.visible=time<this.muzzleUntil;
  }
  updateEffects(time,battle){
    this.particles=this.particles.filter(p=>time-p.born<p.life).slice(-QUALITY[this.quality].particles);
    this.particleMesh.count=this.particles.length;
    this.particles.forEach((p,i)=>{
      const age=(time-p.born)/1000;
      matrix.position.set(p.x+p.vx*age,Math.max(.025,p.y+p.vy*age-3*age*age),p.z+p.vz*age);
      matrix.rotation.set(0,0,0);matrix.scale.setScalar(p.size*(1-age/(p.life/1000)));
      matrix.updateMatrix();this.particleMesh.setMatrixAt(i,matrix.matrix);this.particleMesh.setColorAt(i,new THREE.Color(p.color));
    });
    this.particleMesh.instanceMatrix.needsUpdate=true;if(this.particleMesh.instanceColor)this.particleMesh.instanceColor.needsUpdate=true;
    for(const damage of battle?.damage??[]){
      let view=this.smokeViews.get(damage.id);
      if(!view){
        view=new THREE.Group();
        for(let i=0;i<8;i++)this.mesh('sphere','smoke',[Math.sin(i*2)*3,2+i*3,Math.cos(i)*3],[3+i*.65,2.3+i*.8,3+i*.6],view);
        this.effects.add(view);this.smokeViews.set(damage.id,view);
      }
      view.position.set(damage.x,0,damage.z);view.rotation.y=(time/1000-damage.started)*.008;
    }
  }
  impact(x,y,material='stone',height=1,time=this.lastTime){
    const colors={wood:'#a7854e',stone:'#ccc9b7',earth:'#8b7650',metal:'#ffd57e',character:'#7d3028'};
    for(let i=0;i<9;i++)this.particles.push({x:x/UNITS_PER_METRE,y:height,z:y/UNITS_PER_METRE,
      vx:(Math.random()-.5)*1.4,vy:Math.random()*2,vz:(Math.random()-.5)*1.4,born:time,life:450,size:.035,color:colors[material]??colors.stone});
  }
  explosion(x,y,height=0,time=this.lastTime){
    for(let i=0;i<42;i++)this.particles.push({x:x/UNITS_PER_METRE,y:height,z:y/UNITS_PER_METRE,
      vx:(Math.random()-.5)*7,vy:1+Math.random()*5,vz:(Math.random()-.5)*7,born:time,life:1100,size:.08,color:i<14?'#ffb450':'#736654'});
    this.shake=12;
  }
  muzzle(now){this.muzzleUntil=now+60;this.shake=2;}
  resetEffects(){this.particles=[];this.muzzleUntil=0;this.shake=0;this.m01?.resetEffects();}
  get diagnostics(){return {renderer:'Three.js',quality:this.quality,drawCalls:this.engine.info.render.calls,
    triangles:this.engine.info.render.triangles,geometries:this.engine.info.memory.geometries,textures:this.engine.info.memory.textures,
    assetFailures:this.assets.failures,models:Object.keys(this.models)};}
  dispose(){
    if(this.disposed)return;this.disposed=true;
    this.mixers.forEach(m=>m.stopAllAction());this.assets.dispose();this.m01?.dispose();
    for(const view of this.actorViews.values())this.releaseActor(view);
    Object.values(this.geometries).forEach(g=>g.dispose());
    this.scene.traverse(node=>{if(node.isInstancedMesh)node.dispose();});
    Object.values(this.materials).forEach(m=>{m.map?.dispose();m.dispose();});this.horizonMaterial.dispose();
    this.scene.clear();this.weaponScene.clear();this.engine.dispose();
  }
}
