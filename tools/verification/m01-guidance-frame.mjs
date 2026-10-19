// Immutable projection for amendment 13. Preserve every actor/physics/combat/RNG
// field; only the explicitly listed presentation paths may differ. Sharing the
// untouched actor arrays avoids deep-cloning two complete worlds on every tick.
export function guidanceFrame(frame,staging){
 const strip=st=>{
  if(!st)return st;
  const {dialogueConsumed,dialogueQueue,subtitle,...kept}=st;
  const {barks,guideKey,guideAt,guideDist,guideShown,...timers}=st.timers;
  const {'m01.suggested_cover':hint,...flags}=st.flags;
  const {status,...mission}=st.mission;
  return {...kept,timers,flags,mission,...(st.resumeCheckpoint?{resumeCheckpoint:strip(st.resumeCheckpoint)}:{})};
 };
 const events=frame.events.filter(e=>e.type!=='message'||!staging.has(e.message)&&!/^(Mude para |Metralhadora no dique · V |Socorrista Dudek: |Zieliński: (Metralhadora|Atiradores|Salva|Na posição))/.test(e.message)).map(e=>{
  if(e.type!=='message')return e;
  const {priority,scope,durationMs,...kept}=e;return kept;
 });
 return {...frame,state:strip(frame.state),checkpoint:strip(frame.checkpoint),events};
}
