// Authored layout data shared by the renderer, the NPC navigation and the clipping audit. Data and pure functions only: no Three.js, no simulation state.

/**
 * T47 ckm emplacement: the sandbag walls drawn round the gun root (src/render/m01-environment.js buildEmplacement). Local metres relative to the root;
 * an 'x' wall runs along x at local z = `at`, a 'z' wall along z at local x = `at`. `gap` leaves a door in the wall: no bag is drawn there and nobody has
 * to be solid there. A bag is .39 long (along the wall, .275 stagger on odd courses) and .40 thick, a course is .22 high.
 */
export const CKM_EMPLACEMENT=Object.freeze({
  course:.22,pitch:.55,stagger:.275,halfLength:.2,halfThickness:.2,bagHeight:.12,
  walls:Object.freeze([
    Object.freeze({id:'north',axis:'x',at:-2.2,from:-2.5,to:1.65,courses:3}),
    Object.freeze({id:'south',axis:'x',at:1.4,from:-2.5,to:1.65,courses:3}),
    Object.freeze({id:'back',axis:'z',at:-2.5,from:-2,to:1.2,courses:3}),
    Object.freeze({id:'front',axis:'z',at:1.65,from:-2,to:1.2,courses:2})])});

/** Bag centres of the emplacement round `root` ({x,y,z}); the exact loops the renderer used, as data. */
export function ckmEmplacementBags(root,layout=CKM_EMPLACEMENT){
  const bags=[];
  for(const w of layout.walls){
    // Absolute coordinates, accumulated exactly as the renderer's first loops did, so the drawn instances do not move by a ulp.
    const base=w.axis==='x'?root.x:root.z,t0=base+w.from,t1=base+w.to;
    for(let c=0;c<w.courses;c++){
      const y=root.y+layout.bagHeight+c*layout.course;
      for(let t=t0+(c%2)*layout.stagger;t<=t1;t+=layout.pitch){
        if(w.gap&&t>base+w.gap.from&&t<base+w.gap.to)continue;
        bags.push(w.axis==='x'?{wall:w.id,axis:'x',x:t,y,z:root.z+w.at}:{wall:w.id,axis:'z',x:root.x+w.at,y,z:t});
      }
    }
  }
  return bags;
}

/** One solid box per unbroken run of bags of a wall (a door splits the wall in two). Boxes carry {id,min,max} in the world's metre axes. */
export function ckmEmplacementSolids(root,layout=CKM_EMPLACEMENT){
  const bags=ckmEmplacementBags(root,layout),solids=[];
  for(const w of layout.walls){
    const along=b=>w.axis==='x'?b.x:b.z,own=bags.filter(b=>b.wall===w.id).sort((p,q)=>along(p)-along(q));
    const top=root.y+layout.bagHeight*2+(w.courses-1)*layout.course;
    let run=null;
    const close=()=>{if(!run)return;
      solids.push(w.axis==='x'
        ?{id:`ckm_sandbag_${w.id}_${solids.length}`,min:{x:run.a-layout.halfLength,y:root.y,z:root.z+w.at-layout.halfThickness},max:{x:run.b+layout.halfLength,y:top,z:root.z+w.at+layout.halfThickness}}
        :{id:`ckm_sandbag_${w.id}_${solids.length}`,min:{x:root.x+w.at-layout.halfThickness,y:root.y,z:run.a-layout.halfLength},max:{x:root.x+w.at+layout.halfThickness,y:top,z:run.b+layout.halfLength}});
      run=null;};
    for(const b of own){const t=along(b);if(run&&t-run.b<=layout.pitch+1e-9)run.b=t;else{close();run={a:t,b:t};}}
    close();
  }
  return solids;
}

/**
 * Doorways in solids that the exported collider fills with one slab. Inside a passage the slab is not a wall: the navigation does not route round it
 * and the clipping audit does not count the men who walk through. Lisewo's common 1912 portal (rail and road arches, the gates open to the road) is
 * exported as COL_portal_lisewo_1912, a single block over the whole width; the road arch is the width of the road deck (z 37.2..42.8).
 */
export const M01_PASSAGES=Object.freeze([
  Object.freeze({id:'lisewo_road_arch',solid:'COL_portal_lisewo_1912',min:Object.freeze({x:1058.7,z:37.2}),max:Object.freeze({x:1067.7,z:42.8})})]);
