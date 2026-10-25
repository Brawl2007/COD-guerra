// M01 opening life, presentation (R1-b, 2026-10-25): what each man of Act I is doing, drawn with the clips of the T08 library (no clip is authored here) and, where no clip has the hands where the act needs
// them (the binoculars at the eyes, the cigarette at the mouth, the handset at the ear, the map at the chest, the hands in the ammunition box), with a procedural pose: a forward lean of the torso, a tilt of the
// head and two-bone arm IK to targets, solved on top of the clip by m01-opening-ik.js. This module is pure: no THREE, no renderer object, no random number, no wall clock; the same (actor.act, sim clock)
// gives the same clip, the same hand targets and the same props. The simulation decides what a man does (src/game/m01-opening.js: actor.act = {k, at, until, s, ...}); nothing here decides anything.
//
// Frames. A hand target is {a, o, w, p}: `a` the anchor (a bone of the rig, or `root`, the point on the ground under him), `o` the offset from it in metres along the soldier's own axes [right, up, forward]
// (so it turns with him), `w` the IK weight 0..1 (a pose eased in and out), `p` where the elbow points, [right, up, forward] metres from the shoulder. The point act aims at a world direction instead:
// {a:'shoulder', dir:[x, y, z], len, w}. `lean` is the forward bend of the torso in radians, `head` the head's pitch (positive looks up).
import {OPENING_ACTS} from '../game/m01-opening.js';

/** The clips the opening needs from the library (tests/m01-opening-pose.test.js checks that every one is in the T08 manifests). */
export const OPENING_POSE_CLIPS=Object.freeze(['standing_idle','standing_idle_b','standing_idle_c','crouched_idle','call_out','fidget_check_rifle','sapper_work','rkm_clean','rkm_crouched_idle','rkm_standing_idle',
  'crouched_idle_b']);
const has=(clips,name)=>!clips||typeof clips.has!=='function'||clips.size===0||clips.has(name);
const clamp01=x=>x<0?0:x>1?1:x;
const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};
const unit=(seed,salt)=>{let h=(seed^Math.imul(salt+1,0x9e3779b1))>>>0;h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;return (h>>>0)/4294967296;};

/** Seconds into the act, and seconds left of it (the ease out of a pose that is about to end). */
const tOf=(act,time)=>Math.max(0,time-act.at),leftOf=(act,time)=>act.until-time;
/** The ease of a held pose: in over `inSec` from the start of the act, out over `outSec` before its end. */
const ease=(act,time,inSec=.7,outSec=.6)=>Math.min(smooth(tOf(act,time)/inSec),smooth(leftOf(act,time)/outSec));
/** The acts that put both hands to work: the rifle is slung while they last (the renderer hides the rifle's mesh, the sling is not modelled); in the others (a cigarette, a mug, the note) one hand still holds it. */
export const HANDS_BUSY=Object.freeze(new Set(['map','binoculars','cable_watch','phone','phone_dead','ammo_check','aid_kit','cable_inspect','cable_hold']));

