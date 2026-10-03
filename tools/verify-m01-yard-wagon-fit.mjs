import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TczewWorld} from '../src/world/tczew-world.js';

const HERE=dirname(fileURLToPath(import.meta.url));
export const ROOT=resolve(HERE,'..');

export const INTACT_FILES=[
  'assets/models/provisional/m01-wagons/m01_wagon_covered_lod0.glb',
  'assets/models/provisional/m01-wagons/m01_wagon_covered_lod1.glb',
  'assets/models/provisional/m01-wagons/m01_wagon_covered_lod2.glb',
  'assets/models/provisional/m01-wagons/m01_wagon_open_lod0.glb',
  'assets/models/provisional/m01-wagons/m01_wagon_open_lod1.glb',
  'assets/models/provisional/m01-wagons/m01_wagon_open_lod2.glb',
];

export const DAMAGE_FILES=[
  'assets/models/provisional/m01-wagon-damage/m01_wagon_covered_burned_lod0.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_covered_burned_lod1.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_covered_burned_lod2.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_covered_damaged_lod0.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_covered_damaged_lod1.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_covered_damaged_lod2.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_open_burned_lod0.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_open_burned_lod1.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_open_burned_lod2.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_open_damaged_lod0.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_open_damaged_lod1.glb',
  'assets/models/provisional/m01-wagon-damage/m01_wagon_open_damaged_lod2.glb',
];

const round=(n,digits=6)=>Number(n.toFixed(digits));
const same=(a,b,eps=1e-6)=>Math.abs(a-b)<=eps;
const sameVec=(a,b,eps=1e-6)=>a.length===b.length&&a.every((v,i)=>same(v,b[i],eps));

function mergeBounds(into,box){
  if(!box)return into;
  if(!into)return {min:[...box.min],max:[...box.max]};
  for(let i=0;i<3;i++){
    into.min[i]=Math.min(into.min[i],box.min[i]);
    into.max[i]=Math.max(into.max[i],box.max[i]);
  }
  return into;
}

function parseGlbJson(buffer,path){
  if(buffer.length<20||buffer.toString('ascii',0,4)!=='glTF')throw new Error(`${path}: magic GLB inválida`);
  if(buffer.readUInt32LE(4)!==2)throw new Error(`${path}: GLB não é versão 2`);
  if(buffer.readUInt32LE(8)!==buffer.length)throw new Error(`${path}: tamanho declarado não coincide com ficheiro`);
  let offset=12,json=null;
  while(offset+8<=buffer.length){
    const length=buffer.readUInt32LE(offset),type=buffer.readUInt32LE(offset+4),start=offset+8,end=start+length;
    if(end>buffer.length)throw new Error(`${path}: chunk fora do ficheiro`);
    if(type===0x4e4f534a)json=JSON.parse(buffer.toString('utf8',start,end).replace(/[\0 ]+$/,''));
    offset=end;
  }
  if(!json)throw new Error(`${path}: chunk JSON ausente`);
  return json;
}

function meshBounds(gltf,meshIndex){
  let box=null;
  for(const primitive of gltf.meshes[meshIndex].primitives){
    const accessor=gltf.accessors[primitive.attributes.POSITION];
    if(!accessor?.min||!accessor?.max)throw new Error('Accessor POSITION sem min/max');
    box=mergeBounds(box,{min:accessor.min,max:accessor.max});
  }
  return box;
}

function translated(box,t){
  return {min:box.min.map((v,i)=>v+t[i]),max:box.max.map((v,i)=>v+t[i])};
}

function nodeBounds(gltf,index,parent=[0,0,0]){
  const node=gltf.nodes[index];
  if(node.matrix||node.rotation||node.scale)throw new Error(`${node.name??index}: transform não-translation inesperado`);
  const local=node.translation??[0,0,0],world=local.map((v,i)=>v+parent[i]);
  let box=node.mesh===undefined?null:translated(meshBounds(gltf,node.mesh),world);
  for(const child of node.children??[])box=mergeBounds(box,nodeBounds(gltf,child,world));
  return box;
}

