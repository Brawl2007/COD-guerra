import {mg34ProneGeometry} from '../world/spatial.js';
// Procedural presentation in metres. This never writes to an actor or advances gameplay.
export function actorPoseName(actor,time=0){
  if(!actor.alive)return 'fallen';
  if(actor.task==='station_wounded')return 'wounded';
  if(actor.carriedBy)return 'carried';
  if(actor.state==='WOUNDED')return 'wounded';
  if(actor.pose==='seated')return 'seated';
  // Aliado sob fogo (suppressedUntil vem da simulação): agachado e curvado para a frente, cabeça em baixo.
  if(actor.team==='ally'&&time<(actor.suppressedUntil??0))return 'pinned';
  return actor.crouched?'crouched':'standing';
}

export function actorPose(actor,time){
  const geometry=mg34ProneGeometry(actor,time);
  if(geometry&&actor.mg34Prone.phase!=='standing'){
    // Existing procedural fallback. Read physical posture/frame; never create combat state or advance time.
    const convert=p=>[-p[2],p[1],p[0]],head=convert(geometry.head),torso=convert(geometry.torso),legs=convert(geometry.legs),muzzle=convert(geometry.muzzle);
    head[1]+=.08;
    const aiming=['aim','fire_burst'].includes(actor.mg34Prone.phase)&&time>=(actor.suppressedUntil??0),firing=aiming&&actor.mg34Prone.phase==='fire_burst'&&actor.shot>0;
    const limbs=[],boots=[],hip=[torso[0]-.2,torso[1]-.05,torso[2]],rifle=[muzzle[0]-.62,muzzle[1]-.03,muzzle[2]];
    for(const side of [-1,1]){
      const knee=[legs[0]+.12,legs[1],side*.15],foot=[legs[0]-.27,.07,side*.18],shoulder=[torso[0]+.2,torso[1]+.02,side*.2],elbow=[torso[0]+.27,.07+(1-geometry.low)*.7,side*.22],hand=[rifle[0]+(side>0?-.1:.25),rifle[1]-.07,rifle[2]];
      limbs.push({from:hip.map((v,i)=>i===2?side*.15:v),to:knee,radius:.095},{from:knee,to:foot,radius:.085},{from:shoulder,to:elbow,radius:.075},{from:elbow,to:hand,radius:.065});boots.push(foot);
    }
    return {name:'prone',prone:true,limbs,boots,aiming,firing,moving:false,underFire:time<(actor.suppressedUntil??0),
      root:{offsetY:0,pivotY:0,pitch:0,roll:0},head,torso:{position:torso,size:[.30+.46*geometry.low,.65-.37*geometry.low,.46],roll:0},
      rifle:{position:rifle,axis:[1,0,0],pitch:0,barrelFrom:[muzzle[0]-.57,muzzle[1],muzzle[2]],muzzle}};
  }
  const name=actorPoseName(actor,time),seated=name==='seated',pinned=name==='pinned',crouched=name==='crouched'||pinned;
  const low=seated||crouched,underFire=time<(actor.suppressedUntil??0);
  const armed=!actor.civilian&&actor.role!=='MEDIC',upright=name==='standing'||name==='crouched';
  const moving=name==='standing'&&!underFire&&!(actor.shot>0)&&['ADVANCE','RETREAT'].includes(actor.state);
  const age=Number.isFinite(actor.firedAt)?time-actor.firedAt:actor.shot>0?Math.max(0,.25-actor.shot):Infinity;
  // SUPPRESS can persist after a burst. Only the actual shot/recent fire keeps the weapon shouldered.
  const aiming=armed&&upright&&!underFire&&!moving&&(actor.shot>0||
    actor.state==='SUPPRESS'&&age>=0&&age<2.5||actor.role==='SUPPORT'&&actor.state==='GUARD');
  const firing=aiming&&actor.shot>0;
  const automatic=actor.weapon==='mg34'||actor.role==='SUPPORT',pulseAge=firing&&automatic?Math.max(0,age)%.075:age;
  const kick=aiming&&pulseAge>=0&&pulseAge<.22?Math.sin(Math.min(1,pulseAge/.016)*Math.PI/2)*Math.exp(-pulseAge/.055):0;
  const phase=time*7+Number(actor.id.match(/\d+$/)?.[0]??0),stride=moving?Math.sin(phase)*.22:0;
  const breath=name==='standing'&&!moving?Math.sin(phase*.32)*.006:0;
  const hip=(seated?.46:pinned?.38:crouched?.48:.84)+(moving?Math.sin(phase)**2*.025:0);
  const lean=crouched?-.06:0,tilt=pinned?-.82:underFire&&crouched?-.35:moving?-.10:0;
  const spine=h=>[lean-Math.sin(tilt)*h,hip+Math.cos(tilt)*h+breath,0];
  const riflePitch=(aiming?.025:moving?-.22:0)+kick*.045;
  const rifle=[seated?.35:lean+.35-kick*.055,hip+(seated?.13:aiming?.55:.27)+breath,.12];
  const axis=[Math.cos(riflePitch),Math.sin(riflePitch),0];
  const along=(distance,drop=0)=>rifle.map((v,i)=>v+axis[i]*distance+(i===1?drop:0));
  const grip=along(-.20,-.05),support=along(.25,-.025),muzzle=along(.70,.025);
  const limbs=[],boots=[];
  for(const [i,z]of [-.14,.14].entries()){
    const step=i?stride:-stride;
    const lift=moving?Math.max(0,(i?1:-1)*Math.sin(phase))*.11:0;
    const h=[lean,hip,z],k=[seated?.32:crouched?.22:step*.45+.055,.43-(crouched?.18:0)-lift*.35,z];
    const ankle=[seated?.32:crouched?0:step,.07+lift,z];
    limbs.push({from:h,to:k,radius:.095},{from:k,to:ankle,radius:.085});
    boots.push([ankle[0]+.045,.055+lift,z]);
    const shoulder=spine(.49);shoulder[2]=z*1.85;
    const elbow=seated?[.16,hip+.23,z*1.85]:aiming?[i?.12:.35,hip+(i?.27:.38)+breath,z*1.4]:[shoulder[0]+.20,hip+.22+breath,z*1.9];
    const hand=seated?[.30,hip+.10,z*1.3]:armed?(i?grip:support):[shoulder[0]+.10,hip+.06,z*1.85];
    limbs.push({from:shoulder,to:elbow,radius:.075},{from:elbow,to:hand,radius:.065});
  }
  const lying=name==='wounded'||name==='fallen',carried=name==='carried';
  const head=spine(low?.74:.79);head[0]+=.02+(aiming?.045:0);head[2]=aiming?.07:0;
  return {name,limbs,boots,aiming,firing,moving,underFire:upright||pinned?underFire:false,
    root:{offsetY:lying?.42:0,pivotY:lying||carried?.84:0,pitch:lying?-Math.PI/2:0,roll:carried?-Math.PI/2:0},
    torso:{position:spine(.34),size:[.24,low?.59:.65,.21],roll:tilt},head,
    rifle:{position:rifle,axis,pitch:riflePitch,barrelFrom:along(.13,.025),muzzle}};
}
