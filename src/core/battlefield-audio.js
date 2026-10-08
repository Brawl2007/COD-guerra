// Áudio de campo de batalha de M01 como dados puros: acústica, perfis de armas e planos de camadas ("grãos").
// Nada aqui toca em Web Audio, no RNG da simulação ou no estado de jogo: recebe distâncias/ids já decididos
// pela simulação e devolve descrições deterministas que o AudioManager apenas toca.
// Os sons são sintetizados de raiz (ruído + osciladores); nenhum é amostrado ou copiado de outro jogo.

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

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

// Bandas acústicas: escolhem camadas (mecanismo, estalo, eco), não saltos de ganho. 45/220/950 m cobrem a ponte e os diques.
export const ACOUSTIC_BANDS=Object.freeze([
  Object.freeze({id:'close',max:45}),Object.freeze({id:'mid',max:220}),
  Object.freeze({id:'distant',max:950}),Object.freeze({id:'very-distant',max:Infinity}),
]);
export const acousticBand=distance=>{const d=Math.max(0,Number(distance)||0);return ACOUSTIC_BANDS.find(b=>d<b.max).id;};

// Atenuação contínua por categoria (ref = distância de ganho 1; span = metros para metade do ganho além de ref).
// Afinada para mistura de jogo (gama dinâmica comprimida), não para níveis SPL medidos.
export const ATTENUATION=Object.freeze({
  weapon:Object.freeze({ref:4,span:70}),player:Object.freeze({ref:1,span:1e9}),danger:Object.freeze({ref:1,span:1e9}),
  impact:Object.freeze({ref:2,span:16}),debris:Object.freeze({ref:4,span:30}),explosion:Object.freeze({ref:20,span:170}),
  distant:Object.freeze({ref:4,span:70}),vehicle:Object.freeze({ref:15,span:140}),aircraft:Object.freeze({ref:60,span:260}),
  fire:Object.freeze({ref:6,span:22}),ambience:Object.freeze({ref:1,span:1e9}),fx:Object.freeze({ref:0,span:70}),
});
/**
 * Forma acústica de uma fonte: ganho, corte de absorção do ar, envio para a reverberação exterior e sombra da cabeça.
 * `front` é cos(ângulo relativo à frente do ouvinte): fontes atrás ficam um pouco mais escuras e baixas.
 */
export function acousticShape(distance,{category='weapon',front=1}={}){
  const d=Math.max(0,Number(distance)||0),a=ATTENUATION[category]??ATTENUATION.weapon,f=clamp(Number.isFinite(front)?front:1,-1,1);
  const behind=Math.max(0,-f);
  const gain=(1/(1+Math.max(0,d-a.ref)/a.span))*(1-.14*behind);
  const filter=clamp(18000/(1+d/95),category==='explosion'||category==='aircraft'?320:480,18000)*(1-.38*behind);
  const send=category==='player'||category==='danger'?.16:category==='ambience'?0:clamp(.14+d/700,.14,.82);
  return {band:acousticBand(d),gain,filter,send};
}
/** Compatibilidade com o primeiro production pass: forma de uma arma em campo aberto, de frente. */
export const audioDistanceShape=distance=>{const s=acousticShape(distance,{category:'fx'});return {gain:s.gain,filter:s.filter};};

export const AUDIO_PRIORITY=Object.freeze({
  ambience:10,distant:20,fire:28,train:35,aircraft:40,debris:44,impact:50,mg:62,rifle:66,explosion:78,danger:90,critical:100
});
// Limites por categoria (vozes = eventos com várias camadas). O total global continua 32.
export const CATEGORY_LIMITS=Object.freeze({
  weapon:12,player:6,danger:4,impact:6,debris:4,explosion:6,distant:6,vehicle:4,aircraft:3,fire:3,ambience:4,fx:32
});
export const CATEGORY_BUS=Object.freeze({
  weapon:'weapons',player:'player',danger:'player',impact:'impacts',debris:'impacts',explosion:'explosions',
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
    blast:{hz:900,q:.8,dur:.14,vol:.07},tail:{hz:5200,dur:.5,vol:.04,at:.15},mech:[],echo:.055,jitter:.03,burstTail:1,cadence:1.2}),
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

