// Trajectórias de apresentação das aeronaves de M01 (metros, x/z no solo, y altura).
// Partilhadas pelo renderer e pelo áudio para que o motor se ouça onde o avião se vê.
// Não são dados de simulação: nenhum dano, alvo ou evento depende delas; a simulação não as importa.
// Funções puras do relógio da missão (sem estado, sem RNG): pausa, restauro e reinício dão sempre a mesma posição.
import layout from '../../missions/m01-tczew/map-layout.json' with { type: 'json' };

export const M01_STUKA_COUNT=3;
/** Atraso de cada Ju 87 na fila, em segundos (stukaPath: 3-5 s entre aviões). */
export const M01_STUKA_OFFSETS=Object.freeze([0,3.5,7]);
/** Hora de batalha (04:34:00) do gatilho de evt_m01_bombing_0434; um teste compara-a com mission.json. */
export const M01_BOMBING_BATTLE_SECONDS=16440;
/**
 * Tempo do stukaPath em que o avião 0 está no instante de evt_m01_bombing_0434. Com t=0 colado ao evento o fundo da picada
 * (t=44) cairia 44 s depois dos três impactos (+0/+2,1/+5,0 s): com 45,5 s a bomba de cada avião larga-se 1,5 s antes do
 * impacto com o avião 0 no fundo da picada (t=44) e os outros dois ainda a descer; a saída da picada segue-se ao impacto,
 * como no áudio de saída de picada. A velocidade média da bomba (220-330 m/s) fica próxima da do avião em picada.
 */
export const M01_STUKA_PATH_AT_BOMBING=45.5;
/** Segundos de voo depois do último ponto (a extrapolar para leste) antes de o avião se esconder. */
export const M01_STUKA_DEPARTURE_SECONDS=8;

const points=layout.stukaPath.points.map(p=>({t:p.t,x:p.pos[0],y:p.pos[1],z:p.pos[2]}));
export const M01_STUKA_PATH_START=points[0].t;
export const M01_STUKA_PATH_END=points.at(-1).t;
/** Troço de picada do stukaPath (do início da descida à saída para oeste): pontos t=36 e t=48. */
export const M01_STUKA_DIVE_FROM=points[2].t;
export const M01_STUKA_DIVE_TO=points[5].t;
const AXES=['x','y','z'];
// Catmull-Rom não uniforme: a tangente de cada ponto é a diferença central entre vizinhos (lados nos extremos).
const tangents=points.map((p,k)=>{
  const a=points[Math.max(0,k-1)],b=points[Math.min(points.length-1,k+1)],dt=b.t-a.t;
  return Object.fromEntries(AXES.map(axis=>[axis,(b[axis]-a[axis])/dt]));
});

/** Posição e velocidade (m/s) do stukaPath no tempo `t`; antes do início e depois do fim segue a tangente do extremo. */
export function stukaPathSample(t){
  const last=points.length-1;
  if(!(t>points[0].t)||t>=points[last].t){
    const edge=t>=points[last].t?last:0,dt=t-points[edge].t,m=tangents[edge],p=points[edge];
    const at=Number.isFinite(dt)?dt:0;
    return {x:p.x+m.x*at,y:p.y+m.y*at,z:p.z+m.z*at,vx:m.x,vy:m.y,vz:m.z};
  }
  let k=0;while(t>points[k+1].t)k++;
  const a=points[k],b=points[k+1],h=b.t-a.t,s=(t-a.t)/h,s2=s*s,s3=s2*s;
  const h00=2*s3-3*s2+1,h10=s3-2*s2+s,h01=-2*s3+3*s2,h11=s3-s2;
  const d00=6*s2-6*s,d10=3*s2-4*s+1,d01=-6*s2+6*s,d11=3*s2-2*s;
  const out={};
  for(const axis of AXES){
    out[axis]=h00*a[axis]+h10*h*tangents[k][axis]+h01*b[axis]+h11*h*tangents[k+1][axis];
    out['v'+axis]=(d00*a[axis]+d01*b[axis])/h+d10*tangents[k][axis]+d11*tangents[k+1][axis];
  }
  return out;
}

const finite=x=>Number.isFinite(x);
/**
 * Instante (relógio da missão, s) de evt_m01_bombing_0434, lido só do estado de renderização:
 * consumido -> `started` do impacto station_bomb (a simulação grava-o no mesmo `clock` de consumed[evt_m01_bombing_0434]);
 * ainda por consumir -> o que falta da hora de batalha agendada (escala 1,0 até às 04:34:00, sem saltos no consumo);
 * sem dados -> o próprio relógio (dá `since` 0).
 */
export function m01StukaAnchor(clock,state){
  const consumed=state?.consumed?.evt_m01_bombing_0434;
  if(finite(consumed))return consumed;
  const hit=state?.damage?.find?.(d=>d.id==='station_bomb');
  if(finite(hit?.started))return hit.started;
  if(finite(state?.battleClock))return clock+Math.max(0,M01_BOMBING_BATTLE_SECONDS-state.battleClock);
  return clock;
}
/** Segundos desde evt_m01_bombing_0434 (negativo antes). */
export const m01StukaSince=(clock,state)=>clock-m01StukaAnchor(clock,state);
/** Tempo do stukaPath do avião `i` quando passaram `since` s do evento de bombardeamento. */
export const m01StukaPathTime=(since,i=0)=>since+M01_STUKA_PATH_AT_BOMBING-(M01_STUKA_OFFSETS[i]??0);
/** O avião `i` está em cena? (Antes do início fica no ponto inicial, longe de leste; depois do fim sai e esconde-se.) */
export const m01StukaActive=(since,i=0)=>m01StukaPathTime(since,i)<=M01_STUKA_PATH_END+M01_STUKA_DEPARTURE_SECONDS;
export const m01StukaPosition=(since,i=0)=>{const {x,y,z}=stukaPathSample(m01StukaPathTime(since,i));return {x,y,z};};
/** Velocidade (m/s) do avião `i`; a atitude do renderer sai da tangente. */
export const m01StukaVelocity=(since,i=0)=>{const {vx,vy,vz}=stukaPathSample(m01StukaPathTime(since,i));return {x:vx,y:vy,z:vz};};

// Segundo raide (05:30): uma passagem alta (~1100 m) de sul para norte, a cruzar uma só vez, sem volta. O estado do raide dura
// 05:30-05:34 a 8x (~30 s de relógio de missão); a passagem (~29 s) cabe nessa janela e acaba antes de o estado terminar.
export const M01_RAID_PASS=Object.freeze({x:-700,y:1100,fromZ:1800,toZ:-1500,speed:115});
export const M01_RAID_PASS_SECONDS=(M01_RAID_PASS.fromZ-M01_RAID_PASS.toZ)/M01_RAID_PASS.speed;
/** Segundos desde o início do segundo raide (`started` do impacto raid_0530; sem ele, 0). */
export function m01RaidSince(clock,state){
  const hit=state?.damage?.find?.(d=>d.id==='raid_0530');
  return finite(hit?.started)?clock-hit.started:0;
}
export const m01RaidPlanePosition=since=>({x:M01_RAID_PASS.x,y:M01_RAID_PASS.y,z:Math.max(M01_RAID_PASS.toZ,M01_RAID_PASS.fromZ-Math.max(0,since)*M01_RAID_PASS.speed)});
/** O avião alto está em cena durante a passagem; depois dela esconde-se (não repete). */
export const m01RaidPlaneActive=since=>since<=M01_RAID_PASS_SECONDS;