/** The clip candidate of a man whose act asks for one, or null when the ordinary rules decide (the walking acts, `idle`, and every man without an act). */
export function openingSample(actor,time,offset,clips,pose){
  const act=actor.act;
  if(!act||!actor.alive||actor.state==='WOUNDED'||actor.carriedBy||pose?.name==='fallen'||pose?.name==='pinned'||pose?.underFire)return null;
  // The ckm gunner and loader are drawn with the crew's clips at the gun, authored to the gun's own animation (its idle, aim and feed phases): the opening never changes those, only their heads move (openingPose).
  if(actor.id==='ckm_gunner'||actor.id==='ckm_loader')return null;
  const t=tOf(act,time),stand=name=>({clip:has(clips,name)?name:'standing_idle',time:t+offset,loop:true,source:'opening'});
  switch(act.k){
    case 'map':case 'binoculars':case 'look_up':case 'point':case 'deliver':return stand('standing_idle_c');
    case 'brace':return stand('standing_idle');   // hunched over the rifle at the ready
    case 'cable_hold':return stand('crouched_idle_b');   // the helper kneels beside the leader with the coil
    case 'cable_watch':return stand('crouched_idle');   // the watch kneels, the glasses to his eyes
    case 'smoke':case 'coffee':return stand('standing_idle_b');
    case 'phone':case 'phone_dead':case 'ammo_check':case 'aid_kit':return stand('standing_idle');
    case 'track_check':return stand('crouched_idle');   // kneeling at the rails
    case 'rifle_check':{   // the library's one-shot every few seconds, the base idle in between (the fidget starts and ends on it)
      const cycle=4.6+unit(act.s,3)*1.6,u=(t+unit(act.s,4)*cycle)%cycle,dur=clips?.info?.('fidget_check_rifle')?.duration??clips?.get?.('fidget_check_rifle')?.duration??2.4;
      return u<dur&&has(clips,'fidget_check_rifle')?{clip:'fidget_check_rifle',time:u,loop:false,source:'opening'}:stand('standing_idle');}
    case 'shout':case 'order':{
      const dur=clips?.info?.('call_out')?.duration??clips?.get?.('call_out')?.duration??2;
      return t<dur&&has(clips,'call_out')?{clip:'call_out',time:t,loop:false,source:'opening'}:stand('standing_idle_c');}
    case 'cover':return actor.id==='szymon_kowal'&&has(clips,'rkm_crouched_idle')?{clip:'rkm_crouched_idle',time:t+offset,loop:true,source:'opening'}:stand('crouched_idle');
    case 'clean_rkm':return actor.id==='szymon_kowal'&&has(clips,'rkm_clean')?{clip:'rkm_clean',time:t+offset,loop:true,source:'opening'}:null;
    case 'cable_inspect':return has(clips,'sapper_work')?{clip:'sapper_work',time:(t+offset)*.55,loop:true,rate:.55,source:'sapper'}:null;
    default:return null;   // idle, errand, cable_walk, cable_wait, home, cover_run, the crew's acts: the gait and the idles of the ordinary rules
  }
}
/** The ordinary rules of Kowal's rkm cleaning keep working for a man without an act (a save from before, the minutes after 04:34): the opening's `act` wins only while he has one. */
export const kowalCleans=(actor,battleClock,moving)=>actor.act?actor.act.k==='clean_rkm':battleClock<4*3600+33*60+10&&!Number.isFinite(actor.firedAt)&&!moving;

// ---- the procedural pose -----------------------------------------------------------------------------------------------------------------------------------------------------------------
// Where the elbow points ([right, up, forward] metres from the shoulder): down and a little out is the natural carriage (hands at the face, the mouth, a held object); out and down for the telephone, the map and the box.
const DOWN_L=[-.12,-.7,.04],DOWN_R=[.12,-.7,.04],OUT_L=[-.32,-.5,-.05],OUT_R=[.32,-.5,-.05],EAR_R=[.5,-.3,-.05];
// One reused record per call site: the result is read at once by the renderer (no allocation per man per frame).
const SPEC={lean:0,head:0,look:0,l:null,r:null},HAND_L={a:"head",o:[0,0,0],w:0,p:DOWN_L},HAND_R={a:"head",o:[0,0,0],w:0,p:DOWN_R},DIR={a:"shoulder",dir:[0,0,0],len:.5,w:0,p:DOWN_R};
const hand=(rec,a,o0,o1,o2,w,p)=>{rec.a=a;rec.o[0]=o0;rec.o[1]=o1;rec.o[2]=o2;rec.w=w;rec.p=p;return rec;};
const EAST_UP=Object.freeze([.88,.46,.05]);
/** The head's yaw (radians, positive to his left) of a man who glances about: a new target every 2.2-3.8 s within +-amp, eased in over 0.6 s (the act's own seed; no clock but the one asked). */
const glance=(act,t,amp)=>{const g=2.2+1.6*unit(act.s,997),i=Math.floor(t/g),next=(unit(act.s,i)*2-1)*amp,last=(unit(act.s,i-1)*2-1)*amp;return last+(next-last)*smooth((t-i*g)/.6);};
/**
 * The procedural pose of the act at `time`: {lean, head, l, r} or null (nothing to add to the clip). The record is reused (valid until the next call).
 */
