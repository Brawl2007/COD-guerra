import * as THREE from 'three';
import {puffTexture,cloudFieldTexture} from './m01-surfaces.js';

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
    let count=0;const max=quality==='low'?112:quality==='medium'?192:256;
    const damage=state.damage.filter(d=>d.smokeVisible).sort((a,b)=>Number(b.id.endsWith('_demolition'))-Number(a.id.endsWith('_demolition'))||b.started-a.started);
    for(const d of damage){
      if(!d.smokeVisible)continue;
      const demolition=d.id.endsWith('_demolition'),age=Math.max(0,clock-d.started),number=demolition?30:17;
      // Demolition is one rising cloud, not a chimney with particles looping back to the base.
      const growth=demolition?.15+.85*(1-Math.exp(-age/5)):1;
      const disperse=demolition?1+Math.min(age,120)/100:1;
      const endFade=d.id==='station_bomb'?1:Math.max(0,Math.min(1,(240-age)/30));
      for(let i=0;i<number&&count<max;i++){
        const phase=((demolition?0:age*.032)+(i+.5)*.618)%1,height=(demolition?105:42)*phase*growth;
        const width=((demolition?20:7)+(demolition?25:12)*phase)*disperse;
        const x=d.x+Math.sin(i*2.39)*width*.3+height*.25+Math.sin(age*.16+i*1.7)*width*.12+(demolition?Math.min(age,120)*.35:0),z=d.z+Math.cos(i*1.93)*width*.38+Math.sin(age*.11+i)*width*.09;
        this.dummy.position.set(x,d.y+3+height,z);this.dummy.scale.set(width*(.8+i%3*.12)*growth,width*(1.1+i%2*.24)*growth,1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.puffs.setColorAt(count,this.color.set(demolition?(i<8?'#726955':'#979080'):i<4?'#403e37':'#686b68'));
        // Chimney smoke fades before each respawn; all finite emitters fade before removal at 240 s.
        const cycleFade=demolition?1:Math.min(1,phase/.12,(1-phase)/.18);
        this.fade.setX(count,(demolition?.65:.72)*(1-phase*.65)*Math.min(1,age/2+.3)*cycleFade*endFade);count++;
      }
    }
    let chips=0;
    for(const d of damage){const age=clock-d.started;if(age<0||age>3.2)continue;
      const number=quality==='low'?8:quality==='medium'?16:24;
      for(let i=0;i<number&&chips<64;i++){const a=i*2.399,r=(3+i%5)*age;
        this.dummy.position.set(d.x+Math.cos(a)*r,d.y+.4+(7+i%7)*age-4.9*age*age,d.z+Math.sin(a)*r);
        this.dummy.rotation.set(age*(i+1),a,age*3);this.dummy.scale.setScalar(.08+(i%4)*.07);this.dummy.updateMatrix();this.debris.setMatrixAt(chips++,this.dummy.matrix);
      }
      for(let i=0;i<6&&count<max;i++){const a=i*2.399,r=age*9,fade=Math.max(0,1-age/3.2);
        this.dummy.rotation.set(0,0,0);this.dummy.position.set(d.x+Math.cos(a)*r,d.y+1+age,d.z+Math.sin(a)*r);this.dummy.scale.set(4+age*8,2+age*3,1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.puffs.setColorAt(count,this.color.set('#b0a085'));this.fade.setX(count++,.55*fade);
      }
    }
    this.debris.count=chips;this.debris.instanceMatrix.needsUpdate=true;this.dummy.rotation.set(0,0,0);
    this.count=count;this.puffs.count=count;this.puffs.instanceMatrix.needsUpdate=true;this.puffs.instanceColor.needsUpdate=true;this.fade.needsUpdate=true;
  }
  dispose(){this.scene.remove(this.sky);this.debris.removeFromParent();this.debris.dispose();this.debrisGeometry.dispose();this.debrisMaterial.dispose();for(const batch of this.puffBatches){batch.removeFromParent();batch.dispose();batch.geometry.dispose();}this.puffBatches=[];
    this.quad.dispose();this.skyGeometry.dispose();this.skyMaterial.dispose();this.material.dispose();this.texture.dispose();this.cloudTexture.dispose();}
}
