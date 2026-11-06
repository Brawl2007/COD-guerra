// Definições de áudio do jogador (apresentação apenas; nunca entram em saves nem na simulação).
export const AUDIO_MIX_KEY='cod-guerra:audio-mix';
export const AUDIO_MIX_DEFAULTS=Object.freeze({master:.68,sfx:1,voice:1,music:1,reduceTinnitus:false});
export const REDUCED_CONCUSSION_SCALE=.35;
const level=(v,d)=>typeof v==='number'&&Number.isFinite(v)?Math.min(1,Math.max(0,v)):d;
/** Interpreta o JSON guardado; qualquer valor inválido volta ao predefinido. Nunca lança. */
export function parseAudioMix(raw){
  let o=null;try{o=typeof raw==='string'?JSON.parse(raw):raw;}catch{}
  if(!o||typeof o!=='object'||Array.isArray(o))o={};const d=AUDIO_MIX_DEFAULTS;
  return {master:level(o.master,d.master),sfx:level(o.sfx,d.sfx),voice:level(o.voice,d.voice),music:level(o.music,d.music),reduceTinnitus:o.reduceTinnitus===true};
}
export const concussionScaleFor=reduce=>reduce?REDUCED_CONCUSSION_SCALE:1;