export function inspectGlb(relativePath){
  const buffer=readFileSync(resolve(ROOT,relativePath));
  const gltf=parseGlbJson(buffer,relativePath),scene=gltf.scenes[gltf.scene??0];
  if(!scene?.nodes?.length)throw new Error(`${relativePath}: cena sem raiz`);
  let bounds=null;
  for(const root of scene.nodes)bounds=mergeBounds(bounds,nodeBounds(gltf,root));
  const rootNode=gltf.nodes[scene.nodes[0]];
  const wheelsets=['wheelset_1','wheelset_2'].map(name=>{
    const node=gltf.nodes.find(n=>n.name===name);
    if(!node||node.mesh===undefined)throw new Error(`${relativePath}: ${name} ausente`);
    const local=meshBounds(gltf,node.mesh),translation=node.translation??[0,0,0];
    return {
      name,
      translation:translation.map(v=>round(v)),
      localBounds:{min:local.min.map(v=>round(v)),max:local.max.map(v=>round(v))},
      geometricBottomY:round(translation[1]+local.min[1]),
      geometricTopY:round(translation[1]+local.max[1]),
    };
  });
  return {
    file:relativePath,
    bytes:buffer.length,
    root:rootNode.name??null,
    rootTranslation:(rootNode.translation??[0,0,0]).map(v=>round(v)),
    bounds:{min:bounds.min.map(v=>round(v)),max:bounds.max.map(v=>round(v))},
    size:bounds.min.map((v,i)=>round(bounds.max[i]-v)),
    wheelsets,
  };
}

function readJson(relativePath){return JSON.parse(readFileSync(resolve(ROOT,relativePath),'utf8'));}

function rotateXZ([x,z],yaw){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return [x*c+z*s,-x*s+z*c];
}

function supportContacts(point,yaw,gauge=1.435,wheelbase=4){
  const out=[];
  for(const localZ of [-wheelbase/2,wheelbase/2])for(const localX of [-gauge/2,gauge/2]){
    const [dx,dz]=rotateXZ([localX,localZ],yaw);
    out.push({x:point[0]+dx,z:point[2]+dz});
  }
  return out;
}

export function analyseYard(){
  const layout=readJson('missions/m01-tczew/map-layout.json');
  const world=new TczewWorld();
  const freight=layout.features.find(f=>f.id==='freight_wagons_west');
  if(!freight||freight.points?.length!==3)throw new Error('freight_wagons_west não tem exactamente 3 pontos');
  const coverIds=['cv_wagon_1','cv_wagon_2'];
  const covers=coverIds.map(id=>layout.coverNodes.find(c=>c.id===id));
  if(covers.some(c=>!c))throw new Error('cv_wagon_1/2 ausentes');

  // Os modelos têm eixo longitudinal local Z. As duas coberturas usam normal +X e ficam,
  // relativamente aos dois primeiros centros, em (+2, 0, +3). Yaw=0 mantém +X como
  // lado do vagão e +Z ao longo do corpo; não é necessário rodar nem escalar o asset.
  const yaw=0;
  const points=freight.points.map((p,i)=>{
    const contacts=supportContacts(p,yaw);
    const terrain=contacts.map(c=>round(world.terrainHeightAt(c.x,c.z),4));
    const gaps=terrain.map(h=>round(p[1]-h,4));
    const cover=i<2?covers[i]:null;
    const delta=cover?cover.position.map((v,k)=>round(v-p[k],4)):null;
    return {
      id:`yard_wagon_${i+1}`,
      sourcePoint:[...p],
      proposedTransform:{position:[...p],rotationY:0,scale:[1,1,1]},
      assetType:null,
      damageState:null,
      cover:cover?{id:cover.id,position:[...cover.position],normal:[...cover.normal],deltaFromRoot:delta}:null,
      centerTerrainY:round(world.terrainHeightAt(p[0],p[2]),4),
      wheelSupport:contacts.map((c,k)=>({x:round(c.x,4),z:round(c.z,4),terrainY:terrain[k],gapBelowAuthoredRailTopM:gaps[k]})),
      terrainSpreadM:round(Math.max(...terrain)-Math.min(...terrain),4),
      maxSupportGapM:round(Math.max(...gaps),4),
    };
  });

  const solidIds=new Set(world.covers.map(c=>c.id));
  const obstacleIds=new Set(world.obstacles.map(c=>c.id));
  return {
    feature:{id:freight.id,classification:freight.classification,notes:freight.notes},
    orientationEvidence:{
      yawRad:yaw,
      yawDeg:0,
      assetLongitudinalAxis:'+/-Z',
      assetBroadsideAxis:'+/-X',
      pairedCoverDeltas:points.slice(0,2).map(p=>p.cover.deltaFromRoot),
      pairedCoverNormals:points.slice(0,2).map(p=>p.cover.normal),
    },
    collision:{
      vehicleCoverNodesPresent:coverIds.every(id=>world.coverNodes.some(c=>c.id===id)),
      vehicleCoverNodesAreSolid:coverIds.some(id=>solidIds.has(id)),
      vehicleCoverNodesAreObstacles:coverIds.some(id=>obstacleIds.has(id)),
      note:'VEHICLE é mantido em coverNodes, mas excluído de world.covers/obstacles; este trabalho não cria colisores.',
    },
    points,
  };
}

