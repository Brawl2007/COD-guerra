import hashlib,json,math,struct,subprocess
from pathlib import Path
root=Path.cwd(); run=root/'.agent/runs/M01-T10-T29-20261013'; out=run/'runtime/verifier'
sha=lambda b:hashlib.sha256(b).hexdigest()
a=json.loads((run/'authority-baseline.json').read_text()); assert len(a['paths'])==533
for p,h in a['sha256'].items(): assert sha((root/p).read_bytes())==h,p
s=json.loads((run/'runtime/final-source/source-manifest-final-published.json').read_text())
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==s['gitHead']
for p,e in s['files'].items():
 b=(root/p).read_bytes(); assert sha(b)==e['sha256'] and len(b)==e['bytes'],p
b=(root/'assets/models/provisional/m01/vegetation/vegetation-kit.glb').read_bytes(); magic,version,length=struct.unpack_from('<III',b); assert (magic,version,length)==(0x46546c67,2,len(b));jl,jt=struct.unpack_from('<II',b,12);assert jt==0x4e4f534a
j=json.loads(b[20:20+jl]);bl,bt=struct.unpack_from('<II',b,20+jl);assert bt==0x004e4942;data=b[28+jl:28+jl+bl]
m=json.loads((root/'assets/models/provisional/m01/vegetation/manifest.json').read_text()); assert sha(b)==m['asset']['sha256'];assert len(j['meshes'])==len(m['models'])==43;assert len(j['textures'])==len(j['images'])==1
assert j['materials'][1]['alphaMode']=='MASK' and j['materials'][1]['doubleSided']; assert j['materials'][1]['alphaCutoff']>0
sizes={'VEC3':3,'VEC2':2,'SCALAR':1};types={5126:('f',4),5123:('H',2)}
def read(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];fmt,unit=types[a['componentType']];n=a['count']*sizes[a['type']];off=v.get('byteOffset',0)+a.get('byteOffset',0);assert off+n*unit<=len(data);return struct.unpack_from('<'+fmt*n,data,off)
records=[];silhouettes={}
for mesh in j['meshes']:
 record=next(r for r in m['models'] if r['id']==mesh['name']);low=[math.inf]*3;high=[-math.inf]*3;tri=0;poshash=hashlib.sha256()
 for p in mesh['primitives']:
  pos=read(p['attributes']['POSITION']);normal=read(p['attributes']['NORMAL']);uv=read(p['attributes']['TEXCOORD_0']);wind=read(p['attributes']['_WIND']);idx=read(p['indices']);n=len(wind)
  assert len(pos)==len(normal)==n*3 and len(uv)==n*2;assert len(idx)%3==0 and max(idx)<n;tri+=len(idx)//3
  assert all(math.isfinite(v) for v in pos+normal+uv+wind);assert all(0<=v<=1 for v in uv+wind);assert 0 in wind
  for q in range(n):
   assert abs(math.sqrt(sum(v*v for v in normal[q*3:q*3+3]))-1)<1e-6
   if pos[q*3+1]==0: assert wind[q]==0
  for q,v in enumerate(pos): low[q%3]=min(low[q%3],v);high[q%3]=max(high[q%3],v)
  poshash.update(struct.pack('<'+'f'*len(pos),*pos))
 assert tri==record['triangles'] and low==record['bounds']['min'] and high==record['bounds']['max'],mesh['name']
 if record['family']=='tree':
  assert record['lod']!=0 or tri<=2500;assert record['lod']!=2 or tri<=120;assert record['lod']!=3 or tri==8
 if record['family']=='shrub' or record['family']=='tree' and record['lod']==0: silhouettes.setdefault(record['family'],[]).append(poshash.hexdigest())
 records.append({'id':mesh['name'],'actualTriangles':tri,'min':low,'max':high})
assert len(set(silhouettes['tree']))==8 and len(set(silhouettes['shrub']))==6
atlas=(root/'assets/models/provisional/m01/vegetation/foliage-alpha.png').read_bytes();assert sha(atlas)==m['atlas']['sha256'];w,h=struct.unpack_from('>II',atlas,16);assert (w,h)==(512,512);assert m['atlas']['decodedRGBA8']==w*h*4
report={'status':'PASS','source':s['gitHead'],'aggregate':s['sourceSHA256'],'criticalFiles':len(s['files']),'protectedFiles':len(a['paths']),'actualModels':records,'distinctSilhouettes':{k:len(set(v)) for k,v in silhouettes.items()},'atlasRGBA8':w*h*4,'mipsRGBA8':m['atlas']['mipRGBA8']}
(out/'independent-assets.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS independent actual binary assets, 43 models, 29 critical and 533 protected files')
