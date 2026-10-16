import * as THREE from 'three';

export const VISUAL_VARIATION_VERSION='m01-soldier-visual/v1';
const NAMED={marek_zielinski:'zielinski',pawel_krawiec:'krawiec',tadeusz_nowicki:'nowicki',jozef_bak:'bak',szymon_kowal:'kowal',leon_dudek:'dudek'};
const PL_HEADS=['pl_a','wrona','nowicki','bak','dudek','krawiec','kowal','zielinski'];
const DE_HEADS=['de_a','de_b','de_c'];
// Bounded dye/fading multipliers of the existing national atlas, not new uniform types.
const CLOTH=[[.80,.83,.79],[1.03,1.00,.91],[.91,.97,.91],[1.02,.94,.82],[.83,.89,.87],[1.04,1.04,.99],[.94,.87,.77],[.88,.94,.83]];
const SKIN=[[1.03,.98,.91],[.94,.95,.94],[1.07,1.00,.95],[.89,.90,.88],[1.00,.96,.92],[.95,.93,.90],[1.05,.99,.93],[.93,.96,.96]];
const PACK=[.82,1.16,1.02,.92,1.20,.87,1.10,.96];
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function visualHash(text){let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;}

// No seed, RNG, clock, health, camera, array index or save field participates.
const descriptors=new Map();
export function soldierVisualVariant(actor){
  const nation=actor.team==='enemy'?'de':'pl',role=actor.role??'RIFLEMAN';
  const identity=`${VISUAL_VARIATION_VERSION}|${nation}|${role}|${actor.id}|${actor.group??''}|${actor.weapon??''}`;
  if(descriptors.has(identity))return descriptors.get(identity);
  const profile=visualHash(identity)%8;
  const head=NAMED[actor.id]??(nation==='de'?DE_HEADS[profile%3]:PL_HEADS[profile]);
  const equipment=actor.role==='ENGINEER'?'sapper':actor.id==='marek_zielinski'?'nco':actor.id==='pawel_krawiec'?'sapper':
    actor.group==='grp_ckm_crew'?'ckm-crew':actor.weapon==='mg34'?'mg-crew':actor.id==='szymon_kowal'?'rkm':'field';
  const descriptor=Object.freeze({version:VISUAL_VARIATION_VERSION,id:`${nation}:${profile}`,nation,profile,head,equipment,
    faceStyle:nation==='de'?profile%2:0,pack:PACK[profile],shovel:actor.role==='ENGINEER'||profile%3!==0,wear:profile%4,
    proxyCloth:new THREE.Color(nation==='de'?'#b4c0b7':'#c9bea0').multiply(new THREE.Color(...CLOTH[profile])).getHexString(),
    proxyHelmet:new THREE.Color(nation==='de'?'#465252':'#635f47').multiplyScalar(.82+profile*.033).getHexString(),
    proxySkin:new THREE.Color(...SKIN[profile]).getHexString()});
  descriptors.set(identity,descriptor);return descriptor;
}

// Connected shells in the original merged gear mesh. Weld only exact positions: no actor-dependent slicing.
function gearShells(g){
  const p=g.getAttribute('position'),parent=Array.from({length:p.count},(_,i)=>i),points=new Map();
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  const join=(a,b)=>{parent[find(a)]=find(b);};
  for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');if(points.has(k))join(i,points.get(k));else points.set(k,i);}
  const index=g.index;for(let i=0;index&&i<index.count;i+=3){join(index.getX(i),index.getX(i+1));join(index.getX(i),index.getX(i+2));}
  const shells=new Map();for(let i=0;i<p.count;i++){const k=find(i);if(!shells.has(k))shells.set(k,{vertices:[],box:new THREE.Box3()});const s=shells.get(k);s.vertices.push(i);s.box.expandByPoint(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)));}
  return [...shells.values()];
}

