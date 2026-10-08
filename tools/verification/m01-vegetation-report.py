"""Pairs and counters for the M01 vegetation closeout probes (BASE vs CANDIDATE, same restored state)."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
out=Path(sys.argv[1])
a=json.loads((out/'BASE-report.json').read_text());b=json.loads((out/'CANDIDATE-report.json').read_text())
key=lambda s:(s['name'],s['quality']);before={key(s):s for s in a['shots']};after={key(s):s for s in b['shots']}
assert before.keys()==after.keys() and len(before)==15
rows=[];equal=[]
for k in sorted(before,key=lambda k:(['medium','high','low'].index(k[1]),k[0])):
  x,y=before[k],after[k];assert not x['errors'] and not y['errors'],k
  assert x['stateHash'] and x['stateHash']==y['stateHash'],('state differs',k);equal.append(k)
  for f in ['x','y','z','angle','pitch']:assert x['diagnostics']['player'][f]==y['diagnostics']['player'][f],(k,f)
  vx,vy=x['diagnostics']['m01']['vegetation'],y['diagnostics']['m01']['vegetation']
  base_veg=vx['treeTriangles']+vx['grassInstances']*4;cand_veg=vy['treeTriangles']+vy['groundTriangles']
  rows.append(f"| {k[0]} | {k[1]} | {x['diagnostics']['drawCalls']} → {y['diagnostics']['drawCalls']} | {x['diagnostics']['triangles']:,} → {y['diagnostics']['triangles']:,} ({(y['diagnostics']['triangles']/x['diagnostics']['triangles']-1)*100:+.1f}%) | ~{base_veg:,} → {cand_veg:,} | {vx['grassInstances']:,} → {vy['grassInstances']:,} | {vy['shrubLod']['near']}/{vy['shrubLod']['mid']} | {x['diagnostics']['textures']} → {y['diagnostics']['textures']} |")
  if k[1]!='low' or True:
    A=Image.open(out/x['path']).convert('RGB');B=Image.open(out/y['path']).convert('RGB');w,h=A.size
    pair=Image.new('RGB',(w*2,h+34),(24,24,24));pair.paste(A,(0,34));pair.paste(B,(w,34));d=ImageDraw.Draw(pair)
    d.text((12,10),f'BASE {k[0]} {k[1]}',fill=(240,240,240));d.text((w+12,10),f'CANDIDATE {k[0]} {k[1]}',fill=(240,240,240))
    pair.resize((w,(h+34)//2)).save(out/f'screenshots/PAIR-{k[0]}-{k[1]}.jpg',quality=86)
head='| Probe | Quality | Draw calls | Frame triangles | Vegetation triangles (base grass est. 4/tuft) | Ground tufts submitted | Shrubs near/mid | Textures |\n|---|---|---|---|---|---|---|---|\n'
(out/'PERFORMANCE.md').write_text('# Vegetation counters (renderer.info, paused fixed probes)\n\nCounters only; no FPS or frame-time claim. SwiftShader software WebGL, 1280×720.\n\n'+head+'\n'.join(rows)+'\n')
(out/'STATE_EQUIVALENCE.json').write_text(json.dumps({'pairs':len(equal),'stateHashEqual':True,'shots':[{'name':n,'quality':q,'stateHash':before[(n,q)]['stateHash']} for n,q in equal]},indent=2)+'\n')
print('\n'.join(rows))
