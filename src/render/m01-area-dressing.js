import * as THREE from 'three';

// R4 INC-1: presentation-only dressing of a new act's area (world.area, src/world/m01-area-world.js): shell craters (dark discs with a low earth rim), the scorched
// ground round the wreck and a soot stain on its hull. Procedural primitives of this project, no third-party asset, no collider (the parapets, the turned earth and
// the wreck itself are world solids drawn by M01View.syncSolids; the sandbags, ammunition boxes and wire are the T12 prop kit drawn by M01PropsRuntime).
// Built once per area, disposed with it; never decides anything.
export class M01AreaDressing {
  constructor(parent,world,{ground=null}={}){
    const L=world.area,y=L.groundY;
    this.area=L.area;this.group=new THREE.Group();this.group.name=`m01-area-dressing:${L.area}`;parent.add(this.group);
    this.geometries=[];this.materials=[];
    const geometry=g=>{this.geometries.push(g);return g;},material=m=>{this.materials.push(m);return m;};
    const put=(geo,mat,x,yy,z,sx,sy,sz,ry=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,yy,z);m.scale.set(sx,sy,sz);m.rotation.y=ry;m.receiveShadow=true;this.group.add(m);return m;};
    // The field: the relief skirt is flat here (the area's terrain region) but the terrain material's macro mask only covers the current act's rectangle, so it would be one
    // flat colour. A world-scaled soil/meadow surface (m01-surfaces texturedSurface, procedural) is laid over the flat part of the skirt, drawn just in front of it.
    const F=L.ground;
    if(ground&&F){this.materials.push(ground);
      const g=geometry(new THREE.PlaneGeometry(F.maxX-F.minX,F.maxZ-F.minZ,1,1).rotateX(-Math.PI/2));
      const m=new THREE.Mesh(g,ground);m.position.set((F.minX+F.maxX)/2,y,(F.minZ+F.maxZ)/2);m.receiveShadow=true;m.renderOrder=-1;m.name='m01-area-field';this.group.add(m);
    }
    // A tree line beyond the north edge (outside the playable area and behind the German entry): visual only, the haze reads it as the edge the attack came from.
    const crown=geometry(new THREE.IcosahedronGeometry(1,0)),cone=geometry(new THREE.ConeGeometry(1,1,6)),trunk=geometry(new THREE.CylinderGeometry(.12,.18,1,5));
    const leaf=material(new THREE.MeshStandardMaterial({color:'#3d4a2c',roughness:1,flatShading:true})),dark=material(new THREE.MeshStandardMaterial({color:'#2f3a26',roughness:1,flatShading:true})),bark=material(new THREE.MeshStandardMaterial({color:'#3a3027',roughness:1}));
    const T=L.treeLine;
    if(T)for(let i=0;i<T.count;i++){
      const h=n=>{let v=Math.imul(i+1,0x9e3779b1)^Math.imul(n+7,0x85ebca6b);v^=v>>>15;v=Math.imul(v,0x2c1b3c6d);v^=v>>>12;return (v>>>0)/4294967296;};
      const x=T.minX+(T.maxX-T.minX)*(i+h(1)*.8)/T.count,z=T.z+(h(2)-.5)*T.depthM,height=7+h(3)*9;
      put(trunk,bark,x,y+height*.25,z,1.6,height*.5,1.6);
      if(h(4)<.4)put(cone,dark,x,y+height*.62,z,2.2+h(5)*1.4,height*.85,2.2+h(5)*1.4,h(6)*6).castShadow=true;
      else put(crown,leaf,x,y+height*.7,z,3+h(5)*2.5,height*.38,3+h(6)*2.5,h(6)*6).castShadow=true;
    }
    const disc=geometry(new THREE.CircleGeometry(1,24).rotateX(-Math.PI/2));
    const rim=geometry(new THREE.TorusGeometry(1,.22,5,20).rotateX(Math.PI/2));
    const soot=material(new THREE.MeshStandardMaterial({color:'#2a251d',roughness:1,transparent:true,opacity:.82,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    const scorch=material(new THREE.MeshStandardMaterial({color:'#1d1a16',roughness:1,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    const earth=material(new THREE.MeshStandardMaterial({color:'#5a4a36',roughness:1}));
    (L.craters??[]).forEach(([x,z],i)=>{
      const r=1.9+((i*37)%10)/10,ry=i*1.3;
      put(disc,soot,x,y+.02,z,r,1,r*.86,ry);
      put(rim,earth,x,y+.02,z,r*1.08,.55,r*.94,ry).castShadow=true;
    });
    const w=L.points.wreck;
    put(disc,scorch,w.x,y+.025,w.z,7.5,1,5.5,.3);
    for(const b of L.wreck.boxes){   // soot over the hull's own box (a thin dark shell 2 cm outside it)
      const s=put(geometry(new THREE.BoxGeometry(1,1,1)),material(new THREE.MeshStandardMaterial({color:'#24211d',roughness:.95,metalness:.2})),
        (b.min[0]+b.max[0])/2,(b.min[1]+b.max[1])/2,(b.min[2]+b.max[2])/2,b.max[0]-b.min[0]+.04,b.max[1]-b.min[1]+.02,b.max[2]-b.min[2]+.04);
      s.castShadow=true;
    }
  }
  get diagnostics(){return {area:this.area,meshes:this.group.children.length};}
  dispose(){this.group.removeFromParent();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.group.clear();}
}
