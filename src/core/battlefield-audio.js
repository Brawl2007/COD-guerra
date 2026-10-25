// Áudio de campo de batalha de M01 como dados puros: acústica, perfis de armas e planos de camadas ("grãos").
// Nada aqui toca em Web Audio, no RNG da simulação ou no estado de jogo: recebe distâncias/ids já decididos
// pela simulação e devolve descrições deterministas que o AudioManager apenas toca.
// Os sons são sintetizados de raiz (ruído + osciladores); nenhum é amostrado ou copiado de outro jogo.

import mapLayout from '../../missions/m01-tczew/map-layout.json' with { type: 'json' };

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

/** R7-a: texto de estado do áudio mostrado no menu de definições e na pausa (nunca como sobreposição em jogo). */
export const AUDIO_PROVISIONAL_LABEL='Áudio provisório sintetizado — gravações finais pendentes (T45)';

export const SPEED_OF_SOUND=343;
export const soundDelay=distance=>Math.max(0,Number(distance)||0)/SPEED_OF_SOUND;

export function audioHash(value){
  const text=String(value);let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
  return h>>>0;
}
export const audioVariation=(key,min=0,max=1)=>min+(audioHash(key)/0xffffffff)*(max-min);
/** Ruído de valor suave (0..1) para rajadas de vento, respiração do fogo e modulação lenta, sem período audível. */
export function presentationNoise(seed,t,cell=1.7){
  const x=Math.max(0,Number(t)||0)/cell,i=Math.floor(x),f=x-i,s=f*f*(3-2*f);
  const a=audioVariation(`${seed}:${i}`),b=audioVariation(`${seed}:${i+1}`);
  return a+(b-a)*s;
}

/**
 * Humanização de um plano: nenhum acontecimento sonoro se repete. Um deslocamento de altura partilhado por todos os grãos
 * (a mesma "execução" soa coerente) mais um desvio próprio por grão, ganho por grão e, opcionalmente, ligeira folga temporal.
 * Tudo vem de `audioVariation(key)`: o mesmo acontecimento dá sempre os mesmos números, acontecimentos diferentes diferem.
 * Altera os grãos in-place (são objetos novos de cada plano) e devolve a mesma lista.
 */
export function humanize(grains,key,{pitch=.07,spread=.04,gain=.2,time=0}={}){
  const shared=audioVariation(`${key}:hp`,1-pitch,1+pitch);
  for(let i=0;i<grains.length;i++){
    const g=grains[i],own=audioVariation(`${key}:hf:${i}`,1-spread,1+spread),f=shared*own;
    if(Number.isFinite(g.freq)){g.freq*=f;if(Number.isFinite(g.freqEnd))g.freqEnd*=f;}
    if(g.filter&&Number.isFinite(g.filter.freq)){g.filter.freq*=f;if(Number.isFinite(g.filter.freqEnd))g.filter.freqEnd*=f;}
    g.vol*=audioVariation(`${key}:hv:${i}`,1-gain,1+gain);
    if(time>0&&g.at>0)g.at+=audioVariation(`${key}:ht:${i}`,-time,time)*Math.min(1,g.at*8);
  }
  return grains;
}
/** Escolhe 0..count-1 de forma estável para (família, chave): a "variante" estrutural de um som. */
export const pickVariant=(family,key,count,tracker=null,group=family)=>{
  const v=audioHash(`${family}:${key}:variant`)%count;
  return tracker?tracker.resolve(group,v,count,`${family}:${key}`):v;
};
/**
 * R7-a: guarda de repetição. O hash por id dá variedade, mas é sem memória: com 3-4 variantes repete a mesma de seguida 1 vez em 3-4.
 * O rastreador (um por AudioManager; estado de apresentação, nunca da simulação) lembra as últimas variantes por grupo e nunca devolve
 * a mesma duas vezes seguidas; com 4 ou mais variantes evita também a penúltima (sem ciclos A-B-A-B). Continua determinista: depende só
 * da ordem dos eventos e dos seus ids. `guard=false` reproduz o comportamento anterior (só regista), para medir antes/depois.
 */
export class VariantTracker{
  constructor({guard=true,log=false}={}){this.guard=guard;this.last=new Map();this.log=log?[]:null;this.adjusted=0;}
  resolve(group,v,count,key=''){
    let out=v;
    if(this.guard&&count>1){
      const h=this.last.get(group),a=h?.[0]??-1,b=count>=4?h?.[1]??-1:-1;
      if(out===a||out===b){
        const free=[];for(let i=0;i<count;i++)if(i!==a&&i!==b)free.push(i);
        out=free[audioHash(`${group}:${key}:guard`)%free.length];this.adjusted++;
      }
    }
    this.last.set(group,[out,this.last.get(group)?.[0]??-1]);
    if(this.log)this.log.push({group,variant:out});
    return out;
  }
  reset(){this.last.clear();if(this.log)this.log.length=0;this.adjusted=0;}
}

// Bandas acústicas: escolhem camadas (mecanismo, estalo, eco), não saltos de ganho. 45/220/950 m cobrem a ponte e os diques.
export const ACOUSTIC_BANDS=Object.freeze([
  Object.freeze({id:'close',max:45}),Object.freeze({id:'mid',max:220}),
  Object.freeze({id:'distant',max:950}),Object.freeze({id:'very-distant',max:Infinity}),
]);
export const acousticBand=(distance,{water=0}={})=>{
  const d=Math.max(0,Number(distance)||0);
  // R7-a: fogo que atravessa o canal aberto (margem oposta) é uma banda própria: lê-se diferente do fogo perto, à mesma distância.
  if(water>=FAR_BANK_MIN_WATER_M&&d>=FAR_BANK_MIN_DISTANCE_M)return 'far-bank';
  return ACOUSTIC_BANDS.find(b=>d<b.max).id;
};

// ---------------------------------------------------------------- R7-a: geografia do Vístula (dados de missions/m01-tczew/map-layout.json, só leitura)
const channelFeature=mapLayout.features.find(f=>f.id==='vistula_channel');
const channelXs=channelFeature.polygon.map(p=>p[0]);
/** Canal principal do rio (metros, eixo x do jogo): a ponte atravessa-o entre as margens oeste (x<25) e leste (x>265). */
export const VISTULA_CHANNEL=Object.freeze({minX:Math.min(...channelXs),maxX:Math.max(...channelXs)});
export const FAR_BANK_MIN_WATER_M=60,FAR_BANK_MIN_DISTANCE_M=90;
/** Metros de água aberta que o som atravessa entre o ouvinte e a fonte (sobreposição do segmento x com o canal). 0 = sem rio pelo meio. */
export function waterCrossing(listenerX,sourceX){
  const lx=Number(listenerX),sx=Number(sourceX);if(!Number.isFinite(lx)||!Number.isFinite(sx))return 0;
  return Math.max(0,Math.min(Math.max(lx,sx),VISTULA_CHANNEL.maxX)-Math.max(Math.min(lx,sx),VISTULA_CHANNEL.minX));
}
/** Margem de uma posição: 'west' (x<25), 'channel' ou 'east' (x>265). */
export const bankOf=x=>x<VISTULA_CHANNEL.minX?'west':x>VISTULA_CHANNEL.maxX?'east':'channel';
/**
 * Tratamento de "outra margem": reflexo na água (brilho curto), eco de rebote da margem/dique (atraso cresce com a água atravessada) e mais perda de agudos.
 * Heurística de apresentação afinada de ouvido de papel; ninguém ouviu ainda. Sem água suficiente: inactivo.
 */
export function farBankTreatment(water){
  const w=Math.max(0,Number(water)||0);if(w<FAR_BANK_MIN_WATER_M)return {active:false,k:0,slapDelay:0,slapGain:0,hfScale:1,sheenDelay:0};
  const k=clamp((w-FAR_BANK_MIN_WATER_M)/200,0,1);
  return {active:true,k,slapDelay:clamp(.1+w/SPEED_OF_SOUND*.55,.14,.7),slapGain:.3+.2*k,hfScale:1-.42*k,sheenDelay:.012+.018*k};
}


// Atenuação contínua por categoria (ref = distância de ganho 1; span = metros para metade do ganho além de ref).
// Afinada para mistura de jogo (gama dinâmica comprimida), não para níveis SPL medidos.
export const ATTENUATION=Object.freeze({
  weapon:Object.freeze({ref:4,span:70}),player:Object.freeze({ref:1,span:1e9}),danger:Object.freeze({ref:1,span:1e9}),
  impact:Object.freeze({ref:2,span:16}),foley:Object.freeze({ref:1,span:9}),debris:Object.freeze({ref:4,span:30}),explosion:Object.freeze({ref:20,span:170}),
  distant:Object.freeze({ref:4,span:70}),vehicle:Object.freeze({ref:15,span:140}),aircraft:Object.freeze({ref:60,span:260}),
  fire:Object.freeze({ref:6,span:22}),ambience:Object.freeze({ref:1,span:1e9}),fx:Object.freeze({ref:0,span:70}),
});
/**
 * Forma acústica de uma fonte: ganho, corte de absorção do ar, envio para a reverberação exterior e sombra da cabeça.
 * `front` é cos(ângulo relativo à frente do ouvinte): fontes atrás ficam um pouco mais escuras e baixas.
 */
export function acousticShape(distance,{category='weapon',front=1,water=0}={}){
  const d=Math.max(0,Number(distance)||0),a=ATTENUATION[category]??ATTENUATION.weapon,f=clamp(Number.isFinite(front)?front:1,-1,1);
  const behind=Math.max(0,-f);
  const gain=(1/(1+Math.max(0,d-a.ref)/a.span))*(1-.14*behind);
  // Absorção do ar (ISO 9613 a ~15 °C, 70 % HR, ~-4 dB a 4 kHz aos 150 m, ~-13 dB aos 450 m): um passa-baixo de 12 dB/oitava cuja frequência de corte cai com
  // (1 + d/50)^1.05. Antes 18000/(1 + d/95) deixava passar quase tudo acima de 4 kHz aos 150 m, e o estalo de um tiro longe soava tão "nítido" como o de um perto.
  const filter=clamp(20000/Math.pow(1+d/50,1.05),category==='explosion'||category==='aircraft'?320:480,18000)*(1-.38*behind);
  const send=category==='player'||category==='danger'?.16:category==='ambience'?0:clamp(.14+d/700,.14,.82);
  const fb=farBankTreatment(category==='player'||category==='danger'||category==='ambience'?0:water);   // R7-a: fogo de outra margem perde mais agudos e sobra mais ambiente
  return {band:acousticBand(d,{water:fb.active?water:0}),gain,filter:filter*fb.hfScale,send:fb.active?clamp(send+.1*fb.k,0,.9):send};
}
/** Compatibilidade com o primeiro production pass: forma de uma arma em campo aberto, de frente. */
export const audioDistanceShape=distance=>{const s=acousticShape(distance,{category:'fx'});return {gain:s.gain,filter:s.filter};};