/** Camadas de um disparo isolado, à distância dada. `round` (>0) marca tiros seguintes de uma rajada. */
export function planWeaponShot(weapon,distance,{key='',round=0,at=0,detail='high'}={}){
  const id=weaponProfileId(weapon),p=WEAPON_SOUND_PROFILES[id],d=Math.max(0,Number(distance)||0),band=acousticBand(d);
  const v=(k,j=p.jitter)=>audioVariation(`${id}:${key}:${round}:${k}`,1-j,1+j);
  const near=band==='close',mid=band==='mid',far=band==='distant',vfar=band==='very-distant',grains=[];
  const crackScale=near?1:mid?.62:far?.3:.12;
  grains.push({layer:'crack',src:'noise',noise:'white',at,dur:p.crack.dur*(near?1:1.25),vol:p.crack.vol*crackScale*v('cv'),
    filter:{type:p.crack.type,freq:p.crack.hz*v('cf'),q:p.crack.q},rate:v('cr',.08)});
  grains.push({layer:'body',src:'osc',wave:p.body.wave,freq:p.body.hz*v('bf'),freqEnd:p.body.end*v('be'),at,
    dur:p.body.dur*(near||mid?1:far?1.5:1.9),vol:p.body.vol*(vfar?.9:1)*v('bv')});
  grains.push({layer:'blast',src:'noise',noise:'white',at:at+.002,dur:p.blast.dur*(near?1:1.3),vol:p.blast.vol*(near?1:mid?.85:.6)*v('lv'),
    filter:{type:'bandpass',freq:p.blast.hz*v('lf'),q:p.blast.q}});
  if(d<90)for(const [i,m] of p.mech.entries()){
    if(p.family==='mg'&&i>0&&round%2===1)continue;   // o segundo clique do mecanismo alterna: rajada menos "metralhada"
    grains.push({layer:'mechanism',src:'osc',wave:m.wave,freq:m.hz*v('m'+i),freqEnd:m.hz*.62,at:at+m.at,dur:m.dur,vol:m.vol*(near?1:.55)});
  }
  const tailScale=(near?1:mid?1.3:far?1.9:2.5)*(round>0?p.burstTail:1);
  // Perto, a cauda é o relatório do tiro (ruído claro filtrado); longe, sobra o ronco grave (ruído castanho).
  grains.push({layer:'tail',src:'noise',noise:near||mid?'white':'brown',at:at+p.tail.at,dur:p.tail.dur*(near?1:mid?1.3:far?1.8:2.3),vol:p.tail.vol*tailScale*v('tv'),
    filter:{type:'lowpass',freq:p.tail.hz*(near?1:mid?.7:.45),q:.5}});
  // Reflexões (casario, aterro, margem): mais e mais tardias com a distância: "rolar" do tiro que não soa isolado.
  const echoes=Math.min(DETAIL_ECHOES[detail]??3,near?1:mid?2:3)-(round>0&&p.family==='mg'?1:0);
  for(let i=0;i<echoes;i++){
    const delay=p.echo*(i+1)*v('ed'+i,.35)*(1+d/520)+(far||vfar?.12*i:0);
    grains.push({layer:'echo',src:'noise',noise:'white',at:at+delay,dur:p.crack.dur*(2+i),vol:p.crack.vol*(near?.12:.22)/(i+1)*v('ev'+i),
      filter:{type:'lowpass',freq:2200/(1+i*.7),q:.6}});
  }
  return grains;
}
/** Rajada inteira numa só voz: cadência dada pela simulação/chamador, timbre de cada tiro com variação própria. */
export function planWeaponBurst(weapon,distance,{rounds=1,interval=null,key='',detail='high'}={}){
  const id=weaponProfileId(weapon),p=WEAPON_SOUND_PROFILES[id],n=clamp(Math.round(rounds)||1,1,p.family==='mg'?9:4),step=interval??p.cadence;
  const grains=[];for(let i=0;i<n;i++)grains.push(...planWeaponShot(id,distance,{key,round:i,at:i*step,detail}));
  return grains;
}

// ---------------------------------------------------------------- balas que passam e impactos
/**
 * `crack`: estalo supersónico (onda N) de uma bala que passa a poucos metros (decisão da simulação, event.crack);
 * `whizz`: zumbido de uma bala já subsónica e a tombar, usado só para ricochetes próximos. Às distâncias de M01
 * o 7,92 mm ainda é supersónico, por isso uma passagem directa mais afastada não "zumbe".
 */
