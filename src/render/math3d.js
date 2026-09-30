export const mat4 = {
  identity: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
  multiply(a,b) { const o=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3]; return o; },
  perspective(fov,aspect,near,far) { const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]); },
  lookAt(eye,target,up=[0,1,0]) { let zx=eye[0]-target[0],zy=eye[1]-target[1],zz=eye[2]-target[2],l=Math.hypot(zx,zy,zz);zx/=l;zy/=l;zz/=l;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz);xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return new Float32Array([xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1]); },
  trs(x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0) { const cy=Math.cos(ry),syy=Math.sin(ry),cx=Math.cos(rx),sxx=Math.sin(rx),cz=Math.cos(rz),szz=Math.sin(rz);const r=new Float32Array([cy*cz+syy*sxx*szz,cx*szz,-syy*cz+cy*sxx*szz,0,-cy*szz+syy*sxx*cz,cx*cz,syy*szz+cy*sxx*cz,0,syy*cx,-sxx,cy*cx,0,x,y,z,1]);r[0]*=sx;r[1]*=sx;r[2]*=sx;r[4]*=sy;r[5]*=sy;r[6]*=sy;r[8]*=sz;r[9]*=sz;r[10]*=sz;return r; }
};