export const AUDIO_PRIORITY=Object.freeze({
  ambience:10,distant:20,fire:28,train:35,aircraft:40,debris:44,impact:50,mg:62,rifle:66,explosion:78,danger:90,critical:100
});
// Limites por categoria (vozes = eventos com várias camadas). O total global continua 32.
export const CATEGORY_LIMITS=Object.freeze({
  weapon:12,player:6,danger:4,impact:6,foley:4,debris:4,explosion:6,distant:6,vehicle:4,aircraft:3,fire:3,ambience:4,fx:32
});
export const CATEGORY_BUS=Object.freeze({
  weapon:'weapons',player:'player',danger:'player',impact:'impacts',foley:'impacts',debris:'impacts',explosion:'explosions',
  distant:'distant',vehicle:'vehicles',aircraft:'vehicles',fire:'ambience',ambience:'ambience',fx:'weapons'
});
export const MIX_BUSES=Object.freeze(['weapons','player','impacts','explosions','distant','vehicles','ambience']);

// ---------------------------------------------------------------- armas
// Cada perfil é uma identidade sintetizada: estalo de boca (ruído filtrado), corpo grave, "boom" médio,
// mecanismo (só perto), cauda e reflexões. wz.29 e Kar98k são ambos Mauser 98 de 7,92 mm: diferem pouco no disparo;
// a identidade vem sobretudo da perspectiva (o do jogador junto ao ouvido, com ferrolho; o alemão quase sempre longe).
export const WEAPON_SOUND_PROFILES=Object.freeze({
  kb_wz29:Object.freeze({label:'Karabinek wz.29 (jogador)',family:'rifle',category:'player',priority:'rifle',
    crack:{hz:2600,type:'bandpass',q:.55,dur:.26,vol:.29},body:{wave:'triangle',hz:78,end:44,dur:.24,vol:.17},
    blast:{hz:900,q:.8,dur:.14,vol:.07},tail:{hz:5200,dur:.5,vol:.04,at:.15},mech:[],echo:.055,jitter:.03,burstTail:1,cadence:1.2,fixedTiming:true}),
  kar98k:Object.freeze({label:'Karabiner 98k (alemão)',family:'rifle',category:'weapon',priority:'rifle',
    crack:{hz:3100,type:'highpass',q:.7,dur:.07,vol:.26},body:{wave:'triangle',hz:96,end:50,dur:.12,vol:.05},
    blast:{hz:1150,q:.7,dur:.16,vol:.13},tail:{hz:2600,dur:.38,vol:.05,at:.07},
    mech:[{hz:690,at:.045,dur:.032,vol:.012,wave:'square'}],echo:.07,jitter:.06,burstTail:1,cadence:1.2}),
  // Mesmo mecanismo do Kar98k: a diferença (estalo em banda mais grave, "boom" mais cheio) é escolha de mistura para
  // distinguir fogo amigo de inimigo a meia distância, não uma diferença balística afirmada.
  ally_rifle:Object.freeze({label:'Karabinek wz.29 (aliado)',family:'rifle',category:'weapon',priority:'rifle',
    crack:{hz:2200,type:'bandpass',q:.6,dur:.075,vol:.24},body:{wave:'triangle',hz:84,end:46,dur:.13,vol:.06},
    blast:{hz:820,q:.7,dur:.19,vol:.13},tail:{hz:2400,dur:.42,vol:.05,at:.08},
    mech:[{hz:560,at:.05,dur:.03,vol:.011,wave:'square'}],echo:.075,jitter:.06,burstTail:1,cadence:1.2}),
  mg34:Object.freeze({label:'MG 34',family:'mg',category:'weapon',priority:'mg',
    crack:{hz:3700,type:'highpass',q:1.1,dur:.05,vol:.2},body:{wave:'sawtooth',hz:118,end:70,dur:.06,vol:.03},
    blast:{hz:1600,q:1.2,dur:.07,vol:.1},tail:{hz:3000,dur:.26,vol:.03,at:.04},
    mech:[{hz:1900,at:.016,dur:.014,vol:.008,wave:'square'},{hz:820,at:.03,dur:.02,vol:.008,wave:'square'}],
    echo:.065,jitter:.05,burstTail:.45,cadence:.075}),
  rkm_wz28:Object.freeze({label:'rkm wz.28',family:'mg',category:'weapon',priority:'mg',
    crack:{hz:2400,type:'highpass',q:.8,dur:.065,vol:.19},body:{wave:'triangle',hz:86,end:52,dur:.09,vol:.05},
    blast:{hz:950,q:.85,dur:.11,vol:.11},tail:{hz:2600,dur:.3,vol:.032,at:.06},
    mech:[{hz:640,at:.02,dur:.03,vol:.016,wave:'square'},{hz:240,at:.024,dur:.04,vol:.012,wave:'triangle'}],
    echo:.08,jitter:.05,burstTail:.55,cadence:.11}),
  ckm_wz30:Object.freeze({label:'ckm wz.30',family:'mg',category:'weapon',priority:'mg',
    crack:{hz:1900,type:'bandpass',q:.9,dur:.07,vol:.19},body:{wave:'triangle',hz:64,end:40,dur:.13,vol:.07},
    blast:{hz:700,q:.7,dur:.14,vol:.12},tail:{hz:2200,dur:.42,vol:.04,at:.08},
    mech:[{hz:980,at:.022,dur:.022,vol:.011,wave:'square'},{hz:210,at:.05,dur:.05,vol:.014,wave:'triangle'}],
    echo:.09,jitter:.04,burstTail:.6,cadence:.1}),
});
export const WEAPON_ALIASES=Object.freeze({
  'kb_wz29':'kb_wz29','wz29':'kb_wz29','kar98k':'kar98k','distant-rifle':'kar98k','generic':'kar98k','ally-rifle':'ally_rifle',
  'mg34':'mg34','rkm':'rkm_wz28','rkm_wz28':'rkm_wz28','ckm':'ckm_wz30','ckm_wz30':'ckm_wz30'
});
export const weaponProfileId=weapon=>Object.hasOwn(WEAPON_SOUND_PROFILES,weapon)?weapon:WEAPON_ALIASES[weapon]??'kar98k';
const DETAIL_ECHOES={low:1,medium:2,high:3};

/**
 * Quatro "vozes" de cada arma. Um tiro real nunca repete o anterior: a posição da boca em relação a casas e aterro,
 * a munição e a frente de onda mudam o estalo, o corpo e a cauda. Cada variante é um conjunto de multiplicadores
 * modestos (a identidade espectral da arma mantém-se) e escolhe camadas extra (estalo seco, ressonâncias do corpo).
 */
export const SHOT_VARIANTS=4;
export const SHOT_VARIANT_SHAPES=Object.freeze([
  Object.freeze({name:'sharp',crackHz:1.14,crackQ:1.35,crackDur:.82,bodyHz:1.07,bodyVol:.85,blastVol:.9,tailDur:.7,tailHz:1.2,res:.6,snap:true,slap:1}),
  Object.freeze({name:'full',crackHz:.9,crackQ:.8,crackDur:1.18,bodyHz:.92,bodyVol:1.2,blastVol:1.22,tailDur:1.15,tailHz:.88,res:1.3,snap:false,slap:2}),
  Object.freeze({name:'dry',crackHz:1.04,crackQ:1,crackDur:.92,bodyHz:1,bodyVol:.8,blastVol:.8,tailDur:.55,tailHz:1.3,res:.5,snap:true,slap:3}),
  Object.freeze({name:'ringing',crackHz:.96,crackQ:1.15,crackDur:1,bodyHz:1.03,bodyVol:1,blastVol:1,tailDur:1.45,tailHz:.78,res:1.6,snap:false,slap:4}),
]);
const SHOT_PITCH=.12,SHOT_GAIN=.22,SHOT_MIX=.4;   // ±12 % altura/filtro (≈ ±2 semitons), ±22 % ganho, ±40 % no equilíbrio estalo/corpo/cauda: bem acima do limiar de diferença audível

/**
 * Camadas de um disparo isolado, à distância dada. `round` (>0) marca tiros seguintes de uma rajada.
 * A "arma" (chave sem a ronda) dá um timbre próprio ao longo da rajada; cada tiro acrescenta variante e desvios seus.
 */
