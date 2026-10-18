import {buildM01AcceptedPropPlacements} from './m01-prop-layout.js';

// Everything the PLAYER cannot walk through in M01, derived from the data the renderer draws (never from the renderer at runtime).
// Movement solids are a separate list from `world.obstacles`: obstacles also stop bullets, sight and grenades and NPC movement, and adding to them changes the
// battle (every pinned route, RNG path and golden). The player's body is solid against more than the ballistic world is, exactly as in a shooter where
// a crate stops you but a gap in a lattice girder does not stop a round.
//
// Reuse first: the list is built from what the world already holds (obstacles, decks, joints, the bridge kit's colliders) plus what the renderer draws and no collider covered
// (structures, props, the ckm horseshoe, the bridge heads); nothing is derived from the renderer at runtime.
// ponytail: a second list instead of widening `obstacles`. Ceiling: bullets, sight, grenades and the NPC still ignore everything that is only here (the casemate, the prop kit,
// the trusses); feeding this list to ballistics and NPC navigation is its own task and moves every pinned route and golden.
//
// A solid is an oriented box on the ground plane with a vertical range: {id, kind, cx, cz, hx, hz, yaw, c, s, y0, y1, minX, maxX, minZ, maxZ}.
// How the movement code treats it depends only on its range against the player's feet (src/world/m01-player-physics.js):
//   top <= feet + step height  -> a ledge, stood on or stepped over;   bottom >= head -> overhead, walked under;   otherwise a wall.

/**
 * Footprints of the T12 prop kit in the model frame: rows of [x0, x1, z0, z1, top] (an L has two rows). Walls are measured from the lod0 files between the step
 * height and the head (0.45-1.8 m), so a pole is its trunk (not its cross-arms), the crane its column and a cart its frame. A prop whose top is at most the step height
 * is a ledge the player steps onto and stands on (an ammunition crate 0.35 m, the sandbag corner 0.44 m); ankle-high clutter that cannot be stood on - the tin box, the
 * lantern, the burst sandbags - is left out: the foot goes through it. tests/m01-collision-visible-geometry.test.js recomputes every row from the GLBs.
 * ponytail: one or two boxes per prop (a pole is its trunk, a cart its frame, a barrel its square). Ceiling: cross-arms, wheels and overhangs above the head are not solid.
 */
export const M01_PROP_FOOTPRINTS=Object.freeze({
  supply_crate_planked:[[-.45,.45,-.26,.26,.55]],sandbag_run:[[-1.05,1.05,-.31,.31,.585]],barrel_wood:[[-.29,.29,-.29,.29,.89]],
  drum_fuel_200l:[[-.3,.3,-.3,.3,.91]],jerrycans:[[-.57,.57,-.12,.13,.501]],telegraph_pole:[[-.13,.13,-.12,.12,7]],
  fence_wood:[[-1.5,1.5,-.13,.05,1.152]],fence_barbed:[[-1.52,1.51,-.045,.06,1.3]],hand_cart:[[-.585,.585,-1.525,1.15,.978]],
  horse_cart:[[-.725,.725,-2.75,1.825,1.375]],point_lever:[[-.17,.65,-.38,.07,1.28]],semaphore_signal:[[-.19,.19,-.21,.11,5.67]],
  water_crane:[[-.225,.965,-.225,.225,4.667]],coal_pile:[[-1.33,1.345,-.93,.925,1.205]],sleeper_stack:[[-1.36,1.44,-.54,.54,1.5]],
  // ledges (top <= the step height)
  ammo_crate_wood:[[-.465,.465,-.22,.22,.346]],sandbag_corner:[[-.01,1.51,-.01,.66,.44],[-.01,.66,-.01,1.81,.44]]});

const box=(id,kind,min,max,extra={})=>({id,kind,...extra,cx:(min[0]+max[0])/2,cz:(min[2]+max[2])/2,hx:(max[0]-min[0])/2,hz:(max[2]-min[2])/2,yaw:0,c:1,s:0,y0:min[1],y1:max[1]});

