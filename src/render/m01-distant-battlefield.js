import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {visualNoise} from './m01-atmosphere.js';
import {DISTANT_LIMITS,DISTANT_SEED,planDistantBattlefield,squadFigures} from './m01-distant-battlefield-plan.js';

// Renders the distant battlefield plan. PRESENTATION ONLY: it reads the simulation clock, consumed events and
// ground height (read-only), never writes to the simulation and never takes part in damage, visibility or AI.
// Density per quality matches the battlefield FX (M01View FX_DENSITY); quality never changes which events exist.
const DENSITY={low:.55,medium:.78,high:1};
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
// Distance bands of this layer, named by range so they cannot be mistaken for the battlefield FX near/mid/far bands.
const BAND=d=>d<1200?'0-1.2km':d<2600?'1.2-2.6km':'>2.6km';

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
// Distant smoke: camera-facing puffs with their own aerial perspective. Near smoke fades fully into fog by 2,7 km; a
// column 1-3 km away stays a pale, hazy column instead of dissolving into the sky (haze 11 % at 1 km, 46 % at 3 km,
// capped at 80 % from 4,9 km).
const smokeVertex=`attribute float puffOpacity;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vDepth;
void main(){vUv=uv;vOpacity=puffOpacity;vColor=instanceColor;vec4 c=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  c.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));vDepth=-c.z;gl_Position=projectionMatrix*c;}`;
const smokeFragment=`uniform sampler2D map;uniform vec3 hazeColor;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vDepth;
void main(){vec4 tex=texture2D(map,vUv);float a=tex.a*vOpacity;if(a<.006)discard;
  gl_FragColor=vec4(mix(vColor*tex.rgb,hazeColor,clamp((vDepth-400.)/5600.,0.,.8)),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
/** Node-safe soft puff (the browser passes the atmosphere's puff texture instead). */
export function distantPuffTexture(size=32){
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=(x+.5)/size*2-1,dy=(y+.5)/size*2-1,r=Math.hypot(dx,dy),n=visualNoise(0x5a17,(y*size+x)>>2),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=Math.round(200+40*n);data[i+3]=Math.round(255*Math.pow(Math.max(0,1-r*r),1.8)*(.35+.65*n));}
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;
  texture.needsUpdate=true;return texture;
}

function quadBatch(material,capacity,attributes,parent,name,renderOrder){
  const geometry=new THREE.PlaneGeometry(1,1);
  for(const [key,size]of Object.entries(attributes)){const a=new THREE.InstancedBufferAttribute(new Float32Array(capacity*size),size);a.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute(key,a);}
  const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;
  // Distant transparents draw before near ones (renderOrder 0): near smoke and dust cover them, never the reverse.
  mesh.renderOrder=renderOrder;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,new THREE.Color());parent.add(mesh);return mesh;
}
// Silhouettes: low boxes only. At 1,3-2,5 km a soldier is about a pixel; shape matters less than motion.
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
  /** puffTexture: the atmosphere's soft puff (shared, not disposed here); a Node-safe one is generated otherwise. */
  constructor(parent,{puffTexture=null,seed=DISTANT_SEED}={}){
    this.seed=seed;this.group=new THREE.Group();this.group.name='m01_distant_battlefield';parent.add(this.group);
    const uniforms=()=>({pixel:{value:.001},minPixels:{value:7}});
    this.glowMaterial=new THREE.ShaderMaterial({uniforms:uniforms(),vertexShader:glowVertex,fragmentShader:glowFragment,transparent:true,depthWrite:false,fog:false});
    this.streakMaterial=new THREE.ShaderMaterial({uniforms:{...uniforms(),minPixels:{value:2.6}},vertexShader:streakVertex,fragmentShader:streakFragment,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false});
    this.ownsPuffTexture=!puffTexture;this.puffTexture=puffTexture??distantPuffTexture();
    this.smokeMaterial=new THREE.ShaderMaterial({uniforms:{map:{value:this.puffTexture},hazeColor:{value:new THREE.Color('#a0a7a8')}},vertexShader:smokeVertex,
      fragmentShader:smokeFragment,transparent:true,depthWrite:false,fog:false});
    this.puffs=quadBatch(this.smokeMaterial,DISTANT_LIMITS.puffs,{puffOpacity:1},this.group,'distant_smoke',-3);
    this.streaks=quadBatch(this.streakMaterial,DISTANT_LIMITS.streaks,{aOpacity:1,aDir:3},this.group,'distant_tracers',-2);
    this.flashes=quadBatch(this.glowMaterial,DISTANT_LIMITS.flashes,{aOpacity:1},this.group,'distant_flashes',-1);
    // Opaque silhouettes keep the default order (the sky dome is drawn first without depth writes). Unfogged: a dark,
    // slightly hazy speck reads as movement on the far plain where scene fog would erase it.
    this.silhouette=new THREE.MeshBasicMaterial({color:'#474b45',fog:false,name:'distant_silhouette'});
    this.airMaterial=new THREE.MeshBasicMaterial({color:'#3a3d41',fog:false,name:'distant_aircraft'});
    this.figureGeometry={upright:figureGeometry('upright'),crouched:figureGeometry('crouched')};
    this.figures={};
    for(const pose of ['upright','crouched']){
      const mesh=new THREE.InstancedMesh(this.figureGeometry[pose],this.silhouette,DISTANT_LIMITS.figures);mesh.name=`distant_figures_${pose}`;mesh.count=0;
      mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.group.add(mesh);this.figures[pose]=mesh;
    }
    this.airGeometry=aircraftGeometry();this.aircraft=new THREE.InstancedMesh(this.airGeometry,this.airMaterial,DISTANT_LIMITS.aircraft);
    this.aircraft.name='distant_aircraft';this.aircraft.count=0;this.aircraft.frustumCulled=false;this.aircraft.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.group.add(this.aircraft);
    this.dummy=new THREE.Object3D();this.airDummy=new THREE.Object3D();this.airDummy.rotation.order='YXZ';this.color=new THREE.Color();
    this.frustum=new THREE.Frustum();this.matrix=new THREE.Matrix4();this.point=new THREE.Vector3();
    this.world=null;this.lastClock=null;this.window=.07;this.stats=this.empty();
  }
  empty(){return {clock:null,events:0,layers:{presentation:0,ambient:0},kinds:{},bands:{'0-1.2km':0,'1.2-2.6km':0,'>2.6km':0},inView:0,outOfView:0,
    instances:{flashes:0,streaks:0,puffs:0,figures:0,aircraft:0},requested:{flashes:0,streaks:0,puffs:0,figures:0,aircraft:0},sources:[],ids:[],limits:{...DISTANT_LIMITS}};}
  /**
   * @param sim     M01Simulation (read-only: clock, consumed, world.heightAt).
   * @param camera  The world camera: only used for pixel-size floors, distance LOD/figure enlargement and in-view diagnostics.
   * @param quality low/medium/high: particle density per event, never which events exist.
   * @param options daylight 0..1, viewportHeight in CSS pixels, fogColor (the scene's) for the smoke haze.
   */
  update(sim,camera,quality='low',{daylight=1,viewportHeight=720,fogColor=null}={}){
    const clock=sim.clock;
    // Short flashes must survive slow frames: each is shown for the frame interval (70-250 ms) and repeated frames at
    // one clock are identical. A restored world or an earlier clock starts again from 70 ms, like a fresh renderer.
    if(sim.world!==this.world||(this.lastClock!==null&&clock<this.lastClock)){this.world=sim.world;this.lastClock=null;this.window=.07;}
    if(clock!==this.lastClock){if(this.lastClock!==null)this.window=Math.max(.07,Math.min(.25,clock-this.lastClock));this.lastClock=clock;}
    const plan=planDistantBattlefield(clock,sim.consumed,this.seed),density=DENSITY[quality]??DENSITY.low,cam=camera.position;
    const pixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/Math.max(1,viewportHeight);
    this.glowMaterial.uniforms.pixel.value=this.streakMaterial.uniforms.pixel.value=pixel;if(fogColor)this.smokeMaterial.uniforms.hazeColor.value.copy(fogColor);
    const night=1-.35*Math.max(0,Math.min(1,daylight)),ground=(x,z)=>{const h=sim.world?.heightAt?.(x,z);return Number.isFinite(h)?h:-3;};
    camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const counts={flashes:0,streaks:0,puffs:0,figures:0,aircraft:0,upright:0,crouched:0},requested={flashes:0,streaks:0,puffs:0,figures:0,aircraft:0},dummy=this.dummy;
    const flash=(p,size,color,opacity)=>{if(opacity<=.01)return;requested.flashes++;const i=counts.flashes;if(i>=DISTANT_LIMITS.flashes)return;
      dummy.position.set(p.x,p.y,p.z);dummy.quaternion.identity();dummy.scale.set(size,size,size);dummy.updateMatrix();this.flashes.setMatrixAt(i,dummy.matrix);
      this.flashes.setColorAt(i,this.color.set(color));this.flashes.geometry.attributes.aOpacity.setX(i,opacity*night);counts.flashes++;};
    const streak=(center,dir,width,color,opacity)=>{if(opacity<=.01)return;requested.streaks++;const i=counts.streaks;if(i>=DISTANT_LIMITS.streaks)return;
      dummy.position.set(center.x,center.y,center.z);dummy.quaternion.identity();dummy.scale.set(1,width,1);dummy.updateMatrix();this.streaks.setMatrixAt(i,dummy.matrix);
      this.streaks.geometry.attributes.aDir.setXYZ(i,dir.x,dir.y,dir.z);this.streaks.setColorAt(i,this.color.set(color));
      this.streaks.geometry.attributes.aOpacity.setX(i,opacity);counts.streaks++;};
    const puff=(x,y,z,sx,sy,color,opacity)=>{if(opacity<=.01)return;requested.puffs++;const i=counts.puffs;if(i>=DISTANT_LIMITS.puffs)return;
      dummy.position.set(x,y,z);dummy.quaternion.identity();dummy.scale.set(sx,sy,1);dummy.updateMatrix();this.puffs.setMatrixAt(i,dummy.matrix);
      this.puffs.setColorAt(i,this.color.set(color));this.puffs.geometry.attributes.puffOpacity.setX(i,opacity);counts.puffs++;};
    const stats=this.empty();stats.clock=clock;
    // Diagnostics only: which layer/source each item belongs to, its distance band and whether it is in the view.
    const note=(item,p)=>{stats.layers[item.layer]++;stats.sources.includes(item.source)||stats.sources.push(item.source);
      const d=Math.hypot(p.x-cam.x,p.y-cam.y,p.z-cam.z);stats.bands[BAND(d)]++;if(this.frustum.containsPoint(this.point.set(p.x,p.y,p.z)))stats.inView++;else stats.outOfView++;};
    const brief=age=>age>=0&&age<this.window;
    // Columns first: they are the long-lived signature of the war beyond the river and the town. A farm or vehicle fire
    // seen from 1,3-3 km is a column 100-400 m high (by scale) and tens of metres wide, leaning with the wind aloft.
    for(const c of plan.columns){
      note(c,c);const age=clock-c.start,n=k=>visualNoise(c.seed,k),interval=.9/density,life=26,grow=smooth(0,60,age);
      for(let k=Math.floor((clock-life)/interval);k*interval<=clock;k++){
        const born=k*interval;if(born<c.start)continue;const a=clock-born,q=a/life,j=Math.abs(k)%997;
        const rise=c.scale*(6+140*Math.pow(q,.8))*(.75+.5*n(j)),width=c.scale*(5+38*q)*(.7+.6*n(j+1))*(.4+.6*grow);
        puff(c.x+(n(j+2)-.5)*10*c.scale+a*(1.1+.6*n(j+3))*(.3+q),c.y+1.5+rise*(.35+.65*grow),c.z+(n(j+4)-.5)*10*c.scale+a*.35*(.3+q),width,width*(.9+.4*n(j+5)),
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
          if(brief(age))flash(o,e.kind==='mg'||e.kind==='exchange'?.75:.55,'#ff9f3d',.6+.4*(1-age/this.window));
          if(shot.tracer&&age>=0&&age<flight*.92){
            const k=age/flight,length=Math.min(26,speed*.035),drop=4.9*age*age*.12;
            streak({x:o.x+dx*k-dx/len*length/2,y:o.y+dy*k-drop,z:o.z+dz*k-dz/len*length/2},{x:dx/len*length,y:dy/len*length,z:dz/len*length},.11,color??'#ff9a48',
              smooth(0,.05,age)*(1-smooth(.75,.92,k))*.95);
          }
        }
        // One small cloud hangs where the group fired (Medium/High only; on Low only the flashes remain).
        const age=clock-shots[0].at;
        if(age>=0&&age<4.5&&density>=DENSITY.medium){const q=age/4.5;puff(origin.x+age*.4,origin.y+.6+age*.35,origin.z,1.4+2.6*q,1.3+2.3*q,'#7d7972',.5*(1-q)*Math.min(1,age/.2));}
      };
      if(e.shots){
        const perp=e.origin&&e.target?(()=>{const dx=e.target.x-e.origin.x,dz=e.target.z-e.origin.z,l=Math.hypot(dx,dz)||1;return {x:-dz/l,z:dx/l};})():{x:0,z:1};
        fire(e.shots,e.origin,e.target,e.speed,e.color,perp);
        // The reply is rifle fire: flashes and a cloud, no tracer (so no colour).
        if(e.reply)fire(e.reply.shots,e.reply.origin,e.reply.target,e.reply.speed,null,{x:0,z:1});
      }
      if(e.flash){const age=clock-e.flash.at,hold=Math.max(.12,this.window);if(age>=0&&age<hold)flash({x:e.origin.x,y:e.origin.y+2,z:e.origin.z},7*e.flash.size,'#fff0c8',1-age/hold);
        if(age>=0&&age<5)puff(e.origin.x,e.origin.y+4+age*1.2,e.origin.z,(6+age*2.5)*e.flash.size,(5+age*2)*e.flash.size,'#837e75',.6*(1-age/5));}
      if(e.impact){
        const age=clock-e.impact.at,p=e.impact.point,s=e.impact.size,n=k=>visualNoise(e.seed,k),hold=Math.max(.09,this.window);
        if(age>=0&&age<hold)flash({x:p.x,y:p.y+1.5,z:p.z},4.5*s,'#ffc77a',1-age/hold);
        const dust=Math.max(2,Math.round(6*density*s));
        for(let j=0;j<dust&&age>=0&&age<5.5;j++){const q=age/5.5,a=n(j)*Math.PI*2,r=(2+7*q)*s*n(j+10);
          puff(p.x+Math.cos(a)*r,p.y+1+(4+13*Math.sqrt(q))*s*(.6+.6*n(j+20)),p.z+Math.sin(a)*r,(3+7*q)*s,(3.5+8*q)*s,j%2?'#6f604d':'#7f6e58',.82*(1-q)*Math.min(1,age/.15));}
        for(let j=0;j<2&&age>=1.5&&age<19;j++){const q=(age-1.5)/17.5;
          puff(p.x+age*(.5+.3*n(40+j)),p.y+6*s+q*14*s,p.z+age*.2,(7+12*q)*s,(6+10*q)*s,'#5d5a54',.55*(1-q)*Math.min(1,(age-1.5)/2));}
      }
    }
    // Koźliny vehicles: dust trails while they move, the anti-tank gun's shots, and the hit after the shell's flight.
    for(const v of plan.vehicles){
      note(v,v);const n=k=>visualNoise(v.seed,k),hold=Math.max(.09,this.window);
      // Dust is raised only while moving; each puff stays where the vehicle was when it rose, then drifts and thins.
      for(let k=Math.floor(clock/.55);k>=0;k--){const born=k*.55,age=clock-born;if(age>6.5||born<v.start)break;if(born>v.stopAt)continue;
        puff(v.x+(n(k%97)-.5)*3+age*.4,v.y+1+age*.9,v.from+(born-v.start)*v.speed,4+age*1.6*density,3+age*1.1,'#8a7a62',.65*(1-age/6.5));}
      for(const at of v.gunShots??[]){const age=clock-at;if(age>=0&&age<hold)flash(v.gun,1.4,'#ffe2a8',1-age/hold);}
      if(Number.isFinite(v.hitAt)){const age=clock-v.hitAt;if(age>=0&&age<hold)flash({x:v.x,y:v.y+2,z:v.z},5,'#ffc062',1);}
    }
    // Squads on the far plain: bounding silhouettes at ground height, enlarged by at most 1,6× with distance. A squad is
    // drawn whole or not at all (the pool holds the route's peak with room to spare).
    for(const squad of plan.squads){const figures=squadFigures(squad,clock);note(squad,{x:figures[0].x,y:-1,z:figures[0].z});requested.figures+=figures.length;
      if(counts.figures+figures.length>DISTANT_LIMITS.figures)continue;
      for(const f of figures){
        const pose=f.pose==='crouched'?'crouched':'upright',mesh=this.figures[pose],i=counts[pose];
        const y=ground(f.x,f.z),d=Math.hypot(f.x-cam.x,y-cam.y,f.z-cam.z),scale=Math.max(1,Math.min(1.6,d/900));
        dummy.position.set(f.x,y+(f.pose==='carried'?.95:0)+f.bob*.06*scale,f.z);dummy.rotation.set(0,-f.facing+Math.PI/2,f.pose==='carried'?Math.PI/2:0);
        dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);counts[pose]++;counts.figures++;
      }}
    for(const a of plan.aircraft){
      note(a,a);requested.aircraft++;const i=counts.aircraft;if(i>=DISTANT_LIMITS.aircraft)continue;const air=this.airDummy;
      air.position.set(a.x,a.y,a.z);air.rotation.set(0,-a.heading-Math.PI/2,a.bank);air.scale.setScalar(1);air.updateMatrix();this.aircraft.setMatrixAt(i,air.matrix);counts.aircraft++;
    }
    for(const [mesh,count,attributes]of [[this.flashes,counts.flashes,['aOpacity']],[this.streaks,counts.streaks,['aOpacity','aDir']],[this.puffs,counts.puffs,['puffOpacity']],
      [this.figures.upright,counts.upright,[]],[this.figures.crouched,counts.crouched,[]],[this.aircraft,counts.aircraft,[]]]){
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      for(const name of attributes)mesh.geometry.attributes[name].needsUpdate=true;
    }
    stats.events=plan.events.length;stats.ids=plan.events.map(e=>e.id);stats.squads=plan.squads.length;stats.vehicles=plan.vehicles.length;stats.columns=plan.columns.map(c=>c.id);
    stats.aircraftActive=plan.aircraft.length;stats.instances={flashes:counts.flashes,streaks:counts.streaks,puffs:counts.puffs,figures:counts.figures,aircraft:counts.aircraft};
    stats.requested=requested;stats.milestones={...plan.milestones};stats.window=this.window;this.stats=stats;return stats;
  }
  get diagnostics(){return structuredClone(this.stats);}
  dispose(){
    this.group.removeFromParent();
    for(const mesh of [this.flashes,this.streaks,this.puffs,this.figures.upright,this.figures.crouched,this.aircraft]){mesh.removeFromParent();mesh.dispose();}
    for(const mesh of [this.flashes,this.streaks,this.puffs])mesh.geometry.dispose();
    Object.values(this.figureGeometry).forEach(g=>g.dispose());this.airGeometry.dispose();if(this.ownsPuffTexture)this.puffTexture.dispose();
    this.glowMaterial.dispose();this.streakMaterial.dispose();this.smokeMaterial.dispose();this.silhouette.dispose();this.airMaterial.dispose();
  }
}