export function planWeaponShot(weapon,distance,{key='',round=0,at=0,detail='high',water=0,tracker=null}={}){
  const id=weaponProfileId(weapon),p=WEAPON_SOUND_PROFILES[id],d=Math.max(0,Number(distance)||0),band=acousticBand(d);
  const vr=(k,j)=>audioVariation(`${id}:${key}:${round}:${k}`,1-j,1+j);           // este tiro
  const vg=(k,j)=>audioVariation(`${id}:${key}:gun:${k}`,1-j,1+j);                // esta arma/execução (igual em toda a rajada)
  const v=(k,j=SHOT_PITCH)=>vg(k,j*.55)*vr(k,j*.8);
  const gv=k=>vr(k,SHOT_GAIN)*vg(k,SHOT_GAIN*.4);
  const mix=k=>vr(k,SHOT_MIX)*vg(k,SHOT_MIX*.3);   // equilíbrio entre camadas: o corpo, a cauda e as reflexões pesam diferente em cada tiro
  const variant=pickVariant(`${id}:${round}`,key,SHOT_VARIANTS,tracker,`shot:${id}`),S=SHOT_VARIANT_SHAPES[variant];
  const fixedTiming=p.fixedTiming===true,cd=fixedTiming?1:S.crackDur,bd=fixedTiming?1:S.crackDur;
  const near=band==='close',mid=band==='mid',far=band==='distant',vfar=band==='very-distant',grains=[];
  const crackScale=near?1:mid?.62:far?.3:.12,crackHz=p.crack.hz*S.crackHz*v('cf');
  grains.push({layer:'crack',src:'noise',noise:'white',at,dur:p.crack.dur*cd*(near?1:1.25),vol:p.crack.vol*crackScale*gv('cv'),
    filter:{type:p.crack.type,freq:crackHz,q:p.crack.q*S.crackQ*vr('cq',.2),...(p.crack.type==='bandpass'?{freqEnd:crackHz*.72}:{})},rate:v('cr',.16)});
  // Estalo seco inicial (cabeça da onda de choque): só nas variantes "sharp"/"dry", só até à banda média.
  if(S.snap&&(near||mid)&&detail!=='low')grains.push({layer:'snap',src:'noise',noise:'white',at,dur:.007*vr('sd',.3),vol:p.crack.vol*.5*crackScale*gv('sv'),attack:.0004,
    filter:{type:'highpass',freq:5200*v('sf'),q:.8}});
  grains.push({layer:'body',src:'osc',wave:p.body.wave,freq:p.body.hz*S.bodyHz*v('bf'),freqEnd:p.body.end*v('be'),at,
    dur:p.body.dur*(fixedTiming?1:bd)*(near||mid?1:far?1.5:1.9),vol:p.body.vol*S.bodyVol*(vfar?.9:1)*mix('bv')});
  // Ressonâncias do corpo: ruído excitando dois modos inarmónicos (o corpo de uma arma não é um tom puro).
  const resonances=detail==='low'?0:detail==='medium'?1:2;   // qualidade: menos camadas finas nos níveis baixos
  for(let i=0;i<resonances;i++)grains.push({layer:'resonance',src:'noise',noise:'brown',at:at+.001*i,dur:(.05+.045*i)*(near?1:mid?1.3:1.9)*vr('rd'+i,.2),
    vol:p.body.vol*.5*S.res*(i?.55:1)*(vfar?.8:1)*mix('rv'+i),filter:{type:'bandpass',freq:p.body.hz*(2.1+i*1.6+.5*vg('rr'+i,1))*v('rf'+i),q:4+2.5*i,freqEnd:p.body.hz*(1.6+i)}});
  grains.push({layer:'blast',src:'noise',noise:'white',at:at+.002,dur:p.blast.dur*(near?1:1.3)*vr('bd',.12),vol:p.blast.vol*S.blastVol*(near?1:mid?.85:.6)*mix('lv'),
    filter:{type:'bandpass',freq:p.blast.hz*v('lf'),q:p.blast.q,freqEnd:p.blast.hz*.7}});
  if(d<90)for(const [i,m] of p.mech.entries()){
    if(p.family==='mg'&&i>0&&round%2===1)continue;   // o segundo clique do mecanismo alterna: rajada menos "metralhada"
    if(round>0&&audioVariation(`${id}:${key}:${round}:md${i}`)<.25)continue;   // 1 em 4 cliques cai: o mecanismo não é um relógio
    const hz=m.hz*v('m'+i,.1);
    // Clique metálico = ruído excitando um modo estreito (não um quadrado puro); o "tom" fica só como bater grave curto.
    grains.push({layer:'mechanism',src:'noise',noise:'white',at:at+m.at*vr('mt'+i,.25),dur:m.dur*1.2,vol:m.vol*3.2*(near?1:.55)*gv('mv'+i),filter:{type:'bandpass',freq:hz*1.6,q:6.5}});
    grains.push({layer:'mechanism',src:'osc',wave:'sine',freq:hz*.7,freqEnd:hz*.4,at:at+m.at,dur:m.dur*1.3,vol:m.vol*.7*(near?1:.55)*gv('mp'+i)});
  }
  const tailScale=(near?1:mid?1.3:far?1.9:2.5)*(round>0?p.burstTail:1);
  // Perto, a cauda é o relatório do tiro (ruído claro filtrado); longe, sobra o ronco grave (ruído castanho).
  const tailHz=p.tail.hz*(near?1:mid?.7:.45)*S.tailHz*v('tf');
  grains.push({layer:'tail',src:'noise',noise:near||mid?'white':'brown',at:at+p.tail.at,dur:p.tail.dur*(near?1:mid?1.3:far?1.8:2.3)*S.tailDur,vol:p.tail.vol*tailScale*mix('tv'),
    filter:{type:'lowpass',freq:tailHz,q:.5,freqEnd:tailHz*(near?.62:.36)}});
  // Reflexões (casario, aterro, margem): mais e mais tardias com a distância: "rolar" do tiro que não soa isolado.
  // O número depende só da banda (perto 1, médio 2, longe 3); o padrão (espaçamento, escurecimento) depende da variante.
  const echoes=Math.min(DETAIL_ECHOES[detail]??3,near?1:mid?2:3)-(round>0&&p.family==='mg'?1:0);
  for(let i=0;i<echoes;i++){
    const delay=p.echo*(i+1)*v('ed'+i,.35)*(.8+.15*S.slap)*(1+d/520)+(far||vfar?.12*i:0);
    grains.push({layer:'echo',src:'noise',noise:'white',at:at+delay,dur:p.crack.dur*(2+i),vol:p.crack.vol*(near?.12:.22)/(i+1)*mix('ev'+i),
      filter:{type:'lowpass',freq:2200/(1+i*.7)*v('ee'+i,.2),q:.6,freqEnd:900/(1+i*.7)}});
  }
  // R7-a: outra margem. O ar sobre a água aberta carrega o estalo com um brilho de reflexo (curto, logo atrás do tiro) e, bem depois, o rebote
  // da margem/dique; os agudos de tudo o resto caem mais (o filtro de ar da voz também desce em acousticShape). Só com água suficiente pelo meio.
  const bank=farBankTreatment(water);
  if(bank.active){
    for(const g of grains)if(g.filter&&Number.isFinite(g.filter.freq)&&g.layer!=='echo'){g.filter.freq*=bank.hfScale;if(Number.isFinite(g.filter.freqEnd))g.filter.freqEnd*=bank.hfScale;}
    grains.push({layer:'water-sheen',src:'noise',noise:'white',at:at+bank.sheenDelay*vr('wsd',.3),dur:.05+.04*bank.k,vol:p.crack.vol*.16*bank.slapGain*gv('wsv'),
      filter:{type:'bandpass',freq:2100*v('wsf'),q:1.4,freqEnd:1300}});
    const slaps=detail==='low'?1:2;
    for(let i=0;i<slaps;i++)grains.push({layer:'water-slap',src:'noise',noise:'brown',at:at+bank.slapDelay*(1+.55*i)*vr('wl'+i,.18),dur:.2+.16*i+.1*bank.k,vol:p.crack.vol*bank.slapGain*(i?.5:1)*mix('wlv'+i),
      filter:{type:'lowpass',freq:1500/(1+i*.6)*v('wle'+i,.2),q:.6,freqEnd:620/(1+i*.6)}});
  }
  return grains;
}
/**
 * Rajada inteira numa só voz: cadência dada pela simulação/chamador, timbre de cada tiro com variação própria.
 * `cadenceJitter` (fracção do intervalo, média nula) só é usado por fogo de ambiente e de fundo, sem cadência autoritária:
 * uma metralhadora mecânica real oscila alguns por cento de tiro para tiro. A cadência da simulação nunca é alterada.
 */
export function planWeaponBurst(weapon,distance,{rounds=1,interval=null,key='',detail='high',cadenceJitter=0,water=0,tracker=null}={}){
  const id=weaponProfileId(weapon),p=WEAPON_SOUND_PROFILES[id],n=clamp(Math.round(rounds)||1,1,p.family==='mg'?9:4),step=interval??p.cadence;
  const grains=[];for(let i=0;i<n;i++){
    const at=i*step+(i>0&&cadenceJitter>0?audioVariation(`${id}:${key}:cadence:${i}`,-1,1)*cadenceJitter*step:0);
    grains.push(...planWeaponShot(id,distance,{key,round:i,at,detail,water,tracker}));}
  return grains;
}

// ---------------------------------------------------------------- R2-c: chegada de impactos e granadas ao ouvinte
// O som de um impacto de bala chega com o atraso da distância (343 m/s), depois do voo da bala; o estalo supersónico de quem passa perto (planBulletPass)
// continua a ser da simulação (event.crack) e chega ANTES do relatório da arma (a bala é mais rápida do que o som). Só apresentação: nada aqui decide.
/** Até aqui (= banda 'close') o impacto ouve-se de imediato; além, soundDelay(d). */
export const IMPACT_IMMEDIATE_M=45;
/** Além disto o impacto de uma bala de espingarda já não se distingue do fundo (ganho de ATTENUATION.impact < 0,1 e corte de ar). */
export const IMPACT_AUDIBLE_M=160;
/**
 * Quando e se se ouve o impacto de uma ronda. `distance` = impacto -> ouvinte; `flightSec` = voo da ronda desde o disparo até ao impacto (0 se o evento
 * já é o da chegada, como o `round-impact` alemão). Devolve {audible, immediate, at, band}; `at` em relógio da missão.
 */
export function roundImpactSoundPlan(distance,clock,flightSec=0){
  const d=Math.max(0,Number(distance)||0),fly=Math.max(0,Number(flightSec)||0),band=acousticBand(d);
  if(!(d<=IMPACT_AUDIBLE_M))return {audible:false,immediate:false,at:clock+fly,band};
  const immediate=fly===0&&d<=IMPACT_IMMEDIATE_M;
  return {audible:true,immediate,at:clock+fly+(immediate?0:soundDelay(d)),band};
}
/** O arremesso de uma Stielhandgranate (cordão, espoleta) só se ouve perto; a explosão tem o seu próprio som (m01-blast, escala 'small'). */
export const GRENADE_THROW_AUDIBLE_M=110;
export function grenadeThrowSoundPlan(distance,clock){
  const d=Math.max(0,Number(distance)||0),band=acousticBand(d);
  return d<=GRENADE_THROW_AUDIBLE_M?{audible:true,at:clock+soundDelay(d),band}:{audible:false,at:clock,band};
}
/**
 * Arremesso de uma granada de mão alemã com espoleta de cordão: o estalido do cordão, o deslizar, o "pop" da espoleta que começa a arder e o
 * chiado fraco do rastilho. Curto e seco: não é uma explosão. Estrutura própria (nenhum recurso de áudio novo).
 */
export function planGrenadeThrow(distance,{key=''}={}){
  const d=Math.max(0,Number(distance)||0),near=d<45,v=(k,j=.1)=>audioVariation(`gthrow:${key}:${k}`,1-j,1+j);
  const g=[
    {layer:'cord-click',src:'noise',noise:'white',at:0,dur:.012*v('cd',.3),vol:.05*(near?1:.6),attack:.0004,filter:{type:'highpass',freq:4200*v('cf'),q:.8}},
    {layer:'cord-slide',src:'noise',noise:'white',at:.012,dur:.09*v('sd',.2),vol:.03,filter:{type:'bandpass',freq:2400*v('sf'),q:3,freqEnd:1500}},
    {layer:'igniter-pop',src:'noise',noise:'white',at:.1,dur:.05*v('pd',.25),vol:.055,filter:{type:'bandpass',freq:1100*v('pf'),q:.8,freqEnd:700}},
    {layer:'igniter-thump',src:'osc',wave:'triangle',freq:190*v('tf'),freqEnd:92,at:.1,dur:.05,vol:.025},
  ];
  if(near)g.push({layer:'fuse-hiss',src:'noise',noise:'white',at:.15,dur:.24*v('hd',.2),vol:.016,filter:{type:'highpass',freq:5200*v('hf'),q:.7,freqEnd:3400}});
  return humanize(g,`gthrow:${key}:h`,{pitch:.05,gain:.2,time:.003});
}
// ---------------------------------------------------------------- balas que passam e impactos
export const PASS_VARIANTS=3;
/**
 * `crack`: estalo supersónico (onda N) de uma bala que passa a poucos metros (decisão da simulação, event.crack);
 * `whizz`: zumbido de uma bala já subsónica e a tombar, usado só para ricochetes próximos. Às distâncias de M01
 * o 7,92 mm ainda é supersónico, por isso uma passagem directa mais afastada não "zumbe".
 * Três variantes de cada: a onda de choque muda com a distância de passagem, o ângulo e a velocidade da bala.
 */
