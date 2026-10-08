import { Game } from './game/game.js';
import './styles.css';

const $=selector=>document.querySelector(selector);
const canvas=$('#game'),menu=$('#menu'),pause=$('#pause'),hudRoot=$('#hud'),complete=$('#complete'),errorPanel=$('#error');
const hud={health:$('#health'),healthBar:$('#health-bar'),grenades:$('#grenades'),mag:$('#mag'),reserve:$('#reserve'),
  objective:$('#objective-text'),objectiveStatus:$('#objective-status'),message:$('#message'),checkpoint:$('#checkpoint'),vignette:$('#damage-vignette'),
  weaponName:$('#weapon-name'),weaponState:$('#weapon-state'),clock:$('#battle-clock'),interaction:$('#interaction'),subtitle:$('#subtitle'),crosshair:$('#crosshair'),
  root:hudRoot,objectivePanel:$('#objective'),objectiveUpdate:$('#objective-update'),checkpointName:$('#checkpoint-name'),status:$('#status'),ammo:$('#ammo'),
  rounds:$('#rounds'),lowHealth:$('#low-health'),fade:$('#fade'),titleCard:$('#title-card'),resumeCard:$('#resume-card')};
let game;
const showError=message=>{$('#error-text').textContent=message;errorPanel.classList.remove('hidden');};
function stateChanged(state,detail){
  if(state==='menu'){
    menu.classList.remove('hidden');pause.classList.add('hidden');complete.classList.add('hidden');hudRoot.classList.add('hidden');
    $('#continue').classList.toggle('hidden',!game.hasSave);return;
  }
  if(state==='playing'){pause.classList.add('hidden');complete.classList.add('hidden');hudRoot.classList.remove('hidden');}
  if(state==='paused'||state==='control-error'){
    pause.classList.remove('hidden');
    $('#pause-text').textContent=state==='control-error'?'O Chrome não capturou o rato. Clique em Retomar para tentar novamente.':'A batalha está em pausa. Retome quando estiver pronto.';
    const objective=game.isM01&&game.sim.scene?.id!=='cs_m01_intro'&&game.sim.scene?.id!=='cs_m01_roll_call'?game.sim.mission.text:'';
    $('#pause-objective').textContent=objective?`Objectivo: ${objective}`:'';
  }
  if(state==='save-error'){showError(`Não foi possível abrir o checkpoint: ${detail} Pode iniciar uma nova missão.`);menu.classList.remove('hidden');}
  if(state==='complete'){
    pause.classList.add('hidden');complete.classList.remove('hidden');hudRoot.classList.add('hidden');
    $('#complete-place').textContent=game.isM01?game.sim.definition.debrief.title:'COMUNICAÇÕES RESTABELECIDAS';
    $('#debrief').replaceChildren();
    const paragraphs=game.isM01?game.sim.renderState.debrief.map(p=>p.text):['O rádio está activo. A patrulha aguarda a próxima ordem.'];
    for(const text of paragraphs){const p=document.createElement('p');p.textContent=text;$('#debrief').append(p);}
  }
}
function missionMenu(){
  const m01=game.isM01;$('#mission-select').value=m01?'m01_tczew':'sandbox-1944';
  $('#mission-place').textContent=m01?'POLÓNIA · 1 SETEMBRO 1939':'FRANÇA · 1944';
  $('#mission-title').innerHTML=m01?'A PRIMEIRA<br><span>MANHÃ</span>':'ESTRADA<br><span>DE CINZAS</span>';
  $('#mission-briefing').textContent=m01?'Tczew, 04:30. Leve a mensagem ao posto da ponte. Mantenha contacto com a secção e cubra os sapadores.':'O posto avançado deixou de responder. Atravesse a aldeia com a patrulha e restabeleça as comunicações na capela.';
  $('#mission-note').textContent=m01?'AS PONTES DO VÍSTULA':'COMUNICAÇÕES INTERROMPIDAS';
  $('#mission-status').textContent=m01?'PROTÓTIPO · MODELOS E ÁUDIO PROVISÓRIOS':'BANCADA FICCIONAL · FRANÇA, 1944';
  $('#continue').classList.toggle('hidden',!game.hasSave);
  $('#start').disabled=false;$('#continue').disabled=false;
  if(m01){
    $('#start').disabled=true;$('#continue').disabled=true;
    game.renderer.m01.ready.then(()=>{
      if(!game.isM01)return;
      const failed=game.renderer.m01.diagnostics.requiredAssetFailures.length;
      $('#start').disabled=Boolean(failed);$('#continue').disabled=Boolean(failed);
      if(failed)showError('Não foi possível carregar as pontes de Tczew. Recarregue a página para tentar novamente. A bancada francesa continua disponível no selector de missão.');
    });
  }
}
try{
  const params=new URLSearchParams(location.search);
  game=new Game(canvas,hud,stateChanged,params.get('mission')==='sandbox-1944'?'sandbox-1944':'m01_tczew');
  missionMenu();
  $('#mission-select').addEventListener('change',e=>{game.selectMission(e.target.value);missionMenu();});
  $('#start').addEventListener('click',()=>{
    menu.classList.add('hidden');errorPanel.classList.add('hidden');hudRoot.classList.remove('hidden');
    game.restartMission();
  });
  $('#continue').addEventListener('click',()=>{
    menu.classList.add('hidden');errorPanel.classList.add('hidden');hudRoot.classList.remove('hidden');
    game.start({continueSaved:true});
  });
  $('#resume').addEventListener('click',()=>game.resume());
  $('#restart-checkpoint').addEventListener('click',()=>game.restartCheckpoint());
  $('#back-menu').addEventListener('click',()=>game.menu());
  $('#replay').addEventListener('click',()=>{complete.classList.add('hidden');hudRoot.classList.remove('hidden');game.restartMission();});
  $('#complete-menu').addEventListener('click',()=>game.menu());
  $('#quality').value=game.renderer.quality;
  $('#quality').addEventListener('change',e=>{game.renderer.setQuality(e.target.value);game.audio.setQuality(e.target.value);try{localStorage.setItem('cod-guerra:visual-quality',e.target.value);}catch{}});
  $('#volume').addEventListener('input',e=>game.audio.setVolume(e.target.value));
  $('#close-error').addEventListener('click',()=>errorPanel.classList.add('hidden'));
  // A persisted page retains its WebGL/audio objects and resumes via the usual
  // pause controls after Back. Only a real unload destroys the game.
  window.addEventListener('pagehide',event=>{if(event.persisted)game.pause();else game.dispose();});
  // Read-only debug information, opt-in. No state mutation or exposed gameplay instance.
  if(new URLSearchParams(location.search).has('debug'))window.gameDiagnostics=()=>game.diagnostics;
  if(params.has('debug')&&params.has('visual-verify'))window.gameVerificationState=()=>structuredClone({snapshot:game.sim.snapshot(),checkpoint:game.sim.checkpoint,events:game.sim.events});
}catch(error){showError(error.message);$('#start').disabled=true;$('#continue').disabled=true;}