export function openingPose(actor,time){
  const act=actor.act;
  if(!act||!actor.alive||actor.state==='WOUNDED'||actor.carriedBy||!Object.hasOwn(OPENING_ACTS,act.k))return null;
  const t=tOf(act,time),w=ease(act,time);
  SPEC.lean=0;SPEC.head=0;SPEC.look=0;SPEC.l=null;SPEC.r=null;
  switch(act.k){
    // (the hand targets are metres from the head joint along the soldier's axes [right, up, forward]; the eyes are about 0.015 above it and 0.10 ahead, the mouth 0.04 below and 0.10 ahead, the ear 0.09 to the side)
    case 'binoculars':case 'cable_watch':   // both hands raise the glasses to the eyes, hold them, lower them; the head is a little up
      SPEC.head=.05*w;SPEC.l=hand(HAND_L,"head",-.05,-.02,.15,w,DOWN_L);SPEC.r=hand(HAND_R,"head",.05,-.02,.15,w,DOWN_R);return SPEC;
    case 'smoke':{       // the cigarette hand rests at the chest and goes to the mouth every few seconds for a drag; the other hand keeps the rifle
      const P=7+unit(act.s,1)*2.5,ph=(t+unit(act.s,2)*P)%P,drag=Math.min(smooth(ph/.5),smooth((2.3-ph)/.6));
      SPEC.head=.1*drag;SPEC.r=hand(HAND_R,"head",.14-.105*drag,-.3+.225*drag,.2-.03*drag,w,DOWN_R);return SPEC;}
    case 'coffee':{      // the mug rests at the belly and goes to the mouth for a sip every ten seconds or so
      const P=9+unit(act.s,1)*3,ph=(t+unit(act.s,2)*P)%P,sip=Math.min(smooth(ph/.6),smooth((2.8-ph)/.7));
      SPEC.head=.16*sip;SPEC.r=hand(HAND_R,"head",.13-.1*sip,-.42+.32*sip,.2-.01*sip,w,DOWN_R);return SPEC;}
    case 'phone':case 'phone_dead':{   // the handset at the right ear, the left hand on the box at the chest
      let rx=.115,ry=-.045,rz=.04;
      if(act.k==='phone_dead'&&t>2.6){const q=(t-2.6)%4.4,away=Math.min(smooth(q/.5),smooth((2.6-q)/.5));rx=.115+.02*away;ry=-.045-.08*away;rz=.04+.3*away;}   // the handset away from the ear: he looks at it, shakes it
      SPEC.r=hand(HAND_R,"head",rx,ry,rz,w,EAR_R);SPEC.l=hand(HAND_L,"head",-.1,-.36,.2,w,OUT_L);SPEC.head=act.k==='phone_dead'?-.12*w:0;return SPEC;}
    case 'map':          // both hands hold the folded map at the chest and he reads it
      SPEC.l=hand(HAND_L,"head",-.13,-.31,.3,w,OUT_L);SPEC.r=hand(HAND_R,"head",.13,-.31,.3,w,OUT_R);SPEC.head=-.28*w;return SPEC;
    case 'ammo_check':{  // the open box held at the belly: the left hand under it, the right counts the clips along the row (the targets hang on the chest, which leans with him)
      const row=(t*.45+unit(act.s,5))%1,r2=-.09+.2*Math.abs(2*row-1);
      SPEC.lean=.2*w;SPEC.head=-.35*w;SPEC.l=hand(HAND_L,"chest",-.17,-.27,.3,w,OUT_L);SPEC.r=hand(HAND_R,"chest",r2,-.2+.012*Math.sin(t*2.3),.31,w,OUT_R);return SPEC;}
    case 'aid_kit':      // the medic's bag open at his left hip: one hand holds it, the other looks through it
      SPEC.lean=.15*w;SPEC.head=-.25*w;SPEC.l=hand(HAND_L,"root",-.26,.96,.3,w,OUT_L);SPEC.r=hand(HAND_R,"root",-.08,.94+.04*Math.sin(t*1.7),.36,w,OUT_R);return SPEC;
    case 'track_check':  // peering down at the rails
      SPEC.lean=.3*w;SPEC.head=-.3*w;return SPEC;
    case 'look_up':      // the planes: the head goes up
      SPEC.head=.55*smooth(t/.35)*smooth(leftOf(act,time)/.4+.3);SPEC.lean=-.12*smooth(t/.4)*smooth(leftOf(act,time)/.4+.3);return SPEC;
    case 'point':        // and the right arm points east, up
      SPEC.head=.45*smooth(t/.35);DIR.dir[0]=EAST_UP[0];DIR.dir[1]=EAST_UP[1];DIR.dir[2]=EAST_UP[2];DIR.len=.55;DIR.w=smooth(t/.4)*smooth(leftOf(act,time)/.4+.2);DIR.p=DOWN_R;SPEC.r=DIR;return SPEC;
    case 'deliver':      // the runner holds the sergeant's note out to the man he tells
      SPEC.r=hand(HAND_R,"head",.2,-.42,.5,ease(act,time,.4,.5),DOWN_R);return SPEC;
    case 'errand':case 'cable_inspect':case 'cable_hold':  // running with the note, the meter and the coil: no IK, the clip's hands are where they are
      return null;
    case 'ckm_scan':     // the gunner keeps the gun's authored pose and only turns his head along the east bank, from glance to glance
      SPEC.look=glance(act,t,.5)*w;SPEC.head=.04*w;return SPEC;
    case 'ckm_up':       // the crew hears the planes: the head goes up and turns east, the gun's pose stays
      SPEC.head=.5*smooth(t/.35)*smooth(leftOf(act,time)/.4+.3);SPEC.look=glance(act,t,.25)*w;return SPEC;
    case 'ckm_belt':     // the loader looks down at the belt, now and then up
      SPEC.head=-.38*w+.12*smooth(Math.sin(t*.7+unit(act.s,8)*6)*.5+.5)*w;SPEC.look=glance(act,t,.12)*w;return SPEC;
    case 'brace':        // the bombers are coming: hunched, the head down, now and then a glance up at them (standing: the gameplay posture is his)
      SPEC.lean=.3*w;SPEC.head=(-.12+.46*smooth(Math.sin(t*.9+unit(act.s,6)*6)*.5+.5))*w;return SPEC;
    case 'cover':        // kneeling: eyes up now and then
      SPEC.head=.3*smooth(Math.sin(t*.8+unit(act.s,7)*6)*.5+.5);return SPEC;
    default:return null;
  }
}

