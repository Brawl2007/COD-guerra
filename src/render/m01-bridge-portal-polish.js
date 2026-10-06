import * as THREE from 'three';

export const M01_PORTAL_DETAIL_LAYOUTS=Object.freeze({
  rail_portal_west:Object.freeze({
    node:'rail_portal_west',x:0,thickness:5,halfWidth:7.2,
    openings:Object.freeze([Object.freeze({centerZ:0,width:8.4,springY:5.0})]),
    towers:Object.freeze([Object.freeze({z:-9.3,r:2.6}),Object.freeze({z:9.3,r:2.6})])
  }),
  road_portal_west:Object.freeze({
    node:'road_portal_west',x:0,thickness:5,halfWidth:4.6,
    openings:Object.freeze([Object.freeze({centerZ:0,width:6.0,springY:4.8})]),
    towers:Object.freeze([Object.freeze({z:-7.1,r:3.0}),Object.freeze({z:7.1,r:3.0})])
  }),
  portal_lisewo_1912:Object.freeze({
    node:'portal_lisewo_1912',x:14,thickness:9,halfWidth:28,
    openings:Object.freeze([
      Object.freeze({centerZ:-20,width:9.4,springY:6.0}),
      Object.freeze({centerZ:20,width:7.0,springY:5.0})
    ]),
    towers:Object.freeze([
      Object.freeze({z:-28,r:3.4}),Object.freeze({z:0,r:4.2}),Object.freeze({z:28,r:3.4})
    ])
  })
});

const subtractOpenings=(layout)=>{
  const blocked=layout.openings.map(o=>[o.centerZ-o.width/2-.18,o.centerZ+o.width/2+.18]).sort((a,b)=>a[0]-b[0]);
  const out=[];let cursor=-layout.halfWidth;
  for(const [a,b] of blocked){if(a>cursor+.2)out.push([cursor,a]);cursor=Math.max(cursor,b);}
  if(cursor<layout.halfWidth-.2)out.push([cursor,layout.halfWidth]);
  return out;
};

export function portalDetailDescriptors(name){
  const layout=M01_PORTAL_DETAIL_LAYOUTS[name];if(!layout)return null;
  const mediumBoxes=subtractOpenings(layout).map(([z0,z1])=>({
    p:[layout.x,-.78,(z0+z1)/2],size:[layout.thickness+.16,.28,z1-z0],kind:'plinth'
  }));
  const mediumRings=layout.towers.map(t=>({
    p:[layout.x,-.72,t.z],size:[t.r+.31,.22,t.r+.31],kind:'tower-base-course'
  }));
  const highBoxes=[];
  for(const opening of layout.openings)for(const side of [-1,1])for(const face of [-1,1]){
    highBoxes.push({
      p:[layout.x+face*(layout.thickness/2+.065),(opening.springY-1)/2,opening.centerZ+side*opening.width/2],
      size:[.13,opening.springY+1,.24],kind:'jamb-edge'
    });
  }
  return Object.freeze({
    mediumBoxes:Object.freeze(mediumBoxes.map(Object.freeze)),
    mediumRings:Object.freeze(mediumRings.map(Object.freeze)),
    highBoxes:Object.freeze(highBoxes.map(Object.freeze))
  });
}

const makeBatch=(geometry,material,items)=>{
  if(!items.length)return null;
  const batch=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();
  items.forEach((d,i)=>{dummy.position.set(...d.p);dummy.scale.set(...d.size);dummy.rotation.set(0,0,0);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
  batch.instanceMatrix.needsUpdate=true;batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();return batch;
};

export class M01BridgePortalPolish{
  constructor({stone}){
    this.stone=stone;this.box=new THREE.BoxGeometry(1,1,1);this.ring=new THREE.CylinderGeometry(1,1,1,14);
    this.attachments=[];this.quality='medium';
  }
  attach(node){
    const detail=portalDetailDescriptors(node.name);if(!detail)return false;
    const root=new THREE.Group();root.name=`${node.name}_visual_polish`;root.userData.m01PortalPolish=true;
    const mediumBox=makeBatch(this.box,this.stone,detail.mediumBoxes),mediumRing=makeBatch(this.ring,this.stone,detail.mediumRings),
      highBox=makeBatch(this.box,this.stone,detail.highBoxes);
    for(const batch of [mediumBox,mediumRing,highBox])if(batch)root.add(batch);
    node.add(root);this.attachments.push({node,root,medium:[mediumBox,mediumRing].filter(Boolean),high:[highBox].filter(Boolean),detail});
    this.sync(this.quality);return true;
  }
  sync(quality='medium'){
    this.quality=quality;
    const medium=quality!=='low',high=quality==='high';
    for(const a of this.attachments){for(const b of a.medium)b.visible=medium;for(const b of a.high)b.visible=high;}
  }
  get diagnostics(){
    let medium=0,high=0,visible=0;
    for(const a of this.attachments){
      medium+=a.detail.mediumBoxes.length+a.detail.mediumRings.length;high+=a.detail.highBoxes.length;
      if(this.quality!=='low')visible+=a.detail.mediumBoxes.length+a.detail.mediumRings.length;
      if(this.quality==='high')visible+=a.detail.highBoxes.length;
    }
    return {quality:this.quality,attachments:this.attachments.map(a=>a.node.name),mediumDetails:medium,highDetails:high,visibleDetails:visible,
      batches:this.attachments.reduce((n,a)=>n+a.medium.length+a.high.length,0),collidersAdded:0};
  }
  dispose(){
    for(const a of this.attachments)a.root.removeFromParent();
    this.attachments=[];this.box.dispose();this.ring.dispose();
  }
}
