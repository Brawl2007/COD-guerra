import { SphereGeometry } from 'three';

// The original placeholder generator produced overlapping sphere triangles with gaps.
// Rebuild ONLY its three rounded parts. Never apply this to imported production assets.
const PARTS={
  Uniform:{scale:[.29,.39,.2],position:[0,1.16,0]},
  Face:{scale:[.175,.205,.17],position:[0,1.67,-.015]},
  Helmet:{scale:[.25,.12,.24],position:[0,1.83,0]},
};
export function repairOriginalRoundedPart(mesh){
  const part=PARTS[mesh.material?.name];if(!part)return false;
  const geometry=new SphereGeometry(1,16,12);
  geometry.scale(...part.scale);geometry.translate(...part.position);
  mesh.geometry.dispose();mesh.geometry=geometry;return true;
}