export function planBulletPass(type,{key='',tracker=null}={}){
  const v=(k,j=.08)=>audioVariation(`pass:${key}:${k}`,1-j,1+j),variant=pickVariant(`pass:${type}`,key,PASS_VARIANTS,tracker);
  if(type==='whizz')return humanize([
    {layer:'whizz',src:'noise',noise:'white',at:0,dur:[.2,.26,.15][variant]*v('d'),vol:.05,filter:{type:'bandpass',freq:[2300,1800,2900][variant]*v('f'),q:[5,3.5,7][variant],freqEnd:[1500,1100,1900][variant]},rate:v('r',.2)},
    {layer:'whizz-tone',src:'osc',wave:'sine',freq:[1700,1300,2100][variant]*v('t'),freqEnd:[760,600,980][variant],at:.01,dur:.18,vol:.012},
  ],`pass:${key}:w`,{pitch:.08,gain:.25});
  const g=[
    {layer:'crack',src:'noise',noise:'white',at:0,dur:[.014,.018,.011][variant],vol:.16,attack:.0005,filter:{type:'highpass',freq:[2400,1900,3100][variant]*v('f'),q:.7}},
    {layer:'snap',src:'osc',wave:'square',freq:[2600,2100,3300][variant]*v('t'),freqEnd:[560,480,700][variant],at:0,dur:.024,vol:.05},
    {layer:'flutter',src:'noise',noise:'white',at:.012,dur:[.06,.075,.045][variant],vol:.03,filter:{type:'bandpass',freq:[5200,4300,6100][variant]*v('b'),q:2.5}},
  ];
  // Variante 2: o estalo é seguido do "pop" fraco e tardio do disparo; variante 1: dupla frente de onda (bala e cone de Mach).
  if(variant===1)g.push({layer:'crack2',src:'noise',noise:'white',at:.006,dur:.01,vol:.08,attack:.0004,filter:{type:'highpass',freq:3000*v('f2'),q:.7}});
  return humanize(g,`pass:${key}:c`,{pitch:.06,gain:.2,time:.002});
}
export const IMPACT_MATERIALS=Object.freeze(['earth','wood','metal','stone','brick','water']);
export const impactMaterial=m=>IMPACT_MATERIALS.includes(m)?m:'stone';
export const IMPACT_VARIANTS=3;
// Modos de um impacto em aço: várias famílias inarmónicas (chapa fina, perfil grosso, viga, rebite), cada uma com o seu
// decaimento. Um tom fixo de "ping" era o som mais repetido e artificial do campo de batalha.
const METAL_MODES=Object.freeze([
  Object.freeze([[1850,.04,.32],[2870,.025,.24],[4310,.012,.16]]),
  Object.freeze([[1320,.045,.4],[2210,.03,.28],[3640,.016,.2],[5180,.008,.12]]),
  Object.freeze([[2480,.035,.2],[3330,.03,.26],[5470,.012,.14]]),
  Object.freeze([[960,.05,.5],[1730,.035,.36],[2890,.02,.22]]),
]);
/** Impactos com identidade por material, três variantes cada, estilhaços/terra a seguir e, às vezes, ricochete (pedra/metal). */
export function planImpact(material,distance,{key='',tracker=null}={}){
  const m=impactMaterial(material),v=(k,j=.14)=>audioVariation(`impact:${m}:${key}:${k}`,1-j,1+j),near=distance<25,g=[];
  const variant=pickVariant(`impact:${m}`,key,IMPACT_VARIANTS,tracker);
  if(m==='metal'){
    const modes=METAL_MODES[audioHash(`impact:metal:${key}:modes`)%METAL_MODES.length];
    g.push({layer:'hit',src:'noise',noise:'white',at:0,dur:[.03,.045,.022][variant],vol:.05,filter:{type:'highpass',freq:6000*v('h'),q:.7}});
    for(const [i,[hz,vol,dur]] of modes.entries()){const f=hz*v('r'+i,.1);
      g.push({layer:'ring',src:'osc',wave:'sine',freq:f,freqEnd:f*(.97+.02*v('rd'+i,.5)),at:0,dur:dur*v('rl'+i,.3),vol:vol*v('rv'+i,.3)});}
    if(variant===2)g.push({layer:'thud',src:'osc',wave:'triangle',freq:150*v('k'),freqEnd:95,at:0,dur:.06,vol:.03});   // chapa sobre apoio: pancada surda sob o toque
  }else if(m==='wood'){
    g.push({layer:'hit',src:'noise',noise:'white',at:0,dur:[.08,.05,.11][variant],vol:.065,filter:{type:'bandpass',freq:[1400,2100,900][variant]*v('h'),q:[1.6,2.2,1.2][variant]}});
    g.push({layer:'knock',src:'osc',wave:'triangle',freq:[250,330,170][variant]*v('k'),freqEnd:[150,200,110][variant],at:0,dur:[.085,.06,.12][variant],vol:.035});
    if(variant===1)g.push({layer:'split',src:'noise',noise:'white',at:.012,dur:.02,vol:.03,attack:.0006,filter:{type:'highpass',freq:3600*v('sp'),q:.9}});   // fibra a rachar
    if(variant===2)g.push({layer:'hollow',src:'noise',noise:'brown',at:.01,dur:.14,vol:.03,filter:{type:'bandpass',freq:420*v('ho'),q:4,freqEnd:300}});   // caixa oca (vagão, barracão)
    if(near)for(let i=0;i<2+(variant===1?1:0);i++)g.push({layer:'splinter',src:'noise',noise:'white',at:.03+i*.035*v('s'+i,.4),dur:.012,vol:.018,filter:{type:'highpass',freq:4200,q:.8}});
  }else if(m==='earth'){
    g.push({layer:'hit',src:'noise',noise:'brown',at:0,dur:[.13,.09,.18][variant],vol:.075,filter:{type:'lowpass',freq:[900,1300,650][variant]*v('h'),q:.7,freqEnd:350}});
    g.push({layer:'thud',src:'osc',wave:'triangle',freq:[72,95,56][variant]*v('k'),freqEnd:[44,58,36][variant],at:0,dur:[.11,.07,.16][variant],vol:.03});
    if(near)for(let i=0;i<[3,5,2][variant];i++)g.push({layer:'spray',src:'noise',noise:'white',at:.04+i*.05*v('s'+i,.5),dur:.03,vol:.012,filter:{type:'bandpass',freq:3200*v('b'+i,.3),q:1.2}});
  }else if(m==='water'){
    g.push({layer:'plop',src:'osc',wave:'sine',freq:900*v('p'),freqEnd:2400,at:0,dur:.05,vol:.03});
    g.push({layer:'splash',src:'noise',noise:'white',at:.01,dur:[.18,.26,.12][variant],vol:.04,filter:{type:'bandpass',freq:[2600,1900,3400][variant]*v('h'),q:.8}});
    if(variant===1)g.push({layer:'bubble',src:'osc',wave:'sine',freq:600*v('bb'),freqEnd:1500,at:.045*v('bt',.4),dur:.04,vol:.018});   // bolha que sobe depois do primeiro "plop"
  }else{
    const brick=m==='brick';
    g.push({layer:'hit',src:'noise',noise:'white',at:0,dur:(brick?.08:.06)*[1,.7,1.3][variant],vol:.06,filter:{type:'bandpass',freq:(brick?2200:3300)*[1,1.3,.8][variant]*v('h'),q:brick?1:1.3}});
    g.push({layer:'knock',src:'osc',wave:brick?'triangle':'square',freq:(brick?300:410)*[1,1.25,.8][variant]*v('k'),freqEnd:brick?190:260,at:0,dur:.07,vol:.024});
    if(variant===2)g.push({layer:'crumble',src:'noise',noise:'brown',at:.02,dur:.12,vol:.025,filter:{type:'bandpass',freq:700*v('cr'),q:1.1,freqEnd:420}});   // reboco/cimento a cair
    if(near)for(let i=0;i<[3,4,2][variant];i++)g.push({layer:'chips',src:'noise',noise:'white',at:.035+i*.045*v('c'+i,.5),dur:.015,vol:.012,filter:{type:'highpass',freq:5000,q:.7}});
  }
  // Ricochete: só pedra/metal e apenas uma fracção estável por id (variação de apresentação, sem RNG de jogo).
  if((m==='stone'||m==='metal')&&audioVariation(`ricochet:${key}`)<(m==='metal'?.4:.22)){
    const hz=2900*v('w',.18);
    g.push({layer:'ricochet',src:'osc',wave:'sine',freq:hz,freqEnd:hz*.42,at:.01,dur:.34*v('wd',.2),vol:.022});
    g.push({layer:'ricochet-air',src:'noise',noise:'white',at:.01,dur:.3,vol:.012,filter:{type:'bandpass',freq:hz*.8,q:6}});
  }
  return humanize(g,`impact:${m}:${key}:h`,{pitch:.06,gain:.22,time:.004});
}

// ---------------------------------------------------------------- explosões, destroços, demolição
export const EXPLOSION_SCALES=Object.freeze({
  small:Object.freeze({label:'granada',vol:.8,bodyDur:.42,subHz:70,tailDur:.9,debris:4,debrisMaterial:'earth'}),
  large:Object.freeze({label:'bomba/obus',vol:1,bodyDur:.75,subHz:50,tailDur:1.6,debris:8,debrisMaterial:'earth'}),
  demolition:Object.freeze({label:'demolição da ponte',vol:1.3,bodyDur:1.1,subHz:38,tailDur:4.2,debris:14,debrisMaterial:'masonry'}),
});
const DETAIL_SCALE={low:.5,medium:.75,high:1};
export const EXPLOSION_VARIANTS=3;
/**
 * Corpo de uma explosão (transiente, corpo, grave, cauda e reflexões rolantes) à distância dada. Três variantes:
 * seca e cortante (estilhaços), cheia (corpo e sub mais longos) e rolante (cauda e ecos mais longos).
 */
