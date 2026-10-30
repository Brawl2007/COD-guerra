// The floor classification is shared with the renderer: do not give a
// building the sound of a wooden floor when it is drawn as bare earth.
export const m02FloorFamily=building=>building.id==='B01'?'wood':'earth';

// Adapt the existing M02 building bounds to M01's audio zones and footstep
// surfaces. These room-sized boxes approximate reverberation; source
// occlusion is resolved separately against the actual world geometry.
export function m02AudioLayout(world){
 const buildings=world?.layout?.buildings??[],zones=[],surfaces=[];
 for(const b of buildings){
  if(!Array.isArray(b.bounds)||b.bounds.length!==4||!b.bounds.every(Number.isFinite))continue;
  const [minX,maxX,minZ,maxZ]=b.bounds;if(maxX<=minX||maxZ<=minZ)continue;
  const height=Number.isFinite(b.wallHeight)&&b.wallHeight>0?b.wallHeight:3;
  const box={minX:minX+.05,maxX:maxX-.05,minY:-.2,maxY:height,minZ:minZ+.05,maxZ:maxZ-.05};
  zones.push({id:`m02_${b.id}`,box,reverb:'B'});
  if(m02FloorFamily(b)==='wood')surfaces.push({id:`m02_${b.id}_floor`,box:{...box,maxY:.3},material:'wood'});
 }
 return {schemaVersion:1,zones,surfaces,defaultSurface:'earth'};
}
