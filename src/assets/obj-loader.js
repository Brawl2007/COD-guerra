export function parseMtl(text){const materials=new Map();let current=null;for(const raw of text.split(/\r?\n/)){const [command,...values]=raw.trim().split(/\s+/);if(command==='newmtl'){current=values.join(' ');materials.set(current,[.5,.5,.5]);}else if(command==='Kd'&&current)materials.set(current,values.slice(0,3).map(Number));}return materials;}

export class ObjLoader {
  async load(url){const response=await fetch(url);if(!response.ok)throw new Error(`Falha ao carregar ${url}: ${response.status}`);const text=await response.text(),library=text.match(/^mtllib\s+(.+)$/m)?.[1],base=new URL(url,location.href),materials=library?await this.loadMaterials(new URL(library,base)):new Map();return this.parse(text,materials);}
  async loadMaterials(url){const response=await fetch(url);if(!response.ok)throw new Error(`Falha ao carregar ${url}: ${response.status}`);return parseMtl(await response.text());}
  parse(text,materials=new Map()){const vertices=[[0,0,0]],normals=[[0,1,0]],groups=new Map();let material='default';for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const [command,...values]=line.split(/\s+/);if(command==='v')vertices.push(values.slice(0,3).map(Number));else if(command==='vn')normals.push(values.slice(0,3).map(Number));else if(command==='usemtl')material=values.join(' ');else if(command==='f'){const group=groups.get(material)||{positions:[],normals:[],color:materials.get(material)||[.5,.5,.5]};const corners=values.map(value=>value.split('/').map(Number));for(let i=1;i<corners.length-1;i++)for(const corner of [corners[0],corners[i],corners[i+1]]){group.positions.push(...vertices[corner[0]]);group.normals.push(...(normals[corner[2]]||[0,1,0]));}groups.set(material,group);}}return{meshes:[...groups.entries()].map(([name,mesh])=>({name,positions:new Float32Array(mesh.positions),normals:new Float32Array(mesh.normals),color:mesh.color}))};}
}

export class TextAssetManager {
  constructor(){this.loader=new ObjLoader();this.assets=new Map();}
  async load(name,url){if(this.assets.has(name))return this.assets.get(name);const pending=this.loader.load(url);this.assets.set(name,pending);try{const asset=await pending;this.assets.set(name,asset);return asset;}catch(error){this.assets.delete(name);throw error;}}
}