export function planExplosion(scale,distance,{key='',at=0,detail='high',tracker=null}={}){
  const s=EXPLOSION_SCALES[scale]??EXPLOSION_SCALES.large,d=Math.max(0,Number(distance)||0),band=acousticBand(d);
  const v=(k,j=.1)=>audioVariation(`blast:${scale}:${key}:${k}`,1-j,1+j),far=band==='distant'||band==='very-distant',g=[];
  const variant=pickVariant(`blast:${scale}`,key,EXPLOSION_VARIANTS,tracker),bodyK=[.75,1.25,1][variant],tailK=[.65,1,1.5][variant],echoK=[.8,1,1.35][variant];
  g.push({layer:'transient',src:'noise',noise:'white',at,dur:scale==='small'?.05:.07,vol:.3*s.vol*(far?.45:1),attack:.0008,filter:{type:'highpass',freq:(scale==='small'?1800:1100)*v('t'),q:.6}});
  // Banda média do sopro: o "estalo" seco que dá definição perto (sobretudo granadas); longe quase desaparece.
  g.push({layer:'blast',src:'noise',noise:'white',at:at+.004,dur:(scale==='small'?.22:.3)*v('m'),vol:(scale==='small'?.22:.16)*s.vol*(far?.25:1),
    filter:{type:'bandpass',freq:(scale==='small'?1300:950)*v('mf'),q:.7,freqEnd:(scale==='small'?1300:950)*.55}});
  g.push({layer:'body',src:'noise',noise:'brown',at:at+.01,dur:s.bodyDur*bodyK*v('b'),vol:.22*s.vol,filter:{type:'lowpass',freq:(scale==='small'?2600:1700)*v('bf'),q:.7,freqEnd:420}});
  g.push({layer:'sub',src:'osc',wave:'sine',freq:s.subHz*v('s'),freqEnd:s.subHz*.55,at:at+.012,dur:s.bodyDur*1.3*bodyK,vol:.2*s.vol});
  g.push({layer:'tail',src:'noise',noise:'brown',at:at+.18,dur:s.tailDur*tailK*(far?1.6:1)*v('td'),vol:.07*s.vol*(far?1.4:1),attack:.12,filter:{type:'lowpass',freq:far?280:520,q:.5}});
  // Estilhaços e terra projectada: pequenos estalos que caem aos lados do sopro (variante seca, só perto).
  if(variant===0&&!far)for(let i=0;i<(scale==='small'?3:5);i++)g.push({layer:'frag',src:'noise',noise:'white',at:at+.03+audioVariation(`blast:${key}:fr${i}`,0,scale==='small'?.35:.7),dur:.012,
    vol:.05*s.vol,attack:.0005,filter:{type:'bandpass',freq:audioVariation(`blast:${key}:fq${i}`,1800,4800),q:2.2}});
  const echoes=Math.round((far?3:2)*(DETAIL_SCALE[detail]??1));
  for(let i=0;i<echoes;i++)g.push({layer:'echo',src:'noise',noise:'brown',at:at+(.22+.31*i)*echoK*v('e'+i,.3)*(1+d/800),dur:.5+.25*i,vol:.08*s.vol/(i+1.4),attack:.03,
    filter:{type:'lowpass',freq:900/(1+i*.6),q:.6}});
  return humanize(g,`blast:${scale}:${key}:h`,{pitch:.1,spread:.05,gain:.3,time:.012});
}
/** Destroços que caem depois do sopro: só audíveis por perto. Terra, alvenaria ou metal, consoante a origem. */
export function planDebris(scale,distance,{key='',material=null,detail='high'}={}){
  const s=EXPLOSION_SCALES[scale]??EXPLOSION_SCALES.large,d=Math.max(0,Number(distance)||0);
  if(d>(scale==='demolition'?600:260))return [];
  const kind=material??s.debrisMaterial,count=Math.max(1,Math.round(s.debris*(DETAIL_SCALE[detail]??1))),g=[];
  for(let i=0;i<count;i++){
    const k=`debris:${scale}:${key}:${i}`,at=audioVariation(k+':at',.35,scale==='demolition'?4.2:scale==='large'?2.4:1.3),vol=audioVariation(k+':v',.01,.035)*(scale==='small'?.7:1);
    const pick=kind==='masonry'&&audioVariation(k+':m')<.35?'metal':kind;
    if(pick==='metal'){const hz=audioVariation(k+':hz',380,1200);g.push({layer:'debris-metal',src:'osc',wave:'triangle',freq:hz,freqEnd:hz*.9,at,dur:.22,vol:vol*.8});}
    else if(pick==='masonry')g.push({layer:'debris-masonry',src:'noise',noise:'white',at,dur:audioVariation(k+':d',.04,.12),vol,filter:{type:'bandpass',freq:audioVariation(k+':f',900,2600),q:1.1}});
    else g.push({layer:'debris-earth',src:'noise',noise:'brown',at,dur:audioVariation(k+':d',.05,.14),vol,filter:{type:'lowpass',freq:audioVariation(k+':f',700,1600),q:.7}});
  }
  return g;
}
/** Tensão de metal: gemido grave de vigas a ceder, opcionalmente com guincho agudo. */
export function planMetalStress(distance,{key='',at=0,shriek=true}={}){
  const v=(k,j=.1)=>audioVariation(`stress:${key}:${k}`,1-j,1+j),g=[];
  g.push({layer:'groan',src:'osc',wave:'sawtooth',freq:78*v('a'),freqEnd:52*v('b'),at,dur:2.4*v('d'),vol:.05,attack:.35,filter:{type:'bandpass',freq:420*v('f'),q:4}});
  g.push({layer:'groan',src:'osc',wave:'sawtooth',freq:81.5*v('c'),freqEnd:50*v('e'),at:at+.15,dur:2.1*v('g'),vol:.04,attack:.4,filter:{type:'bandpass',freq:610*v('h'),q:5}});
  if(shriek)g.push({layer:'shriek',src:'osc',wave:'sine',freq:940*v('s'),freqEnd:620,at:at+.7*v('sa',.3),dur:1.1,vol:.016,attack:.25,filter:{type:'bandpass',freq:900,q:9}});
  return g;
}
/**
 * Demolição de um vão da ponte: cargas em cadeia, sopro principal, aço a ceder, vigas a cair, água do Vístula e
 * ribombar longo. É um único evento da simulação (east/west_demolition); as camadas são só apresentação.
 */
export function planBridgeDemolition(distance,{key='',detail='high'}={}){
  const v=(k,j=.1)=>audioVariation(`demolition:${key}:${k}`,1-j,1+j),g=[];
  const charges=[0,.11*v('c1',.4),.29*v('c2',.3),.46*v('c3',.3)];
  charges.forEach((at,i)=>g.push(...planExplosion(i===0?'demolition':'large',distance,{key:`${key}:charge${i}`,at,detail}).map(x=>i===0?x:{...x,vol:x.vol*.55})));
  g.push(...planMetalStress(distance,{key,at:1.2*v('s'),shriek:true}));
  for(let i=0;i<4;i++){const hz=audioVariation(`demolition:${key}:clang${i}`,220,520),at=1.7+i*.55*v('ca'+i,.35);
    g.push({layer:'girder',src:'osc',wave:'triangle',freq:hz,freqEnd:hz*.8,at,dur:.7,vol:.045},{layer:'girder-hit',src:'noise',noise:'brown',at,dur:.25,vol:.06,filter:{type:'lowpass',freq:900,q:.7}});}
  const splash=2.6*v('w',.15);
  g.push({layer:'splash',src:'noise',noise:'brown',at:splash,dur:1.5,vol:.11,attack:.06,filter:{type:'bandpass',freq:620,q:.8}});
  g.push({layer:'spray',src:'noise',noise:'white',at:splash+.08,dur:1.9,vol:.03,attack:.2,filter:{type:'highpass',freq:3000,q:.6}});
  g.push({layer:'rumble',src:'noise',noise:'brown',at:.4,dur:7*v('r'),vol:.08,attack:.6,filter:{type:'lowpass',freq:180,q:.5}});
  return g;
}
/** Artilharia longínqua: estrondo surdo e rolante, em salvas de 1–3. */
export function planDistantArtillery(distance,{key='',salvo=1}={}){
  const g=[];for(let i=0;i<clamp(salvo,1,3);i++){
    const k=`artillery:${key}:${i}`,at=i===0?0:audioVariation(k+':at',.45,1.7)*i;
    g.push({layer:'boom',src:'noise',noise:'brown',at,dur:audioVariation(k+':d',1.4,2.3),vol:audioVariation(k+':v',.09,.13),attack:.04,filter:{type:'lowpass',freq:audioVariation(k+':f',200,320),q:.6}});
    g.push({layer:'thump',src:'osc',wave:'sine',freq:audioVariation(k+':hz',34,46),freqEnd:28,at,dur:1.1,vol:.11});
    g.push({layer:'roll',src:'noise',noise:'brown',at:at+audioVariation(k+':r',.5,.9),dur:2.2,vol:.05,attack:.4,filter:{type:'lowpass',freq:150,q:.5}});
  }return g;
}

// ---------------------------------------------------------------- veículos e aviões
/** Chegada de comboio: guincho de travões, cascata de engates de trás para a frente e descarga de vapor. */
export function planTrainArrival(distance,{key='train',wagons=12,heavy=false}={}){
  const v=(k,j=.1)=>audioVariation(`arrival:${key}:${k}`,1-j,1+j),g=[];
  g.push({layer:'brake',src:'osc',wave:'sine',freq:2150*v('b'),freqEnd:1900,at:0,dur:2.2,vol:.018,attack:.3,filter:{type:'bandpass',freq:2100,q:12}});
  g.push({layer:'brake-noise',src:'noise',noise:'white',at:0,dur:2.0,vol:.02,attack:.25,filter:{type:'bandpass',freq:2600*v('n'),q:3}});
  for(let i=0;i<wagons;i++){const at=2+i*.085*v('w'+i,.3),hz=audioVariation(`arrival:${key}:hz${i}`,330,620);
    g.push({layer:'coupler',src:'osc',wave:'square',freq:hz,freqEnd:hz*.7,at,dur:.12,vol:(heavy?.04:.03)*(1-i/(wagons*1.6)),filter:{type:'bandpass',freq:hz*1.6,q:2}});}
  g.push({layer:'steam',src:'noise',noise:'white',at:1.6,dur:2.6,vol:.05,attack:.08,filter:{type:'highpass',freq:2500,q:.6}});
  if(heavy)g.push({layer:'chuff',src:'noise',noise:'brown',at:0,dur:.9,vol:.08,filter:{type:'bandpass',freq:300,q:1}});
  return g;
}
/** Locomotiva parada: bomba de ar (tum-tss), purga, e de quando em quando aço a ranger. Um "tique" por janela de 1,5 s. */
export function planLocomotiveIdleTick(slot,{key='loco',heavy=false}={}){
  const k=`idle:${key}:${slot}`,g=[],roll=audioVariation(k);
  if(roll<.62){const at=audioVariation(k+':at',0,.4);
    g.push({layer:'pump',src:'noise',noise:'brown',at,dur:.18,vol:heavy?.07:.055,filter:{type:'bandpass',freq:220,q:1.4}});
    g.push({layer:'pump-hiss',src:'noise',noise:'white',at:at+.2,dur:.35,vol:.018,filter:{type:'highpass',freq:3200,q:.6}});}
  if(roll>.9)g.push(...planMetalStress(0,{key:k,at:.2,shriek:false}).map(x=>({...x,vol:x.vol*.5,dur:x.dur*.6})));
  else if(roll>.8){const hz=audioVariation(k+':hz',300,560);g.push({layer:'clank',src:'osc',wave:'square',freq:hz,freqEnd:hz*.75,at:.5,dur:.1,vol:.02,filter:{type:'bandpass',freq:hz*1.5,q:2}});}
  return g;
}
export const LOCOMOTIVE_IDLE_SLOT_SEC=1.5;
/**
 * Camadas do motor do Ju 87 (Jumo 211, hélice tripá) pela distância: perto, rasgar/zumbido; longe, só o ronco grave.
 * Pesos de 0..1 para as fontes do loop "aircraft".
 */
