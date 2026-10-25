// M01 R1-b: the pilots of the opening (04:30 to the first bombs), shared by the metrics tool and the capture spec. They drive ANY tree's simulation (a `sim` with tick / player / drainEvents) through
// the player's own controls only; nothing is injected, so the same pilot runs the tree before a change and the tree after it.
//   fast     the golden route's opening: the intro is skipped, the player sprints to the forward post (tests/helpers/m01-route.js toRepair), delivers the message and goes on to the rally.
//   rush     the intro is watched (it is skippable but is what a first-time player sees), then he sprints to the forward post and delivers the message at once.
//   witness  (the captures' own) the intro is watched, then he stays among the men to the first bombs: the post, the strip with the camp, the garrison line.
//   tourist  the intro is watched in full, he looks at the section at the post, walks (no sprint) to the sappers' camp and watches them, then along the rails to the forward post where he waits,
//            looking east, for the planes; he delivers the message after the planes are heard and stays there through the first bombs; then he goes to the rally.
// `observe(sim, events)` is called after every tick with the events that tick drained. Returns when the battle clock has reached 04:35:00.
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const seconds=text=>text.split(':').map(Number).reduce((n,x)=>n*60+x,0);
export const OPENING_PILOTS=Object.freeze(['fast','rush','tourist']);   // (the metrics' three; 'witness' is the captures' own: it stays among the men)
/** The stations of the tourist, for the captures: [battle clock he is there from, label]. The view each one looks at is in the pilot. */
export function openingPilot(sim,kind,observe=null){
  const step=(controls={})=>{sim.tick(.05,controls);observe?.(sim,sim.drainEvents());};
  const walk=(x,z,{sprint=true,limit=150}={})=>{
    for(let i=0;i<limit*20;i++){
      const p=sim.player,dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<1.2)return;
      step({lookX:wrap(Math.atan2(dz,dx)-p.angle)/.0022,forward:1,sprint});
    }
    throw new Error(`blocked on the way to ${x},${z}`);
  };
  // He stands and looks at a point (yaw and, when given, the pitch towards a height) for `sec` s of game time, or until a battle clock.
  const look=(at,{pitch=null}={})=>{
    const p=sim.player,yaw=wrap(Math.atan2(at.z-p.z,at.x-p.x)-p.angle)/.0022;
    let lookY=0;if(pitch!==null)lookY=-(pitch-p.pitch)/.0022;
    step({lookX:yaw,lookY});
  };
  const wait=(sec,at=null,opts)=>{for(let i=0;i<sec*20;i++){if(at)look(at,opts);else step({});}};
  const untilBattle=(text,at=null,opts)=>{for(let i=0;i<20*400&&sim.battleClock<seconds(text);i++){if(at)look(at,opts);else step({});}};
  const intro=()=>{for(let i=0;i<46*20&&sim.scene;i++)step({});};
  const rally=()=>{walk(-30,2);walk(-30,11);walk(-147,11);untilBattle('04:35:00');};
  if(kind==='fast'){
    step({skip:true});
    walk(-66,26);walk(-30,26);walk(-30,2);walk(16,2);step({interact:true});
    rally();
  }else if(kind==='rush'){
    intro();
    walk(-66,26);walk(-30,26);walk(-30,2);walk(16,2);step({interact:true});
    rally();
  }else if(kind==='tourist'){
    intro();
    untilBattle('04:31:10',{x:-74,z:21.5});                         // at the post, turns to the section behind him (map, rkm, coffee, telephone, cigarette)
    walk(-52,15,{sprint:false});untilBattle('04:32:05',{x:-44,z:10.5});   // along the strip to the sappers' camp (the cable inspection) and the garrison men; he watches them
    wait(14,{x:-44,z:10.5});
    walk(-30,2,{sprint:false});walk(16,2,{sprint:false});             // up the embankment, along the rails to the forward post
    untilBattle('04:33:22',{x:60,z:3},{pitch:.12});                    // waits looking east for the planes
    step({interact:true});wait(1,{x:60,z:3},{pitch:.12});
    untilBattle('04:34:40',{x:60,z:3},{pitch:.12});
    rally();
  }else if(kind==='witness'){
    // He stays among the men until after the first bombs (the evidence captures look from here): the post, the strip with the sappers' camp and the garrison, the garrison line where the planes are heard.
    intro();
    untilBattle('04:31:10',{x:-74,z:21.5});                         // at the post, turns to the section behind him
    walk(-53,15,{sprint:false});untilBattle('04:32:50',{x:-44,z:10.5});   // the strip: the sappers' camp, the garrison, the runner
    walk(-62,25,{sprint:false});untilBattle('04:33:55',{x:-48,z:20});     // beside the garrison line, looking along it: the planes are heard here
    untilBattle('04:34:40',{x:-48,z:18},{pitch:.1});                      // the first bombs
    walk(-30,26,{sprint:false});rally();
  }else throw new Error(`pilot ${kind}`);
}
