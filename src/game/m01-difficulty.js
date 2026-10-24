// H9 difficulty levels for M01 (design approved D35: docs/direction/H9_DIFICULDADE.md, section 2 table).
// D1 (data), D2 (2026-10-19, wiring) and D3/D4/D5 (2026-10-22, death with a cause, CP-B2, the fair-death rules F1-F5, the lower-level offer): src/game/m01-simulation.js reads every
// row of the table through `sim.level` (landRound, woundPlayer, burst, aiFire, aiTarget, deckFire, deckTarget, eastFire, spansFire, the hold_access cover salvo, saveCheckpoint,
// the regen in tick, Kowal's pool and the section-ammo invariant of the validator).
// `recruta` is today's prototype tuning and stays byte-identical (every multiplier is exactly 1, every new rule and every new saved key is off/absent on it);
// the other two levels are calibrated against the section 6 bars (tools/verification/m01-danger-sweep.mjs, m01-difficulty-sweep.mjs). Conventions: `null` means "not applicable / none / as saved".
// NOT in the D35 table, so not per level (D2 does not invent them): suppression of the player (there is none), the AI's reaction/peek/bolt timings, the deck ammo box (timers.deckAmmo).
// Pure data and pure helpers, no imports.
const deepFreeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const item of Object.values(value))deepFreeze(item);}
  return value;
};

