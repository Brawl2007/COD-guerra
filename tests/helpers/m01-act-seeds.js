// Seeds for the duration checks of Act VII-a (tests/m01-act-vii-a-seeds.test.js, tools/verification/m01-act-vii-a-duration-sweep.mjs). The review of 2026-11-04 found the fight under two minutes on
// 11 of 26 routes of seeds the tests did not use, so the data are checked on more seeds than the three of the golden: ACT_SEEDS are those three (19390901, 3, 7, the seeds of the 18 routes and of the
// golden) and twelve others (1, 2, 4, 5, 6, 8..14); the numbers of the data were chosen looking at these. ACT_HELD_OUT_SEEDS (101..120) were never looked at while tuning: they check that the
// tuning did not only fit the first fifteen.
export const ACT_SEEDS=Object.freeze([19390901,3,7,1,2,4,5,6,8,9,10,11,12,13,14]);
export const ACT_HELD_OUT_SEEDS=Object.freeze(Array.from({length:20},(_,i)=>101+i));
/** The rule: the fight (wave start to repelled) lasts at least MIN_FIGHT_SEC with the active pilot on at least MIN_SHARE of the seeds; the passive pilot is done in PASSIVE_LIMIT_SEC of act clock. */
export const MIN_FIGHT_SEC=110,MIN_SHARE=.9,PASSIVE_LIMIT_SEC=360;
