import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {visualNoise} from './m01-atmosphere.js';
import {DISTANT_LIMITS,DISTANT_SEED,planDistantBattlefield,squadFigures} from './m01-distant-battlefield-plan.js';

// Renders the distant battlefield plan. PRESENTATION ONLY: it reads the simulation clock, consumed events and
// ground height (read-only), never writes to the simulation and never takes part in damage, visibility or AI.
const DENSITY={low:.55,medium:.8,high:1};
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const BAND=d=>d<1200?'mid':d<2600?'far':'horizon';

// Glow with a minimum on-screen size: a flash 1 km away must stay a readable point, dimmed instead of lost. Distant
// flashes sit on the horizon band against a bright sky, where additive light vanishes, so they are blended over the
// background: a saturated warm halo gives hue contrast by day and a hot core still reads at dawn.
const glowVertex=`attribute float aOpacity;uniform float pixel;uniform float minPixels;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;
void main(){vUv=uv;vColor=instanceColor;vec4 c=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  float size=length(instanceMatrix[0].xyz),depth=max(.001,-c.z),grow=max(1.,minPixels*pixel*depth/max(size,1e-5));
  vOpacity=aOpacity*clamp(3.5/grow,.8,1.)*exp(-depth/7000.);c.xy+=position.xy*size*grow;gl_Position=projectionMatrix*c;}`;
const glowFragment=`varying vec2 vUv;varying vec3 vColor;varying float vOpacity;
void main(){float r=length(vUv-.5)*2.;float core=exp(-r*r*5.),a=min(1.,(core+exp(-r*r*2.)*.5)*vOpacity);if(a<.003)discard;
  gl_FragColor=vec4(mix(vColor,vec3(1.,.96,.82),core*.7),a);
  #include <colorspace_fragment>
}`;
// Tracer streak: a quad laid along the round's view-space path, widened to a minimum pixel width.
const streakVertex=`attribute float aOpacity;attribute vec3 aDir;uniform float pixel;uniform float minPixels;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;
void main(){vUv=uv;vColor=instanceColor;vOpacity=aOpacity;vec4 c=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  vec3 d=(modelViewMatrix*vec4(aDir,0.)).xyz;vec2 dir=normalize(d.xy+vec2(1e-6,0.)),perp=vec2(-dir.y,dir.x);
  float depth=max(.001,-c.z),width=max(length(instanceMatrix[1].xyz),minPixels*pixel*depth);
  vOpacity*=exp(-depth/6500.);gl_Position=projectionMatrix*vec4(c.xyz+d*position.x+vec3(perp*position.y*width,0.),1.);}`;
const streakFragment=`varying vec2 vUv;varying vec3 vColor;varying float vOpacity;
void main(){float across=exp(-pow((vUv.y-.5)*2.,2.)*2.2),along=smoothstep(0.,.8,vUv.x)*(1.-smoothstep(.96,1.,vUv.x));float a=min(1.,across*along*vOpacity*1.3);
  if(a<.003)discard;gl_FragColor=vec4(mix(vColor,vec3(1.,.9,.7),.45*smoothstep(.85,1.,vUv.x)),a);
  #include <colorspace_fragment>
}`;

function quadBatch(material,capacity,attributes,parent,name){
  const geometry=new THREE.PlaneGeometry(1,1);
  for(const [key,size]of Object.entries(attributes)){const a=new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size);a.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(key,a);}
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=3;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,new THREE.Color());parent.add(mesh);return mesh;
}
/** Fallback soft batch (Node tests / no atmosphere): same contract as M01Atmosphere.billboardBatch. */
export function plainSmokeBatch(capacity,color,parent){
  const mesh=quadBatch(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,depthWrite:false}),capacity,{puffOpacity:1},parent,'distant_smoke_plain');
  return mesh;
}
// Silhouettes: low boxes only. At 1,3-2,5 km a soldier is a couple of pixels; shape matters less than motion.
function figureGeometry(pose){
  const parts=pose==='crouched'?[[.34,.42,.26,0,.86,0],[.2,.2,.2,0,1.2,.02],[.16,.5,.18,-.1,.36,.18],[.16,.5,.18,.12,.3,-.14],[.06,.06,1.05,.1,.95,-.3]]:
    [[.36,.62,.24,0,1.18,0],[.2,.22,.2,0,1.6,.02],[.15,.86,.17,-.1,.45,.12],[.15,.86,.17,.1,.45,-.12],[.06,.06,1.1,.14,1.3,-.35]];
  const boxes=parts.map(([w,h,d,x,y,z])=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);return g;});
  const geometry=mergeGeometries(boxes);boxes.forEach(g=>g.dispose());return geometry;
}
function aircraftGeometry(){
  const parts=[[1.1,1.1,10,0,0,0],[14,.22,1.9,0,-.15,-.6],[4.8,.18,1.2,0,.2,4.4],[.18,1.7,1.3,0,.95,4.5]];
  const boxes=parts.map(([w,h,d,x,y,z])=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);return g;});
  const geometry=mergeGeometries(boxes);boxes.forEach(g=>g.dispose());return geometry;
}

