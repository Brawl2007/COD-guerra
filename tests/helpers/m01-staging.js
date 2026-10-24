// T38 M01-COMBAT-POSTURE-STAGING-V1: what "a row" means for the staging tests (pure geometry on {x, z} in metres).
const d2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Median distance from each man to his nearest neighbour: the group's own spacing, so "close order" scales with the group. */
export const medianSpacing=points=>{const n=points.map((a,i)=>Math.min(...points.filter((_,j)=>j!==i).map(b=>d2(a,b)))).sort((a,b)=>a-b);
  return n.length%2?n[(n.length-1)/2]:(n[n.length/2-1]+n[n.length/2])/2;};
/**
 * A close-order row, as the eye reads one: three men on one line (the middle one within `dev` m of the line through the outer two) with even
 * gaps (they differ by at most `even` of the larger gap) of at most `maxGap` m (default 2.2 x the group's median spacing). Returns every such
 * triple of indices [outer, middle, outer].
 */
export function rowTriples(points,{dev=.3,even=.3,maxGap=2.2*medianSpacing(points)}={}){
  const out=[];
  for(let i=0;i<points.length;i++)for(let k=i+1;k<points.length;k++){
    const a=points[i],c=points[k],ac=d2(a,c),ux=(c.x-a.x)/ac,uz=(c.z-a.z)/ac;
    for(let j=0;j<points.length;j++){
      if(j===i||j===k)continue;const b=points[j],t=(b.x-a.x)*ux+(b.z-a.z)*uz;if(t<=0||t>=ac)continue;
      if(Math.abs((b.x-a.x)*uz-(b.z-a.z)*ux)>dev)continue;
      const ab=d2(a,b),bc=d2(b,c);if(Math.max(ab,bc)<=maxGap&&Math.abs(ab-bc)<=even*Math.max(ab,bc))out.push([i,j,k]);
    }
  }
  return out;
}
export const closestPair=points=>{let m=Infinity;for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)m=Math.min(m,d2(points[i],points[j]));return m;};
/**
 * An open-order line: four men on one line (each inner man within `dev` m of the line through the outer two), consecutive gaps of at most
 * `maxGap` m (default 4 m), whatever their spacing. Returns every such quadruple of indices, ordered along the line.
 */
export function lineQuads(points,{dev=.3,maxGap=4}={}){
  const out=[];
  for(let i=0;i<points.length;i++)for(let k=i+1;k<points.length;k++){
    const a=points[i],c=points[k],ac=d2(a,c),ux=(c.x-a.x)/ac,uz=(c.z-a.z)/ac;
    const inner=[];
    for(let j=0;j<points.length;j++){
      if(j===i||j===k)continue;const b=points[j],t=(b.x-a.x)*ux+(b.z-a.z)*uz;
      if(t>0&&t<ac&&Math.abs((b.x-a.x)*uz-(b.z-a.z)*ux)<=dev)inner.push([t,j]);
    }
    inner.sort((p,q)=>p[0]-q[0]);
    for(let m=0;m<inner.length;m++)for(let n=m+1;n<inner.length;n++){
      const ts=[0,inner[m][0],inner[n][0],ac];
      if(ts.slice(1).every((t,q)=>t-ts[q]<=maxGap))out.push([i,inner[m][1],inner[n][1],k]);
    }
  }
  return out;
}
