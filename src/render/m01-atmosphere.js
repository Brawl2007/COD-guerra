import * as THREE from 'three';
import {puffTexture,cloudFieldTexture} from './m01-surfaces.js';
import {dustPuffTexture} from './m01-fx-textures.js';
import {CLOUD_WIND} from './m01-lighting.js';
import {demolitionParticles} from './m01-demolition.js';
import {train963Kinematics,isTrain963Visible} from './m01-locomotive.js';
import {panzerzugKinematics,isPanzerzugVisible} from './m01-panzerzug.js';

// T24 (Gemini/Argon, M01-TRAIN-ARRIVAL-AND-LIFE-V1): railway smoke and steam share the existing 256-puff pool (no extra draw call).
// The single railway puff cap: m01-train-life.js re-exports it as TRAIN_PUFF_CAP (Codex partials name); there is no second train emitter.
export const RAILWAY_PUFF_BUDGET=Object.freeze({low:12,medium:18,high:24});
// Chimney anchors relative to each train's canonical x (963 smokebox chimney; Panzerzug armoured engine mid-consist).
// M01TrainLife publishes its puff sources at exactly these anchors; the emitter below uses the same constants.
export const RAILWAY_SMOKE_ANCHOR_X=Object.freeze({train963:-5.2,panzerzug:38});

// Presentation-only deterministic noise. It never consumes the simulation RNG.
export function visualNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}