export function planBulletPass(type,{key=''}={}){
  const v=(k,j=.08)=>audioVariation(`pass:${key}:${k}`,1-j,1+j);
  if(type==='whizz')return [
    {layer:'whizz',src:'noise',noise:'white',at:0,dur:.2*v('d'),vol:.05*v('v'),filter:{type:'bandpass',freq:2300*v('f'),q:5},rate:v('r',.2)},
    {layer:'whizz-tone',src:'osc',wave:'sine',freq:1700*v('t'),freqEnd:760,at:.01,dur:.18,vol:.012},
  ];
  return [
    {layer:'crack',src:'noise',noise:'white',at:0,dur:.014,vol:.16*v('v'),attack:.0005,filter:{type:'highpass',freq:2400*v('f'),q:.7}},
    {layer:'snap',src:'osc',wave:'square',freq:2600*v('t'),freqEnd:560,at:0,dur:.024,vol:.05},
    {layer:'flutter',src:'noise',noise:'white',at:.012,dur:.06,vol:.03,filter:{type:'bandpass',freq:5200*v('b'),q:2.5}},
  ];
}
export const IMPACT_MATERIALS=Object.freeze(['earth','wood','metal','stone','brick','water']);
export const impactMaterial=m=>IMPACT_MATERIALS.includes(m)?m:'stone';
/** Impactos com identidade por material, estilhaços/terra a seguir e, às vezes, ricochete (pedra/metal). */
export function planImpact(material,distance,{key=''}={}){
  const m=impactMaterial(material),v=(k,j=.1)=>audioVariation(`impact:${m}:${key}:${k}`,1-j,1+j),near=distance<25,g=[];
  if(m==='metal'){
    g.push({layer:'hit',src:'noise',noise:'white',at:0,dur:.03,vol:.05,filter:{type:'highpass',freq:6000*v('h'),q:.7}});
    for(const [i,[hz,vol,dur]] of [[1850,.04,.32],[2870,.025,.24],[4310,.012,.16]].entries())
      g.push({layer:'ring',src:'osc',wave:'sine',freq:hz*v('r'+i,.06),freqEnd:hz*v('r'+i,.06)*.985,at:0,dur,vol});
  }else if(m==='wood'){
    g.push({layer:'hit',src:'noise',noise:'white',at:0,dur:.08,vol:.065,filter:{type:'bandpass',freq:1400*v('h'),q:1.6}});
    g.push({layer:'knock',src:'osc',wave:'triangle',freq:250*v('k'),freqEnd:150,at:0,dur:.085,vol:.035});
    if(near)for(let i=0;i<2;i++)g.push({layer:'splinter',src:'noise',noise:'white',at:.03+i*.035*v('s'+i,.4),dur:.012,vol:.018,filter:{type:'highpass',freq:4200,q:.8}});
  }else if(m==='earth'){
    g.push({layer:'hit',src:'noise',noise:'brown',at:0,dur:.13,vol:.075,filter:{type:'lowpass',freq:900*v('h'),q:.7}});
    g.push({layer:'thud',src:'osc',wave:'triangle',freq:72*v('k'),freqEnd:44,at:0,dur:.11,vol:.03});
    if(near)for(let i=0;i<3;i++)g.push({layer:'spray',src:'noise',noise:'white',at:.04+i*.05*v('s'+i,.5),dur:.03,vol:.012,filter:{type:'bandpass',freq:3200*v('b'+i,.3),q:1.2}});
  }else if(m==='water'){
    g.push({layer:'plop',src:'osc',wave:'sine',freq:900*v('p'),freqEnd:2400,at:0,dur:.05,vol:.03});
    g.push({layer:'splash',src:'noise',noise:'white',at:.01,dur:.18,vol:.04,filter:{type:'bandpass',freq:2600*v('h'),q:.8}});
  }else{
    const brick=m==='brick';
    g.push({layer:'hit',src:'noise',noise:'white',at:0,dur:brick?.08:.06,vol:.06,filter:{type:'bandpass',freq:(brick?2200:3300)*v('h'),q:brick?1:1.3}});
    g.push({layer:'knock',src:'osc',wave:brick?'triangle':'square',freq:(brick?300:410)*v('k'),freqEnd:brick?190:260,at:0,dur:.07,vol:.024});
    if(near)for(let i=0;i<3;i++)g.push({layer:'chips',src:'noise',noise:'white',at:.035+i*.045*v('c'+i,.5),dur:.015,vol:.012,filter:{type:'highpass',freq:5000,q:.7}});
  }
  // Ricochete: só pedra/metal e apenas uma fracção estável por id (variação de apresentação, sem RNG de jogo).
  if((m==='stone'||m==='metal')&&audioVariation(`ricochet:${key}`)<(m==='metal'?.4:.22)){
    const hz=2900*v('w',.18);
    g.push({layer:'ricochet',src:'osc',wave:'sine',freq:hz,freqEnd:hz*.42,at:.01,dur:.34*v('wd',.2),vol:.022});
    g.push({layer:'ricochet-air',src:'noise',noise:'white',at:.01,dur:.3,vol:.012,filter:{type:'bandpass',freq:hz*.8,q:6}});
  }
  return g;
}

