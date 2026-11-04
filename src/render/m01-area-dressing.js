import * as THREE from 'three';
import {artTexture} from './m01-surfaces.js';
import {areaReliefOffset,buildFieldGeometry,createFieldMaterial} from './m01-area-field.js';
import {buildMoundGeometry,buildBermGeometry,buildClodGeometry,buildCraterRimGeometry,buildMoundInstances,buildClodInstances,createEarthMaterial,createBermMaterial} from './m01-area-earthworks.js';
import {buildTreeLine,treeDrawRange,createTreeMaterial,TREE_SHARE} from './m01-area-trees.js';
import {buildWreckGeometry,createWreckMaterial} from './m01-area-wreck.js';
import {createStubble} from './m01-area-stubble.js';

// R4 INC-1 + the VII-a visual package: presentation-only dressing of a new act's area (world.area, src/world/m01-area-world.js). Procedural primitives of this project, no third-party
// asset, no collider, nothing here decides anything. The area's solids are the simulation's boxes (the parapet, the turned earth the Germans bound to, the wreck: world.areaCovers);
// this class draws them as heaped earth, an earth berm and a generic hull instead of the world's plain boxes (`replaces(id)` tells M01View.syncSolids which boxes it no longer needs
// to draw); the sandbags, ammunition boxes and wire are the T12 prop kit drawn by M01PropsRuntime.
// What it draws, in draw calls: the field (1), the heaped mounds (1), the berm (1), the clods (1), crater discs and rims (2), the scorch (1), the hull (1), the tree line with its
// undergrowth (1), and on High the stubble (1): ten (eleven on High), against the roughly 150 of the first version (two meshes per tree, two per crater, two per wreck box).
// INC-2: syncShellCraters adds the craters of an act's shells (two more instanced draws, on the first shell only).
// Built once per area, disposed with it; the quality tier only scales how many trees and clods are drawn and the field shader's detail (never the cover or the hull).
const SHELL_CRATERS_MAX=40;
export class M01AreaDressing{
  /** `surface(x,z)` = the submitted terrain surface under the field (without this class's offset); `quality` = 'low'|'medium'|'high'. */
  constructor(parent,world,{surface=null,quality='low',reuse=null}={}){
    const L=world.area,y=L.groundY,F=L.ground;
    this.area=L.area;this.groundY=y;this.quality=quality;this.group=new THREE.Group();this.group.name=`m01-area-dressing:${L.area}`;parent.add(this.group);
    this.geometries=[];this.materials=[];this.textures=[];this.replaced=new Set();this.drawn=[];this.wreckKey=M01AreaDressing.wreckKey(world);
    const geometry=g=>{this.geometries.push(g);return g;},material=m=>{this.materials.push(m);return m;};
    const base=surface??(()=>y),ground=(x,z)=>base(x,z)+areaReliefOffset(L,x,z);
    const add=(mesh,name,{cast=false,receive=true,triangles=null}={})=>{mesh.name=name;mesh.castShadow=cast;mesh.receiveShadow=receive;this.group.add(mesh);
      const g=mesh.geometry,tris=triangles??(g.index?g.index.count:g.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);this.drawn.push({mesh,name,triangles:tris});return mesh;};

    // The field: the existing terrain is covered by a grid that follows its submitted surface plus the area's visual offset (m01-area-field: 0 on the fought-over strip), drawn with
    // a procedural patchwork of crops and soil (domain-warped, rows that follow the field, a worn track with ruts, a trampled strip behind the parapet). renderOrder -1 and a
    // polygon offset keep it in front of the coplanar terrain.
    // Perf audit: an act of the same area (VII-a -> VII-b -> VII-c) only changes the covers; the field, the stubble, the trees, the scorch and an unchanged wreck are taken over from `reuse` (see adopt).
    const adopted=reuse&&reuse!==this&&reuse.area===L.area?this.adopt(reuse,world):new Set();
    if(F&&!adopted.has('field')){
      const detail=artTexture('soil',256);this.textures.push(detail);
      const track=(L.features??[]).find(f=>f.id==='np_track_south')?.polyline.map(p=>[p[0],p[2]])??[],P=L.parapets,xs=P.segments.flat();
      this.field=createFieldMaterial(detail,{track,band:[Math.min(...xs)-6,Math.max(...xs)+6,P.z1+.9,P.z1+4.5],origin:[(F.minX+F.maxX)/2,(F.minZ+F.maxZ)/2],quality});
      Object.assign(this.field.material,{polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4});material(this.field.material);
      const m=new THREE.Mesh(geometry(buildFieldGeometry(L,base,{cell:12})),this.field.material);m.renderOrder=-1;add(m,'m01-area-field');
      // Round 2 (High tier only): stubble/grass tufts that follow the camera over the fought-over strip (m01-area-stubble). One instanced draw call, hidden below High.
      const B=L.bounds.playable;this.stubble=createStubble({bounds:[B.minX,B.maxX,B.minZ,B.maxZ],groundY:y,origin:[(F.minX+F.maxX)/2,(F.minZ+F.maxZ)/2]});
      add(this.stubble.mesh,'m01-area-stubble',{receive:false,triangles:this.stubble.triangles});
    }

    // Earthworks: one soil material for the heaps, the berm, the clods and the crater rims.
    const covers=world.areaCovers??[],parapets=covers.filter(c=>c.coverType==='PARAPET'),mounds=covers.filter(c=>c.coverType==='EARTH');
    const earth=material(createEarthMaterial());this.earth=earth;   // also the shell craters' rim material (syncShellCraters)
    if(mounds.length){
      const mesh=buildMoundInstances(mounds,geometry(buildMoundGeometry(3,{seg:18,detail:1})),earth);add(mesh,'m01-area-mounds',{cast:true,triangles:mesh.count*mesh.geometry.index.count/3});
      for(const c of mounds)this.replaced.add(c.id);
    }
    if(parapets.length){
      // Round 2: the berm has its own soil with a plank-and-picket revetment on the inner face and near-camera pebble detail (createBermMaterial).
      this.berm=createBermMaterial({base:y,z:(L.parapets.z0+L.parapets.z1)/2,quality});
      add(new THREE.Mesh(geometry(buildBermGeometry(parapets)),material(this.berm.material)),'m01-area-berm',{cast:true});
      for(const c of parapets)this.replaced.add(c.id);
    }
    if(mounds.length||parapets.length){
      this.clods=buildClodInstances(mounds,parapets,geometry(buildClodGeometry()),earth);add(this.clods,'m01-area-clods',{triangles:0});
    }

    // Craters (visual only; the simulation has none): a dark scorched disc and a lumpy raised rim, instanced.
    const craters=L.craters??[];
    if(craters.length){
      const disc=geometry(new THREE.CircleGeometry(1,24).rotateX(-Math.PI/2));
      const soot=material(new THREE.MeshStandardMaterial({color:'#2a251d',roughness:1,transparent:true,opacity:.82,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
      const discs=new THREE.InstancedMesh(disc,soot,craters.length),rims=new THREE.InstancedMesh(geometry(buildCraterRimGeometry()),earth,craters.length);
      const m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),s=new THREE.Vector3();
      craters.forEach(([x,z],i)=>{
        const r=1.9+((i*37)%10)/10;e.set(0,i*1.3,0);q.setFromEuler(e);
        p.set(x,y+.02,z);s.set(r,1,r*.86);m.compose(p,q,s);discs.setMatrixAt(i,m);
        p.set(x,y,z);s.set(r*1.02,.34,r*.9);m.compose(p,q,s);rims.setMatrixAt(i,m);
      });
      discs.instanceMatrix.needsUpdate=rims.instanceMatrix.needsUpdate=true;discs.computeBoundingSphere();rims.computeBoundingSphere();
      add(discs,'m01-area-crater-discs',{triangles:craters.length*24});add(rims,'m01-area-crater-rims',{cast:true,triangles:craters.length*rims.geometry.index.count/3});
    }

    // The wreck: the scorched ground round it and a generic hull inside the simulation's two boxes (the smoke column is the atmosphere's: the simulation's damage record).
    const w=L.points.wreck,wh=covers.find(c=>c.id==='np_wreck_hull'),wu=covers.find(c=>c.id==='np_wreck_upper');
    const scorch=material(new THREE.MeshStandardMaterial({color:'#1d1a16',roughness:1,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
    if(!adopted.has('scorch')){const sm=new THREE.Mesh(geometry(new THREE.CircleGeometry(1,28).rotateX(-Math.PI/2)),scorch);sm.position.set(w.x,y+.025,w.z);sm.scale.set(7.5,1,5.5);sm.rotation.y=.3;add(sm,'m01-area-scorch',{receive:false,triangles:28});}
    if(wh&&wu){
      const arr=c=>({min:[c.min.x,c.min.y,c.min.z],max:[c.max.x,c.max.y,c.max.z]});
      if(!adopted.has('wreck'))add(new THREE.Mesh(geometry(buildWreckGeometry(arr(wh),arr(wu))),material(createWreckMaterial())),'m01-area-wreck',{cast:true});
      this.replaced.add(wh.id);this.replaced.add(wu.id);
    }

    // The tree line north of the area (layout.treeLine): pines, broadleaves and undergrowth in one geometry; the quality tier draws a prefix of whole trees.
    const T=L.treeLine;
    if(T&&!adopted.has('trees')){
      const built=buildTreeLine(T,ground);this.trees=built.trees;
      const mesh=new THREE.Mesh(geometry(built.geometry),material(createTreeMaterial()));add(mesh,'m01-area-trees',{receive:true});
      this.treeMesh=mesh;this.treeTriangles=built.geometry.index.count/3;
    }
    this.setQuality(quality);
  }
  /** Key of the wreck's two simulation boxes (the hull is drawn from them): a reused hull is only valid if they are the same. */
  static wreckKey(world){
    const c=(world.areaCovers??[]).filter(b=>b.id==='np_wreck_hull'||b.id==='np_wreck_upper');
    return c.map(b=>[b.id,b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].join(':')).join('|');
  }
  /**
   * Takes over, from the dressing of the previous act of the same area, the pieces that do not depend on the act's covers (field + soil texture + stubble, trees, scorch, and the wreck when its boxes are the same):
   * they move into this dressing's group and ownership lists, so disposing `prev` afterwards leaves them alone. Returns the names taken: 'field', 'trees', 'scorch', 'wreck'.
   */
  adopt(prev,world){
    const got=new Set(),wk=this.wreckKey;
    const take=(name,tag)=>{
      const i=prev.drawn.findIndex(d=>d.name===name);if(i<0)return false;
      const d=prev.drawn[i];prev.drawn.splice(i,1);this.drawn.push(d);this.group.add(d.mesh);
      for(const [from,to,item] of [[prev.geometries,this.geometries,d.mesh.geometry],[prev.materials,this.materials,d.mesh.material]]){const k=from.indexOf(item);if(k>=0){from.splice(k,1);to.push(item);}}
      got.add(tag);return true;
    };
    if(prev.field&&take('m01-area-field','field')){
      this.field=prev.field;this.textures.push(...prev.textures.splice(0));
      if(take('m01-area-stubble','stubble')){this.stubble=prev.stubble;prev.stubble=null;}
    }
    if(prev.treeMesh&&take('m01-area-trees','trees')){this.trees=prev.trees;this.treeMesh=prev.treeMesh;this.treeTriangles=prev.treeTriangles;prev.treeMesh=null;}
    take('m01-area-scorch','scorch');
    if(prev.wreckKey===wk)take('m01-area-wreck','wreck');
    return got;
  }
  /** Scales what is drawn with the tier (never cover, the hull or the German-visible ground). Cheap and idempotent. */
  setQuality(quality){
    this.quality=quality;this.field?.setQuality(quality);this.berm?.setQuality(quality);if(this.stubble)this.stubble.mesh.visible=quality==='high';
    const share=TREE_SHARE[quality]??TREE_SHARE.low;
    if(this.treeMesh){const r=treeDrawRange(this.trees,share);this.treeMesh.geometry.setDrawRange(r.start,r.count);this.treesDrawn=r.trees;}
    if(this.clods)this.clods.count=Math.max(1,Math.round(this.clods.userData.total*({low:.45,medium:.7,high:1}[quality]??.45)));
  }
  /**
   * INC-2 (Act VII-b): the craters of the act's shells, from the simulation's saved damage records (`np_shell_crater_*`: where and when each fell) as the same dark scorched disc and lumpy rim as the area's
   * old craters, two instanced draws made on the first shell and redrawn only when the set of records changes (the latest SHELL_CRATERS_MAX). The decals of the current act cannot lie on the area (its ground is
   * not the terrain they project on), so without this a shell would leave smoke and nothing on the ground. Presentation only: it reads the records, decides nothing, and an act with no shells never reaches it.
   */
  syncShellCraters(damage){
    // Called every frame with a fresh array: the cheap signature (count, first and last crater id) is taken without allocating; the list is only built when it changes.
    let n=0,first=null,last=null;
    if(damage)for(let i=0;i<damage.length;i++){const id=damage[i].id;if(typeof id==='string'&&id.startsWith('np_shell_crater_')){if(n===0)first=id;last=id;n++;}}
    if(n===(this.shellCraterN??0)&&first===(this.shellCraterFirst??null)&&last===(this.shellCraterLast??null))return;   // nothing changed (and nothing to draw before the first shell: an act without shells never makes the meshes)
    this.shellCraterN=n;this.shellCraterFirst=first;this.shellCraterLast=last;
    const list=damage.filter(d=>typeof d.id==='string'&&d.id.startsWith('np_shell_crater_')).slice(-SHELL_CRATERS_MAX);
    if(!this.shellCraters){
      const disc=new THREE.CircleGeometry(1,24).rotateX(-Math.PI/2),rim=buildCraterRimGeometry();
      const soot=new THREE.MeshStandardMaterial({color:'#2a251d',roughness:1,transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),earth=this.earth??createEarthMaterial();
      this.geometries.push(disc,rim);this.materials.push(soot);if(earth!==this.earth)this.materials.push(earth);   // the dressing's own earth material is already owned (one soil shader program, not two)
      const discs=new THREE.InstancedMesh(disc,soot,SHELL_CRATERS_MAX),rims=new THREE.InstancedMesh(rim,earth,SHELL_CRATERS_MAX);
      for(const [m,name,cast] of [[discs,'m01-area-shell-crater-discs',false],[rims,'m01-area-shell-crater-rims',true]]){m.name=name;m.castShadow=cast;m.receiveShadow=true;m.frustumCulled=false;this.group.add(m);}
      this.shellCraters={discs,rims};
    }
    const {discs,rims}=this.shellCraters,m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),sc=new THREE.Vector3(),y=this.groundY;
    list.forEach((d,i)=>{
      const r=2.6+((i*37)%10)/10*.9;e.set(0,i*1.9,0);q.setFromEuler(e);   // a shell's crater is a little larger than the old mortar marks (1.9-2.9 m)
      p.set(d.x,y+.02,d.z);sc.set(r,1,r*.86);m.compose(p,q,sc);discs.setMatrixAt(i,m);
      p.set(d.x,y,d.z);sc.set(r*1.02,.4,r*.9);m.compose(p,q,sc);rims.setMatrixAt(i,m);
    });
    discs.count=rims.count=list.length;discs.instanceMatrix.needsUpdate=rims.instanceMatrix.needsUpdate=true;
  }
  /** True for the simulation boxes this class draws itself: M01View.syncSolids then skips their plain boxes. */
  replaces(id){return this.replaced.has(id);}
  get diagnostics(){
    let triangles=0;for(const d of this.drawn){if(d===undefined)continue;
      if(d.name==='m01-area-trees')triangles+=this.treeMesh.geometry.drawRange.count/3;else if(d.name==='m01-area-clods')triangles+=d.mesh.count*d.mesh.geometry.index.count/3;else if(d.name==='m01-area-stubble'){if(d.mesh.visible)triangles+=d.triangles;}else triangles+=d.triangles;}
    return {area:this.area,quality:this.quality,meshes:this.group.children.length,drawCalls:this.drawn.filter(d=>d.mesh.visible).length,triangles:Math.round(triangles),trees:this.treesDrawn??0,clods:this.clods?.count??0,replacedSolids:this.replaced.size};
  }
  dispose(){this.group.removeFromParent();for(const c of this.group.children)if(c.isInstancedMesh)c.dispose();   // frees the instance matrix/colour buffers (the stubble's mesh is the stubble's own; harmless twice)
    for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.stubble?.dispose();this.stubble=null;this.group.clear();this.drawn.length=0;}
}
