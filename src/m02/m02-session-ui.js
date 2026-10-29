import {m02ObjectivePresentation} from './m02-objective-presentation.js';
import {m02DamageIndicator} from '../render/m02-presentation.js';
export function mountM02SessionUi(session,renderer){
 const root=document.createElement('section');root.id='mission-menu';root.setAttribute('aria-label','Menu da missão');
 root.innerHTML=`<div class="menu-card"><p class="eyebrow">POLÓNIA · SETEMBRO DE 1939</p><h1>Batalha do Bzura</h1><p id="session-status">A preparar a missão…</p><div class="menu-actions"><button id="mission-start">Iniciar missão</button><button id="mission-continue">Continuar</button><button id="mission-resume">Retomar</button><button id="mission-epilogue-next">Continuar</button><button id="mission-restart">Reiniciar checkpoint</button></div><label>Qualidade <select id="mission-quality"><option value="high">Máxima</option><option value="medium" selected>Equilibrada</option><option value="low">Leve</option></select></label><label>Volume <input id="mission-volume" type="range" min="0" max="1" step=".05" value=".68"></label><label><input id="mission-shake" type="checkbox"> Reduzir movimento da câmara</label><label><input id="mission-subtitles" type="checkbox"> Legendas</label><label><input id="mission-direction-toggle" type="checkbox"> Indicação de dano</label><p class="controls-help">WASD · mover &nbsp; Shift · correr &nbsp; C · agachar<br>Rato · olhar &nbsp; Clique · disparar &nbsp; V / botão direito · apontar<br>R · recarregar &nbsp; G · granada &nbsp; E · interagir<br>Na quinta: Z · suprimir &nbsp; X · avançar &nbsp; B · flanquear<br>Esc · pausa</p><p id="session-message" role="status"></p></div>`;
 document.body.append(root);
 const vitals=document.createElement('div');vitals.id='mission-vitals';vitals.innerHTML='<span id="mission-condition"></span><span id="mission-bearing"></span>';document.body.append(vitals);
 const hit=document.createElement('div');hit.id='mission-hit';document.body.append(hit);
 const direction=document.createElement('div');direction.id='mission-direction';direction.setAttribute('aria-hidden','true');document.body.append(direction);
 const orderNotice=document.createElement('div');orderNotice.id='mission-order';orderNotice.hidden=true;orderNotice.setAttribute('role','status');
 document.getElementById('hud-objective').after(orderNotice);

 const start=root.querySelector('#mission-start'),cont=root.querySelector('#mission-continue'),resume=root.querySelector('#mission-resume'),restart=root.querySelector('#mission-restart');
 const epilogueNext=root.querySelector('#mission-epilogue-next');epilogueNext.onclick=()=>session.nextEpilogue();
 const lock=()=>{document.getElementById('m02-canvas').requestPointerLock?.()?.catch?.(()=>{});};
 start.onclick=()=>{session.start();lock();};cont.onclick=()=>{if(session.continue())lock();};resume.onclick=()=>{session.resume();lock();};restart.onclick=()=>{session.restart();lock();};
 root.querySelector('#mission-quality').value=renderer.qualityProfile.id;
 root.querySelector('#mission-quality').onchange=e=>renderer.applyQualityProfile(e.target.value);
 root.querySelector('#mission-volume').oninput=e=>renderer.presentation.audio.setVolume(e.target.value);
 root.querySelector('#mission-shake').onchange=e=>session.sim.setAccessibilityOptions({reducedCameraShake:e.target.checked});
 root.querySelector('#mission-subtitles').onchange=e=>session.sim.setAccessibilityOptions({subtitlesEnabled:e.target.checked});
 root.querySelector('#mission-direction-toggle').onchange=e=>session.sim.setAccessibilityOptions({directionalIndicatorsEnabled:e.target.checked});
 let ready=false;
 Promise.all([renderer.presentation.ready,renderer.environment.ready,renderer.environment.terrain.ready,renderer.cargo.ready]).then(()=>{ready=true;});
 return ()=>{
   root.hidden=session.playing;
   if(!session.playing && document.pointerLockElement)document.exitPointerLock();
   vitals.hidden=!session.playing;hit.hidden=!session.playing;
   root.querySelector('#mission-quality').value=renderer.qualityProfile.id;
   const sim=session.sim,health=sim.player.health;
   const order=sim.squadOrder,age=sim.clock-(order?.issuedAt??-Infinity);
   const orderLabels={suppress:'Secção: segurar e suprimir',advance:'Secção: avançar',flank_east:'Secção: flanquear pelo pomar'};
   orderNotice.hidden=!session.playing||sim.activeCellId!=='A'||sim.c01Active||!orderLabels[order?.type]||age<0||age>=4;
   const orderText=orderLabels[order?.type]??'';if(orderNotice.textContent!==orderText)orderNotice.textContent=orderText;
   const accessibility=sim.audiovisual.accessibility;
   root.querySelector('#mission-shake').checked=accessibility.reducedCameraShake;
   root.querySelector('#mission-subtitles').checked=accessibility.subtitlesEnabled;
   root.querySelector('#mission-direction-toggle').checked=accessibility.directionalIndicatorsEnabled;
   vitals.querySelector('#mission-condition').textContent=health>60?'Em condições':health>25?'Ferido':'Ferimento grave';
   const hitFeedback=renderer.presentation.feedback.sample(sim.clock,renderer.qualityProfile.id);
   hit.style.opacity=String(Math.max(health<40?(40-health)/90:0,hitFeedback.overlayAlpha));
   const indicator=m02DamageIndicator(renderer.presentation.damageSource,sim.player,sim.clock,accessibility.directionalIndicatorsEnabled);
   direction.hidden=!session.playing||!indicator;
   if(indicator){direction.style.transform=`translate(-50%,-50%) rotate(${indicator.angle}rad)`;direction.style.opacity=String(indicator.opacity);}
   const objective=m02ObjectivePresentation(sim),point=objective.point;
   if(point){const dx=point[0]-sim.player.x,dz=point[1]-sim.player.z,angle=Math.atan2(dz,dx)-sim.player.angle;
    vitals.querySelector('#mission-bearing').textContent=`${Math.abs(angle)% (Math.PI*2)<.4?'↑':Math.sin(angle)>0?'→':'←'} ${Math.round(Math.hypot(dx,dz))} m · objetivo`;
   }

   document.body.classList.toggle('mission-paused',!session.playing);
   epilogueNext.hidden=session.state!=='epilogue';
   start.disabled=!ready;
   start.hidden=!['menu','debrief'].includes(session.state);
   cont.hidden=session.state!=='menu'||!session.saveAvailable;
   resume.hidden=session.state!=='paused';restart.hidden=!['paused','dead'].includes(session.state);
   const lisLabels={wounded_walking:'ferido, a caminhar',wounded_evacuated:'evacuado',missing:'desaparecido',active:'com a secção'};
   const labels={menu:'A ofensiva começa numa estrada coberta de orvalho. Siga Gruca, proteja a secção e mantenha aberto o caminho dos feridos.',paused:'Missão em pausa',dead:'Piotr caiu. Retome o último checkpoint.',debrief:`M02 terminada · ${session.sim.areaC?.lastGroup.filter(a=>a.evacuated&&a.alive).length??0}/12 homens atravessaram. Lis: ${lisLabels[session.sim.flags['m02.lis_status']]??'desconhecido'}.`};
   if(session.state==='epilogue'){const lis=session.sim.flags['m02.lis_status'];labels.epilogue=session.epilogueIndex<2?session.sim.areaC.epilogueCartelas[session.epilogueIndex]:lis==='missing'?'Wierzba: «Lis…»': 'Lis: «Guarda um pouco de água. Todos precisam.»';}
   root.querySelector('#session-status').textContent=ready?labels[session.state]??'': 'A carregar modelos, animações e cenário…';
   root.querySelector('#session-message').textContent=session.message;
 };
}