// ---------------------------------------------------------------- explosões, destroços, demolição
export const EXPLOSION_SCALES=Object.freeze({
  small:Object.freeze({label:'granada',vol:.8,bodyDur:.42,subHz:70,tailDur:.9,debris:4,debrisMaterial:'earth'}),
  large:Object.freeze({label:'bomba/obus',vol:1,bodyDur:.75,subHz:50,tailDur:1.6,debris:8,debrisMaterial:'earth'}),
  demolition:Object.freeze({label:'demolição da ponte',vol:1.3,bodyDur:1.1,subHz:38,tailDur:4.2,debris:14,debrisMaterial:'masonry'}),
});
const DETAIL_SCALE={low:.5,medium:.75,high:1};
/** Corpo de uma explosão (transiente, corpo, grave, cauda e reflexões rolantes) à distância dada. */
export function planExplosion(scale,distance,{key='',at=0,detail='high'}={}){
  const s=EXPLOSION_SCALES[scale]??EXPLOSION_SCALES.large,d=Math.max(0,Number(distance)||0),band=acousticBand(d);
  const v=(k,j=.1)=>audioVariation(`blast:${scale}:${key}:${k}`,1-j,1+j),far=band==='distant'||band==='very-distant',g=[];
  g.push({layer:'transient',src:'noise',noise:'white',at,dur:scale==='small'?.05:.07,vol:.3*s.vol*(far?.45:1),attack:.0008,filter:{type:'highpass',freq:(scale==='small'?1800:1100)*v('t'),q:.6}});
  // Banda média do sopro: o "estalo" seco que dá definição perto (sobretudo granadas); longe quase desaparece.
  g.push({layer:'blast',src:'noise',noise:'white',at:at+.004,dur:(scale==='small'?.22:.3)*v('m'),vol:(scale==='small'?.22:.16)*s.vol*(far?.25:1),
    filter:{type:'bandpass',freq:(scale==='small'?1300:950)*v('mf'),q:.7}});
  g.push({layer:'body',src:'noise',noise:'brown',at:at+.01,dur:s.bodyDur*v('b'),vol:.22*s.vol,filter:{type:'lowpass',freq:(scale==='small'?2600:1700)*v('bf'),q:.7}});
  g.push({layer:'sub',src:'osc',wave:'sine',freq:s.subHz*v('s'),freqEnd:s.subHz*.55,at:at+.012,dur:s.bodyDur*1.3,vol:.2*s.vol});
  g.push({layer:'tail',src:'noise',noise:'brown',at:at+.18,dur:s.tailDur*(far?1.6:1)*v('td'),vol:.07*s.vol*(far?1.4:1),attack:.12,filter:{type:'lowpass',freq:far?280:520,q:.5}});
  const echoes=Math.round((far?3:2)*(DETAIL_SCALE[detail]??1));
  for(let i=0;i<echoes;i++)g.push({layer:'echo',src:'noise',noise:'brown',at:at+(.22+.31*i)*v('e'+i,.3)*(1+d/800),dur:.5+.25*i,vol:.08*s.vol/(i+1.4),attack:.03,
    filter:{type:'lowpass',freq:900/(1+i*.6),q:.6}});
  return g;
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