// Source attributes/atlas are immutable and shared; only colours and changed gear positions/indices are private.
export class SoldierVisualVariations {
  constructor(){this.geometries=new Map();this.materials=new Map();this.shells=new WeakMap();this.disposed=false;}
  apply(root,actor,key,variant=soldierVisualVariant(actor)){
    root.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible||!mesh.geometry.getAttribute('position'))return;
      const name=mesh.name,head=name.startsWith('head_');
      if(!(name==='body'||name==='gear'||name.startsWith('helmet_')||name==='sapper'||head&&!NAMED[actor.id]))return;
      const source=mesh.geometry,cacheKey=`${key}|${variant.profile}|${name}|${name==='gear'&&variant.shovel?'full':'light'}`;
      if(!this.geometries.has(cacheKey))this.geometries.set(cacheKey,this.geometry(source,mesh,variant));
      if(!this.materials.has(mesh.material)){const material=mesh.material.clone();material.vertexColors=true;this.materials.set(mesh.material,material);}
      mesh.geometry=this.geometries.get(cacheKey);mesh.material=this.materials.get(mesh.material);
    });
    return variant;
  }
  geometry(source,mesh,v){
    const g=new THREE.BufferGeometry();for(const [name,a]of Object.entries(source.attributes))g.setAttribute(name,a);g.setIndex(source.index);
    const pos=source.getAttribute('position'),colour=new Float32Array(pos.count*3),head=mesh.name.startsWith('head_'),helmet=mesh.name.startsWith('helmet_');
    const bones=mesh.skeleton?.bones??[],joints=source.getAttribute('skinIndex'),weights=source.getAttribute('skinWeight');
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
      let hand=false;if(mesh.name==='body'&&joints&&weights)for(let k=0;k<4;k++)if(weights.getComponent(i,k)>.2&&/^(hand|thumb|index|middle|ring|pinky)/.test(bones[joints.getComponent(i,k)]?.name??''))hand=true;
      const base=head?SKIN[v.profile]:mesh.name==='body'&&!hand?CLOTH[v.profile]:helmet?[.84+v.profile*.024,.86+v.profile*.019,.80+v.profile*.025]:[1,1,1];
      const pattern=.5+.5*Math.sin(x*39+y*23+z*51+v.profile*2.3),hem=1-smooth(.35,.9,y);
      const dirt=head?.045*(v.wear+1)*pattern:hand?.025:helmet?.075*v.wear*pattern:(.06*v.wear+.14*hem)*pattern;
      const beard=head&&v.profile%2&&y<1.59&&z<-.035?.10:0;
      for(let k=0;k<3;k++)colour[i*3+k]=Math.max(.5,base[k]*(1-dirt-beard));
    }
    g.setAttribute('color',new THREE.BufferAttribute(colour,3));
    if(head&&v.nation==='de'){
      // Two authored lower-face treatments of each existing German face, not a random morph generator.
      // Local lower-face treatment: maximum per-coordinate change 3 mm; original skin weights and rig intact.
      const p=new Float32Array(pos.count*3),normal=source.getAttribute('normal'),ns=new Float32Array(pos.count*3);
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),jaw=smooth(1.49,1.54,y)*(1-smooth(1.59,1.64,y))*smooth(.015,.07,-z);
        const dx=THREE.MathUtils.clamp(x*(v.faceStyle?.045:-.035)*jaw,-.003,.003);
        const nose=Math.exp(-x*x/.00025)*smooth(1.56,1.60,y)*(1-smooth(1.65,1.68,y))*smooth(.04,.07,-z);
        p.set([x+dx,y,z+(v.faceStyle?-.0015:.001)*nose],i*3);
        if(normal)ns.set([normal.getX(i),normal.getY(i),normal.getZ(i)],i*3);
      }
      g.setAttribute('position',new THREE.BufferAttribute(p,3));if(normal)g.setAttribute('normal',new THREE.BufferAttribute(ns,3));g.computeVertexNormals();
    }
    if(mesh.name==='gear'){
      if(!this.shells.has(source))this.shells.set(source,gearShells(source));
      const positions=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++)positions.set([pos.getX(i),pos.getY(i),pos.getZ(i)],i*3);
      const removed=new Set();let changed=false;
      for(const s of this.shells.get(source)){
        const b=s.box,c=b.getCenter(new THREE.Vector3());
        // Existing right rear breadbag body/flap: bounded fullness and a 0–6 cm lateral belt placement.
        const bag=b.min.x>=-.04&&b.min.y>=.80&&b.max.y<1.016&&b.max.z>.20&&b.min.z<.03;
        const shovel=b.max.x<-.005&&b.min.z>.02&&b.max.y<.95;
        if(bag){const lateral=[0,.06,.035,.02,.055,.01,.045,.03][v.profile];for(const i of s.vertices){positions[i*3]=c.x+(positions[i*3]-c.x)*v.pack+lateral;positions[i*3+2]=c.z+(positions[i*3+2]-c.z)*v.pack;}changed=true;}
        if(shovel&&!v.shovel)for(const i of s.vertices)removed.add(i);
      }
      if(changed){g.setAttribute('position',new THREE.BufferAttribute(positions,3));const normal=source.getAttribute('normal');if(normal){const ns=new Float32Array(normal.count*3);for(let i=0;i<normal.count;i++)ns.set([normal.getX(i),normal.getY(i),normal.getZ(i)],i*3);g.setAttribute('normal',new THREE.BufferAttribute(ns,3));}g.computeVertexNormals();}
      if(removed.size&&source.index){const indices=[];for(let i=0;i<source.index.count;i+=3){const t=[0,1,2].map(k=>source.index.getX(i+k));if(!t.every(n=>removed.has(n)))indices.push(...t);}g.setIndex(indices);}
    }
    g.computeBoundingBox();g.computeBoundingSphere();return g;
  }
  get diagnostics(){let privateBytes=0;const buffers=new Set();for(const g of this.geometries.values())for(const name of ['color','position','normal']){const a=g.getAttribute(name);if(a&&!a.isInterleavedBufferAttribute&&!buffers.has(a.array)){buffers.add(a.array);privateBytes+=a.array.byteLength;}}
    return {version:VISUAL_VARIATION_VERSION,profilesPerNation:8,geometries:this.geometries.size,materials:this.materials.size,additionalTextures:0,additionalDrawCalls:0,attributeBytesUpperBound:privateBytes};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const g of this.geometries.values())g.dispose();for(const m of this.materials.values())m.dispose();this.geometries.clear();this.materials.clear();}
}