// ---- the props ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Which props the man shows now (a pure function of act and time; the kit applies it): binoculars, cigarette (and its ember, 0..1), mug, map, note, handset, phone box, ammunition box, aid bag,
 * the sapper's meter and coil.
 */
export const PROP_KEYS=Object.freeze(['binoculars','cigarette','mug','map','note','handset','phone','box','bag','meter','coil']);
const PROPS={};
for(const k of PROP_KEYS)PROPS[k]=false;
export function openingProps(actor,time){
  const act=actor.act;
  for(const k of PROP_KEYS)PROPS[k]=false;PROPS.ember=0;
  if(!act||!actor.alive||actor.state==='WOUNDED'||actor.carriedBy)return PROPS;
  const t=tOf(act,time);
  switch(act.k){
    case 'binoculars':case 'cable_watch':PROPS.binoculars=true;break;
    case 'smoke':{PROPS.cigarette=true;const P=7+unit(act.s,1)*2.5,ph=(t+unit(act.s,2)*P)%P;PROPS.ember=ph<2.3?smooth(ph/.5):Math.max(.15,1-(ph-2.3)/2);break;}
    case 'coffee':PROPS.mug=true;break;
    case 'map':PROPS.map=true;break;
    case 'phone':case 'phone_dead':PROPS.handset=true;PROPS.phone=true;break;
    case 'ammo_check':PROPS.box=true;break;
    case 'aid_kit':PROPS.bag=true;break;
    case 'deliver':case 'errand':PROPS.note=true;break;
    case 'cable_inspect':case 'cable_hold':case 'cable_walk':case 'cable_wait':{   // the team: the leader has the meter, the helper the coil (the kit gives each only his own)
      PROPS.meter=actor.id==='pawel_krawiec';PROPS.coil=actor.id==='sapper_2';break;}
    default:break;
  }
  return PROPS;
}