export function aircraftLayerMix(distance){
  const d=Math.max(0,Number(distance)||0),near=clamp(1-(d-150)/650,0,1),far=clamp((d-400)/1400,0,1);
  return {prop:.18+.5*near,engine:.12+.38*near,rasp:.03+.4*near*near,rumble:.25+.5*far};
}
export const JU87_BLADE_HZ=75;     // 1500 rpm × 3 pás (estimativa já usada pela hélice do renderer)
export const JU87_ENGINE_HZ=115;   // ~metade da frequência de ignição do V12 a ~2300 rpm (230 Hz): ronco por banco de cilindros
/** Doppler suavizado para uma fonte cuja distância variou `dd` metros em `dt` segundos. */
export const dopplerFactor=(dd,dt)=>dt>0?clamp(SPEED_OF_SOUND/(SPEED_OF_SOUND+dd/dt),.9,1.1):1;
/**
 * Saída de picada depois da largada (só depois de um sopro aéreo real): sirene que desce com o Doppler e motor a puxar.
 * Não antecipa a bomba: a simulação só revela o impacto no instante do impacto.
 */
export function planJu87PullOut({key=''}={}){
  const v=(k,j=.06)=>audioVariation(`ju87:${key}:${k}`,1-j,1+j);
  return [
    {layer:'siren',src:'osc',wave:'square',freq:420*v('a'),freqEnd:300,at:0,dur:2.6,vol:.03,attack:.2,filter:{type:'bandpass',freq:700,q:2}},
    {layer:'siren',src:'osc',wave:'square',freq:331*v('b'),freqEnd:236,at:0,dur:2.6,vol:.024,attack:.2,filter:{type:'bandpass',freq:600,q:2}},
    {layer:'engine-surge',src:'osc',wave:'sawtooth',freq:JU87_ENGINE_HZ*v('e'),freqEnd:JU87_ENGINE_HZ*1.32,at:.1,dur:2.8,vol:.05,attack:.5,filter:{type:'lowpass',freq:1400,q:.7}},
    {layer:'engine-rasp',src:'noise',noise:'white',at:.1,dur:2.6,vol:.02,attack:.5,filter:{type:'bandpass',freq:950,q:.9}},
  ];
}

// ---------------------------------------------------------------- jogador: mecanismo, golpe, aterragem e passos
// Tudo o que o jogador faz com o corpo e com a arma era um conjunto fixo de bips de onda quadrada: soava igual sempre.
// Agora cada ocorrência vem de uma chave (relógio/contador de apresentação, nunca do RNG da simulação) e muda.
/** Clique metálico: ruído em modo estreito (o "tic" do aço) e uma pancada grave curta (a massa da peça). */
const metalClick=(layer,at,hz,dur,vol,v,q=6.5)=>[
  {layer,src:'noise',noise:'white',at,dur,vol:vol*3.4,filter:{type:'bandpass',freq:hz*1.5*v('c'+layer+at,.1),q,freqEnd:hz*v('e'+layer+at,.1)}},
  {layer:layer+'-body',src:'osc',wave:'sine',freq:hz*.5*v('b'+layer+at,.12),freqEnd:hz*.28,at,dur:dur*1.5,vol:vol*.9}];
export const MECHANISM_KINDS=Object.freeze(['bolt','clip','round','magazine']);
/** Ferrolho, carregador e munição do wz.29 do jogador. Os tempos mantêm a sequência estabelecida (±6 %). */
export function planWz29Mechanism(kind,{key=''}={}){
  const k=MECHANISM_KINDS.includes(kind)?kind:'round',v=(n,j=.1)=>audioVariation(`wz29mech:${k}:${key}:${n}`,1-j,1+j),t=(at,n)=>at*v('t'+n,.12),g=[];
  if(k==='bolt'){
    g.push(...metalClick('open',t(.13,0),620,.035,.023,v),{layer:'scrape',src:'noise',noise:'white',at:t(.16,1),dur:.05,vol:.012,filter:{type:'bandpass',freq:2000*v('sc'),q:1.6,freqEnd:1200}});
    g.push({layer:'brass',src:'noise',noise:'white',at:t(.44,2),dur:.06,vol:.02,filter:{type:'bandpass',freq:3100*v('br'),q:2.2,freqEnd:2300}});
    g.push({layer:'brass-ping',src:'osc',wave:'sine',freq:3800*v('bp'),freqEnd:3500,at:t(.5,3),dur:.08,vol:.006});
    g.push(...metalClick('lock',t(.91,4),440,.045,.026,v,5));
  }else if(k==='clip'){
    g.push(...metalClick('clip-in',t(.25,0),970,.04,.018,v));
    for(let i=0;i<3;i++)g.push({layer:'rounds',src:'noise',noise:'white',at:t(1.1,5)+i*.045*v('r'+i,.4),dur:.025,vol:.014,filter:{type:'bandpass',freq:3300*v('rf'+i,.2),q:3}});
    g.push(...metalClick('clip-lock',t(2.8,4),360,.05,.026,v,4.5));
  }else if(k==='magazine'){   // recarga da bancada antiga: quatro toques em vez de quatro bips
    for(const [at,hz] of [[0,780],[.38,510],[.82,690],[1.2,430]])g.push(...metalClick('mag',t(at+.001,at),hz,.045,.024,v));
  }else{
    g.push(...metalClick('round',0,710,.035,.02,v));
    g.push({layer:'round-seat',src:'noise',noise:'white',at:t(.46,1),dur:.045,vol:.012,filter:{type:'bandpass',freq:2600*v('rs'),q:2}});
  }
  return humanize(g,`wz29mech:${k}:${key}:h`,{pitch:.04,spread:.03,gain:.18});
}
/** O jogador é atingido: pancada do corpo, bofetada de tecido/equipamento e inspiração brusca (sem voz gravada). */
export function planPlayerHit({key='',tracker=null}={}){
  const v=(n,j=.1)=>audioVariation(`phit:${key}:${n}`,1-j,1+j),variant=pickVariant('phit',key,3,tracker);
  return humanize([
    {layer:'thump',src:'osc',wave:'sine',freq:[105,90,125][variant]*v('t'),freqEnd:[52,44,64][variant],at:0,dur:.13,vol:.07},
    {layer:'slap',src:'noise',noise:'brown',at:0,dur:.1,vol:.09,filter:{type:'lowpass',freq:1500*v('s'),q:.7,freqEnd:500}},
    {layer:'cloth',src:'noise',noise:'white',at:.012,dur:.07,vol:.03,filter:{type:'bandpass',freq:2400*v('c'),q:.8}},
    {layer:'gasp',src:'noise',noise:'white',at:.06,dur:.26*v('g',.2),vol:.022,attack:.05,filter:{type:'bandpass',freq:[900,1200,700][variant]*v('gf'),q:1.2,freqEnd:450}},
  ],`phit:${key}:h`,{pitch:.06,gain:.2,time:.006});
}
/** Os pés do jogador tocam o chão depois de uma queda; a velocidade (m/s) escolhe o peso. Terra/ladrilho (`ground`) ou água. */
export function planLanding(speed,surface,{key=''}={}){
  const s=clamp(((Number(speed)||0)-2.5)/10.5,0,1),v=(n,j=.1)=>audioVariation(`landing:${key}:${n}`,1-j,1+j),g=[];
  if(surface==='water'){
    g.push({layer:'splash',src:'noise',noise:'white',at:0,dur:(.4+.3*s)*v('d'),vol:.05+.09*s,filter:{type:'lowpass',freq:2600*v('f'),q:.7,freqEnd:900}});
    g.push({layer:'body',src:'osc',wave:'sine',freq:96*v('b'),freqEnd:44,at:0,dur:.28+.2*s,vol:.04+.07*s});
    for(let i=0;i<2+Math.round(3*s);i++)g.push({layer:'drops',src:'noise',noise:'white',at:.08+i*.06*v('dr'+i,.5),dur:.03,vol:.012+.01*s,filter:{type:'bandpass',freq:audioVariation(`landing:${key}:df${i}`,1800,4200),q:2}});
    return humanize(g,`landing:${key}:h`,{pitch:.05,gain:.18});
  }
  g.push({layer:'body',src:'osc',wave:'sine',freq:(70-18*s)*v('b'),freqEnd:36-18*s,at:0,dur:.14+.16*s,vol:.07+.14*s});
  g.push({layer:'boots',src:'noise',noise:'brown',at:0,dur:.05+.09*s,vol:.04+.1*s,filter:{type:'lowpass',freq:(1100+700*s)*v('f'),q:.7,freqEnd:500}});
  g.push({layer:'grit',src:'noise',noise:'white',at:.01,dur:.06+.05*s,vol:.015+.02*s,filter:{type:'bandpass',freq:2300*v('gr'),q:.9}});
  // Equipamento (cantil, pente, fivelas): dois a cinco toques metálicos curtos, mais com a queda mais dura.
  const rattles=2+Math.round(3*s);
  for(let i=0;i<rattles;i++)g.push({layer:'gear',src:'noise',noise:'white',at:.02+i*.035*v('ga'+i,.6),dur:.025,vol:.008+.014*s,filter:{type:'bandpass',freq:audioVariation(`landing:${key}:gf${i}`,2600,5600),q:4}});
  if(s>.45){g.push({layer:'knock',src:'osc',wave:'sine',freq:46*v('k'),freqEnd:28,at:.05,dur:.2+.12*s,vol:.06*s});
    g.push({layer:'rattle',src:'noise',noise:'white',at:.04,dur:.12,vol:.05*s,filter:{type:'lowpass',freq:2200*v('rf'),q:.7}});}
  return humanize(g,`landing:${key}:h`,{pitch:.1,gain:.25,time:.006});
}
export const FOOTSTEP_SURFACES=Object.freeze(['earth','wood','metal','stone','brick','water']);
export const footstepSurface=m=>m==='ground'?'earth':m==='concrete'?'stone':FOOTSTEP_SURFACES.includes(m)?m:'earth';   // sand/grass/gravel have no voicing of their own yet: earth
const PACE_GAIN=Object.freeze({walk:1,run:1.55,crouch:.5});
export const FOOTSTEP_VARIANTS=3;
/**
 * Um passo do jogador (calcanhar, ponta do pé, equipamento) sobre o material sob os pés (audio-layout `surface`).
 * `load` (0..1) acrescenta peso e ranger (a carregar o ferido). Cada passo difere: três variantes por material,
 * desvios de altura e ganho, e o equipamento só se ouve a correr ou de vez em quando a andar.
 */
