import { Game } from './game/game.js';
import './styles.css';

const $=selector=>document.querySelector(selector);
const canvas=$('#game'),menu=$('#menu'),pause=$('#pause'),hudRoot=$('#hud'),complete=$('#complete'),errorPanel=$('#error');
const hud={health:$('#health'),healthBar:$('#health-bar'),grenades:$('#grenades'),mag:$('#mag'),reserve:$('#reserve'),
  objective:$('#objective-text'),message:$('#message'),checkpoint:$('#checkpoint'),vignette:$('#damage-vignette')};
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
  }
  if(state==='save-error'){showError(`Não foi possível abrir o checkpoint: ${detail} Pode iniciar uma nova missão.`);menu.classList.remove('hidden');}
  if(state==='complete'){pause.classList.add('hidden');complete.classList.remove('hidden');hudRoot.classList.add('hidden');}
}
try{
  game=new Game(canvas,hud,stateChanged);
  $('#continue').classList.toggle('hidden',!game.hasSave);
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
  $('#quality').addEventListener('change',e=>game.renderer.setQuality(e.target.value));
  $('#volume').addEventListener('input',e=>game.audio.setVolume(e.target.value));
  $('#close-error').addEventListener('click',()=>errorPanel.classList.add('hidden'));
  window.addEventListener('pagehide',()=>game.dispose(),{once:true});
  // Read-only debug information, opt-in. No state mutation or exposed gameplay instance.
  if(new URLSearchParams(location.search).has('debug'))window.gameDiagnostics=()=>game.diagnostics;
}catch(error){showError(error.message);$('#start').disabled=true;$('#continue').disabled=true;}
