// Original art placements, not surveyed tree positions from 1939.
// These avoid all scripted routes and firing lanes; visible trunks have solid physics.
export const M01_TREES=Object.freeze([
  [-12,18,12],[-8,63,15],[-40,-24,16],[-79,-22,18],[-122,-28,17],[-169,-23,14],
  [-215,-29,16],[-265,-24,18],[-319,-30,15],[-365,-21,17],[-411,-27,15],
  [-49,77,16],[-103,69,18],[-159,73,15],[-207,88,17],[-349,82,18],[-406,74,14],
].map(([x,z,height],i)=>Object.freeze({id:`m01_tree_${i}`,x,z,height,radius:.25+(i%3)*.045})));