export function planFootstep(surface,{key='',pace='walk',load=0,tracker=null}={}){
  const m=footstepSurface(surface),pg=(PACE_GAIN[pace]??1)*(1+.35*clamp(load,0,1)),g=[],v=(n,j=.14)=>audioVariation(`step:${m}:${key}:${n}`,1-j,1+j);
  const variant=pickVariant(`step:${m}`,key,FOOTSTEP_VARIANTS,tracker),toe=.065+.03*v('toe',.5)*(pace==='run'?.6:1);
  if(m==='earth'){
    g.push({layer:'heel',src:'noise',noise:'brown',at:0,dur:[.07,.09,.06][variant],vol:.07*pg,filter:{type:'lowpass',freq:[520,420,650][variant]*v('h'),q:.7,freqEnd:230}});
    g.push({layer:'grit',src:'noise',noise:'white',at:.008,dur:.05,vol:.014*pg,filter:{type:'bandpass',freq:[1700,2300,1300][variant]*v('g'),q:.9,freqEnd:900}});
    g.push({layer:'toe',src:'noise',noise:'brown',at:toe,dur:.045,vol:.026*pg,filter:{type:'lowpass',freq:420*v('t'),q:.7}});
  }else if(m==='stone'||m==='brick'){
    const dull=m==='brick'?.72:1;
    g.push({layer:'heel',src:'noise',noise:'white',at:0,dur:.026,vol:.075*pg,attack:.0006,filter:{type:'bandpass',freq:[2600,2000,3200][variant]*dull*v('h'),q:1.1}});
    g.push({layer:'thud',src:'osc',wave:'sine',freq:[95,80,110][variant]*v('k'),freqEnd:58,at:0,dur:.07,vol:.02*pg});
    g.push({layer:'toe',src:'noise',noise:'white',at:toe,dur:.018,vol:.04*pg,filter:{type:'bandpass',freq:3300*dull*v('t'),q:1.2}});
    if(variant===2)g.push({layer:'scuff',src:'noise',noise:'white',at:.03,dur:.05,vol:.01*pg,filter:{type:'highpass',freq:4200,q:.7}});
  }else if(m==='wood'){
    g.push({layer:'knock',src:'osc',wave:'triangle',freq:[190,230,160][variant]*v('k'),freqEnd:[110,130,95][variant],at:0,dur:.08,vol:.04*pg});
    g.push({layer:'hollow',src:'noise',noise:'brown',at:.004,dur:.13,vol:.04*pg,filter:{type:'bandpass',freq:[400,520,330][variant]*v('h'),q:4,freqEnd:300}});
    g.push({layer:'toe',src:'noise',noise:'white',at:toe,dur:.02,vol:.016*pg,filter:{type:'bandpass',freq:1500*v('t'),q:1.4}});
    if(audioVariation(`step:wood:${key}:creak`)<.14)g.push({layer:'creak',src:'osc',wave:'sawtooth',freq:520*v('cr',.3),freqEnd:430*v('ce',.3),at:.02,dur:.17,vol:.012,attack:.03,filter:{type:'bandpass',freq:650,q:6}});
  }else if(m==='metal'){
    g.push({layer:'heel',src:'noise',noise:'white',at:0,dur:.022,vol:.015*pg,attack:.0005,filter:{type:'highpass',freq:2500*v('h'),q:.7}});
    g.push({layer:'thud',src:'osc',wave:'sine',freq:[110,95,130][variant]*v('k'),freqEnd:68,at:0,dur:.08,vol:.021*pg});
    g.push({layer:'ring',src:'osc',wave:'sine',freq:[780,640,920][variant]*v('r'),freqEnd:[772,632,910][variant],at:.002,dur:.22*v('rd',.3),vol:.006*pg});
    g.push({layer:'ring',src:'osc',wave:'sine',freq:[1460,1210,1710][variant]*v('r2'),freqEnd:1430,at:.002,dur:.14*v('rd2',.3),vol:.0037*pg});
    g.push({layer:'deck',src:'noise',noise:'brown',at:.004,dur:.26,vol:.015*pg,filter:{type:'bandpass',freq:150*v('d'),q:5}});   // tabuleiro oco da ponte
    g.push({layer:'toe',src:'noise',noise:'white',at:toe,dur:.016,vol:.009*pg,filter:{type:'highpass',freq:3000,q:.8}});
  }else{   // water
    g.push({layer:'slosh',src:'noise',noise:'white',at:0,dur:[.16,.2,.13][variant],vol:.045*pg,filter:{type:'bandpass',freq:900*v('h'),q:.9,freqEnd:1700}});
    g.push({layer:'plop',src:'osc',wave:'sine',freq:400*v('p'),freqEnd:900,at:.01,dur:.05,vol:.02*pg});
    g.push({layer:'wet',src:'noise',noise:'brown',at:0,dur:.12,vol:.03*pg,filter:{type:'lowpass',freq:600*v('w'),q:.7}});
  }
  // Equipamento: fivelas e cantil. Correr, ou carregar o ferido, quase sempre; a andar, de vez em quando.
  if(audioVariation(`step:${m}:${key}:gear`)<(pace==='run'?.7:load>0?.55:.28))
    for(let i=0;i<2;i++)g.push({layer:'gear',src:'noise',noise:'white',at:.012+i*.03*v('ga'+i,.6),dur:.022,vol:(.007+.004*(pace==='run'?1:0))*pg,filter:{type:'bandpass',freq:audioVariation(`step:${key}:gf${i}`,2800,5600),q:4.5}});
  return humanize(g,`step:${m}:${key}:h`,{pitch:.05,gain:.2,time:.004});
}

// ---------------------------------------------------------------- fogo
/** Estalidos de fogo numa janela de 0,1 s: 0–2 grãos, densidade pelo tamanho; respiração lenta do braseiro. */
export const FIRE_SLOT_SEC=.1;
export function planFireCrackle(slot,{key='fire',size=1}={}){
  const k=`crackle:${key}:${slot}`,breath=.55+.45*presentationNoise(`fire:${key}`,slot*FIRE_SLOT_SEC,2.3),g=[];
  const n=audioVariation(k)<.42*size*breath?(audioVariation(k+':n')<.25?2:1):0;
  for(let i=0;i<n;i++){const kk=`${k}:${i}`,pop=audioVariation(kk+':pop')<.3;
    g.push(pop?{layer:'pop',src:'noise',noise:'white',at:audioVariation(kk+':at',0,FIRE_SLOT_SEC),dur:.03,vol:audioVariation(kk+':v',.02,.05)*size,filter:{type:'bandpass',freq:audioVariation(kk+':f',900,1700),q:1.4}}
      :{layer:'crackle',src:'noise',noise:'white',at:audioVariation(kk+':at',0,FIRE_SLOT_SEC),dur:audioVariation(kk+':d',.004,.016),vol:audioVariation(kk+':v',.02,.06)*size,attack:.0005,filter:{type:'highpass',freq:audioVariation(kk+':f',2200,4200),q:.7}});}
  return g;
}

// ---------------------------------------------------------------- intensidade e batalha longínqua
/**
 * Intensidade dinâmica (0..1) da batalha ouvida, alimentada pelos eventos apresentados e decaída no relógio da simulação.
 * É estado de apresentação: não é guardada no save nem lida pela simulação.
 */
export class BattleIntensity{
  constructor(tau=7){this.tau=tau;this.energy=0;this.clock=0;}
  reset(clock=0){this.energy=0;this.clock=Math.max(0,Number(clock)||0);}
  decay(clock){const c=Number(clock)||0;if(c>this.clock){this.energy*=Math.exp(-(c-this.clock)/this.tau);this.clock=c;}return this;}
  add(clock,weight){this.decay(clock);this.energy=Math.min(4,this.energy+Math.max(0,weight));return this.level(clock);}
  level(clock=this.clock){this.decay(clock);return 1-Math.exp(-this.energy);}
}
const INTENSITY_BASE=Object.freeze({rifle:.06,mg:.035,'near-miss':.16,impact:.03,explosion:.4,demolition:.9,distant:.012,artillery:.05});
export const intensityWeight=(kind,distance=0)=>(INTENSITY_BASE[kind]??.02)/(1+Math.max(0,Number(distance)||0)/180);

export const DISTANT_SLOT_SEC=.75;
// Sectores longínquos (metros, posições aproximadas fora do tabuleiro jogável): cabeça de ponte leste, diques, Kozliny, sul, oeste.
export const DISTANT_SECTORS=Object.freeze([
  Object.freeze({id:'east-bridgehead',x:930,z:-180}),Object.freeze({id:'lisewo-dike',x:850,z:260}),
  Object.freeze({id:'kozliny-north',x:-520,z:-1150}),Object.freeze({id:'south-front',x:-650,z:950}),
  Object.freeze({id:'west-far',x:-1700,z:250}),
]);
// INTRO/SETUP (antes dos aviões às 04:34) ficam quase calados; fases desconhecidas usam 0,1.
export const PHASE_ACTIVITY=Object.freeze({INTRO:.02,SETUP:.02,BUILDUP:.12,FIRST_CONTACT:.22,MAIN_COMBAT:.32,SET_PIECE:.38,CLIMAX:.4,AFTERMATH:.22,OUTRO:.05});
/**
 * Evento longínquo de uma janela de DISTANT_SLOT_SEC: nulo ou {kind,sector,point,rounds,salvo,offset}.
 * Determinista para (janela, fase, intensidade), sem backlog nem Math.random; a intensidade é a amostrada no fotograma
 * em que a janela abre, por isso a mesma partida pode variar ligeiramente com o ritmo de fotogramas (só apresentação).
 * Não repete o mesmo sector+tipo da janela anterior.
 */
