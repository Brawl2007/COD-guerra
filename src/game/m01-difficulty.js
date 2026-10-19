// H9 difficulty levels for M01 (design approved D35: docs/direction/H9_DIFICULDADE.md, section 2 table).
// D1 (data) and D2 (2026-10-19, wiring): src/game/m01-simulation.js reads every row of the table through `sim.level` (landRound, burst, aiFire, aiTarget, deckFire,
// deckTarget, eastFire, spansFire, the hold_access cover salvo, saveCheckpoint, the regen in tick, Kowal's pool and the section-ammo invariant of the validator).
// `recruta` is today's prototype tuning and stays byte-identical (every multiplier is exactly 1, every new rule and every new saved key is off/absent on it);
// the other two levels are calibrated in D2 over the 24 audit routes (tools/verification/m01-difficulty-sweep.mjs). Conventions: `null` means "not applicable / none / as saved".
// NOT in the D35 table, so not per level (D2 does not invent them): suppression of the player (there is none), the AI's reaction/peek/bolt timings, the deck ammo box (timers.deckAmmo).
// Pure data and pure helpers, no imports.
const deepFreeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}
  return value;
};

export const M01_DIFFICULTY_IDS=deepFreeze(['recruta','soldado','veterano']);
export const M01_DIFFICULTY_NEW_GAME='soldado';    // default offered to new games (selector arrives in D5)
export const M01_DIFFICULTY_SIM_DEFAULT='recruta'; // default of `new M01Simulation(seed)`: legacy saves and every existing test keep this tuning

const LOADOUT={grenades:2,mag:5,reserve:40};  // identical on every level: changing it breaks the weapon/grenade snapshot invariants

