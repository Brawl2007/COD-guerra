// Pure-data collision kit exported from the checked GLB. Never serialises Three.js objects.
import { readFile, writeFile } from 'node:fs/promises';
const root=new URL('../../../',import.meta.url),base=new URL('assets/models/provisional/m01/',root);
const boxes=[];
for(const name of ['bridge_rail_1891_1912','bridge_road_lentze_1857_1912','portal_lisewo_1912']){
  const b=await readFile(new URL(`${name}.colliders.glb`,base));
  const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  const visit=(index,offset)=>{
    const node=gltf.nodes[index],t=(node.translation??[0,0,0]).map((v,i)=>v+offset[i]);
    if(node.matrix||(node.rotation&&!node.rotation.every((v,i)=>v===[0,0,0,1][i]))||
      (node.scale&&!node.scale.every(v=>v===1)))throw new Error(`Transform não suportado no colisor ${node.name}`);
    if(node.mesh!==undefined){
      const positions=gltf.meshes[node.mesh].primitives.map(p=>gltf.accessors[p.attributes.POSITION]);
      const min=[0,1,2].map(i=>Math.min(...positions.map(a=>a.min[i]))+t[i]);
      const max=[0,1,2].map(i=>Math.max(...positions.map(a=>a.max[i]))+t[i]);
      boxes.push({id:node.name,min,max,...node.extras.m01});
    }
    for(const child of node.children??[])visit(child,t);
  };
  for(const index of gltf.scenes[gltf.scene??0].nodes)visit(index,[0,0,0]);
}
const output=new URL('bridge-colliders.json',base),content=JSON.stringify({schemaVersion:1,units:'metres',generatedBy:'tools/assets/m01-bridges/export-colliders.mjs',boxes},null,2)+'\n';
if(process.argv.includes('--check')){
  if(await readFile(output,'utf8')!==content)throw new Error('bridge-colliders.json diverge dos GLB. Volte a exportar.');
}else await writeFile(output,content);
console.log(`${process.argv.includes('--check')?'Verified':'Exported'} ${boxes.length} collider boxes from the three GLB.`);
