// A number in [0, 1) from a string, the same on every machine and uniform over sequential ids (R4 INC-2, 2026-11-04). The act-1 blastJitter (m01-blast.js: FNV-1a alone) is clumpy over ids that
// differ in their last digits (np_round_9000, np_round_9001...): for one man a whole range of values never occurs. A chance drawn from a pair of ids needs the avalanche of murmur3's finalizer
// after the FNV-1a, which this module adds. Pure: no stream, no clock; the act-1 module stays as it is.
export function unitHash(text){
  let h=0x811c9dc5;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
  h^=h>>>16;h=Math.imul(h,0x85ebca6b)>>>0;h^=h>>>13;h=Math.imul(h,0xc2b2ae35)>>>0;h^=h>>>16;
  return (h>>>0)/4294967296;
}
/** The unit hash of a pair of ids (a man and a round, a man and an impact). */
export const pairUnit=(a,b)=>unitHash(`${a}|${b}`);