export class M01DistantBattlefield {
  constructor(parent,{smokeBatch=plainSmokeBatch,seed=DISTANT_SEED}={}){
    this.seed=seed;this.group=new THREE.Group();this.group.name='m01_distant_battlefield';parent.add(this.group);
    const uniforms=()=>({pixel:{value:.001},minPixels:{value:7}});
    this.glowMaterial=new THREE.ShaderMaterial({uniforms:uniforms(),vertexShader:glowVertex,fragmentShader:glowFragment,transparent:true,
      depthWrite:false,fog:false});
    this.streakMaterial=new THREE.ShaderMaterial({uniforms:{...uniforms(),minPixels:{value:2.6}},vertexShader:streakVertex,fragmentShader:streakFragment,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false});
    this.flashes=quadBatch(this.glowMaterial,DISTANT_LIMITS.flashes,{aOpacity:1},this.group,'distant_flashes');
    this.streaks=quadBatch(this.streakMaterial,DISTANT_LIMITS.streaks,{aOpacity:1,aDir:3},this.group,'distant_tracers');
    // Soft smoke shares the atmosphere's fog-aware billboard material when given; that pool is then the atmosphere's to dispose.
    this.ownsPuffs=smokeBatch===plainSmokeBatch;this.puffs=smokeBatch(DISTANT_LIMITS.puffs,'#77736b',this.group);this.puffs.name||='distant_smoke';
    this.silhouette=new THREE.MeshBasicMaterial({color:'#2a2c27',name:'distant_silhouette'});
    this.airMaterial=new THREE.MeshBasicMaterial({color:'#3a3d41',fog:false,name:'distant_aircraft'});
    this.figureGeometry={upright:figureGeometry('upright'),crouched:figureGeometry('crouched')};
    this.figures={};
    for(const pose of ['upright','crouched']){
      const mesh=new THREE.InstancedMesh(this.figureGeometry[pose],this.silhouette,DISTANT_LIMITS.figures);mesh.name=`distant_figures_${pose}`;mesh.count=0;
      mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.group.add(mesh);this.figures[pose]=mesh;
    }
    this.airGeometry=aircraftGeometry();this.aircraft=new THREE.InstancedMesh(this.airGeometry,this.airMaterial,DISTANT_LIMITS.aircraft);
    this.aircraft.name='distant_aircraft';this.aircraft.count=0;this.aircraft.frustumCulled=false;this.aircraft.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.group.add(this.aircraft);
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.frustum=new THREE.Frustum();this.matrix=new THREE.Matrix4();this.point=new THREE.Vector3();
    this.lastClock=null;this.window=.07;this.stats=this.empty();
  }
  empty(){return {clock:null,events:0,layers:{presentation:0,ambient:0},kinds:{},bands:{mid:0,far:0,horizon:0},inView:0,outOfView:0,
    instances:{flashes:0,streaks:0,puffs:0,figures:0,aircraft:0},sources:[],ids:[],limits:{...DISTANT_LIMITS}};}
  /**
   * @param sim     M01Simulation (read-only: clock, consumed, world.heightAt).
   * @param camera  The world camera: only used for pixel-size floors, distance LOD and in-view diagnostics.
   * @param quality low/medium/high: particle density per event, never which events exist.
   */
  update(sim,camera,quality='low',{daylight=1,viewportHeight=720}={}){
    const clock=sim.clock;
    // Short flashes must survive slow frames: they are shown for the frame interval (70-250 ms), fixed per clock.
    if(clock!==this.lastClock){if(this.lastClock!==null&&clock>this.lastClock)this.window=Math.max(.07,Math.min(.25,clock-this.lastClock));this.lastClock=clock;}
    const plan=planDistantBattlefield(clock,sim.consumed,this.seed),density=DENSITY[quality]??DENSITY.low,cam=camera.position;
    const pixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/Math.max(1,viewportHeight);
    this.glowMaterial.uniforms.pixel.value=this.streakMaterial.uniforms.pixel.value=pixel;
    const night=1-.35*Math.max(0,Math.min(1,daylight)),ground=(x,z)=>{const h=sim.world?.heightAt?.(x,z);return Number.isFinite(h)?h:-3;};
    camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const counts={flashes:0,streaks:0,puffs:0,figures:0,aircraft:0,upright:0,crouched:0},dummy=this.dummy;
    const flash=(p,size,color,opacity)=>{const i=counts.flashes;if(i>=DISTANT_LIMITS.flashes||opacity<=.01)return;
      dummy.position.set(p.x,p.y,p.z);dummy.quaternion.identity();dummy.scale.set(size,size,size);dummy.updateMatrix();this.flashes.setMatrixAt(i,dummy.matrix);
      this.flashes.setColorAt(i,this.color.set(color));this.flashes.geometry.attributes.aOpacity.setX(i,opacity*night);counts.flashes++;};
    const streak=(center,dir,width,color,opacity)=>{const i=counts.streaks;if(i>=DISTANT_LIMITS.streaks||opacity<=.01)return;
      dummy.position.set(center.x,center.y,center.z);dummy.quaternion.identity();dummy.scale.set(1,width,1);dummy.updateMatrix();this.streaks.setMatrixAt(i,dummy.matrix);
      this.streaks.geometry.attributes.aDir.setXYZ(i,dir.x,dir.y,dir.z);this.streaks.setColorAt(i,this.color.set(color));
      this.streaks.geometry.attributes.aOpacity.setX(i,opacity);counts.streaks++;};
    const puff=(x,y,z,sx,sy,color,opacity)=>{const i=counts.puffs;if(i>=DISTANT_LIMITS.puffs||opacity<=.01)return;
      dummy.position.set(x,y,z);dummy.quaternion.identity();dummy.scale.set(sx,sy,1);dummy.updateMatrix();this.puffs.setMatrixAt(i,dummy.matrix);
      this.puffs.setColorAt(i,this.color.set(color));this.puffs.geometry.attributes.puffOpacity.setX(i,opacity);counts.puffs++;};
    const stats=this.empty();stats.clock=clock;
    // Diagnostics only: which layer/source each item belongs to, its distance band and whether it is in the view.
    const note=(item,p)=>{stats.layers[item.layer]++;stats.sources.includes(item.source)||stats.sources.push(item.source);
      const d=Math.hypot(p.x-cam.x,p.y-cam.y,p.z-cam.z);stats.bands[BAND(d)]++;if(this.frustum.containsPoint(this.point.set(p.x,p.y,p.z)))stats.inView++;else stats.outOfView++;};
    // Columns first: they are the long-lived signature of the war beyond the river and the town.
    for(const c of plan.columns){
      note(c,c);const age=clock-c.start,n=k=>visualNoise(c.seed,k),interval=.9/density,life=26,grow=smooth(0,60,age);
      for(let k=Math.floor((clock-life)/interval);k*interval<=clock;k++){
        const born=k*interval;if(born<c.start)continue;const a=clock-born,q=a/life,j=Math.abs(k)%997;
        const rise=c.scale*(4+38*Math.pow(q,.8))*(.75+.5*n(j)),width=c.scale*(3+14*q)*(.7+.6*n(j+1))*(.4+.6*grow);
        puff(c.x+(n(j+2)-.5)*4*c.scale+a*(.55+.3*n(j+3)),c.y+1.5+rise*(.35+.65*grow),c.z+(n(j+4)-.5)*4*c.scale+a*.18,width,width*(.9+.4*n(j+5)),
          c.black?(q<.3?'#242220':'#3a3835'):(q<.35?'#46433f':'#67645d'),.82*(1-q)*Math.min(1,a/2)*(.6+.4*grow));
      }
      if(c.fire)for(let f=0;f<3;f++){const flicker=.55+.45*Math.sin(clock*(7+f*2.3)+n(30+f)*6)*Math.sin(clock*(3.1+f)+n(40+f)*6);
        flash({x:c.x+(n(50+f)-.5)*5*c.scale,y:c.y+1+f*.8*c.scale,z:c.z+(n(60+f)-.5)*5*c.scale},(2.2+f*.9)*c.scale,f?'#ff8a3a':'#ffb25a',.9*flicker*(.5+.5*grow));}
    }
    for(const e of plan.events){
      note(e,e.origin??e.target);stats.kinds[e.kind]=(stats.kinds[e.kind]??0)+1;
      const fire=(shots,origin,target,speed,color,offsetAxis)=>{
        const dx=target.x-origin.x,dy=target.y-origin.y,dz=target.z-origin.z,len=Math.hypot(dx,dy,dz)||1,flight=len/speed;
        for(const shot of shots){
          const age=clock-shot.at,o=shot.offset?{x:origin.x+offsetAxis.x*shot.offset,y:origin.y,z:origin.z+offsetAxis.z*shot.offset}:origin;
          if(age>=0&&age<this.window)flash(o,e.kind==='mg'||e.kind==='exchange'?.75:.55,'#ff9f3d',.6+.4*(1-age/this.window));
          if(shot.tracer&&age>=0&&age<flight*.92){
            const k=age/flight,length=Math.min(26,speed*.035),drop=4.9*age*age*.12;
            streak({x:o.x+dx*k-dx/len*length/2,y:o.y+dy*k-drop,z:o.z+dz*k-dz/len*length/2},{x:dx/len*length,y:dy/len*length,z:dz/len*length},.11,color??'#ff9a48',
              smooth(0,.05,age)*(1-smooth(.75,.92,k))*.95);
          }
        }
        // One small cloud hangs where the group fired; on low quality only the flashes remain.
        const age=clock-shots[0].at;
        if(age>=0&&age<4.5&&density>.5){const q=age/4.5;puff(origin.x+age*.4,origin.y+.6+age*.35,origin.z,1.4+2.6*q,1.3+2.3*q,'#7d7972',.5*(1-q)*Math.min(1,age/.2));}
      };
      if(e.shots){
        const perp=e.origin&&e.target?(()=>{const dx=e.target.x-e.origin.x,dz=e.target.z-e.origin.z,l=Math.hypot(dx,dz)||1;return {x:-dz/l,z:dx/l};})():{x:0,z:1};
        fire(e.shots,e.origin,e.target,e.speed,e.color,perp);
        if(e.reply)fire(e.reply.shots,e.reply.origin,e.reply.target,e.reply.speed,'#ffc070',{x:0,z:1});
      }
      if(e.flash){const age=clock-e.flash.at;if(age>=0&&age<Math.max(.12,this.window))flash({x:e.origin.x,y:e.origin.y+2,z:e.origin.z},7*e.flash.size,'#fff0c8',1-age/Math.max(.12,this.window));
        if(age>=0&&age<5)puff(e.origin.x,e.origin.y+4+age*1.2,e.origin.z,(6+age*2.5)*e.flash.size,(5+age*2)*e.flash.size,'#837e75',.6*(1-age/5));}
      if(e.impact){
        const age=clock-e.impact.at,p=e.impact.point,s=e.impact.size,n=k=>visualNoise(e.seed,k);
        if(age>=0&&age<Math.max(.09,this.window))flash({x:p.x,y:p.y+1.5,z:p.z},4.5*s,'#ffc77a',1-age/Math.max(.09,this.window));
        const dust=Math.max(2,Math.round(6*density*s));
        for(let j=0;j<dust&&age>=0&&age<5.5;j++){const q=age/5.5,a=n(j)*Math.PI*2,r=(2+7*q)*s*n(j+10);
          puff(p.x+Math.cos(a)*r,p.y+1+(4+13*Math.sqrt(q))*s*(.6+.6*n(j+20)),p.z+Math.sin(a)*r,(3+7*q)*s,(3.5+8*q)*s,j%2?'#6f604d':'#7f6e58',.82*(1-q)*Math.min(1,age/.15));}
        for(let j=0;j<2&&age>=1.5&&age<19;j++){const q=(age-1.5)/17.5;
          puff(p.x+age*(.5+.3*n(40+j)),p.y+6*s+q*14*s,p.z+age*.2,(7+12*q)*s,(6+10*q)*s,'#5d5a54',.55*(1-q)*Math.min(1,(age-1.5)/2));}
      }
    }
    // Koźliny vehicles: dust trails while they move, the AT gun's flashes, and the hit.
    for(const v of plan.vehicles){
      note(v,v);const n=k=>visualNoise(v.seed,k),trail=Math.round(12*density);
      // Dust is raised only while moving; each puff stays where the vehicle was when it rose, then drifts and thins.
      for(let k=Math.floor(clock/.55);k>=0;k--){const born=k*.55,age=clock-born;if(age>6.5||born<v.start)break;if(born>v.stopAt)continue;
        puff(v.x+(n(k%97)-.5)*3+age*.4,v.y+1+age*.9,v.from+(born-v.start)*v.speed,4+age*1.6*density,3+age*1.1,'#8a7a62',.65*(1-age/6.5));}
      if(Number.isFinite(v.hitAt))for(const dt of [-9,-4.5,0]){const age=clock-(v.hitAt+dt);
        if(age>=0&&age<Math.max(.09,this.window)){flash(v.gun,1.4,'#ffe2a8',1-age/Math.max(.09,this.window));if(!dt)flash({x:v.x,y:v.y+2,z:v.z},5,'#ffc062',1);}}
    }
    // Squads on the far plain: bounding silhouettes at ground height, enlarged by at most 1,6× with distance.
    for(const squad of plan.squads){const figures=squadFigures(squad,clock);note(squad,{x:figures[0].x,y:-1,z:figures[0].z});for(const f of figures){
      const pose=f.pose==='crouched'?'crouched':'upright',mesh=this.figures[pose],i=counts[pose];if(counts.figures>=DISTANT_LIMITS.figures)continue;
      const y=ground(f.x,f.z),d=Math.hypot(f.x-cam.x,y-cam.y,f.z-cam.z),scale=Math.max(1,Math.min(1.6,d/900));
      dummy.position.set(f.x,y+(f.pose==='carried'?.95:0)+f.bob*.06*scale,f.z);dummy.rotation.set(0,-f.facing+Math.PI/2,f.pose==='carried'?Math.PI/2:0);
      dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);counts[pose]++;counts.figures++;
    }}
    for(const a of plan.aircraft){
      note(a,a);const i=counts.aircraft;if(i>=DISTANT_LIMITS.aircraft)break;
      dummy.position.set(a.x,a.y,a.z);dummy.rotation.set(0,-a.heading-Math.PI/2,a.bank,'YXZ');dummy.scale.setScalar(1);dummy.updateMatrix();this.aircraft.setMatrixAt(i,dummy.matrix);counts.aircraft++;
    }
    for(const [mesh,count]of [[this.flashes,counts.flashes],[this.streaks,counts.streaks],[this.puffs,counts.puffs],[this.figures.upright,counts.upright],[this.figures.crouched,counts.crouched],[this.aircraft,counts.aircraft]]){
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      for(const name of ['aOpacity','aDir','puffOpacity','puffSpin','puffShape'])if(mesh.geometry.attributes[name])mesh.geometry.attributes[name].needsUpdate=true;
    }
    stats.events=plan.events.length;stats.ids=plan.events.map(e=>e.id);stats.squads=plan.squads.length;stats.vehicles=plan.vehicles.length;stats.columns=plan.columns.map(c=>c.id);
    stats.aircraftActive=plan.aircraft.length;stats.instances={flashes:counts.flashes,streaks:counts.streaks,puffs:counts.puffs,figures:counts.figures,aircraft:counts.aircraft};
    stats.milestones={...plan.milestones};stats.window=this.window;this.stats=stats;return stats;
  }
  get diagnostics(){return structuredClone(this.stats);}
  dispose(){
    this.group.removeFromParent();
    for(const mesh of [this.flashes,this.streaks,this.figures.upright,this.figures.crouched,this.aircraft]){mesh.removeFromParent();mesh.dispose();}
    this.puffs.removeFromParent();if(this.ownsPuffs){this.puffs.dispose();this.puffs.geometry.dispose();this.puffs.material.dispose();}
    this.flashes.geometry.dispose();this.streaks.geometry.dispose();
    Object.values(this.figureGeometry).forEach(g=>g.dispose());this.airGeometry.dispose();
    this.glowMaterial.dispose();this.streakMaterial.dispose();this.silhouette.dispose();this.airMaterial.dispose();
  }
}
