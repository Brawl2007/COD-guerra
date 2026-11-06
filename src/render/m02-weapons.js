import {AssetManager} from '../assets/asset-manager.js';
import {smgReloadPose} from './m02-smg-animation.js';
import manifest from '../../assets/models/provisional/m02/weapons/manifest.json' with {type:'json'};

// Merge M02 único (FIX-1/EQP-01): suporte da linha Codex para um modelo provisório de pistola-metralhadora ligado ao encaixe de
// arma animado da M01. EQP-01 está pendente (sem fonte em B6, PDF p. 10): NENHUMA arma do roster usa este modelo e o asset
// (assets/models/provisional/m02/weapons/, autoria e manifesto em ASSET_CREDITS.md) fica no repositório sem uso. Os nomes de
// ficheiros e de nós vêm do manifesto. Corpo, passo, recuo, lotes e LOD continuam a ser da M01 (M01Characters).
export const M02_SMG_WEAPON_IDS = Object.freeze([]);
const DIR = 'assets/models/provisional/m02/weapons/';
const [, MAGAZINE_NODE, HANDLE_NODE] = manifest.parts.map((part) => part.split(' ')[0]);

export class M02Weapons {
 constructor(){
  this.assets=new AssetManager();this.models=[];
  // Sem arma que o use, nada é descarregado.
  this.ready=M02_SMG_WEAPON_IDS.length?Promise.allSettled(manifest.files.map(async(entry,lod)=>{this.models[lod]=(await this.assets.load(`m02-smg:${lod}`,DIR+entry.file)).scene;})):Promise.resolve([]);
 }
 // `weaponIds`: só os testes do modelo passam outra lista; o jogo usa M02_SMG_WEAPON_IDS (vazia enquanto EQP-01 estiver pendente).
 update(characters,actors,time=0,weaponIds=M02_SMG_WEAPON_IDS){
  if(!weaponIds.length)return;
  for(const actor of actors){
   if(!weaponIds.includes(actor.weapon))continue;
   const v=characters.instances.get(actor.id);if(!v?.weaponBone)continue;
   const lod=v.key.endsWith(':0')?0:1,source=this.models[lod];if(!source)continue;
   if(!v.m02Smg){v.m02Smg=source.clone(true);v.m02Smg.name='m02_smg';v.weaponBone.add(v.m02Smg);v.muzzle=manifest.sockets.muzzle;}
   const armed=actor.alive&&actor.state!=='WOUNDED'&&actor.role!=='MEDIC';
   for(const mesh of v.meshes)if(mesh.name==='rifle'||mesh.name==='clip')mesh.visible=false;
   for(const batch of v.batches)if(batch.parts.some(p=>p.name==='rifle'))batch.mesh.visible=false;
   v.m02Smg.visible=armed;v.m02Smg.traverse(n=>{if(n.isMesh){n.castShadow=v.root.visible&&lod===0;n.receiveShadow=true;}});
   const magazine=v.m02Smg.getObjectByName(MAGAZINE_NODE),handle=v.m02Smg.getObjectByName(HANDLE_NODE);
   const pose=actor.reload?smgReloadPose((time-actor.reload.startedAt)/actor.reload.durationSec*2.7):smgReloadPose(2.7);
   if(magazine){magazine.position.fromArray(pose.position);magazine.scale.setScalar(pose.scale);}
   if(handle)handle.position.z=-.02+pose.handleZ;
   v.m02ReloadPhase=actor.reload?pose.phase:'ready';
  }
 }
}
