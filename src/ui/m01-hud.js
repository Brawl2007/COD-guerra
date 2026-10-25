// Apresentação do HUD de M01. Lê o estado da simulação e escreve somente no DOM.
// Nunca altera objectivos, relógios, eventos, cenas ou checkpoints; os tempos derivam do relógio da simulação,
// por isso tudo congela na pausa e recomeça coerente depois de um restauro.
import { clockText } from '../game/m01-simulation.js';

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const ramp=(t,from,to)=>clamp((t-from)/(to-from));

// Cartelas da introdução, nos instantes de cs_m01_intro (t=0 ecrã preto, t=3 e t=7 cartelas, t=11 fade-in).
export const INTRO_CARDS=Object.freeze([
  {id:'place',from:3,to:7,lines:['TCZEW, POLÓNIA','1 de setembro de 1939 — 04:30']},
  {id:'unit',from:7,to:11,lines:['Strzelec Jan Wrona','2.º Batalhão de Fuzileiros','Oddział Wydzielony „Tczew” · Exército „Pomorze”']}
]);
export const HUD_TIMING=Object.freeze({
  introBlackUntil:11,introFade:2.4,outroFadeIn:3,outroCardUntil:5.5,outroFadeOut:[57,60],
  typeRate:40,lineDelay:.5,cardFade:.45,resumeFade:.8,resumeCard:4.5,checkpoint:3.2,
  banner:{new:3.8,done:2.6,expired:3,current:2.6},bannerIn:.3,bannerOut:.6,fresh:4,hitMarker:.15
});

/** Speed of sound used for every delayed M01 sound (m/s). */
/** H9 D5: pt-PT names of the three difficulty levels (the ids are the simulation's; this is presentation only). */
export const M01_DIFFICULTY_LABELS=Object.freeze({recruta:'Recruta',soldado:'Soldado',veterano:'Veterano'});
/**
 * H9 D5, the death beat (presentation only, REAL seconds: the simulation is not ticked while it runs). sec = how long; offerAfterDeaths = deaths at one checkpoint after which a level above
 * recruta is offered the next lower level. deathBeatFrame(age) = how black the screen is (full in 0.45 s) and how visible the cause text is (in from 0.3 s, out over the last 0.4 s).
 */
export const DEATH_BEAT=Object.freeze({sec:2.5,fadeInSec:.45,textFrom:.3,textInSec:.35,textOutSec:.4,offerAfterDeaths:3});
export function deathBeatFrame(age){
  const T=DEATH_BEAT;if(!(age>=0))return {black:0,text:0};
  return {black:ramp(age,0,T.fadeInSec),text:ramp(age,T.textFrom,T.textFrom+T.textInSec)*(1-ramp(age,T.sec-T.textOutSec,T.sec))};
}
export const SOUND_SPEED=343;
/** Impacts of the player's own shot closer than this are heard at once; farther ones arrive after distance/343 s. */
export const PLAYER_IMPACT_DELAY_FROM=60;
/** When the sound of the player's shot impact is heard: now (<= 60 m) or queued at clock + distance/343. Presentation only, no RNG. */
export function playerImpactSoundPlan(distance,clock){
  return distance>PLAYER_IMPACT_DELAY_FROM?{immediate:false,at:clock+distance/SOUND_SPEED}:{immediate:true,at:clock};
}
/** Opacity of the hit marker `age` mission-clock seconds after a confirmed hit: 1, easing slightly in the last stretch, 0 once expired. */
export function hitMarkerOpacity(age){
  const T=HUD_TIMING.hitMarker;
  return age>=0&&age<T?1-.6*ramp(age,T*.55,T):0;
}
const LOCKED=new Set(['cs_m01_intro','cs_m01_roll_call']);
export const isLockedScene=id=>LOCKED.has(id);

