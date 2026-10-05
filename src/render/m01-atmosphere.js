import * as THREE from 'three';
import {puffTexture,cloudFieldTexture} from './m01-surfaces.js';

// Presentation-only deterministic noise. It never consumes the simulation RNG.
export function visualNoise(seed,index=0){
  let x=((seed>>>0)+Math.imul((index+1)>>>0,0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;
  return (x>>>0)/4294967296;
}

// Bounded presentation pools. All emitters come from the simulation's damage/events.
export class M01Atmosphere {
  constructor(scene){
    this.scene=scene;this.texture=puffTexture();this.capacity=256;this.count=0;
    this.skyGeometry=new THREE.SphereGeometry(5500,32,16);
    this.cloudTexture=cloudFieldTexture();
    this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
      uniforms:{clouds:{value:this.cloudTexture},day:{value:0},sunDirection:{value:new THREE.Vector3(1,-.1,0)},time:{value:0}},
      vertexShader:'varying vec3 vDirection;varying vec2 vCloudUv;void main(){vDirection=normalize(position);vCloudUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform sampler2D clouds;uniform float day;uniform float time;uniform vec3 sunDirection;varying vec3 vDirection;varying vec2 vCloudUv;
        void main(){float h=clamp(vDirection.y,0.0,1.0);float c=texture2D(clouds,vCloudUv*vec2(2.0,1.0)+vec2(time*.000025,0.0)).r;
          vec3 horizon=mix(vec3(.24,.28,.32),vec3(.53,.58,.60),day);
          vec3 zenith=mix(vec3(.09,.15,.24),vec3(.22,.34,.47),day);
          vec3 color=mix(horizon,zenith,pow(h,.55));
          float cloud=smoothstep(.33,.68,c)*smoothstep(-.03,.15,vDirection.y);
          vec3 cloudColor=mix(vec3(.30,.34,.37),vec3(.59,.63,.65),c)*(.72+day*.40);
          color=mix(color,cloudColor,cloud*.66);
          float sun=pow(max(0.0,dot(vDirection,normalize(sunDirection))),24.0);
          color+=vec3(.15,.075,.028)*sun*(1.0-h)*(.7+day*.3);
          gl_FragColor=vec4(color,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.sky=new THREE.Mesh(this.skyGeometry,this.skyMaterial);this.sky.frustumCulled=false;this.sky.renderOrder=-100;scene.add(this.sky);
    this.quad=new THREE.PlaneGeometry(1,1);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
      uniforms:{cloud:{value:this.texture},fogColor:{value:new THREE.Color('#869093')}},
      vertexShader:`attribute float puffOpacity;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vDepth;
        void main(){vUv=uv;vOpacity=puffOpacity;vColor=instanceColor;
          vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
          float sx=length(instanceMatrix[0].xyz),sy=length(instanceMatrix[1].xyz);
          center.xy+=position.xy*vec2(sx,sy);vDepth=-center.z;gl_Position=projectionMatrix*center;}`,
      fragmentShader:`uniform sampler2D cloud;uniform vec3 fogColor;varying vec2 vUv;varying vec3 vColor;varying float vOpacity;varying float vDepth;
        void main(){vec4 tex=texture2D(cloud,vUv);float edge=sin(vUv.x*31.0+vUv.y*17.0)*sin(vUv.y*27.0-vUv.x*13.0);float alpha=tex.a*vOpacity*(.82+.18*edge);if(alpha<.006)discard;
          vec3 color=mix(vColor*tex.rgb,fogColor,smoothstep(500.0,2700.0,vDepth));gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.puffBatches=[];this.puffs=this.billboardBatch(this.capacity,'#ffffff',scene);
    this.debrisGeometry=new THREE.TetrahedronGeometry(1);this.debrisMaterial=new THREE.MeshStandardMaterial({color:'#615846',roughness:1});
    this.debris=new THREE.InstancedMesh(this.debrisGeometry,this.debrisMaterial,64);this.debris.count=0;this.debris.frustumCulled=false;scene.add(this.debris);
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.fade=this.puffs.geometry.attributes.puffOpacity;
  }
  /** Camera-facing soft particles share one material/texture; each bounded pool owns its opacity buffer. */
  billboardBatch(capacity,color,parent){
    const geometry=this.quad.clone(),opacity=new THREE.InstancedBufferAttribute(new Float32Array(capacity).fill(1),1);
    opacity.setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('puffOpacity',opacity);
    const batch=new THREE.InstancedMesh(geometry,this.material,capacity);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.count=0;batch.frustumCulled=false;
    const tint=new THREE.Color(color);for(let i=0;i<capacity;i++)batch.setColorAt(i,tint);
    parent.add(batch);this.puffBatches.push(batch);return batch;
  }
  lighting(player,day,alt,az,clock){
    this.sky.position.set(player.x,player.y,player.z);this.skyMaterial.uniforms.day.value=day;this.skyMaterial.uniforms.time.value=clock;
    this.skyMaterial.uniforms.sunDirection.value.set(Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt));
  }
  update(state,clock,quality){
    let count=0;const density=quality==='low'?.58:quality==='medium'?.80:1,max=quality==='low'?112:quality==='medium'?192:256;
    const damage=state.damage.filter(d=>d.smokeVisible).sort((a,b)=>Number(b.id.endsWith('_demolition'))-Number(a.id.endsWith('_demolition'))||b.started-a.started);
    for(const d of damage){
      const demolition=d.id.endsWith('_demolition'),heavy=demolition||/bomb|raid/.test(d.id),age=Math.max(0,clock-d.started);
      const base=demolition?30:heavy?22:17,number=Math.max(6,Math.round(base*density));
      const seed=(Math.floor((d.x+2048)*17)^Math.floor((d.z+2048)*31)^Math.floor(d.started*1000))>>>0;
      const endFade=d.id==='station_bomb'||d.id==='station_wagon_fire'?1:Math.max(0,Math.min(1,(240-age)/30));
      for(let i=0;i<number&&count<max;i++){
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
          height=(31+n2*20)*phase;width=(6+n3*7+(8+n1*8)*phase)*(heavy?1.25:1);
          x=d.x+(n0-.5)*width+height*(.16+n1*.09)+Math.sin(age*(.12+n2*.11)+i*1.9)*width*.16;
          z=d.z+(n1-.5)*width+Math.cos(age*(.10+n0*.09)+i*1.5)*width*.14;
          const cycleFade=Math.min(1,phase/.13,(1-phase)/.20);
          opacity=(heavy?.72:.64)*(1-phase*.55)*Math.min(1,age/1.8+.25)*cycleFade*endFade;
        }
        this.dummy.position.set(x,d.y+2.5+height,z);this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(width*(.72+n2*.55),width*(.95+n3*.72),1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);
        const shade=demolition?(phase<.28?'#5a5145':phase<.68?'#777166':'#969188'):heavy?(i%3?'#68655e':'#4b4944'):(i%4===0?'#41413d':'#666965');
        this.puffs.setColorAt(count,this.color.set(shade));this.fade.setX(count,opacity);count++;
      }
    }
    let chips=0;
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
      for(let i=0;i<dustN&&count<max;i++){
        const n0=visualNoise(seed,200+i*3),n1=visualNoise(seed,201+i*3),a=i*2.399+n0*1.8;
        const r=age*(heavy?10:6.5)*(.55+n1*.65),fade=Math.max(0,1-age/(heavy?3.2:2.4)),w=(heavy?4.8:2.8)+age*(heavy?8:4.5);
        this.dummy.rotation.set(0,0,0);this.dummy.position.set(d.x+Math.cos(a)*r,d.y+.45+age*(.45+n0*.65),d.z+Math.sin(a)*r);
        this.dummy.scale.set(w*(.75+n0*.5),w*(.42+n1*.35),1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.puffs.setColorAt(count,this.color.set(heavy?'#9e8d72':'#aa9a81'));this.fade.setX(count++,.48*fade);
      }
    }
    this.debris.count=chips;this.debris.instanceMatrix.needsUpdate=true;this.dummy.rotation.set(0,0,0);
    this.count=count;this.puffs.count=count;this.puffs.instanceMatrix.needsUpdate=true;this.puffs.instanceColor.needsUpdate=true;this.fade.needsUpdate=true;
  }
  get diagnostics(){return {puffs:this.count,puffCapacity:this.capacity,debris:this.debris.count,debrisCapacity:this.debris.instanceMatrix.count,puffBatches:this.puffBatches.length};}
  dispose(){this.scene.remove(this.sky);this.debris.removeFromParent();this.debris.dispose();this.debrisGeometry.dispose();this.debrisMaterial.dispose();for(const batch of this.puffBatches){batch.removeFromParent();batch.dispose();batch.geometry.dispose();}this.puffBatches=[];
    this.quad.dispose();this.skyGeometry.dispose();this.skyMaterial.dispose();this.material.dispose();this.texture.dispose();this.cloudTexture.dispose();}
}
