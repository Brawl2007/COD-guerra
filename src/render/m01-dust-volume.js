import * as THREE from 'three';

// The dust clouds of the simulation (state.dust = dustClouds() of src/game/m01-dust.js: {x, y, z, r, h, density}) drawn as what they are for the AI: a vertical cylinder of radius r and height h, standing on the
// ground of its crater, whose optical depth along any line of sight is proportional to density times the length of the line inside it. The simulation blocks a sight line at 3 m of density-1 cloud (DUST.blockAt);
// here that thickness reads as an opaque curtain (alpha 1 - exp(-DUST_VOLUME_K * thickness * profile), about .95 at 3 m), and a thin cloud (low density, or a short chord near its rim) stays thin. Presentation only: it reads
// the simulation's numbers and decides nothing (no visibility, no damage, no event), and the soft rim, the thinner top and the noise only shape the picture of a cloud whose size and density come from the simulation.
//
// One InstancedMesh (one draw call, one material) holds a box per cloud; the fragment shader intersects the eye ray with the cylinder analytically (the same chord as dustChord) and integrates a few samples along it:
// 9 on High, 6 on Medium, 4 on Low. Seen from outside the box's front faces are drawn (depth-tested: a wall in front of the cloud hides it); with the eye inside the box its back faces are drawn at
// depth 0, so the dust around the player covers the view (without a depth texture the scene's own depth is unknown there: a thick cloud around the eye hides everything, as it does for the AI beyond 3 m). The pool, its
// buffers and the material are built once; update() only writes into them (no allocation per frame).
//
// Draw order against the particle batches (flash, fire, smoke, dust sprites and the smoke columns: transparent, depthWrite false, renderOrder 0): the volume is drawn BEFORE them (renderOrder -.5, after the ground
// marks and embers at -3..-1), so an explosion or a smoke column standing in front of a cloud composites over it instead of being blended away. A second pass over the same instances (depthMesh, renderOrder -.4,
// colorWrite false) then writes the depth of the point where the eye ray enters the cloud wherever the cloud is near-opaque (alpha >= DUST_VOLUME_OPAQUE), so the batches drawn after it are depth-rejected behind that
// curtain, as are the far impostors (renderOrder 2). Thin parts write no depth: what stands behind a thin cloud still shows through it. With the eye inside the box the pass writes depth 0 only where the dust is near-opaque.
export const DUST_VOLUME_POOL=Object.freeze({low:4,medium:6,high:8});
export const DUST_VOLUME_STEPS=Object.freeze({low:4,medium:6,high:9});
/** Optical depth per metre of density-1 cloud, compensating the mean of the soft profile (about .45): 3 m of cloud at density 1 give a transmittance of about 5 %. */
export const DUST_VOLUME_K=2.3;
/** Opacity from which the cloud also occludes by depth (the particle batches and impostors drawn after it are rejected behind it). */
export const DUST_VOLUME_OPAQUE=.7;
/** renderOrder of the colour pass and of the depth pass: before the particle batches (0), after the ground marks and embers (-3..-1). */
export const DUST_VOLUME_ORDER=Object.freeze({color:-.5,depth:-.4});
const DUST_COLOR=new THREE.Color('#a39679');   // hoisted: parsed once