const card=(id,lines,opacity,elapsed)=>({id,lines,opacity,elapsed});
export function sceneBeatFrame(sim){
  const scene=sim.scene,data=scene&&sim.definition.cutscenes?.find(c=>c.id===scene.id);
  const frame={scene:scene?.id??null,elapsed:scene?.elapsed??0,letterbox:false,dimHud:0,lookPrompt:'',subtitlePause:false,shake:0};
  if(!scene||!data)return frame;
  for(const cue of data.presentationCues??[]){if(scene.elapsed<cue.t||scene.elapsed>=cue.until)continue;
    if(cue.letterbox)frame.letterbox=true;if(cue.dimHud)frame.dimHud=cue.dimHud;
    if(cue.lookPrompt)frame.lookPrompt=cue.lookPrompt;if(cue.subtitlePause)frame.subtitlePause=true;
    if(cue.shakeAtSound){const id=scene.id==='cs_m01_east_blast'?'east_demolition':'west_demolition',damage=sim.sectors?.damage?.find(d=>d.id===id);
      const age=damage?sim.clock-damage.soundAt:-1;if(age>=0&&age<.6)frame.shake=Math.sin(age*65)*(1-age/.6)*3;}
  }
  return frame;
}
/** Caracteres visíveis de cada linha: linhas desfasadas, escritas em paralelo à mesma cadência. */
export const typedChars=(line,index,elapsed)=>Math.max(0,Math.min(line.length,Math.floor((elapsed-index*HUD_TIMING.lineDelay)*HUD_TIMING.typeRate)));
/** Fotograma cinematográfico derivado da cena da simulação (id + elapsed). Só apresentação. */
export function cinematicFrame(scene,battleClock=0){
  if(scene?.card)return actCardFrame(scene);   // R4: the card of a new act (scene.card, M01AreaSimulation); the current act's scenes carry none
  if(!scene||!LOCKED.has(scene.id))return {locked:false,black:0,card:null};
  const t=Number(scene.elapsed)||0,T=HUD_TIMING;
  if(scene.id==='cs_m01_intro'){
    const black=t<T.introBlackUntil?1:1-ramp(t,T.introBlackUntil,T.introBlackUntil+T.introFade);
    const c=INTRO_CARDS.find(c=>t>=c.from&&t<c.to);
    const opacity=c?Math.min(ramp(t,c.from,c.from+T.cardFade),1-ramp(t,c.to-T.cardFade,c.to)):0;
    return {locked:true,black,card:c?card(c.id,c.lines,opacity,t-c.from):null};
  }
  // cs_m01_roll_call: "fade com cartela 07:05" (t=0) e "fade para o debrief" (t=60).
  const black=Math.max(1-ramp(t,0,T.outroFadeIn),ramp(t,...T.outroFadeOut));
  const opacity=Math.min(ramp(t,.2,.2+T.cardFade),1-ramp(t,T.outroCardUntil-T.cardFade,T.outroCardUntil));
  return {locked:true,black,card:t<T.outroCardUntil?card('roll-call',['Chamada no abrigo',`Tczew — ${clockText(battleClock).slice(0,5)}`],opacity,t-.2):null};
}

/**
 * R4 INC-1: the card of a new act (its entry, between the roll call and the new area, and its end, before the debrief). The entry card is black until its last 1.2 s
 * (the area appears behind it); the end card fades the field to black in 1.5 s. Its lines say what is documented and what is reconstruction; no exact hour.
 */
export function actCardFrame(scene){
  const t=Number(scene.elapsed)||0,end=scene.card.seconds,T=HUD_TIMING;
  const black=scene.card.kind==='end'?ramp(t,0,1.5):1-ramp(t,end-1.2,end);
  const opacity=Math.min(ramp(t,.4,.4+T.cardFade),1-ramp(t,end-1.4,end-.9));
  return {locked:true,black,card:card(scene.id,scene.card.lines,opacity,t-.4)};
}