/**
 * Structures drawn by the field-structures renderer with `collidersAdded: 0` (tools/assets/m01-field-structures/build.mjs, anchors in the manifest).
 *  - casemate (anchor 13,-7,40): the hull is one block (concrete walls with two slits and the roof slab, x 0..26, z 34..46, up to -1.4), buried: its roof
 *    is 1.6 m above the lowland and its west entrance opens below the abutment, so nobody gets in; the earth cap (x -0.3..26.3, z 33.7..46.3, -1.4..-0.95)
 *    overhangs the walls by 0.3 m at head height, so a standing body bumps it where a crouching one passes under;
 *  - shelter (anchor -260,-4,70): west, south and east walls and the L return wall (the north entrance stays open at x -265..-261.5) and the bench.
 */
export const M01_STRUCTURE_SOLIDS=Object.freeze([
  box('casemate_hull','structure',[0,-7,34],[26,-1.4,46]),box('casemate_cap','structure',[-.3,-1.4,33.7],[26.3,-.95,46.3]),
  box('shelter_wall_west','structure',[-265,-4,68],[-264.65,-1.45,75]),box('shelter_wall_south','structure',[-265,-4,74.65],[-255,-1.45,75]),
  box('shelter_wall_east','structure',[-255.35,-4,68],[-255,-1.45,75]),box('shelter_wall_north_return','structure',[-261.5,-4,68],[-255.35,-1.45,68.35]),
  box('shelter_bench','structure',[-263,-3.4,73],[-260.5,-3.2,74])].map(Object.freeze));

/**
 * Sandbag horseshoe round the ckm wz.30 of post S2 (M01Environment.buildEmplacement draws it around CKM_POSITION = 7.17, -3, 26 until the west demolition):
 * bags are 0.55 m long, 0.4 m deep and 0.24 m high, courses 0.22 m apart; three courses (0.68 m) on the north, south and back sides, two (0.46 m) in front.
 * tests/m01-collision-visible-geometry.test.js checks these rows against the renderer's own bag instances.
 */
export const CKM_EMPLACEMENT_ROOT=Object.freeze([7.17,-3,26]);
export function ckmEmplacementSolids([rx,ry,rz]=CKM_EMPLACEMENT_ROOT){
  const BAG=.273,HALF_DEPTH=.2;   // a bag is a capsule 0.546 m long and 0.4 m deep; courses alternate by half a bag
  // The span of a wall = the bags the renderer places: x0 + (course odd ? 0.275 : 0) + k * 0.55 while <= x1 (the same loop, the same float steps).
  const span=(from,to,courses)=>{
    let lo=Infinity,hi=-Infinity;
    for(let c=0;c<courses;c++)for(let v=from+(c%2)*.275;v<=to;v+=.55){lo=Math.min(lo,v-BAG);hi=Math.max(hi,v+BAG);}
    return [lo,hi];
  };
  const top=courses=>ry+.24+(courses-1)*.22;
  const side=(id,x0,x1,z,courses)=>{const [lo,hi]=span(x0,x1,courses);return box(id,'emplacement',[lo,ry,z-HALF_DEPTH],[hi,top(courses),z+HALF_DEPTH]);};
  const end=(id,x,z0,z1,courses)=>{const [lo,hi]=span(z0,z1,courses);return box(id,'emplacement',[x-HALF_DEPTH,ry,lo],[x+HALF_DEPTH,top(courses),hi]);};
  return [side('ckm_emplacement_north',rx-2.5,rx+1.65,rz-2.2,3),side('ckm_emplacement_south',rx-2.5,rx+1.65,rz+1.4,3),
    end('ckm_emplacement_back',rx-2.5,rz-2,rz+1.2,3),end('ckm_emplacement_front',rx+1.65,rz-2,rz+1.2,2)];
}