export class M01DustVolumes{
  constructor(parent){
    this.parent=parent;this.capacity=DUST_VOLUME_POOL.high;this.drawn=0;this.quality='medium';
    this.geometry=new THREE.BoxGeometry(1,1,1);
    this.density=new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1);this.density.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('dustDensity',this.density);
    const uniforms={uColor:{value:DUST_COLOR.clone()},fogColor:{value:new THREE.Color('#869093')},uLight:{value:1},uTime:{value:0},uSteps:{value:DUST_VOLUME_STEPS.medium},uNoise:{value:1},uK:{value:DUST_VOLUME_K}};
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,uniforms,
      vertexShader:`attribute float dustDensity;varying vec3 vWorld;varying vec4 vCloud;varying vec2 vDH;
        void main(){
          mat4 m=modelMatrix*instanceMatrix;vec4 w=m*vec4(position,1.0);vWorld=w.xyz;
          vec3 o=(m*vec4(0.0,0.0,0.0,1.0)).xyz;float R=length(m[0].xyz)*.5,H=length(m[1].xyz);
          vCloud=vec4(o.x,o.y-H*.5,o.z,R);vDH=vec2(dustDensity,H);
          gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform mat4 projectionMatrix;uniform vec3 uColor;uniform vec3 fogColor;uniform float uLight;uniform float uTime;uniform float uSteps;uniform float uNoise;uniform float uK;
        varying vec3 vWorld;varying vec4 vCloud;varying vec2 vDH;
        float dHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
        float dNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(dHash(i),dHash(i+vec2(1.0,0.0)),f.x),mix(dHash(i+vec2(0.0,1.0)),dHash(i+vec2(1.0,1.0)),f.x),f.y);}
        void main(){
          vec3 ro=cameraPosition,rd=vWorld-ro;float dist=length(rd);rd/=max(dist,1e-4);
          vec3 c=vCloud.xyz;float R=vCloud.w,H=vDH.y,y0=c.y,y1=c.y+H;
          vec2 oc=ro.xz-c.xz;
          bool inBox=abs(oc.x)<R&&abs(oc.y)<R&&ro.y>y0&&ro.y<y1;
          if(inBox==gl_FrontFacing)discard;
          float a=dot(rd.xz,rd.xz),t0=0.0,t1=1e4;
          if(a>1e-8){float b=dot(oc,rd.xz),cc=dot(oc,oc)-R*R,disc=b*b-a*cc;if(disc<=0.0)discard;float s=sqrt(disc);t0=(-b-s)/a;t1=(-b+s)/a;}
          else if(dot(oc,oc)>R*R)discard;
          if(abs(rd.y)>1e-5){float v0=(y0-ro.y)/rd.y,v1=(y1-ro.y)/rd.y;t0=max(t0,min(v0,v1));t1=min(t1,max(v0,v1));}
          else if(ro.y<y0||ro.y>y1)discard;
          t0=max(t0,0.0);if(t1<=t0)discard;
          float dt=(t1-t0)/uSteps,tau=0.0,hm=0.0;
          for(int i=0;i<12;i++){
            if(float(i)>=uSteps)break;
            vec3 p=ro+rd*(t0+(float(i)+.5)*dt);
            vec2 q=p.xz-c.xz;float rr=length(q)/R,hv=clamp((p.y-y0)/H,0.0,1.0);
            // billows: a low-frequency noise moves the soft rim and the soft top in and out (the cut at the simulation's cylinder stays: the profile is 0 there)
            float n=dNoise(p.xz*.13+vec2(p.y*.07,uTime*.025))*uNoise+.5*(1.0-uNoise);
            float rEff=rr*(1.22-.44*n),hEff=hv+(n-.5)*.36;
            float pr=(1.0-smoothstep(.40,1.0,rEff))*(1.0-smoothstep(.84,1.0,rr)),pv=smoothstep(0.0,.05,hv)*(1.0-smoothstep(.32,1.0,hEff));
            float prof=pr*pr*pv*pv*(.7+.6*n);   // squared: a long chord near the rim or the top must not saturate there (the picture would show the cylinder's cut)
            tau+=prof*dt;hm+=hv;
          }
          tau*=uK*vDH.x;float alpha=1.0-exp(-tau);
          if(alpha<.01)discard;
          #ifdef DEPTH_PASS
          // depth pass (colorWrite false): only the near-opaque part writes depth, at the point where the eye ray enters the cloud (0 with the eye inside it)
          if(alpha<DUST_OPAQUE)discard;
          vec4 cp=projectionMatrix*viewMatrix*vec4(ro+rd*t0,1.0);
          gl_FragDepth=inBox?0.0:clamp(cp.z/cp.w*.5+.5,0.0,1.0);
          gl_FragColor=vec4(0.0);
          #else
          vec3 col=uColor*uLight*(.80+.34*clamp(hm/uSteps,0.0,1.0))*mix(1.0,.70,smoothstep(1.0,9.0,tau));
          col=mix(col,fogColor,smoothstep(500.0,2700.0,dist));
          gl_FragDepth=inBox?0.0:gl_FragCoord.z;
          gl_FragColor=vec4(col,alpha);
          #endif
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    // the depth pass: same shader and uniforms, same instances (the instance matrix is shared), no colour
    this.depthMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:true,depthTest:true,colorWrite:false,side:THREE.DoubleSide,uniforms,
      defines:{DEPTH_PASS:'',DUST_OPAQUE:DUST_VOLUME_OPAQUE.toFixed(3)},vertexShader:this.material.vertexShader,fragmentShader:this.material.fragmentShader});
    this.mesh=new THREE.InstancedMesh(this.geometry,this.material,this.capacity);this.mesh.name='m01-dust-volumes';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.visible=false;this.mesh.renderOrder=DUST_VOLUME_ORDER.color;
    this.depthMesh=new THREE.InstancedMesh(this.geometry,this.depthMaterial,this.capacity);this.depthMesh.name='m01-dust-volumes-depth';
    this.depthMesh.instanceMatrix=this.mesh.instanceMatrix;this.depthMesh.count=0;this.depthMesh.frustumCulled=false;this.depthMesh.visible=false;this.depthMesh.renderOrder=DUST_VOLUME_ORDER.depth;
    this.dummy=new THREE.Object3D();this.pickIndex=new Int16Array(this.capacity);this.pickDistance=new Float32Array(this.capacity);
    parent.add(this.mesh);parent.add(this.depthMesh);
  }
  /** How many clouds the quality tier draws as volumes (the rest of the list, if longer, keeps the soft puffs of the atmosphere). */
  poolFor(quality){return DUST_VOLUME_POOL[quality]??DUST_VOLUME_POOL.medium;}
  /** Chooses, without allocating, the `cap` clouds of `clouds` nearest to `eye` (distance to the rim; list order when there is no eye): fills this.pickIndex (nearest first) and returns how many. */
  pick(clouds,cap,eye=null){
    const idx=this.pickIndex,dist=this.pickDistance;let n=0;
    for(let i=0;i<clouds.length;i++){
      const c=clouds[i],d=eye?Math.max(0,Math.hypot(c.x-eye.x,c.z-eye.z)-c.r):0;
      let j;if(n<cap)j=n++;else if(d<dist[cap-1])j=cap-1;else continue;
      while(j>0&&dist[j-1]>d){dist[j]=dist[j-1];idx[j]=idx[j-1];j--;}
      dist[j]=d;idx[j]=i;
    }
    return n;
  }
  isPicked(i,n){for(let k=0;k<n;k++)if(this.pickIndex[k]===i)return true;return false;}
  /** Writes the picked clouds into the instance buffers (position, size and density come from the simulation's cloud record). */
  update(clouds,n,quality,clock,light,fogColor){
    this.quality=quality;const u=this.material.uniforms;
    u.uSteps.value=DUST_VOLUME_STEPS[quality]??DUST_VOLUME_STEPS.medium;u.uNoise.value=1;u.uTime.value=clock;
    if(Number.isFinite(light))u.uLight.value=light;
    if(fogColor)u.fogColor.value.copy(fogColor);
    for(let k=0;k<n;k++){
      const c=clouds[this.pickIndex[k]],y0=c.y-.5,H=c.h+.5;
      this.dummy.position.set(c.x,y0+H*.5,c.z);this.dummy.rotation.set(0,0,0);this.dummy.scale.set(c.r*2,H,c.r*2);this.dummy.updateMatrix();
      this.mesh.setMatrixAt(k,this.dummy.matrix);this.density.setX(k,c.density);
    }
    this.drawn=n;this.mesh.count=this.depthMesh.count=n;this.mesh.visible=this.depthMesh.visible=n>0;
    if(n>0){this.mesh.instanceMatrix.needsUpdate=true;this.density.needsUpdate=true;}
  }
  dispose(){this.mesh.removeFromParent();this.depthMesh.removeFromParent();this.mesh.dispose();this.depthMesh.dispose();this.geometry.dispose();this.material.dispose();this.depthMaterial.dispose();}
}