export function planDistantBattleSlot(slot,{phase='MAIN_COMBAT',intensity=0}={}){
  const activity=clamp((PHASE_ACTIVITY[phase]??.1)+clamp(intensity,0,1)*.22,0,.7);
  if(audioVariation(`m01-battle:${slot}`)>=activity)return null;
  const raw=s=>{const kr=audioVariation(`m01-battle-kind:${s}`),art=['OUTRO','SETUP','INTRO'].includes(phase)?.04:.15;
    return {kind:kr<art?'artillery':kr<art+.27?'mg':'rifle',sector:DISTANT_SECTORS[audioHash(`m01-battle-sector:${s}`)%DISTANT_SECTORS.length]};};
  // Escolha final de uma janela, comparada com a escolha final da anterior (cadeia curta e limitada).
  const pick=(s,depth)=>{const cur=raw(s);if(depth>=8)return cur;const prev=pick(s-1,depth+1);
    if(prev.kind===cur.kind&&prev.sector===cur.sector)cur.sector=DISTANT_SECTORS[(DISTANT_SECTORS.indexOf(cur.sector)+1)%DISTANT_SECTORS.length];return cur;};
  const {kind,sector}=pick(slot,0);
  return {slot,kind,sector:sector.id,point:{x:sector.x,y:0,z:sector.z},offset:audioVariation(`m01-battle-at:${slot}`,0,DISTANT_SLOT_SEC*.9),
    rounds:kind==='mg'?3+audioHash(`m01-battle-rounds:${slot}`)%7:kind==='rifle'?1+audioHash(`m01-battle-rounds:${slot}`)%4:1,
    salvo:kind==='artillery'?1+audioHash(`m01-battle-salvo:${slot}`)%3:1,key:`slot:${slot}`};
}
/** Espaçamento irregular de uma salva de espingardas longínqua (vários atiradores, não um só). */
export const volleyOffsets=(key,rounds)=>Array.from({length:rounds},(_,i)=>i===0?0:audioVariation(`${key}:volley:${i}`,.12,.75)*i);

// ---------------------------------------------------------------- emissores de M01
// Posições iguais às do renderer (LOCOMOTIVE_PLACEMENT, PANZERZUG_PLACEMENT, M01_YARD_WAGON_PLAN); verificadas em teste.
export const M01_AUDIO_EMITTERS=Object.freeze({
  locomotive:Object.freeze({x:1075,y:2,z:-2.5}),panzerzug:Object.freeze({x:1119,y:2,z:2.5}),
  yardWagonFire:Object.freeze({x:-352,y:1,z:8}),train963Wagons:65,
});
/** Fogos audíveis a partir do estado de apresentação: vagão a arder, estação bombardeada e braseiros recentes. */
export function m01FireEmitters(state={},clock=0){
  const fires=[];
  if((state.destruction??[]).includes('station_wagon_fire'))fires.push({id:'station_wagon_fire',...M01_AUDIO_EMITTERS.yardWagonFire,size:1});
  for(const d of state.damage??[]){
    if(!d||!Number.isFinite(d.x)||!Number.isFinite(d.z)||String(d.id).startsWith('m01_grenade_'))continue;
    const age=clock-(d.soundAt??d.started??0);if(age<0)continue;   // o fogo só se ouve depois do estrondo
    if(d.id==='station_bomb')fires.push({id:d.id,x:d.x,y:d.y??0,z:d.z,size:.9});
    else if(age<240&&d.smokeVisible!==false)fires.push({id:d.id,x:d.x,y:d.y??0,z:d.z,size:clamp(.55*(1-age/240),.12,.55)});
  }
  return fires;
}

// ---------------------------------------------------------------- R7-a: o Vístula (cama contínua) e o pátio ferroviário
// Tudo apresentação: lê só a posição do ouvinte (e o estado de apresentação já existente), nunca a simulação nem o RNG de jogo.
/** Ganho de 0..1 da cama do rio pela posição do ouvinte: cheio sobre a água (tabuleiro da ponte), cai com a distância à margem mais próxima. */
export const RIVER_BANK_SPAN_M=50;
export function riverBedMix(x,z=0){
  const lx=Number(x),lz=Number(z)||0;if(!Number.isFinite(lx))return {inChannel:false,distance:Infinity,gain:0,nearest:{x:VISTULA_CHANNEL.minX,z:lz}};
  const inChannel=lx>=VISTULA_CHANNEL.minX&&lx<=VISTULA_CHANNEL.maxX,nx=clamp(lx,VISTULA_CHANNEL.minX,VISTULA_CHANNEL.maxX);
  const distance=Math.abs(lx-nx);
  return {inChannel,distance,gain:1/(1+distance/RIVER_BANK_SPAN_M),nearest:{x:nx,z:lz}};
}
/**
 * Camadas da cama do rio: ruído castanho/branco em loop com velocidades de leitura distintas (períodos de buffer sem divisor comum útil, ver
 * RIVER_LAYER_PERIODS_MS) e níveis moduladores de ruído de valor com células primas diferentes: nenhum período audível abaixo de 60 s.
 */
export const RIVER_LAYERS=Object.freeze([
  Object.freeze({name:'deep',noise:'brown',rate:.41,cell:29.7,filter:Object.freeze({type:'lowpass',freq:120,q:.5}),gain:1}),
  Object.freeze({name:'flow',noise:'brown',rate:.53,cell:17.3,filter:Object.freeze({type:'lowpass',freq:430,q:.5}),gain:1}),
  Object.freeze({name:'rush',noise:'white',rate:.61,cell:11.9,filter:Object.freeze({type:'bandpass',freq:1100,q:.5}),gain:.3}),
  Object.freeze({name:'lap',noise:'white',rate:.83,cell:7.3,filter:Object.freeze({type:'bandpass',freq:2600,q:.8}),gain:.12}),
]);
const RIVER_BUFFER_SEC=Object.freeze({brown:6.83,white:2.37});   // as durações de NOISE_SECONDS em audio.js
/** Período do buffer de cada camada à sua velocidade de leitura, em milissegundos inteiros. */
export const RIVER_LAYER_PERIODS_MS=Object.freeze(RIVER_LAYERS.map(l=>Math.round(RIVER_BUFFER_SEC[l.noise]/l.rate*1000)));
const gcd=(a,b)=>b?gcd(b,a%b):a;
/** Menor múltiplo comum dos períodos (ms): o mais cedo em que as camadas voltam a alinhar-se, sem contar as modulações. */
export const riverAlignmentPeriodMs=(periods=RIVER_LAYER_PERIODS_MS)=>periods.reduce((a,b)=>a/gcd(a,b)*b,1);
/** Nível 0..1 de cada camada no instante t (relógio da simulação): lento, não periódico. */
export function riverLayerLevels(t){
  const out={};for(const l of RIVER_LAYERS)out[l.name]=.35+.65*presentationNoise(`m01-river:${l.name}`,t,l.cell);
  return out;
}
/** Volume mestre da cama (antes do ganho espacial) com respiração lenta de ~±20 %. */
export const riverBedVolume=(mix,t)=>.05*mix.gain*(.8+.4*presentationNoise('m01-river:master',t,43.1));

// Pátio ferroviário oeste: vagões de carga parados a 352 m do encontro oeste da ponte (M01_AUDIO_EMITTERS.yardWagonFire, mesma posição que o renderer).
export const RAIL_SLOT_SEC=2.5;
export const RAIL_AUDIBLE_M=800;
export const RAIL_QUIET_AFTER_BLAST_SEC=5;
/**
 * Fase do ambiente ferroviário. Antes do bombardeamento da estação (04:34, damage 'station_bomb' audível): 'shunting'. Depois: 'aftermath'
 * (a estação foi atingida: acabam a manobra e o vapor, ficam só metais a arrefecer). Nos primeiros segundos de qualquer sopro audível: 'quiet'.
 */
export function railAmbiencePhase(state={},clock=0){
  const damage=state?.damage??[];let hit=false,quiet=false;
  for(const d of damage){
    if(!d)continue;const at=d.soundAt??d.started;if(!Number.isFinite(at)||clock<at)continue;
    if(d.id==='station_bomb')hit=true;
    if(clock-at<RAIL_QUIET_AFTER_BLAST_SEC)quiet=true;
  }
  return quiet?'quiet':hit?'aftermath':'shunting';
}
const RAIL_KINDS=Object.freeze(['couplers','creak','buffer','steam']);
/** Tipo de acontecimento ferroviário de uma janela (null = silêncio). Nunca igual ao da janela imediatamente anterior. */
export function railSlotKind(slot,phase='shunting'){
  if(phase==='quiet')return null;
  if(phase!=='shunting')return audioVariation(`m01-rail-after:${slot}`)<.12?'tick':null;
  const raw=s=>audioVariation(`m01-rail:${s}`)<.62?RAIL_KINDS[audioHash(`m01-rail-kind:${s}`)%RAIL_KINDS.length]:null;
  const cur=raw(slot);if(cur===null)return null;
  const prev=raw(slot-1);
  return prev===cur?RAIL_KINDS[(RAIL_KINDS.indexOf(cur)+1+audioHash(`m01-rail-alt:${slot}`)%(RAIL_KINDS.length-1))%RAIL_KINDS.length]:cur;
}
/** Grãos de uma janela ferroviária ao longe: cascata de engates, rangido de vagão, batente, sopro de vapor; ou, após o ataque, tiques de metal a arrefecer. */
export function planRailAmbienceSlot(slot,phase='shunting'){
  const kind=railSlotKind(slot,phase);if(!kind)return [];
  const k=`rail:${slot}`,v=(n,j=.1)=>audioVariation(`${k}:${n}`,1-j,1+j),g=[];
  if(kind==='couplers'){
    const n=3+audioHash(`${k}:n`)%4;
    for(let i=0;i<n;i++){const at=i*.11*v('a'+i,.35),hz=audioVariation(`${k}:hz${i}`,260,520);
      g.push({layer:'coupler',src:'noise',noise:'white',at,dur:.05,vol:.05*(1-i/(n*1.5)),attack:.001,filter:{type:'bandpass',freq:hz*2,q:5}},
        {layer:'coupler-body',src:'osc',wave:'sine',freq:hz*.5,freqEnd:hz*.3,at,dur:.12,vol:.03*(1-i/(n*1.5))});}
  }else if(kind==='creak'){
    const hz=audioVariation(`${k}:hz`,380,640);
    g.push({layer:'wagon-creak',src:'osc',wave:'sawtooth',freq:hz*v('f'),freqEnd:hz*audioVariation(`${k}:glide`,.78,1.18),at:0,dur:audioVariation(`${k}:d`,.5,1.3),vol:.022,attack:.15,filter:{type:'bandpass',freq:hz*1.4,q:7}});
  }else if(kind==='buffer'){
    g.push({layer:'buffer-thump',src:'osc',wave:'sine',freq:88*v('f'),freqEnd:44,at:0,dur:.22,vol:.07},
      {layer:'buffer-clank',src:'noise',noise:'white',at:.01,dur:.09,vol:.04,attack:.001,filter:{type:'bandpass',freq:1500*v('c'),q:3,freqEnd:800}});
  }else if(kind==='steam'){
    g.push({layer:'steam-hiss',src:'noise',noise:'white',at:0,dur:audioVariation(`${k}:d`,.9,1.9),vol:.026,attack:.25,filter:{type:'highpass',freq:2800*v('f'),q:.6}});
  }else{   // tick: metal a arrefecer depois do bombardeamento
    const hz=audioVariation(`${k}:hz`,520,1400);
    g.push({layer:'metal-tick',src:'osc',wave:'sine',freq:hz,freqEnd:hz*.96,at:0,dur:.09,vol:.008},{layer:'metal-tick',src:'noise',noise:'white',at:0,dur:.015,vol:.012,filter:{type:'bandpass',freq:hz*2.4,q:6}});
  }
  return g;
}