/** Transições de objectivos entre dois mapas {id:{state}}; previous=null significa linha de base vazia. */
export function objectiveChanges(previous,current,definitions){
  const changes=[];
  for(const o of definitions){
    const before=previous?.[o.id]?.state??'locked',after=current[o.id]?.state;
    if(!after||before===after)continue;
    const kind=after==='active'?'new':after==='done'&&before==='active'?'done':after==='expired'?'expired':null;
    if(kind)changes.push({kind,id:o.id,text:objectiveText(o),optional:!o.required});
  }
  // Concluir antes de anunciar o seguinte, como a ordem da própria missão.
  return changes.sort((a,b)=>(a.kind==='new')-(b.kind==='new'));
}
export const objectiveText=o=>o.text.replace(/^\(Opcional\)\s*/,'');
const BANNER_LABEL={new:'Novo objectivo',done:'Objectivo concluído',expired:'Objectivo encerrado',current:'Objectivo'};
export function bannerLabel(change){return change.optional&&change.kind!=='done'?(change.kind==='new'?'Objectivo opcional':BANNER_LABEL[change.kind]):BANNER_LABEL[change.kind];}

/** "E · entregar mensagem" → tecla + acção; texto sem tecla devolve só a acção. */
export function splitInteraction(text=''){
  const match=/^(Espaço|[A-Z0-9]{1,3}) · (.+)$/.exec(text);
  return match?{key:match[1],action:match[2]}:{key:'',action:text};
}
/** Separa o objectivo opcional que a simulação junta a mission.text com " · ". */
export function splitObjective(text,optionalText){
  const suffix=optionalText?` · ${optionalText}`:'';
  return suffix&&text.endsWith(suffix)&&text.length>suffix.length?{main:text.slice(0,-suffix.length),optional:optionalText}:{main:text,optional:''};
}
/** Vertical field of view of the M01 camera (src/render/m01-view.js PerspectiveCamera(70, …)). */
export const M01_VFOV_DEG=70;
/**
 * Horizontal place of the objective marker for a bearing relative to the view (radians, + = right), on a screen of `aspect`.
 * On screen: perspective-correct x in 0..1. Off screen: pinned to the nearer edge with the side, so the player knows which way to turn.
 */
export function markerScreen(bearing,aspect=16/9,vfovDeg=M01_VFOV_DEG){
  const half=Math.atan(Math.tan(vfovDeg*Math.PI/360)*aspect),edge=.05;
  if(Math.abs(bearing)<half)return {x:clamp(.5+.5*Math.tan(bearing)/Math.tan(half),edge,1-edge),side:null};
  return {x:bearing>0?1-edge:edge,side:bearing>0?'right':'left'};
}
/** Intensidade do aviso de vida baixa (0 a partir de 45 de saúde). */
export const lowHealthLevel=health=>clamp((45-health)/45);