// Bounded presentation pools. All emitters come from the simulation's damage/events.
export class M01Atmosphere {
  constructor(scene){
    this.scene=scene;this.texture=puffTexture();this.capacity=256;this.count=0;this.smokeByDamage={};this.railwayPuffs=0;this.trainPuffs=0;this.lastQuality='medium';
    this.skyGeometry=new THREE.SphereGeometry(5500,32,16);
    this.cloudTexture=cloudFieldTexture();
    // Sky by solar altitude: every colour comes from m01-lighting's model. Clouds are projected from the view direction
    // (xz / (y + k)) onto a plane, so there is no sphere-UV seam and no pinch at the zenith.
    this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
      uniforms:{clouds:{value:this.cloudTexture},time:{value:0},sunDirection:{value:new THREE.Vector3(1,-.1,0)},
        skyZenith:{value:new THREE.Color('#2f4468')},skyHorizon:{value:new THREE.Color('#6f8096')},skyHalo:{value:new THREE.Color('#d9946e')},
        skyDisc:{value:new THREE.Color('#ffc08a')},skyGlow:{value:.5},discStrength:{value:0},day:{value:0},cloudWind:{value:new THREE.Vector2(CLOUD_WIND.x,CLOUD_WIND.z)}},
      vertexShader:'varying vec3 vDirection;void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform sampler2D clouds;uniform float time;uniform float day;uniform float skyGlow;uniform float discStrength;uniform vec3 sunDirection;
        uniform vec3 skyZenith;uniform vec3 skyHorizon;uniform vec3 skyHalo;uniform vec3 skyDisc;uniform vec2 cloudWind;varying vec3 vDirection;
        void main(){
          vec3 d=normalize(vDirection);vec3 sd=normalize(sunDirection);float h=clamp(d.y,0.0,1.0);
          float toSun=max(0.0,dot(d,sd));
          // Fog tint by view direction: the horizon band warms towards the sun's azimuth and stays the fog colour away from it.
          vec2 viewAz=normalize(d.xz+vec2(1e-5,0.0)),sunAz=normalize(sd.xz+vec2(1e-5,0.0));
          float towards=pow(dot(viewAz,sunAz)*.5+.5,3.0);
          float band=exp(-h*9.0);
          vec3 color=mix(skyHorizon,skyZenith,pow(h,.55));
          color=mix(color,skyHalo,clamp(towards*band*skyGlow*.62,0.0,.85));
          color+=skyHalo*pow(toSun,6.0)*skyGlow*.20*(1.0-h*.6);
          float cloudShape=1.0/(max(d.y,0.0)+.32);
          vec2 cuv=d.xz*cloudShape*.62+cloudWind*time;
          float c=texture2D(clouds,cuv).r;
          float cloud=smoothstep(.33,.68,c)*smoothstep(-.03,.15,d.y);
          vec3 cloudShade=skyHorizon*.60+skyZenith*.12;
          vec3 cloudLit=skyHorizon*1.12+vec3(.03)*day;
          vec3 cloudColor=mix(cloudShade,cloudLit,c)*(.64+day*.36);
          cloudColor+=skyHalo*pow(toSun,3.0)*skyGlow*.55*c;
          color=mix(color,cloudColor,cloud*.66);
          float disc=smoothstep(.99985,.99996,toSun);
          color+=skyDisc*(disc*4.0+pow(toSun,60.0)*.9)*discStrength*(1.0-cloud*.75);
          gl_FragColor=vec4(color,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.sky=new THREE.Mesh(this.skyGeometry,this.skyMaterial);this.sky.frustumCulled=false;this.sky.renderOrder=-100;scene.add(this.sky);
    this.quad=new THREE.PlaneGeometry(1,1);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      uniforms:{cloud:{value:this.texture},fogColor:{value:new THREE.Color('#869093')}},
      vertexShader:`attribute float puffOpacity;attribute float puffSpin;attribute float puffShape;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vDepth;varying float vShape;
        void main(){vUv=uv;vOpacity=puffOpacity;vColor=instanceColor;vShape=puffShape;
          vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
          float sx=length(instanceMatrix[0].xyz),sy=length(instanceMatrix[1].xyz);vec2 local=position.xy;float cs=cos(puffSpin),sn=sin(puffSpin);
          local=mat2(cs,-sn,sn,cs)*local;local*=vec2(1.0+abs(puffShape)*.12,1.0-abs(puffShape)*.055);
          center.xy+=local*vec2(sx,sy);vDepth=-center.z;gl_Position=projectionMatrix*center;}`,
      fragmentShader:`uniform sampler2D cloud;uniform vec3 fogColor;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vDepth;varying float vShape;
        void main(){vec2 sampleUv=vUv-.5;sampleUv.x+=sin(sampleUv.y*8.0+vShape*5.0)*.028*vShape;sampleUv.y+=sin(sampleUv.x*6.0-vShape*3.0)*.018*vShape;sampleUv+=.5;vec4 tex=texture2D(cloud,sampleUv);float edge=sin(vUv.x*31.0+vUv.y*17.0+vShape*4.7)*sin(vUv.y*27.0-vUv.x*13.0-vShape*3.1);float alpha=tex.a*vOpacity*(.80+.20*edge);if(alpha<.006)discard;
          vec3 color=mix(vColor*tex.rgb,fogColor,smoothstep(500.0,2700.0,vDepth));gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.dustTexture=dustPuffTexture();this.dustMaterial=this.material.clone();this.dustMaterial.uniforms.cloud.value=this.dustTexture;
    this.puffBatches=[];this.puffs=this.billboardBatch(this.capacity,'#ffffff',scene);
    this.debrisGeometry=new THREE.TetrahedronGeometry(1);this.debrisMaterial=new THREE.MeshStandardMaterial({color:'#615846',roughness:1});
    this.debris=new THREE.InstancedMesh(this.debrisGeometry,this.debrisMaterial,64);this.debris.count=0;this.debris.frustumCulled=false;scene.add(this.debris);
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.fade=this.puffs.geometry.attributes.puffOpacity;
    this.demolitionDrawn={puffs:0,chips:0};   // set-piece particles drawn by the last update (diagnostics only)
  }
  /** Camera-facing soft particles share one material/texture; each bounded pool owns its opacity buffer. */
  billboardBatch(capacity,color,parent,style='smoke'){
    const geometry=this.quad.clone(),opacity=new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1),1),
      spin=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1),shape=new THREE.InstancedBufferAttribute(new Float32Array(capacity),1);
    opacity.setUsage(THREE.DynamicDrawUsage);spin.setUsage(THREE.DynamicDrawUsage);shape.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('puffOpacity',opacity);geometry.setAttribute('puffSpin',spin);geometry.setAttribute('puffShape',shape);
    const batch=new THREE.InstancedMesh(geometry,style==='dust'?this.dustMaterial:this.material,capacity);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.frustumCulled=false;
    const tint=new THREE.Color(color);for(let i=0;i<capacity;i++)batch.setColorAt(i,tint);
    parent.add(batch);this.puffBatches.push(batch);return batch;
  }
  stylePuff(batch,index,seed,variant=0){
    const spin=batch.geometry.attributes.puffSpin,shape=batch.geometry.attributes.puffShape;
    if(!spin||!shape)return;
    spin.setX(index,(visualNoise(seed,variant*3)-.5)*Math.PI*1.7);
    shape.setX(index,(visualNoise(seed,variant*3+1)*2-1)*(.45+.55*visualNoise(seed,variant*3+2)));
  }
  /** Sky uniforms from the lighting model (m01-lighting.js); the dome follows the player. */
  lighting(player,model,clock){
    const u=this.skyMaterial.uniforms,sky=model.sky;
    this.sky.position.set(player.x,player.y,player.z);
    u.day.value=model.daylight;u.time.value=clock;
    u.skyZenith.value.setRGB(...sky.zenith);u.skyHorizon.value.setRGB(...sky.horizon);u.skyHalo.value.setRGB(...sky.halo);u.skyDisc.value.setRGB(...sky.disc);
    u.skyGlow.value=sky.glow;u.discStrength.value=sky.discStrength;u.sunDirection.value.set(...sky.sunDir);
    this.material.uniforms.fogColor.value.setRGB(...model.fog.color);this.dustMaterial.uniforms.fogColor.value.setRGB(...model.fog.color);
  }
  /** Railway puffs for this frame, decided before damage so the damage pass can leave exactly this room. Presentation only. */
  railwayPlan(state,clock,quality,context={}){
    const battleClock=state?.battleClock;
    // Only a real simulation render state (it carries battleClock) emits railway life; bare damage fixtures stay unchanged.
    // context.railwaySmoke===false is the ?debug lamp/smoke A/B switch (M01View.trainSmokeEnabled).
    if(!Number.isFinite(battleClock)||context.railwaySmoke===false)return {battleClock:null,budget:0,west:0,smoke:0,steam:0,pz:0,total:0};
    const budget=RAILWAY_PUFF_BUDGET[quality]??RAILWAY_PUFF_BUDGET.medium;
    // M01TrainLife's puff sources gate the train emitters when supplied (same arrival-or-flag rule); bare states use the same rule directly.
    const sources=Array.isArray(context.trainSources)?context.trainSources:null,active=id=>Boolean(sources.find(s=>s.id===id)?.active);
    const trainVis=sources?active('train963'):isTrain963Visible(battleClock,Boolean(state.train963)),pzVis=sources?active('panzerzug'):isPanzerzugVisible(battleClock,Boolean(state.panzerzug));
    let used=0;const west=Math.min(2,budget);used+=west;
    let smoke=0,steam=0,pz=0;
    if(trainVis&&used<budget){
      const kin=train963Kinematics(battleClock,Boolean(state.train963));
      const pzShare=pzVis?Math.max(3,Math.floor((budget-used)*0.35)):0,quota=Math.max(0,budget-used-pzShare);
      steam=kin.arriving?Math.min(3,Math.floor(quota*0.35)):1;smoke=Math.max(0,quota-steam);used+=smoke+steam;
    }
    if(pzVis&&used<budget){pz=budget-used;used+=pz;}
    return {battleClock,budget,west,smoke,steam,pz,total:used};
  }
  emitRailwayPuffs(state,clock,plan,count,max){
    const battleClock=plan.battleClock;let used=0;this.trainPuffs=0;if(plan.total===0){this.railwayPuffs=0;return count;}

    // 1. West Station yard shunting locomotive idling plume ("manobra parada a oeste")
    const westQuota=plan.west;
    for(let i=0;i<westQuota&&count<max;i++){
      const seed=0x7261696c^(i*131);
      const n0=visualNoise(seed,0),n1=visualNoise(seed,1);
      const phase=((clock*0.032)+(i/Math.max(1,westQuota))+n0*0.11)%1;
      const height=3.8+22.0*phase;
      const width=4.2+8.5*phase;
      const x=-292+(n0-0.5)*width*0.6+height*0.18;
      const z=-18+(n1-0.5)*width*0.5;
      const opacity=0.42*(1-phase*0.65)*Math.min(1,phase/0.15);
      this.dummy.position.set(x,height,z);this.dummy.rotation.set(0,0,0);
      this.dummy.scale.set(width,width*0.92,1);this.dummy.updateMatrix();
      this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,seed,i);
      this.puffs.setColorAt(count,this.color.set('#7a7d7e'));this.fade.setX(count,opacity);
      count++;used++;
    }
    const westUsed=used;   // Codex's trainPuffs diagnostic counts only the two trains' smoke/steam

    // 2. Train 963 coal chimney plume & cylinder/brake steam
    if(plan.smoke+plan.steam>0){
      const kin=train963Kinematics(battleClock,Boolean(state.train963));
      const steamCount=plan.steam,smokeCount=plan.smoke;

      for(let i=0;i<smokeCount&&count<max;i++){
        const seed=0x963000^(i*197);
        const n0=visualNoise(seed,0),n1=visualNoise(seed,1),n2=visualNoise(seed,2);
        const rate=kin.arriving?0.065:0.034;
        const phase=((clock*rate)+(i/Math.max(1,smokeCount))+n0*0.08)%1;
        const height=4.4+(kin.arriving?42:32)*phase;
        const width=(5.2+14.5*phase)*(0.82+n1*0.36);
        const trailDrag=kin.arriving?phase*kin.speed*3.2:0;
        const x=(kin.x+RAILWAY_SMOKE_ANCHOR_X.train963)+trailDrag+height*0.15+(n0-0.5)*width*0.55;
        const z=kin.z+(n1-0.5)*width*0.50;
        const cycleFade=Math.min(1,phase/0.12,(1-phase)/0.18);
        const opacity=(kin.arriving?0.78:0.62)*(1-phase*0.48)*cycleFade;
        this.dummy.position.set(x,height,z);this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(width,width*(0.92+n2*0.25),1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,seed,i);
        const shade=phase<0.35?'#2e2c2a':phase<0.72?'#484542':'#686560';
        this.puffs.setColorAt(count,this.color.set(shade));this.fade.setX(count,opacity);
        count++;used++;
      }

      for(let i=0;i<steamCount&&count<max;i++){
        const seed=0x963555^(i*251);
        const side=i%2===0?1:-1;
        const phase=((clock*(kin.arriving?0.18:0.06))+(i*0.37))%1;
        const x=(kin.x-4.2)+phase*(kin.arriving?5.5:2.2);
        const y=0.75+phase*3.4;
        const z=kin.z+side*(1.55+phase*3.8);
        const width=2.4+phase*5.2;
        const opacity=(kin.arriving?0.68:0.44)*(1-phase*0.75);
        this.dummy.position.set(x,y,z);this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(width*1.15,width*0.78,1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,seed,i);
        this.puffs.setColorAt(count,this.color.set('#dce2e6'));this.fade.setX(count,opacity);
        count++;used++;
      }
    }

    // 3. Panzerzug 7 armored locomotive smoke/steam column
    if(plan.pz>0){
      const kin=panzerzugKinematics(battleClock,Boolean(state.panzerzug));
      const pzQuota=plan.pz;
      for(let i=0;i<pzQuota&&count<max;i++){
        const seed=0x505a3037^(i*173);
        const n0=visualNoise(seed,0),n1=visualNoise(seed,1);
        const phase=((clock*(kin.arriving?0.058:0.032))+(i/Math.max(1,pzQuota))+n0*0.09)%1;
        const height=4.2+(kin.arriving?36:27)*phase;
        const width=4.8+12.0*phase;
        const x=(kin.x+RAILWAY_SMOKE_ANCHOR_X.panzerzug)+(kin.arriving?phase*kin.speed*2.6:0)+height*0.14+(n0-0.5)*width*0.5;
        const z=kin.z+(n1-0.5)*width*0.45;
        const cycleFade=Math.min(1,phase/0.12,(1-phase)/0.18);
        const opacity=(kin.arriving?0.74:0.58)*(1-phase*0.50)*cycleFade;
        this.dummy.position.set(x,height,z);this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(width,width*0.95,1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,seed,i);
        this.puffs.setColorAt(count,this.color.set(i===0&&kin.arriving?'#cfd6da':'#3d3c3a'));
        this.fade.setX(count,opacity);
        count++;used++;
      }
    }

    this.railwayPuffs=used;this.trainPuffs=used-westUsed;
    return count;
  }
  update(state,clock,quality,context={}){
    for(const id in this.smokeByDamage)this.smokeByDamage[id]=0;
    this.lastQuality=quality;
    let count=0,chips=0;this.demolitionDrawn={puffs:0,chips:0};const density=quality==='low'?.58:quality==='medium'?.80:1,max=quality==='low'?112:quality==='medium'?192:256;
    // Railway puffs (T24) take their room from the same pool first; with no railway state damageMax===max and nothing changes.
    const plan=this.railwayPlan(state,clock,quality,context),damageMax=Math.max(0,max-plan.total);
    const damage=state.damage.filter(d=>d.smokeVisible).sort((a,b)=>Number(b.id.endsWith('_demolition'))-Number(a.id.endsWith('_demolition'))||b.started-a.started);
    // Demolition set-piece first (priority over generic blasts): river/ground impact debris and splashes, earth rain at the west
    // firing post, suspended dust. Bounded by M01_DEMOLITION_BUDGET inside the same pools and the same `count<damageMax` / `chips<64` guards.
    for(const d of damage){
      if(d.id!=='east_demolition'&&d.id!=='west_demolition')continue;
      const fx=demolitionParticles({damage:d,clock,quality,surfaceY:context.surfaceY});
      for(const p of fx.puffs){
        if(count>=damageMax)break;
        this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(0,0,0);this.dummy.scale.set(p.sx,p.sy,1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,p.seed,p.variant);
        this.puffs.setColorAt(count,this.color.set(p.color));this.fade.setX(count++,p.opacity);this.demolitionDrawn.puffs++;
      }
      for(const c of fx.chips){
        if(chips>=64)break;
        this.dummy.position.set(c.x,c.y,c.z);this.dummy.rotation.set(c.rx,c.ry,c.rz);this.dummy.scale.set(c.sx,c.sy,c.sz);this.dummy.updateMatrix();
        this.debris.setMatrixAt(chips++,this.dummy.matrix);this.demolitionDrawn.chips++;
      }
    }
    for(const d of damage){
      const demolition=d.id.endsWith('_demolition'),heavy=demolition||/bomb|raid/.test(d.id),age=Math.max(0,clock-d.started);
      const base=demolition?30:heavy?22:17,number=Math.max(6,Math.round(base*density));
      const seed=(Math.floor((d.x+2048)*17)^Math.floor((d.z+2048)*31)^Math.floor(d.started*1000))>>>0;
      const endFade=d.id.startsWith('m01_grenade_')?Math.max(0,Math.min(1,(20-age)/5)):
        d.id==='station_bomb'||d.id==='station_wagon_fire'||/^raid_0530(?:_[1-5])?$/.test(d.id)?1:Math.max(0,Math.min(1,(240-age)/30));
      for(let i=0;i<number&&count<damageMax;i++){
        const n0=visualNoise(seed,i*5),n1=visualNoise(seed,i*5+1),n2=visualNoise(seed,i*5+2),n3=visualNoise(seed,i*5+3);
        let phase,height,width,x,z,opacity;
        if(demolition){
          const localAge=Math.max(0,age-i/number*4.5);if(localAge<=0)continue;
          phase=Math.min(1,localAge/(17+n0*11));height=(18+92*phase)*(.76+n1*.42);
          width=(9+31*phase)*(.78+n2*.48)*(1+Math.min(age,150)/320);
          x=d.x+(n0-.5)*width*.85+height*(.10+n1*.13)+Math.sin(age*(.10+n2*.08)+i*1.7)*width*.13;
          z=d.z+(n1-.5)*width*.85+Math.cos(age*(.08+n0*.07)+i*1.3)*width*.12;
          opacity=.68*(1-phase*.48)*Math.min(1,localAge/1.4)*endFade;
        }else{
          const speed=.020+n0*.018;phase=(age*speed+(i+.5)/number+n1*.09)%1;
          const grenade=d.id.startsWith('m01_grenade_');
          height=(grenade?2.2+n2:31+n2*20)*phase;width=(grenade?1.5+phase*2:6+n3*7+(8+n1*8)*phase)*(heavy?1.25:1);
          x=d.x+(n0-.5)*width+height*(.16+n1*.09)+Math.sin(age*(.12+n2*.11)+i*1.9)*width*.16;
          z=d.z+(n1-.5)*width+Math.cos(age*(.10+n0*.09)+i*1.5)*width*.14;
          const cycleFade=Math.min(1,phase/.13,(1-phase)/.20);
          opacity=(heavy?.72:.64)*(1-phase*.55)*Math.min(1,age/1.8+.25)*cycleFade*endFade;
        }
        this.dummy.position.set(x,d.y+2.5+height,z);this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(width*(.72+n2*.55),width*(.95+n3*.72),1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,seed,i);
        const shade=demolition?(phase<.28?'#5a5145':phase<.68?'#777166':'#969188'):heavy?(i%3?'#68655e':'#4b4944'):(i%4===0?'#41413d':'#666965');
        this.puffs.setColorAt(count,this.color.set(shade));this.fade.setX(count,opacity);count++;this.smokeByDamage[d.id]=(this.smokeByDamage[d.id]??0)+1;
      }
    }
    for(const d of damage){
      const age=clock-d.started;if(age<0||age>3.2)continue;
      const heavy=d.id.endsWith('_demolition')||/bomb|raid/.test(d.id),seed=(Math.floor(d.started*1000)^Math.floor(d.x*97)^Math.floor(d.z*193))>>>0;
      const number=Math.max(4,Math.round((heavy?28:18)*density));
      for(let i=0;i<number&&chips<64;i++){
        const n0=visualNoise(seed,i*4),n1=visualNoise(seed,i*4+1),n2=visualNoise(seed,i*4+2),a=i*2.399+n0*1.7;
        const speed=(heavy?7.5:4.2)*(.45+n1*.85),r=speed*age;
        this.dummy.position.set(d.x+Math.cos(a)*r,d.y+.32+(heavy?8.5:5.8)*(.55+n2*.7)*age-4.9*age*age,d.z+Math.sin(a)*r);
        this.dummy.rotation.set(age*(2+i*.7),a+n1,age*(3+n0*4));
        const s=(.055+n2*.18)*(heavy?1.15:1)*Math.max(.2,1-age/3.2);this.dummy.scale.set(s,s*(.45+n0*.55),s*(.7+n1*.6));this.dummy.updateMatrix();
        this.debris.setMatrixAt(chips++,this.dummy.matrix);
      }
      const dustN=Math.max(2,Math.round((heavy?8:6)*density));
      for(let i=0;i<dustN&&count<damageMax;i++){
        const n0=visualNoise(seed,200+i*3),n1=visualNoise(seed,201+i*3),a=i*2.399+n0*1.8;
        const r=age*(heavy?10:6.5)*(.55+n1*.65),fade=Math.max(0,1-age/(heavy?3.2:2.4)),w=(heavy?4.8:2.8)+age*(heavy?8:4.5);
        this.dummy.rotation.set(0,0,0);this.dummy.position.set(d.x+Math.cos(a)*r,d.y+.45+age*(.45+n0*.65),d.z+Math.sin(a)*r);
        this.dummy.scale.set(w*(.75+n0*.5),w*(.42+n1*.35),1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.stylePuff(this.puffs,count,seed,200+i);this.puffs.setColorAt(count,this.color.set(heavy?'#9e8d72':'#aa9a81'));this.fade.setX(count++,.48*fade);
      }
    }
    count=this.emitRailwayPuffs(state,clock,plan,count,max);
    this.debris.count=chips;this.debris.instanceMatrix.needsUpdate=true;this.dummy.rotation.set(0,0,0);
    this.count=count;this.puffs.count=count;this.puffs.instanceMatrix.needsUpdate=true;this.puffs.instanceColor.needsUpdate=true;this.fade.needsUpdate=true;
  }
  get diagnostics(){return {puffs:this.count,puffCapacity:this.capacity,railwayPuffs:this.railwayPuffs,trainPuffs:this.trainPuffs,railwayBudget:RAILWAY_PUFF_BUDGET[this.lastQuality]??RAILWAY_PUFF_BUDGET.medium,smokeByDamage:{...this.smokeByDamage},debris:this.debris.count,debrisCapacity:this.debris.instanceMatrix.count,puffBatches:this.puffBatches.length,demolition:{...this.demolitionDrawn}};}
  dispose(){this.scene.remove(this.sky);this.debris.removeFromParent();this.debris.dispose();this.debrisGeometry.dispose();this.debrisMaterial.dispose();for(const batch of this.puffBatches){batch.removeFromParent();batch.dispose();batch.geometry.dispose();}this.puffBatches=[];
    this.quad.dispose();this.skyGeometry.dispose();this.skyMaterial.dispose();this.material.dispose();this.dustMaterial.dispose();this.texture.dispose();this.dustTexture.dispose();this.cloudTexture.dispose();}
}
