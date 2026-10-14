// Read-only production-source reproduction; run from the repository root.
import * as THREE from 'three';
import {M01BridgeFinishRuntime} from '../../../../src/render/m01-bridge-finish-runtime.js';
const root=new THREE.Group(),node=new THREE.Group();node.name='rail_span_01';root.add(node);
const original=new THREE.MeshStandardMaterial({name:'steel_painted'}),mesh=new THREE.Mesh(new THREE.BoxGeometry(100,8,10),original);
mesh.userData.m01SourceMaterial='steel_painted';node.add(mesh);
const kits=[{root,file:{lod:2},pieces:[{name:node.name,node}]}],world={revision:0},state={damage:[],parts:{rail_span_01:{visible:true,lod:2}}},camera=new THREE.PerspectiveCamera();camera.position.set(-1000,4,0);
const owner=new M01BridgeFinishRuntime(root,{quality:'low',loadTexture:async()=>({texture:new THREE.Texture(),bitmap:{close(){}}})});
await owner.ready;owner.sync({kits,world,quality:'low'});owner.select({kits,state,camera});
const enabled={card:owner.diagnostics.impostors.activeParts,originalVisible:mesh.visible};
owner.setEnabled(false);
const immediate={card:owner.diagnostics.impostors.activeParts,originalVisible:mesh.visible};
owner.prepareFrame();owner.select({kits,state,camera,prepared:true});
const afterFrame={enabled:owner.enabled,card:owner.diagnostics.impostors.activeParts,originalVisible:mesh.visible,originalMaterial:mesh.material===original};
console.log(JSON.stringify({enabled,immediate,afterFrame}));
owner.dispose();original.dispose();mesh.geometry.dispose();
