// Audio core constants (T06a, AUDIO-DESIGN §2-§5). Presentation only: nothing here reads or writes simulation state.
export const QUALITIES=Object.freeze(['low','medium','high']);
/** Per-quality SFX voice cap: 32 events, 20 on `low` (design §2 "Voice limits"). VOICE is a separate pool capped at 3. */
export const SFX_VOICE_CAP=Object.freeze({low:20,medium:32,high:32});
export const VOICE_BUS_CAP=3;
/** Music runs outside the SFX pool: 4 looping stems + 1 stinger (design §2). */
export const MUSIC_SLOTS=Object.freeze(['stem0','stem1','stem2','stem3','stinger']);
/** Never more than two ConvolverNodes: IR A (open/riverbank, long tail) and IR B (metallic/interior, short). */
export const MAX_CONVOLVERS=2;
export const IR_MAX_SECONDS=Object.freeze({A:3.2,B:.9});
/** Seconds of impulse response per quality (A: existing 2.4 s / 1.2 s outdoor tail; B: short metallic room). */
export const IR_SECONDS=Object.freeze({A:Object.freeze({low:1.2,medium:2.4,high:2.4}),B:Object.freeze({low:.45,medium:.7,high:.7})});
export const ZONE_RAMP_SEC=.3;
export const OPEN_LOWPASS_HZ=20000;
export const VOICE_CONCUSSION_LP_HZ=2500,VOICE_CONCUSSION_THRESHOLD=.6;
/** Master limiter. Provisional values inherited from the pre-T06a compressor (-14 dB, 4:1); retune on H12 (PH-A7). */
export const LIMITER=Object.freeze({threshold:-14,knee:12,ratio:4,attack:.003,release:.25});
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const sfxVoiceCap=quality=>SFX_VOICE_CAP[quality]??SFX_VOICE_CAP.high;