export function buildYardWagonFitReport(){
  const intactManifest=readJson('assets/models/provisional/m01-wagons/manifest.json');
  const damageManifest=readJson('assets/models/provisional/m01-wagon-damage/manifest.json');
  const assets=[...INTACT_FILES,...DAMAGE_FILES].map(inspectGlb);
  const yard=analyseYard();
  const errors=[];

  if(!/topo do carril/i.test(intactManifest.pivot))errors.push('manifesto intacto não declara pivot no topo do carril');
  if(!/topo do carril/i.test(damageManifest.pivot))errors.push('manifesto de dano não declara pivot no topo do carril');
  for(const asset of assets){
    if(!sameVec(asset.rootTranslation,[0,0,0]))errors.push(`${asset.file}: raiz deslocada`);
    if(!sameVec(asset.wheelsets[0].translation,[0,.5,-2])||!sameVec(asset.wheelsets[1].translation,[0,.5,2]))
      errors.push(`${asset.file}: pivôs dos rodados divergiram`);
  }
  if(yard.orientationEvidence.pairedCoverDeltas.some(d=>!sameVec(d,[2,0,3],1e-4)))
    errors.push('cv_wagon_1/2 já não ficam a (+2,0,+3) dos dois primeiros pontos');
  if(yard.orientationEvidence.pairedCoverNormals.some(n=>!sameVec(n,[1,0,0],1e-6)))
    errors.push('normais cv_wagon_1/2 já não são +X');
  if(!yard.collision.vehicleCoverNodesPresent||yard.collision.vehicleCoverNodesAreSolid||yard.collision.vehicleCoverNodesAreObstacles)
    errors.push('contrato actual de cover/collision VEHICLE mudou');

  const verticalBlockers=yard.points.filter(p=>p.maxSupportGapM>.15||p.terrainSpreadM>.15).map(p=>({
    id:p.id,maxSupportGapM:p.maxSupportGapM,terrainSpreadM:p.terrainSpreadM,
  }));

  return {
    verificationOk:errors.length===0,
    integrationReady:false,
    reason:verticalBlockers.length?
      'Transform horizontal/orientação/escala é determinável, mas a cota y=0 dos pontos não tem suporte compatível no terreno actual; não baixar/rodar os vagões por inferência.':
      'Ainda falta a identificação de tipo/estado por posição.',
    contract:{
      units:intactManifest.units,
      pivot:intactManifest.pivot,
      gaugeM:intactManifest.dimensions_m.gauge,
      wheelbaseM:intactManifest.dimensions_m.wheelbase,
      scale:[1,1,1],
    },
    assets,
    yard,
    verticalBlockers,
    errors,
  };
}

const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const report=buildYardWagonFitReport();
  console.log(JSON.stringify(report,null,2));
  if(!report.verificationOk)process.exitCode=1;
}
