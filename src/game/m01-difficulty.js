// H9 difficulty levels for M01 (design approved D35: docs/direction/H9_DIFICULDADE.md, section 2 table).
// Step D1 is DATA ONLY: nothing in the simulation reads these numbers yet (wiring is D2..D4). Pure data, no imports.
// `recruta` is today's prototype tuning, so its snapshots stay byte-identical; the other two levels are the design's starting values,
// still to be calibrated in D2 against the time-to-death bands. Conventions: `null` means "not applicable / none / as saved".
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
    rifleGateEastThreshold:.50,                 // r()< : east-only rifle gate shooters
    spansPickPlayerThreshold:.25,               // r()< : spans riflemen pick the player
    deEast0Repair:{share:0,withinSappersM:8},   // share of de_east_0 fire on a visible player within 8 m of the sappers during the repair
    coverAdjustSalvoSec:42,                     // seconds in one cover before the adjusted-fire salvo
    reactionGraceSec:null,                      // grace after a shooter's first telegraph (fair-death rule F1); null = no rule
    healing:null,                               // null = none; otherwise {ratePerSec,afterUnhitSec,cap}
    hpOnCheckpoint:null,                        // null = as saved; otherwise health set on checkpoint save/restore
    kowalRounds:30,                             // Kowal resupply pool (timers.kowalRounds)
    loadout:LOADOUT,
    bombsLethal:false
  },
  soldado:{
    id:'soldado',
    woundChance:{exposed:.90,cover:.35},
    woundDamage:34,                             // 3 wounds to die
    burstWoundCap:2,                            // full HP survives any one burst
    aimErrorScale:.55,
    cooldownScale:.75,
    rifleGateEastThreshold:.35,
    spansPickPlayerThreshold:.40,
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
    woundChance:{exposed:1,cover:.50},
    woundDamage:50,                             // 2 wounds to die
    burstWoundCap:null,
    aimErrorScale:.40,
    cooldownScale:.60,
    rifleGateEastThreshold:.25,
    spansPickPlayerThreshold:.50,
    deEast0Repair:{share:.50,withinSappersM:8},
    coverAdjustSalvoSec:20,
    reactionGraceSec:.8,
    healing:null,
    hpOnCheckpoint:100,
    kowalRounds:15,
    loadout:LOADOUT,
    bombsLethal:false
  }
});
