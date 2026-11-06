import * as THREE from 'three';

// M01's yard patients use a canvas and two wooden poles. Fit the same
// proportions inside each authored B12 obstacle, without adding collision.
export function isM02AidStretcher(ob) {
  return ob.id === 'prop_b12_stretcher_1' || ob.id === 'prop_b12_stretcher_2';
}

export function createM02AidStretcher(ob, materials) {
  const length = ob.max.x - ob.min.x;
  const width = ob.max.z - ob.min.z;
  const height = ob.max.y - ob.min.y;
  const scale = Math.min(length / 2.65, width / .985, height / .33);
  const group = new THREE.Group();
  group.name = `M02 aid stretcher ${ob.id}`;
  group.position.set((ob.min.x + ob.max.x) / 2, ob.min.y, (ob.min.z + ob.max.z) / 2);
  const part = (name, dimensions, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions.map(n => n * scale)), material);
    mesh.name = name;
    mesh.position.set(...position.map(n => n * scale));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.m02AidStretcher = true;
    group.add(mesh);
  };
  part('canvas', [2.05, .055, .82], [0, .30, 0], materials.roof_thatch);
  for (const side of [-1, 1]) {
    part('wooden pole', [2.65, .045, .045], [0, .29, side * .47], materials.wood_frame);
  }
  return group;
}
