// Isolated visual fixture using the same character renderer as M01; not a mission playthrough.
import * as THREE from 'three';
import { M01View } from '../src/render/m01-view.js';

const canvas=document.querySelector('canvas'),engine=new THREE.WebGLRenderer({canvas,antialias:true});
engine.setSize(1280,640,false);engine.setPixelRatio(1);engine.outputColorSpace=THREE.SRGBColorSpace;
const view=new M01View({engine,canvas});await view.ready;
const scene=new THREE.Scene();scene.background=new THREE.Color('#73837d');
scene.add(new THREE.HemisphereLight('#e0e8ee','#4d5543',2.7));
const sun=new THREE.DirectionalLight('#ffe3c5',2);sun.position.set(-3,8,5);scene.add(sun);
for(const batch of view.batches.values())scene.add(batch);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(16,12),new THREE.MeshStandardMaterial({color:'#566158',roughness:1}));
floor.rotation.x=-Math.PI/2;scene.add(floor);
const combat=new URLSearchParams(location.search).has('combat');
const camera=new THREE.PerspectiveCamera(42,2,.1,50);camera.position.set(0,combat?2.3:2.35,combat?9.2:6);camera.lookAt(0,.75,0);
const base={y:0,z:0,facing:Math.PI/2,team:'ally',active:true,alive:true,state:'GUARD',shot:0};
const actors=combat?[
  {...base,id:'aim',x:-4.2,facing:0,state:'SUPPRESS',firedAt:9},
  {...base,id:'fire',x:-1.5,facing:0,team:'enemy',state:'SUPPRESS',weapon:'kar98k',shot:.12,firedAt:10},
  {...base,id:'pinned',x:1.2,facing:0,suppressedUntil:12,crouched:true},
  {...base,id:'walk',x:3.9,facing:0,state:'ADVANCE'}
]:[
  {...base,id:'standing',x:-3.3},
  {...base,id:'seated',x:-1.3,pose:'seated',crouched:true},
  {...base,id:'wounded',x:.7,state:'WOUNDED'},
  {...base,id:'medic',x:3.2,role:'MEDIC'},
  {...base,id:'carried',x:3.2,y:1.15,z:-.25,facing:Math.PI,state:'WOUNDED',carriedBy:'medic'}
];
const render=time=>{
  view.updateActors(actors,time);engine.render(scene,camera);
  window.poseGallery={ready:true,verification:'Isolated visual fixture; not gameplay',clock:time,
    actorPoses:{...view.actorPoses},actorAnimations:{...view.actorAnimations},drawCalls:engine.info.render.calls,triangles:engine.info.render.triangles};
};
render(combat?10.016:0);
// Only this isolated verification fixture exposes a render-clock control. The game does not.
if(combat)window.renderPoseGallery=render;
