import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Provisional original geometry: no canteen asset was found in the M01 kit.
// The caller owns the geometry; the material and hand rig come from M01/M02.
export function m02CanteenGeometry(){
 const body=new THREE.SphereGeometry(1,20,14);body.scale(1,1.18,.45);
 const neck=new THREE.CylinderGeometry(.22,.28,.32,12);neck.translate(0,1.16,0);
 const cap=new THREE.CylinderGeometry(.27,.27,.13,12);cap.translate(0,1.36,0);
 const pieces=[body,neck,cap],geometry=mergeGeometries(pieces);for(const piece of pieces)piece.dispose();
 geometry.computeBoundingSphere();return geometry;
}