/**
 * What the bridge heads draw above and under the walking surfaces that the kit's collider boxes leave out (measured on the intact meshes of the lod0 GLBs;
 * tests/m01-collision-bridgehead.test.js casts rays from every standable point of the heads against those meshes and requires a solid first):
 *  - the parapets along both sides of the two west abutments (1 m thick, 1.1 m above the walking plane: -0.35 .. 0.75 m): without them the abutment top ended in thin air;
 *  - the west portal piers (chamfered, 7 m wide, hollow chambers closed at both ends): the kit's boxes are 0.4-0.5 m smaller than the drawing;
 *  - the underside of the first rail span over the lowland (the lower chords at |z| 4..5.5 and a floor beam at x 18..19): steel at the height of a man's chest.
 * They go with the west demolition, like the abutment, the portals and the first two spans they belong to.
 */
export const M01_BRIDGE_HEAD_SOLIDS=Object.freeze((()=>{
  const out=[],add=(id,x0,x1,z0,z1,y0,y1)=>out.push(Object.freeze(box(id,'bridge',[x0,y0,z0],[x1,y1,z1])));
  add('rail_abutment_parapet_n',-20.1,11.9,-9.5,-8.5,-.35,.75);add('rail_abutment_parapet_s',-20.1,11.9,8.5,9.5,-.35,.75);
  add('road_abutment_parapet_n',-22,10,29.5,30.5,-.35,.75);add('road_abutment_parapet_s',-22,10,49.5,50.5,-.35,.75);
  // rail portal piers, north (z<0) and mirrored south: [x0, x1, z0, z1]
  [[-5.25,-2.75,-12.25,-11.5],[-6.25,-1.75,-11.5,-10.75],[-6.75,-1.25,-10.75,-10],[-7,-1,-10,-8.5],[-6.75,-1.25,-8.5,-7],[-6.75,-1.25,-7,-4]].forEach(([x0,x1,z0,z1],i)=>{
    add(`rail_portal_pier_n_${i}`,x0,x1,z0,z1,-1,14);add(`rail_portal_pier_s_${i}`,x0,x1,-z1,-z0,-1,14);});
  // road portal piers, north (z 29.5..37.25) and mirrored about the road axis z=40
  [[-5.5,-2.5,29.5,30],[-6.75,-1.25,30,31],[-7.25,-.75,31,34.75],[-6.75,-1.25,34.75,37.25]].forEach(([x0,x1,z0,z1],i)=>{
    add(`road_portal_pier_n_${i}`,x0,x1,z0,z1,-1,14);add(`road_portal_pier_s_${i}`,x0,x1,80-z1,80-z0,-1,14);});
  // under the first rail span, above the lowland (-3 .. -0.5, the underside of the deck slab)
  add('rail_span_1_chord_n',10.2,26.5,-5.5,-4,-4.5,-.5);add('rail_span_1_chord_s',10.2,26.5,4,5.5,-4.5,-.5);add('rail_span_1_floor_beam',18,19,-5.5,5.5,-4.5,-.5);
  return out;
})());

/** Two metal barrels beside the hut's west door (M01Environment.buildArchitecture: trunk 0.35 x 1.1 x 0.35 at x -272/-274, z 14, y -2.45). Always drawn. */
export const HUT_BARRELS=Object.freeze([[-272,14],[-274,14]]);