export class M01HudPresenter {
  constructor(el,{document:doc=globalThis.document}={}){
    this.el=el;this.doc=doc;this.cache=new Map();this.queue=[];this.aspect=16/9;this.reset('new',0);
    if(!el.sceneCue&&el.root?.appendChild&&doc?.createElement){el.sceneCue=this.node('div','scene-look-prompt','');el.root.appendChild(el.sceneCue);}
    // P2: world marker of the current objective and the "Mais tarde…" card of a compressed clock (created here, like the scene cue: no index.html change).
    if(!el.objectiveMarker&&el.root?.appendChild&&doc?.createElement){
      el.objectiveMarker=this.node('div','objective-marker','');el.objectiveMarker.setAttribute?.('aria-hidden','true');
      el.markerLabel=this.node('span','marker-label','');el.markerDistance=this.node('span','marker-distance','');
      el.objectiveMarker.append?.(this.node('i','marker-pip',''),el.markerLabel,el.markerDistance);el.root.appendChild(el.objectiveMarker);
    }
    if(!el.tempoCard&&el.root?.appendChild&&doc?.createElement){
      el.tempoCard=this.node('div','tempo-card','');el.tempoLabel=this.node('strong','','');el.tempoReason=this.node('small','','');
      el.tempoCard.append?.(el.tempoLabel,el.tempoReason);el.root.appendChild(el.tempoCard);
    }
    // The HUD root size is read here and on resize, never per frame (a clientWidth read after the frame's style writes forces a synchronous layout).
    this.resize();
    if(typeof ResizeObserver==='function'&&el.root?.nodeType===1){this.sizeObserver=new ResizeObserver(()=>this.resize());this.sizeObserver.observe(el.root);}
  }
  /** Re-reads the HUD root size once (window resize / ResizeObserver). Fallback 16:9 while the root has no layout box. */
  resize(){const root=this.el.root;this.aspect=root?.clientWidth&&root?.clientHeight?root.clientWidth/root.clientHeight:16/9;return this.aspect;}
  dispose(){this.sizeObserver?.disconnect();this.sizeObserver=null;}
  /** kind: new (missão nova), continue (save carregado), restore (checkpoint reposto). */
  reset(kind='new',clock=0){
    this.clearSceneCues();
    this.kind=kind;this.baseline=kind==='new'?null:undefined;this.queue=[];this.banner=null;this.checkpointAt=-Infinity;this.checkpointName='';
    this.lastClock=clock;this.resumeAt=kind==='new'?-Infinity:clock;this.tempoSince=null;this.objectiveText=null;this.objectiveAt=-Infinity;this.lastHealth=null;
    this.announceCurrent=kind!=='new';this.resumeLines=null;
    this.hitAt=-Infinity;this.opacity('hitMarker',0);this.markerMemo=null;
  }
  /** Confirmed hit by the player's shot (player-shot hit:true) at mission clock `clock`. */
  hit(clock){this.hitAt=clock;}
  checkpoint(name,clock){this.checkpointAt=clock;this.checkpointName=name;}
  /** Repõe o DOM neutro (troca para a bancada francesa). */
  clearSceneCues(){
    const e=this.el;this.beatFrame=null;e.root?.classList.remove('scene-beats');
    for(const key of ['--scene-dim','--scene-shake'])e.root?.style?.removeProperty(key);
    if(e.sceneCue){e.sceneCue.textContent='';e.sceneCue.style.removeProperty('opacity');}
    for(const key of ['class:root:scene-beats','text:sceneCue','opacity:sceneCue'])this.cache.delete(key);
  }
  clear(){
    this.clearSceneCues();this.markerMemo=null;
    const e=this.el;this.cache.clear();
    e.root?.classList.remove('cinematic','m01');
    for(const k of ['interaction','subtitle','objective','objectiveStatus','titleCard','objectiveUpdate','resumeCard','checkpointName','markerLabel','markerDistance','tempoLabel','tempoReason'])if(e[k])e[k].textContent='';
    for(const k of ['objectiveMarker','tempoCard'])e[k]?.style?.removeProperty('opacity');e.root?.classList.remove('tempo-compressed');
    e.ammo?.classList.remove('low','empty');e.objectivePanel?.classList.remove('fresh');e.interaction?.classList.remove('show');e.subtitle?.classList.remove('show');
    for(const k of ['fade','lowHealth','titleCard','objectiveUpdate','resumeCard','checkpoint','hitMarker'])e[k]?.style.removeProperty('opacity');
    e.rounds?.classList.add('hidden');e.status?.classList.remove('health-full','health-low');
  }
  set(key,value,write){if(this.cache.get(key)===value)return false;this.cache.set(key,value);write(value);return true;}
  text(key,value){const node=this.el[key];if(node)this.set(`text:${key}`,value,v=>{node.textContent=v;});}
  opacity(key,value){const node=this.el[key];if(node)this.set(`opacity:${key}`,value.toFixed(3),v=>node.style.setProperty('opacity',v));}
  toggle(key,name,on){const node=this.el[key];if(node)this.set(`class:${key}:${name}`,Boolean(on),v=>node.classList.toggle(name,v));}
  node(tag,className,text){const n=this.doc.createElement(tag);if(className)n.className=className;n.textContent=text;return n;}
  update(sim){
    const clock=sim.clock,e=this.el,scene=sim.scene,cine=cinematicFrame(scene,sim.battleClock),defs=sim.definition.objectives;
    if(clock<this.lastClock-1e-6)this.reset('restore',clock);this.lastClock=clock;
    const beats=this.beatFrame=sceneBeatFrame(sim);
    this.toggle('root','m01',true);this.toggle('root','cinematic',cine.locked);
    this.toggle('root','scene-beats',beats.letterbox);this.text('sceneCue',beats.lookPrompt);this.opacity('sceneCue',beats.lookPrompt?1:0);
    e.root?.style?.setProperty('--scene-dim',String(1-beats.dimHud));e.root?.style?.setProperty('--scene-shake',`${beats.shake.toFixed(3)}px`);
    this.updateObjectives(sim,defs,clock,cine.locked);
    // Fade: preto das cenas fechadas e fade-in breve depois de continuar/restaurar.
    const resume=Number.isFinite(this.resumeAt)?1-ramp(clock,this.resumeAt,this.resumeAt+HUD_TIMING.resumeFade):0;
    this.opacity('fade',Math.max(cine.black,resume));
    this.updateCard('titleCard',cine.card,'cinema');
    this.updateResumeCard(sim,clock,cine.locked);
    // Estado da ameaça: o texto é exactamente o da simulação.
    this.text('objectiveStatus',sim.mission.status??'');
    this.text('clock',sim.clockLabel??clockText(sim.battleClock));   // R4: a new act shows only its approximate label (no exact hour without a source)
    this.updateMarker(this.markerFor(sim),cine.locked||beats.letterbox);
    this.updateTempo(sim.tempo??null,clock,cine.locked);
    this.updateInteraction(sim.interaction??'');
    this.updateSubtitle(sim.subtitle);
    this.opacity('subtitle',beats.subtitlePause?0:1);
    this.updateWeapon(sim);
    this.updateHealth(sim.player.health,clock);
    const at=this.checkpointAt,cp=Number.isFinite(at)?ramp(clock,at,at+.25)*(1-ramp(clock,at+HUD_TIMING.checkpoint-.6,at+HUD_TIMING.checkpoint)):0;
    this.opacity('hitMarker',cine.locked?0:hitMarkerOpacity(clock-this.hitAt));
    this.opacity('checkpoint',cine.locked?0:cp);this.text('checkpointName',this.checkpointName);
  }
  updateObjectives(sim,defs,clock,locked){
    const states={};for(const o of defs)states[o.id]={state:sim.objectives[o.id]?.state};
    if(this.baseline===undefined)this.baseline=states;
    const changes=objectiveChanges(this.baseline,states,defs);
    this.baseline=states;
    for(const change of changes){
      this.queue.push(change);
      // Um aviso ultrapassado sai já; os outros encurtam para não atrasar a ordem seguinte.
      if(this.banner)this.banner.until=Math.min(this.banner.until,change.id===this.banner.id?clock+.25:Math.max(clock+.5,this.banner.at+1));
    }
    if(this.announceCurrent&&!locked){
      this.announceCurrent=false;
      const active=defs.find(o=>o.required&&states[o.id].state==='active');
      if(active&&!this.queue.some(c=>c.id===active.id))this.queue.unshift({kind:'current',id:active.id,text:objectiveText(active),optional:false});
    }
    if(this.queue.length>4)this.queue.splice(0,this.queue.length-4);
    // Banner central: um de cada vez; espera o fim das cenas fechadas.
    const T=HUD_TIMING;
    if(this.banner&&clock>=this.banner.until)this.banner=null;
    if(!this.banner&&!locked&&this.queue.length){
      // Uma conclusão seguida do objectivo seguinte aparece num só aviso, sem atrasar a nova ordem.
      const next=this.queue.shift(),follow=next.kind==='done'&&this.queue[0]?.kind==='new'?this.queue.shift():null;
      const shown=follow?{...follow,completed:next.text}:next;this.banner={...shown,at:clock,until:clock+T.banner[shown.kind]};
    }
    if(this.banner){
      const b=this.banner,end=b.until,fade=Math.min(T.bannerOut,Math.max(.2,end-b.at-T.bannerIn));
      this.set('banner',`${b.kind}|${b.id}|${b.completed??''}`,()=>{
        const u=this.el.objectiveUpdate;if(!u)return;
        u.dataset&&(u.dataset.kind=b.kind);
        u.replaceChildren(...(b.completed?[this.node('span','objective-done',b.completed)]:[]),this.node('small','',bannerLabel(b)),this.node('strong','',b.text));
      });
      this.opacity('objectiveUpdate',locked?0:Math.min(ramp(clock,b.at,b.at+T.bannerIn),1-ramp(clock,end-fade,end)));
    }else this.opacity('objectiveUpdate',0);
    // Painel: mission.text completo no textContent; opcional numa segunda linha.
    const text=sim.mission.text??'',optional=defs.find(o=>!o.required&&states[o.id].state==='active');
    if(text!==this.objectiveText){this.objectiveText=text;this.objectiveAt=clock;}
    this.set('objective',text,()=>{
      const target=this.el.objective;if(!target)return;
      const {main,optional:opt}=splitObjective(text,optional?.text);
      target.replaceChildren(...[this.node('span','objective-main',main),...(opt?[this.node('span','objective-sep',' · '),this.node('span','objective-optional',opt)]:[])]);
    });
    this.toggle('objectivePanel','fresh',clock-this.objectiveAt<T.fresh&&!locked);
  }
  updateCard(key,data,className){
    const node=this.el[key];if(!node)return;
    this.set(`${key}:lines`,data?`${data.id}|${data.lines.join('|')}`:'',()=>node.replaceChildren(...(data?.lines??[]).map((line,i)=>this.node('span',`card-line card-line-${i}`,line))));
    this.opacity(key,data?data.opacity:0);
    if(data){
      // Máquina de escrever: revela os caracteres pelo relógio da simulação (largura fixa em ch, sem reflow).
      [...node.children].forEach((child,i)=>this.set(`${key}:chars:${i}`,typedChars(data.lines[i],i,data.elapsed),v=>child.style.setProperty('--chars',String(v))));
    }
    this.toggle(key,className,Boolean(data));
  }
  updateResumeCard(sim,clock,locked){
    const t=clock-this.resumeAt,active=!locked&&t>=0&&t<HUD_TIMING.resumeCard&&this.kind==='continue';
    const cp=sim.definition.checkpoints.find(c=>c.id===sim.checkpointsReached.at(-1));
    const head=sim.clockLabel?['Tczew — perímetro norte',`1 de setembro de 1939 · ${sim.clockLabel.toLowerCase()}`]:['Tczew — pontes do Vístula',`1 de setembro de 1939 · ${clockText(sim.battleClock).slice(0,5)}`];
    const data=active?card('resume',[...head,...(cp?[`${cp.label} · ${cp.name}`]:[])],
      Math.min(ramp(t,.3,.3+HUD_TIMING.cardFade),1-ramp(t,HUD_TIMING.resumeCard-.7,HUD_TIMING.resumeCard)),t-.3):null;
    // As linhas fixam-se no primeiro fotograma; o relógio da batalha continua a correr no HUD.
    if(data&&this.resumeLines)data.lines=this.resumeLines;else if(data)this.resumeLines=data.lines;
    if(!active)this.resumeLines=null;
    this.updateCard('resumeCard',data,'show');
  }
  /** sim.objectiveMarker runs the pacing target search (filter().sort() in some phases). Everything it reads changes only on a simulation tick,
   *  so it is evaluated once per (simulation, clock, player pose) instead of once per rendered frame. reset()/clear() drop the memo. */
  markerFor(sim){
    const p=sim.player,m=this.markerMemo;
    if(m&&m.sim===sim&&m.clock===sim.clock&&m.x===p?.x&&m.z===p?.z&&m.angle===p?.angle)return m.value;
    const value=sim.objectiveMarker??null;
    if(m){m.sim=sim;m.clock=sim.clock;m.x=p?.x;m.z=p?.z;m.angle=p?.angle;m.value=value;}
    else this.markerMemo={sim,clock:sim.clock,x:p?.x,z:p?.z,angle:p?.angle,value};
    return value;
  }
  updateMarker(marker,hidden){
    const node=this.el.objectiveMarker;if(!node)return;
    if(!marker||hidden){this.opacity('objectiveMarker',0);return;}
    const place=markerScreen(marker.bearing,this.aspect);
    this.set('marker:x',place.x.toFixed(4),v=>node.style?.setProperty('--marker-x',v));
    this.set('marker:side',place.side??'',v=>{if(node.dataset)node.dataset.side=v;});
    this.text('markerLabel',marker.label);this.text('markerDistance',`${Math.round(marker.distance)} m`);
    this.opacity('objectiveMarker',1);
  }
  updateTempo(tempo,clock,locked){
    const on=Boolean(tempo?.compressed)&&!locked;
    if(on&&this.tempoSince===null)this.tempoSince=clock;if(!on)this.tempoSince=null;
    this.toggle('root','tempo-compressed',on);
    this.text('tempoLabel',on?tempo.label:'');this.text('tempoReason',on?tempo.reason:'');
    // Card for the first seconds of each compression; the clock keeps its accelerated look (CSS) for the whole stretch.
    const t=on?clock-this.tempoSince:0;this.opacity('tempoCard',on?Math.min(ramp(t,0,.6),1-ramp(t,5,6.5)):0);
  }
  updateInteraction(text){
    this.set('interaction',text,()=>{
      const node=this.el.interaction;if(!node)return;const {key,action}=splitInteraction(text);
      node.replaceChildren(...(key?[this.node('kbd','',key),this.node('span','interaction-sep',' · ')]:[]),...(action?[this.node('span','interaction-action',action)]:[]));
    });
    this.toggle('interaction','show',Boolean(text));
  }
  updateSubtitle(subtitle){
    const text=subtitle?`${subtitle.speaker}: ${subtitle.text}`:'';
    this.set('subtitle',text,()=>{
      const node=this.el.subtitle;if(!node)return;
      node.replaceChildren(...(subtitle?[this.node('b','subtitle-speaker',`${subtitle.speaker}:`),this.node('span','subtitle-text',` ${subtitle.text}`)]:[]));
    });
    this.toggle('subtitle','show',Boolean(text));
  }
  updateWeapon(sim){
    const w=sim.weapon;
    this.text('weaponName','KARABINEK WZ.29');
    this.text('mag',w.reloading?'—':String(w.mag));this.text('reserve',String(w.reserve));
    this.text('weaponState',`Alça ${w.sight} m${w.boltCycling?' · ferrolho':w.reloading?' · a carregar':''}`);
    this.text('grenades',`Granadas ×${sim.grenades.ammo}`);
    this.toggle('ammo','empty',!w.reloading&&w.mag===0);this.toggle('ammo','low',w.mag+w.reserve<=10);
    const rounds=this.el.rounds;
    if(rounds){
      this.toggle('rounds','hidden',false);
      [...rounds.children].forEach((pip,i)=>this.set(`round:${i}`,i<w.mag,v=>pip.classList.toggle('spent',!v)));
    }
  }
  updateHealth(health,clock){
    const h=Math.ceil(health),e=this.el;
    this.text('health',String(h));
    if(e.healthBar)this.set('healthBar',h,v=>e.healthBar.style.setProperty('width',`${v}%`));
    this.toggle('status','health-full',h>=100);this.toggle('status','health-low',h<=35);
    const level=lowHealthLevel(health);
    // Pulsação lenta pelo relógio da simulação; parada na pausa.
    this.opacity('lowHealth',level?level*(.82+.18*Math.sin(clock*4.2)):0);
  }
  get diagnostics(){
    return {banner:this.banner?{kind:this.banner.kind,id:this.banner.id}:null,queued:this.queue.map(c=>`${c.kind}:${c.id}`),
      fade:Number(this.cache.get('opacity:fade')??0),checkpoint:Number(this.cache.get('opacity:checkpoint')??0),
      titleCard:this.cache.get('titleCard:lines')||null,resumeCard:this.cache.get('resumeCard:lines')||null,
      cinematic:Boolean(this.cache.get('class:root:cinematic')),sceneBeats:this.beatFrame??null,
      marker:Number(this.cache.get('opacity:objectiveMarker')??0)>0?{label:this.cache.get('text:markerLabel'),x:Number(this.cache.get('marker:x')),side:this.cache.get('marker:side')||null}:null,
      tempo:Boolean(this.cache.get('class:root:tempo-compressed'))};
  }
}
