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
          vec3 horizon=mix(vec3(.24,.28,.32),vec3(.58,.61,.62),day);
          vec3 zenith=mix(vec3(.09,.15,.24),vec3(.22,.34,.47),day);
          vec3 color=mix(horizon,zenith,pow(h,.55));
          float cloud=smoothstep(.33,.68,c)*smoothstep(-.03,.15,vDirection.y);
          vec3 cloudColor=mix(vec3(.30,.34,.37),vec3(.63,.65,.65),c)*(.72+day*.40);
          color=mix(color,cloudColor,cloud*.85);
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
        void main(){vec4 tex=texture2D(cloud,vUv);float alpha=tex.a*vOpacity;if(alpha<.006)discard;
          vec3 color=mix(vColor*tex.rgb,fogColor,smoothstep(500.0,2700.0,vDepth));gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    this.puffs=new THREE.InstancedMesh(this.quad,this.material,this.capacity);
    this.puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.puffs.count=0;this.puffs.frustumCulled=false;
    this.puffs.geometry.setAttribute('puffOpacity',new THREE.InstancedBufferAttribute(new Float32Array(this.capacity),1));
    for(let i=0;i<this.capacity;i++)this.puffs.setColorAt(i,new THREE.Color());scene.add(this.puffs);
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.fade=this.puffs.geometry.attributes.puffOpacity;
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
        const x=d.x+Math.sin(i*2.39)*width*.3+height*.19+(demolition?Math.min(age,120)*.35:0),z=d.z+Math.cos(i*1.93)*width*.28;
        this.dummy.position.set(x,d.y+3+height,z);this.dummy.scale.set(width*(.8+i%3*.12)*growth,width*(1.1+i%2*.24)*growth,1);this.dummy.updateMatrix();
        this.puffs.setMatrixAt(count,this.dummy.matrix);this.puffs.setColorAt(count,this.color.set(demolition?'#aaa18b':i<4?'#5d5648':'#606365'));
        // Chimney smoke fades before each respawn; all finite emitters fade before removal at 240 s.
        const cycleFade=demolition?1:Math.min(1,phase/.12,(1-phase)/.18);
        this.fade.setX(count,(demolition?.65:.72)*(1-phase*.65)*Math.min(1,age/2+.3)*cycleFade*endFade);count++;
      }
    }
    this.count=count;this.puffs.count=count;this.puffs.instanceMatrix.needsUpdate=true;this.puffs.instanceColor.needsUpdate=true;this.fade.needsUpdate=true;
  }
  dispose(){this.scene.remove(this.sky,this.puffs);this.puffs.dispose();this.quad.dispose();this.skyGeometry.dispose();this.skyMaterial.dispose();this.material.dispose();this.texture.dispose();this.cloudTexture.dispose();}
}