export const M01_DIFFICULTY_IDS=deepFreeze(['recruta','soldado','veterano']);
export const M01_DIFFICULTY_NEW_GAME='soldado';    // default offered to new games (the menu selector, D5 2026-10-21)
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
  // D2 CALIBRATION (2026-10-19, tools/verification/m01-difficulty-sweep.mjs on the 24 audit routes, after the 05:35 fill) softened the D35 starting values so that the scripted pilots
  // lived; its values are kept below as [D2 ...] for the record. RECALIBRATION OF 2026-10-22 (owner decision: veterano has no regeneration, recalibrate with D3/D4): the rows are
  // set to the section 6 bars of docs/direction/H9_DIFICULDADE.md, measured with tools/verification/m01-danger-sweep.mjs (12 seeds x the four scenarios of tests/helpers/m01-danger.js):
  // standing in the open in sight of the gate MG34s, the pooled median time to death is 15-25 s on soldado and 8-12 s on veterano; crouched in cover no run dies before 120 s / 60 s.
  // The two hard levels share the fire (aim error x.35, west-bank cooldown x.5) and the certain wound on a round that hits a man in the open;
  // they differ by the damage (3 wounds / 2), the reaction grace, the regeneration (soldado only), the gate MG share, the thresholds, the salvo timing and Kowal's pool.
  // Cover is what saves a man (.06 / .08 per colliding round: the cover-adjust salvo and the MG still reach him, rarely). Consequence, measured and reported (evidence README of
  // docs/verification/m01-runtime/difficulty-d3-d4-2026-10-22): the scripted pilots that never move (control: waits at the sandbags, stands at the deck post; support: stands beside
  // the sappers) do NOT survive soldado or veterano any more. The measured times and deaths live in that README, not here.
  // The D2 and D35 values stay in the brackets; the table is data: a softer calibration is a change of these numbers and of tests/m01-difficulty-save.test.js, nothing else.
  soldado:{
    id:'soldado',
    woundChance:{exposed:1,cover:.06},          // [D2 .45/.15, D35 .90/.35]
    woundDamage:34,                             // 3 wounds to die [D2 25, D35 34]
    burstWoundCap:1,                            // one wound per MG burst [D35 2]
    aimErrorScale:.35,                          // [D2 .85, D35 .55]
    cooldownScale:.50,                          // [D2 .90, D35 .75]
    rifleGateEastThreshold:.35,
    spansPickPlayerThreshold:.30,               // deck player weight x1.29 [.40, x2]
    deEast0Repair:{share:.30,withinSappersM:8},
    coverAdjustSalvoSec:30,
    reactionGraceSec:1.2,                       // [D35 1.5: too slow for the 15-25 s bar when replayed on the recorded exposures; the README of the evidence folder has the sweep]
    healing:{ratePerSec:5,afterUnhitSec:8,cap:100},
    hpOnCheckpoint:100,
    kowalRounds:30,
    loadout:LOADOUT,
    bombsLethal:false
  },
  veterano:{
    id:'veterano',
    woundChance:{exposed:1,cover:.08},          // [D2 .80/.30, D35 1/.50]
    woundDamage:50,                             // 2 wounds to die [D2 40, D35 50]
    burstWoundCap:1,                            // [D35 none] measured in D2: with no cap one MG34 group (2-3 bursts in ~1.5 s) killed the support pilot at full health on 2 of 12 seeds
    aimErrorScale:.35,                          // [D2 .55, D35 .40]
    cooldownScale:.50,                          // [D2 .70, D35 .60]
    rifleGateEastThreshold:.25,
    spansPickPlayerThreshold:.40,               // deck player weight x2 [.50, x3]
    deEast0Repair:{share:.50,withinSappersM:8},
    coverAdjustSalvoSec:20,
    reactionGraceSec:.8,
    // 2026-10-22 OWNER DECISION (D35 section 7 item 2, "veterano none"): the automatic regeneration of the D2 calibration (3/s after 10 s) is REMOVED. A veterano wound is healed
    // only by the next checkpoint (hpOnCheckpoint). The D2 note above about the departure is history; the table is recalibrated without it (docs/direction/H9_DIFICULDADE.md, D3/D4).
    healing:null,
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

// H9 D3 (2026-10-22), pure helpers. CP-B2 ("Reparo", mission.json `cp_m01_b2_reparo`, saved when obj_m01_cover_repair becomes active) exists on soldado and veterano only: recruta saves
// nothing new and its route stays byte for byte (no CP-B2 in `checkpointsReached`, no `pendingCheckpoint`). The ids a route reaches on a level are the mission's checkpoints that apply.
export const M01_CHECKPOINT_B2='cp_m01_b2_reparo';
export const checkpointApplies=(id,difficulty)=>id!==M01_CHECKPOINT_B2||difficulty!==M01_DIFFICULTY_SIM_DEFAULT;
/** H9 D5: the next lower level ("continuar em nível mais baixo"), or null on the lowest. A level is never raised in a running mission. */
export const lowerLevelOf=id=>M01_DIFFICULTY_IDS[M01_DIFFICULTY_IDS.indexOf(id)-1]??null;

// H9 F5: every death carries a cause (and the shooter) in portuguese; the simulation writes it to `failure` and into `player-down`, the HUD and the audio only present it.
// A German is named by his place: the two MG34 of the Lisewo gates (de_east_0 road, de_east_1 rail), the twelve gate riflemen (de_east_2..13), the dike riflemen (de_east_14..39),
// the men of the road deck (de_spans_*). The strings of the fall, the river and the boundary are the ones those deaths already had.
export const M01_DEATH_CAUSES=Object.freeze(['shot','grenade','fall','water','bounds']);
const shooterPhrase=(by,weapon)=>{
  if(weapon==='stielhandgranate'&&/^de_spans_\d+$/.test(by??''))return 'por uma granada de mão do tabuleiro';   // R2-b: the stick grenades of the deck assault
  const east=/^de_east_(\d+)$/.exec(by??'');
  if(east)return weapon==='mg34'||Number(east[1])<2?'pela MG34 do dique (portões)':Number(east[1])<14?'por um atirador Kar98k dos portões':'por um atirador Kar98k do dique';
  if(/^de_spans_\d+$/.test(by??''))return 'por um atirador Kar98k do tabuleiro';
  return 'pelo fogo alemão';
};
export const deathText=(cause,by=null,weapon=null)=>cause==='shot'?`Abatido ${shooterPhrase(by,weapon)}.`:cause==='grenade'?'Morto pela própria granada.':
  cause==='fall'?'Você caiu de uma altura fatal.':cause==='water'?'Você caiu no Vístula.':'Você se afastou da sua secção.';
