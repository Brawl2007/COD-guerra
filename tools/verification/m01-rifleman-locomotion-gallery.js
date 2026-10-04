import * as THREE from 'three';
import {M01Characters} from '../../src/render/m01-characters.js';
import {M01Characters as BaselineCharacters} from '../../src/render/__rifleman_baseline.js';
import {RIFLEMAN_PILOT_IDS} from '../../src/render/m01-rifleman-locomotion.js';
import {M01View} from '../../src/render/m01-view.js';
import {actorHitboxes,muzzlePosition} from '../../src/world/spatial.js';

const canvas=document.querySelector('canvas'),engine=new THREE.WebGLRenderer({canvas,antialias:true});engine.setSize(1100,620);
const scene=new THREE.Scene();scene.background=new THREE.Color('#819793');scene.add(new THREE.HemisphereLight(0xffffff,0x4a4640,2.5));
const sun=new THREE.DirectionalLight(0xffedce,3);sun.position.set(3,6,-4);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,30),new THREE.MeshStandardMaterial({color:'#78705d',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.012;scene.add(ground);
const grid=new THREE.GridHelper(100,100,0x8a6b49,0x9d8870);grid.position.y=.002;scene.add(grid);
const baseline=new BaselineCharacters(scene),candidate=new M01Characters(scene);
await Promise.all([baseline.load('high'),candidate.load('high')]);
const actors=()=>RIFLEMAN_PILOT_IDS.map((id,i)=>({id,role:'RIFLEMAN',group:id.startsWith('pl_')?'grp_east_platoon':'grp_de_spans',active:true,alive:true,health:100,team:id.startsWith('pl_')?'ally':'enemy',x:4,y:0,z:i*1.5,facing:0,state:'GUARD',shot:0,firedAt:-1e9}));
let a=actors(),time=0;
const camera=new THREE.PerspectiveCamera(34,1100/620,.05,200),point=(v,n)=>v.root.getObjectByName(n).getWorldPosition(new THREE.Vector3()).toArray();
function draw(label=''){
  // Two lanes, same local input and trajectory; offset camera-visible lane only on detached render input.
  const b=a.map(x=>({...x,x:x.x-4}));baseline.update(b,time,{x:a[0].x+3,z:0},'high',0);candidate.update(a,time,{x:a[0].x+3,z:0},'high',0);
  camera.position.set(a[0].x-2,3.4,-13);camera.lookAt(a[0].x-2,1.0,1.5);engine.render(scene,camera);
  if(label)document.querySelector('#label').textContent=`${label} · BASE (esquerda) / CANDIDATE (direita) · t=${time.toFixed(3)} s`;
  return {time,baseline:baseline.diagnostics,candidate:candidate.diagnostics};
}
window.gallery={ready:true,step(dt,speed,label=''){
  time+=dt;for(const x of a){x.x+=speed*dt;x.state=speed?'ADVANCE':'GUARD';}return draw(label);
},frame(){return draw();},reset(){candidate.riflemanLocomotion.clear();a=actors();time=0;return draw('IDLE');},
restore(){a=structuredClone(a);return draw('RESTORE — mesma posição gameplay; fase cosmética reconstruída');},
async metric(audit,{speed,id,lod=0,quality='high',duration=6}){
  const c=new M01Characters(new THREE.Scene()),b=new BaselineCharacters(new THREE.Scene());
  for(const r of [c,b]){r.sources=candidate.sources;r.clips=candidate.clips;}
  const data={baseline:[],candidate:[]},x={...actors().find(a=>a.id===id),z:0,x:0,state:'ADVANCE'},dt=1/120,player={x:lod===0?0:80,z:0};
  const previous={};let identityChecks=0;
  try{
    for(let i=0;i<=duration*120;i++){
      const t=i*dt;x.x=speed*t;player.x=lod===0?x.x+2:x.x+80;
      const immutable=JSON.stringify(x),boxes=JSON.stringify(actorHitboxes(x)),muzzle=JSON.stringify(muzzlePosition(x,t));
      for(const [name,r]of [['baseline',b],['candidate',c]]){
        r.update([x],t,player,quality,0);const v=r.instances.get(id),d=r.diagnostics.actors[0];
        if(!v)throw new Error(`missing ${name}/${id}`);
        for(const side of ['left','right']){
          const foot=point(v,side==='left'?'foot_l':'foot_r'),clipTime=v.action.time,key=name+side,old=previous[key];
          const windows=audit.clips[d.clip]?.contacts[side]??[],planted=windows.some(w=>clipTime>=w.startS&&clipTime<=w.endS);
          if(t>1&&old&&planted&&old.planted&&d.clip===old.clip&&Math.abs(clipTime-old.clipTime)<.05&&(!d.locomotion?.transition)){
            const drift=Math.hypot(foot[0]-old.foot[0],foot[2]-old.foot[2]);data[name].push({side,t,driftM:drift,driftMps:drift/dt});
          }
          previous[key]={foot,planted,clip:d.clip,clipTime};
        }
      }
      if(JSON.stringify(x)!==immutable||JSON.stringify(actorHitboxes(x))!==boxes||JSON.stringify(muzzlePosition(x,t))!==muzzle)throw new Error('Gameplay presentation mutation');identityChecks++;
    }
    const summary=values=>{
      const sorted=values.map(x=>x.driftMps).sort((a,b)=>a-b);return {supportIntervals:sorted.length,meanDriftMps:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95DriftMps:sorted[Math.floor(sorted.length*.95)],maxDriftMps:sorted.at(-1),meanDriftPerFrameM:values.reduce((a,b)=>a+b.driftM,0)/values.length};
    };
    return {id,speed,lod,quality,dt,duration,identityChecks,baseline:summary(data.baseline),candidate:summary(data.candidate),samples:data};
  }finally{c.dispose();b.dispose();}
},lod(distance,quality){return drawLOD(distance,quality);},feet(){return Object.fromEntries([...candidate.instances].map(([id,v])=>[id,{left:point(v,'foot_l'),right:point(v,'foot_r')}]))},
fallback(){const view=new M01View({quality:'low'});view.characters=new M01Characters(view.scene);view.characters.sources=candidate.sources;
  view.updateActors(a,time,{x:a[0].x,z:0});const result={selected:view.characters.diagnostics.active,proceduralActors:view.actorPoses,...view.actorAnimations};view.dispose();return result;}
};
function drawLOD(distance,quality){candidate.update(a,time,{x:a[0].x+distance,z:0},quality,0);engine.render(scene,camera);return candidate.diagnostics;}
draw('IDLE');
