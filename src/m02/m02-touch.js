import {TouchState, bindTouchControls} from '../core/touch-controls.js';
import './m02-touch.css';

// The M01 touch mapper feeds the same M02 controls as keyboard and mouse.
export function mountM02Touch({sim, session, actions}) {
 const root=document.createElement('div');root.id='m02-touch';root.hidden=true;
 root.innerHTML=`<div class="touch-look" data-touch="look" aria-label="Arrastar para olhar"></div>
 <div class="touch-move" data-touch="move" aria-label="Arrastar para mover"><span class="touch-knob">MOVER</span></div>
 <div class="touch-actions"><button data-touch="interact">USAR</button><button data-touch="reload">RECARGA</button><button data-touch="grenade">GRANADA</button><button data-touch="crouch">AGACHAR</button><button data-touch="aim">MIRAR</button><button class="touch-fire" data-touch="fire">DISPARAR</button></div>
 <div class="touch-orders"><button data-order="orderSuppress">SEGURAR</button><button data-order="orderAdvance">AVANÇAR</button><button data-order="orderFlank">FLANQUEAR</button></div>
 <button class="touch-water" data-water hidden>ÁGUA</button>
 <button class="touch-pause" data-touch="pause" aria-label="Pausar">PAUSA</button>`;
 document.body.append(root);
 const input={forward:0,side:0,sprint:false,aim:false,
  setMove(side,forward,sprint){this.side=side;this.forward=forward;this.sprint=sprint;},
  addLook(dx,dy){if(!session.playing)return;sim.player.angle+=dx*.0024;sim.player.pitch=Math.max(-1.3,Math.min(1.3,sim.player.pitch-dy*.0022));},
  setFire(on){if(on)actions.fire=true;},
  tap(code){const names={KeyR:'reload',KeyG:'grenade',KeyE:'interact',KeyC:'crouch'};if(names[code])actions[names[code]]=true;},
  clear(){this.forward=0;this.side=0;this.sprint=false;this.aim=false;for(const key of Object.keys(actions))actions[key]=false;}
 };
 const state=new TouchState(input,{onPause:()=>session.pause()});bindTouchControls(root,state);
 const stick=root.querySelector('.touch-move'),knob=stick.querySelector('.touch-knob');let stickPointer=null,origin=null;
 const resetStick=()=>{stickPointer=null;origin=null;knob.style.transform='';stick.classList.remove('down');};
 stick.addEventListener('pointerdown',e=>{if(stickPointer===null){stickPointer=e.pointerId;origin={x:e.clientX,y:e.clientY};}});
 stick.addEventListener('pointermove',e=>{if(e.pointerId!==stickPointer||!origin)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y,scale=Math.min(1,28/(Math.hypot(dx,dy)||1));knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===stickPointer)resetStick();});
 for(const event of ['blur','orientationchange'])window.addEventListener(event,resetStick);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)resetStick();});
 for(const button of root.querySelectorAll('[data-order]'))button.addEventListener('pointerdown',e=>{e.preventDefault();if(session.playing)actions[button.dataset.order]=true;});
 const water=root.querySelector('[data-water]');water.addEventListener('pointerdown',e=>{e.preventDefault();if(session.playing)actions.giveWater=true;});
 return {input,update(){const playing=session.playing;root.hidden=!playing;water.hidden=!playing||!sim.currentWoundedWaterPrompt();if(state.active!==playing){state.setActive(playing);if(!playing){resetStick();root.querySelectorAll('.down').forEach(el=>el.classList.remove('down'));}}}};
}