export const M01_DIFFICULTY=deepFreeze({
  recruta:{
    id:'recruta',
    woundChance:{exposed:.20,cover:.06},        // enemy round that hits the player collider (landRound)
    woundDamage:8,
    burstWoundCap:null,                         // max wounds per single MG burst; null = no cap
    aimErrorScale:1,                            // x bias and cone, kinds `player`/`cover` only
    cooldownScale:1,                            // x fire cooldown at the west bank
    // D2 2026-10-19 (was DEAD after combat AI slice 1, review of 2026-10-18): re-expressed as a weight. The old draw `r()<.5` gave 'east' odds of t/(1-t) against the rest;
    // aiTarget now multiplies the gate rifleman's 'east' weight (1) by oddsWeight(level, recruta) = (t/(1-t)) / (.5/.5): recruta 1 exactly, soldado .54, veterano .33.
    // A German without actor.ai (an older save) still draws `r()<t` in eastFire, now from this field.
    rifleGateEastThreshold:.50,
    // D2 2026-10-19 (was DEAD after combat slice 2): re-expressed as the player weight of deckTarget, x oddsWeight(level, recruta) = (t/(1-t)) / (.25/.75): recruta 1
    // exactly, soldado 2, veterano 3. A spans man without the deck record (an older save) still draws `r()<t` in spansFire, now from this field.
    spansPickPlayerThreshold:.25,
    deEast0Repair:{share:0,withinSappersM:8},   // share of de_east_0 fire on a visible player within 8 m of the sappers during the repair
    coverAdjustSalvoSec:42,                     // seconds in one cover before the adjusted-fire salvo
    reactionGraceSec:null,                      // grace after a shooter's first telegraph (fair-death rule F1); null = no rule
    healing:null,                               // null = none; otherwise {ratePerSec,afterUnhitSec,cap}
    hpOnCheckpoint:null,                        // null = as saved; otherwise health set on checkpoint save/restore
    kowalRounds:30,                             // Kowal resupply pool (timers.kowalRounds)
    loadout:LOADOUT,
    bombsLethal:false
  },
  // D2 CALIBRATION (2026-10-19, tools/verification/m01-difficulty-sweep.mjs on the 24 audit routes, after the 05:35 fill). The D35 starting values in brackets killed the
  // scripted routes: soldado [.90/.35, 34, cap 2, aim .55, cooldown .75, spans .40] died on 3 of 4 worst routes (control pilot standing at the deck post through the
  // 260 s deck fight: 22-27 collisions); veterano [1/.50, 50, aim .40, cooldown .60, spans .50, no regen] killed even the support pilot in the repair (2-3 wounds).
  // Values outside the D35 starting table are reported in DEVELOPMENT_STATUS (human decision): soldado's are inside the D35 calibration latitude; veterano's REGEN is a
  // departure from D35 section 7 item 2 (recommended none), taken because without it no scripted route, the competent support pilot included, survives the long
  // checkpoint segments (CP-B 04:38 -> CP-C 05:34 holds the whole repair).
  soldado:{
    id:'soldado',
    woundChance:{exposed:.45,cover:.15},        // [.90/.35]
    woundDamage:25,                             // 4 wounds to die [34]
    burstWoundCap:1,                            // one wound per MG burst [2]
    aimErrorScale:.85,                          // [.55]
    cooldownScale:.90,                          // [.75]
    rifleGateEastThreshold:.35,
    spansPickPlayerThreshold:.30,               // deck player weight x1.29 [.40, x2]
    deEast0Repair:{share:.30,withinSappersM:8},
    coverAdjustSalvoSec:30,
    reactionGraceSec:1.5,
    healing:{ratePerSec:5,afterUnhitSec:8,cap:100},
    hpOnCheckpoint:100,
    kowalRounds:30,
    loadout:LOADOUT,
    bombsLethal:false
  },
  veterano:{
    id:'veterano',
    woundChance:{exposed:.80,cover:.30},        // [1/.50]
    woundDamage:40,                             // 3 wounds to die [50]
    burstWoundCap:null,
    aimErrorScale:.55,                          // [.40]
    cooldownScale:.70,                          // [.60]
    rifleGateEastThreshold:.25,
    spansPickPlayerThreshold:.40,               // deck player weight x2 [.50, x3]
    deEast0Repair:{share:.50,withinSappersM:8},
    coverAdjustSalvoSec:20,
    reactionGraceSec:.8,
    healing:{ratePerSec:3,afterUnhitSec:10,cap:100},   // [none] slower and later than soldado's; see the calibration note above
    hpOnCheckpoint:100,
    kowalRounds:15,
    loadout:LOADOUT,
    bombsLethal:false
  }
});

// D2 helpers (pure). The odds of an old `r()<t` draw against the level's own, as a multiplier of the weight that replaced the draw: exactly 1 when t is recruta's.
export const oddsWeight=(t,base)=>t===base?1:(t/(1-t))/(base/(1-base));
// Fire "at the west bank" (cooldownScale, aimErrorScale reads only player/cover): the kinds of round aimed at the Polish side. 'east' (the show of fire at the east
// bridgehead block) and 'platoon' (the men crossing the deck) keep their cadence on every level.
export const M01_WEST_BANK_KINDS=Object.freeze(['player','cover','repair','squad','area']);
export const M01_AIMED_AT_PLAYER_KINDS=Object.freeze(['player','cover']);
// Rule F1 (H9 section 3), draw-free: a shooter "engages" the player from his first round of kind player/cover; the engagement is broken by a gap of more than
// F1_TELEGRAPH_GAP_SEC between his rounds at the player. A wound may take the player to 0 only from a round fired reactionGraceSec or more after the first round of the
// current engagement of the same shooter; otherwise health stays >= 1. Rule F2: rounds of one shooter fired within BURST_GROUP_SEC of the first wounding round are
// one burst (a 7-round MG34 burst spans 6 x 0.075 = 0.45 s; the next burst of a group starts >= 0.75 s after the last).
export const F1_TELEGRAPH_GAP_SEC=6;
export const BURST_GROUP_SEC=.45;
