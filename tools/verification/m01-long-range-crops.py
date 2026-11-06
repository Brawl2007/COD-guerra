# R2-c evidence helper: before/after crops (6x, nearest) around the points the view reports in `m01.longRangeFire.sample` (projected with the camera of the grab) and around orange tracer pixels.
# Usage: python3 tools/verification/m01-long-range-crops.py <capDir> <outDir>   (capDir holds before-a/report-before.json, after-a/report-after.json ... as written by m01-long-range-capture.mjs)
import json,math,os,sys
from PIL import Image,ImageDraw
BASE=sys.argv[1].rstrip('/')+'/'
OUT=sys.argv[2];os.makedirs(OUT,exist_ok=True)
W,H=1366,768
def project(cam,p):
    qx,qy,qz,qw=cam['quaternion'];cx,cy,cz=cam['position']
    vx,vy,vz=p[0]-cx,p[1]-cy,p[2]-cz
    ix,iy,iz,iw=-qx,-qy,-qz,qw
    tx=2*(iy*vz-iz*vy);ty=2*(iz*vx-ix*vz);tz=2*(ix*vy-iy*vx)
    rx=vx+iw*tx+(iy*tz-iz*ty);ry=vy+iw*ty+(iz*tx-ix*tz);rz=vz+iw*tz+(ix*ty-iy*tx)
    if rz>=0:return None
    t=math.tan(math.radians(cam['fov'])/2);asp=W/H
    return ((rx/(-rz*t*asp)+1)/2*W,(1-ry/(-rz*t))/2*H,-rz)
def load(d,label):
    r=json.load(open(BASE+d+'/report-'+label+'.json'));return r['shots'][0],BASE+d+'/'
def orange(im,region):
    px=im.load();pts=[]
    x0,y0,x1,y1=region
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,bl=px[x,y]
            if r>150 and 90<g<215 and bl<130 and r-bl>70 and r>g+20:pts.append((x,y))
    return pts
def pair(out,pb,pa,centre,half,scale,labels):
    ib=Image.open(pb).convert('RGB');ia=Image.open(pa).convert('RGB')
    cx,cy=centre;box=(max(0,int(cx-half[0])),max(0,int(cy-half[1])),min(W,int(cx+half[0])),min(H,int(cy+half[1])))
    cb=ib.crop(box).resize(((box[2]-box[0])*scale,(box[3]-box[1])*scale),Image.NEAREST);ca=ia.crop(box).resize(cb.size,Image.NEAREST)
    im=Image.new('RGB',(cb.width*2+10,cb.height+18),(30,30,30));im.paste(cb,(0,18));im.paste(ca,(cb.width+10,18))
    d=ImageDraw.Draw(im);d.text((4,3),'before '+labels[0],fill=(255,255,255));d.text((cb.width+14,3),'after '+labels[1],fill=(255,255,255));im.save(OUT+'/'+out)
summary=[]
# impacts
for tag in ['a','b','c','d']:
    sb,db=load('before-'+tag,'before');sa,da=load('after-'+tag,'after');nshown=0
    for i,(fb,fa) in enumerate(zip(sb['files'],sa['files'])):
        if tag in 'cd' and nshown>=3:break
        lr=fa.get('longRange');cam=fa.get('camera')
        for k,smp in enumerate((lr or {}).get('sample',[])):
            age=fa['clock']-smp['at']
            if not (0<=age<.8):continue
            pr=project(cam,(smp['x'],smp['y']+.3,smp['z']))
            if not pr:continue
            nshown+=1
            nm='impact-%s-%02d-%d.png'%(tag,i,k)
            pair(nm,db+fb['file'],da+fa['file'],(pr[0],pr[1]),(60,40),6,('offset %.2f'%fb['offset'],'%s %.0f m, age %.2f s'%(smp['material'],pr[2],age)))
            summary.append(('impact',nm,round(pr[2]),smp['material'],round(age,2),fb['offset'],fa['offset']))
# tracers (repair)
sb,db=load('before-c','before');sa,da=load('after-c','after')
for i,(fb,fa) in enumerate(zip(sb['files'],sa['files'])):
    ib=Image.open(db+fb['file']).convert('RGB');ia=Image.open(da+fa['file']).convert('RGB')
    region=(300,250,1066,520);pb,pa=orange(ib,region),orange(ia,region)
    n=(fb['fx']['tracer'],fa['fx']['tracer'])
    summary.append(('tracer',i,n,len(pb),len(pa)))
    p=pb or pa
    if p:
        cx=sum(x for x,y in p)/len(p);cy=sum(y for x,y in p)/len(p)
        pair('tracer-%02d.png'%i,db+fb['file'],da+fa['file'],(cx,cy),(60,40),6,('tracers %d, %d orange px'%(n[0],len(pb)),'tracers %d, %d orange px'%(n[1],len(pa))))
for s in summary:print(s)
