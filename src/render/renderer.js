import { CONFIG } from '../config.js';
import { normalizeAngle, distance } from '../core/math.js';

export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.depth=new Float32Array(canvas.width);this.shake=0;}
  resize(){const dpr=Math.min(devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;this.canvas.width=w*dpr;this.canvas.height=h*dpr;this.canvas.style.width=`${w}px`;this.canvas.style.height=`${h}px`;this.depth=new Float32Array(this.canvas.width);}
  render(world,player,actors,radio,time){const {ctx}=this,{width:w,height:h}=this.canvas;ctx.save();const shake=this.shake?Math.sin(time*.09)*this.shake:0;ctx.translate(0,shake);this.shake=Math.max(0,this.shake-.8);
    const sky=ctx.createLinearGradient(0,0,0,h*.55);sky.addColorStop(0,'#30373b');sky.addColorStop(1,'#89908b');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h*.55);ctx.fillStyle='#3d3c32';ctx.fillRect(0,h*.55,w,h*.45);
    const rays=Math.ceil(w/3),strip=w/rays,plane=(w/2)/Math.tan(CONFIG.fov/2);if(this.depth.length!==rays)this.depth=new Float32Array(rays);
    for(let i=0;i<rays;i++){const offset=(i/rays-.5)*CONFIG.fov,hit=world.raycast(player.x,player.y,player.angle+offset,900),corrected=hit.distance*Math.cos(offset),wallH=Math.min(h*1.8,CONFIG.tile/corrected*plane);this.depth[i]=corrected;const fog=Math.max(25,145-corrected*.13),brick=(Math.floor(hit.x/16)+Math.floor(hit.y/16))%2*9;ctx.fillStyle=`rgb(${fog+brick},${fog+brick-8},${fog+brick-18})`;ctx.fillRect(i*strip,h/2-wallH/2,strip+1,wallH);ctx.fillStyle=`rgba(20,20,15,${Math.min(.5,corrected/1000)})`;ctx.fillRect(i*strip,h/2-wallH/2,strip+1,wallH);}
    this.drawSprites(player,[...actors.filter(a=>a.alive),{...radio,team:'radio',alive:true}],plane);
    this.drawWeapon(w,h,time);ctx.restore();
  }
  drawSprites(player,actors,plane){const {ctx}=this,{width:w,height:h}=this.canvas;const sorted=[...actors].sort((a,b)=>distance(b,player)-distance(a,player));for(const a of sorted){const d=distance(player,a),rel=normalizeAngle(Math.atan2(a.y-player.y,a.x-player.x)-player.angle);if(Math.abs(rel)>CONFIG.fov*.65)continue;const screenX=w/2+Math.tan(rel)*plane, size=Math.min(h*1.3,(a.team==='radio'?45:68)/d*plane),ray=Math.floor(screenX/(w/this.depth.length));if(d>(this.depth[ray]??Infinity)+20)continue;const y=h/2-size*.55;
      if(a.team==='radio'){ctx.fillStyle='#282b25';ctx.fillRect(screenX-size*.35,y,size*.7,size*.7);ctx.strokeStyle='#111';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(screenX,y);ctx.lineTo(screenX+size*.4,y-size*.7);ctx.stroke();continue;}
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(screenX,h/2+size*.48,size*.35,size*.1,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=a.flash?'#fff3d1':a.team==='enemy'?'#535846':'#6f745d';ctx.fillRect(screenX-size*.22,y+size*.25,size*.44,size*.62);ctx.fillStyle=a.team==='enemy'?'#32352c':'#767d68';ctx.beginPath();ctx.arc(screenX,y+size*.19,size*.2,Math.PI,0);ctx.fill();ctx.fillStyle='#bd9c79';ctx.fillRect(screenX-size*.12,y+size*.17,size*.24,size*.18);ctx.fillStyle='#25251f';ctx.fillRect(screenX+size*.12,y+size*.42,size*.5,size*.07);ctx.fillStyle=a.team==='enemy'?'#70443a':'#435a69';ctx.fillRect(screenX-size*.18,y+size*.87,size*.14,size*.3);ctx.fillRect(screenX+size*.04,y+size*.87,size*.14,size*.3);}
  }
  drawWeapon(w,h,time){const {ctx}=this;const bob=Math.sin(time*.008)*3;ctx.fillStyle='#29302d';ctx.beginPath();ctx.moveTo(w*.57,h);ctx.lineTo(w*.54,h*.78+bob);ctx.lineTo(w*.62,h*.7+bob);ctx.lineTo(w*.75,h);ctx.fill();ctx.fillStyle='#5d412a';ctx.fillRect(w*.58,h*.79+bob,w*.14,h*.07);ctx.fillStyle='#171b19';ctx.fillRect(w*.49,h*.72+bob,w*.2,h*.055);ctx.fillRect(w*.49,h*.71+bob,w*.025,h*.03);}
}