/** Oriented boxes of the placed props the player cannot step over. `placements` defaults to the very list the renderer draws. */
export function propSolids(placements,footprints=M01_PROP_FOOTPRINTS){
  const out=[];
  for(const p of placements){
    const rows=footprints[p.type];if(!rows)continue;
    const [sx,,sz]=p.scale??[1,1,1],c=Math.cos(p.yaw),s=Math.sin(p.yaw);
    rows.forEach(([x0,x1,z0,z1,top],i)=>{
      const lx=(x0+x1)/2*sx,lz=(z0+z1)/2*sz;
      out.push({id:`${p.id}:${p.type}${rows.length>1?`#${i}`:''}`,kind:'prop',cx:p.x+lx*c+lz*s,cz:p.z-lx*s+lz*c,hx:(x1-x0)/2*sx,hz:(z1-z0)/2*sz,yaw:p.yaw,c,s,y0:p.y,y1:p.y+top});
    });
  }
  return out;
}

const WEST_DEMOLITION='evt_m01_west_demolition';

/**
 * Builds the player's solid list for the current world state.
 *  - every ballistic obstacle (hut, station, covers, trunks, wagons, portals, bridge piers and towers);
 *  - the bridge decks, abutments and deck joints (a mass seen from the side, a ledge seen from above, a ceiling seen from below);
 *  - the lattice trusses, which stop a body although they do not stop a round, and a 1.2 m rail across each gap between two surviving spans;
 *  - the structures, the ckm emplacement, the hut barrels and the T12 prop kit above.
 */
export function buildPlayerSolids(world,consumed){
  const out=[];
  const aabb=(b,kind)=>out.push({id:b.id,kind,cx:(b.min.x+b.max.x)/2,cz:(b.min.z+b.max.z)/2,hx:(b.max.x-b.min.x)/2,hz:(b.max.z-b.min.z)/2,yaw:0,c:1,s:0,y0:b.min.y,y1:b.max.y});
  for(const b of world.obstacles)aabb(b,'obstacle');
  for(const b of world.decks)aabb(b,'deck');
  for(const b of world.joints)aabb(b,'deck');
  const trusses=world.colliders.filter(b=>b.collider==='partialCover'&&/_truss_[NS]_span_/.test(b.id));
  // The drawn girders overhang the kit's boxes by up to 0.2 m at their ends.
  for(const b of trusses)aabb({...b,min:{...b.min,x:b.min.x-.2},max:{...b.max,x:b.max.x+.2}},'truss');
  // A rail where two surviving spans meet: the same z band as the trusses, only as high as the shortest neighbour needs to stop a walking man.
  for(const j of world.joints){
    const prefix=j.id.slice(0,j.id.indexOf('_joint_'));
    for(const side of ['N','S']){
      const near=trusses.filter(t=>t.id.startsWith(`${prefix}_collider_truss_${side}_`)&&(Math.abs(t.max.x-j.min.x)<1e-6||Math.abs(t.min.x-j.max.x)<1e-6));
      if(near.length<2)continue;
      aabb({id:`${j.id}_rail_${side}`,min:{x:j.min.x,y:near[0].min.y,z:near[0].min.z},max:{x:j.max.x,y:near[0].min.y+1.2,z:near[0].max.z}},'truss');
    }
  }
  for(const b of M01_STRUCTURE_SOLIDS)out.push(b);
  if(!consumed.has(WEST_DEMOLITION))out.push(...ckmEmplacementSolids(),...M01_BRIDGE_HEAD_SOLIDS);
  HUT_BARRELS.forEach(([x,z],i)=>out.push(box(`hut_barrel_${i}`,'prop',[x-.3,-3,z-.3],[x+.3,-1.9,z+.3])));
  out.push(...propSolids(buildM01AcceptedPropPlacements(world)));
  return out.map(b=>{
    const ex=Math.abs(b.c)*b.hx+Math.abs(b.s)*b.hz,ez=Math.abs(b.s)*b.hx+Math.abs(b.c)*b.hz;
    return {...b,minX:b.cx-ex,maxX:b.cx+ex,minZ:b.cz-ez,maxZ:b.cz+ez};   // a fresh object per world: the structure table above is frozen and shared
  });
}

/** Uniform grid over the solids (8 m cells, each box registered with a 0.5 m margin so a circle of radius < 0.5 finds everything from its centre's cell). */
export const SOLID_CELL=8,SOLID_MARGIN=.5;
export function indexSolids(solids){
  const cells=new Map(),key=(i,j)=>i*100003+j;
  for(const b of solids){
    const i0=Math.floor((b.minX-SOLID_MARGIN)/SOLID_CELL),i1=Math.floor((b.maxX+SOLID_MARGIN)/SOLID_CELL),j0=Math.floor((b.minZ-SOLID_MARGIN)/SOLID_CELL),j1=Math.floor((b.maxZ+SOLID_MARGIN)/SOLID_CELL);
    for(let i=i0;i<=i1;i++)for(let j=j0;j<=j1;j++){const k=key(i,j);let list=cells.get(k);if(!list){list=[];cells.set(k,list);}list.push(b);}
  }
  const none=[];
  return {near:(x,z)=>cells.get(key(Math.floor(x/SOLID_CELL),Math.floor(z/SOLID_CELL)))??none};
}
