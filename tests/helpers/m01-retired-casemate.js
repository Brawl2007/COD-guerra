// T47 (M01-T47-CKM-LIVE-FIRE-V1) retired the dramatized casemate ckm from the mission data: the real gun of post S2 is now the only ckm of the west bridgehead, and
// it sounds through the simulation's `ally-fire` event (one ckmBurst per burst), so a display-only twin at the old casemate would double it.
// The crew gate (a dramatized emitter sounds only while its crew is there), the sector states and the slot-based scheduling are engine rules of EVERY
// dramatized emitter. The tests that exercise them keep doing so on the emitter exactly as it was authored (the values of mission.json before T47), put back
// into a COPY of the mission definition: the mission file itself is never touched.
export const RETIRED_CASEMATE=Object.freeze({
  id:'ae_s1_ckm_casemate',weapon:'ckm_wz30',position:Object.freeze([25,-3,43]),activeFrom:'04:46:00',activeUntil:'06:45:00',certainty:'GAMEPLAY_DRAMATIZATION',displayOnly:true,
});

/** A deep copy of a mission definition whose sector s1_west_bridgehead has the retired casemate emitter again (the other sectors are as they are). */
export function missionWithRetiredCasemate(mission){
  const copy=structuredClone(mission);
  copy.sectors.find(s=>s.id==='s1_west_bridgehead').audioEmitters=[{...RETIRED_CASEMATE,position:[...RETIRED_CASEMATE.position]}];
  return copy;
}
