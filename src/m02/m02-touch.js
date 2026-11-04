import {TouchState, bindTouchControls} from '../core/touch-controls.js';
import './m02-touch.css';

// The M01 touch mapper feeds the same M02 controls as keyboard and mouse.
export function mountM02Touch({sim, session, actions}) {
 const root=document.createElement('div');root.id='m02-touch';root.hidden=true;
 root.innerHTML=`<div class="touch-look" data-touch="look" aria-label="Arrastar para olhar"></div>
 <div class="touch-move" data-touch="move" aria-label="Arrastar para mover"><span>MOVER</span></div>
 <div class="touch-actions"><button data-touch="interact">USAR</button><button data-touch="reload">MUNIÇÃO</button><button data-touch="grenade">GRANADA</button><button data-touch="crouch">AGACHAR</button><button data-touch="aim">MIRAR</button><button class="touch-fire" data-touch="fire">DISPARAR</button></div>
 <div class="touch-orders"><button data-order="orderSuppress">SEGURAR</button><button data-order="orderAdvance">AVANÇAR</button><button data-order="orderFlank">FLANQUEAR</button></div>
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
 for(const button of root.querySelectorAll('[data-order]'))button.addEventListener('pointerdown',e=>{e.preventDefault();if(session.playing)actions[button.dataset.order]=true;});
 return {input,update(){const playing=session.playing;root.hidden=!playing;if(state.active!==playing)state.setActive(playing);}};
}
