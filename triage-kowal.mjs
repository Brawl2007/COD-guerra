import {M01Simulation} from './src/game/m01-simulation.js';
import {driver,toRepair} from './tests/helpers/m01-route.js';
const t0=Date.now();
const d=toRepair(driver());d.walk(-115,32);d.walk(-74,30);d.step({crouch:true});
d.until(()=>d.sim.actor('szymon_kowal').rounds===2,240);
const k=d.sim.actor('szymon_kowal'),p=d.sim.player,angle=Math.atan2(k.z-p.z,k.x-p.x);
d.step({lookX:Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle))/.0022});
console.log('staging ms',Date.now()-t0,'sim clock',d.sim.clock.toFixed(2));
const snapshot=d.sim.snapshot();
const sim=new M01Simulation();sim.restoreSnapshot(snapshot);
const c0=sim.clock;let burstAt=null,reloadAt=null;
for(let i=0;i<4000;i++){
  sim.tick(.05,{});
  const a=sim.actor('szymon_kowal'),age=sim.clock-a.firedAt;
  if(burstAt===null&&Number.isFinite(age)&&age>=0&&age<.8)burstAt=+(sim.clock-c0).toFixed(2);
  if(reloadAt===null&&a.rounds===20&&a.cooldown>0&&age>=.8&&age<4.2){reloadAt=+(sim.clock-c0).toFixed(2);break;}
}
console.log(JSON.stringify({burstAt,reloadAt,rounds:sim.actor('szymon_kowal').rounds}));
