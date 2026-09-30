import { Game } from './game/game.js';
const canvas=document.querySelector('#game'),menu=document.querySelector('#menu'),pause=document.querySelector('#pause'),hudRoot=document.querySelector('#hud');
const hud={health:document.querySelector('#health'),healthBar:document.querySelector('#health-bar'),grenades:document.querySelector('#grenades'),mag:document.querySelector('#mag'),reserve:document.querySelector('#reserve'),objective:document.querySelector('#objective-text'),message:document.querySelector('#message'),checkpoint:document.querySelector('#checkpoint'),vignette:document.querySelector('#damage-vignette')};
const game=new Game(canvas,hud);
document.querySelector('#start').addEventListener('click',()=>{menu.classList.add('hidden');hudRoot.classList.remove('hidden');game.start();});
canvas.addEventListener('click',()=>canvas.requestPointerLock());
document.addEventListener('pointerlockchange',()=>{if(!menu.classList.contains('hidden'))return;pause.classList.toggle('hidden',document.pointerLockElement===canvas);});
