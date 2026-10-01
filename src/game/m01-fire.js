import { traceShot } from '../world/spatial.js';

// Fogo alemão de M01 como dados puros: cada tiro guarda origem, ponto visado, flecha e horas de partida e chegada.
// A apresentação (clarão, traçante, impacto, som) só lê estes registos e os eventos que a simulação emite.
// Aproximação de jogo, não balística medida (grp_de_east.fireModel): recta da boca ao ponto visado com flecha
// parabólica h = ARC_K·R² (≈9 m a 1,2 km) e ROUND_SPEED de média (≈1,6 s a 1 km; perfil do wz.29: 1,5–2 s).
// Sem a flecha, o tabuleiro e o portal oeste tapariam os sapadores a quem dispara do dique.
export const ARC_K=6e-6,ROUND_SPEED=620,NEAR_MISS=3,ROUND_KINDS=['repair','player','squad','area','platoon','cover','east'];

export const roundPoint=(r,t)=>({x:r.ox+(r.ax-r.ox)*t,y:r.oy+(r.ay-r.oy)*t+4*r.h*t*(1-t),z:r.oz+(r.az-r.oz)*t});
const range=r=>Math.max(1,Math.hypot(r.ax-r.ox,r.az-r.oz));

/** Primeiro impacto ao longo do arco (até 150 m além do ponto visado): mundo e os actores dados. */
export function traceRound(world,r,actors=[]){
  const R=range(r),n=Math.max(4,Math.min(40,Math.ceil(R/40))),end=1+Math.min(1,150/R),steps=Math.ceil(n*end);
  let prev=roundPoint(r,0),t0=0;
  for(let i=1;i<=steps;i++){
    const t=Math.min(end,i/n),cur=roundPoint(r,t),len=Math.hypot(cur.x-prev.x,cur.y-prev.y,cur.z-prev.z);
    if(len>1e-6){
      const hit=traceShot(world,prev,{x:(cur.x-prev.x)/len,y:(cur.y-prev.y)/len,z:(cur.z-prev.z)/len},actors,len);
      if(hit)return {...hit,t:t0+(t-t0)*hit.distance/len};
    }
    prev=cur;t0=t;
  }
  return {point:prev,material:null,t:end};
}

/** Distância mínima do arco (até ao impacto) a um ponto: "tiros que passam a menos de 3 m". */
export function closestApproach(r,tEnd,c){
  const R=range(r),ux=(r.ax-r.ox)/R,uz=(r.az-r.oz)/R,tc=((c.x-r.ox)*ux+(c.z-r.oz)*uz)/R;
  const from=Math.max(0,tc-25/R),to=Math.min(tEnd,tc+25/R);let best=Infinity;
  for(let t=from;t<=to;t+=.5/R){const p=roundPoint(r,t);best=Math.min(best,Math.hypot(p.x-c.x,p.y-c.y,p.z-c.z));}
  return best;
}

/** Um tiro de uma rajada: dispersão em milésimos (rajada partilhada + cone por tiro), sem nada aleatório na apresentação. */
export function makeRound({id,by,weapon,kind,origin,aim,firedAt,bias,cone,gauss,tracer=false,victim=null}){
  const R=Math.max(1,Math.hypot(aim.x-origin.x,aim.z-origin.z)),side={x:-(aim.z-origin.z)/R,z:(aim.x-origin.x)/R},m=R/1000;
  const lateral=(bias[0]+cone[0]*gauss())*m,vertical=(bias[1]+cone[1]*gauss())*m;
  return {id,by,weapon,kind,ox:origin.x,oy:origin.y,oz:origin.z,ax:aim.x+side.x*lateral,ay:aim.y+vertical,az:aim.z+side.z*lateral,
    h:ARC_K*R*R,firedAt,arriveAt:firedAt+R/ROUND_SPEED,tracer,victim};
}

export function validRound(r,clock){
  return r&&typeof r.id==='string'&&typeof r.by==='string'&&/^de_(east|spans)_\d+$/.test(r.by)&&['mg34','kar98k'].includes(r.weapon)&&
    ROUND_KINDS.includes(r.kind)&&[r.ox,r.oy,r.oz,r.ax,r.ay,r.az,r.h,r.firedAt,r.arriveAt].every(Number.isFinite)&&
    r.ox>=690&&r.h>=0&&r.h<=40&&r.arriveAt>=r.firedAt&&r.arriveAt-clock<=10&&typeof r.tracer==='boolean'&&
    (r.victim===null||(typeof r.victim==='string'&&/^pl_east_\d+$/.test(r.victim)));
}
