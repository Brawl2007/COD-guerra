"""Build review documents from completed, matching production browser probes."""
import json, sys, hashlib
from pathlib import Path
from PIL import Image, ImageDraw
out=Path(sys.argv[1]);code_head=sys.argv[2]
a=json.loads((out/'BASE-report.json').read_text());b=json.loads((out/'CANDIDATE-report.json').read_text())
key=lambda s:(s['name'],s['quality'])
before={key(s):s for s in a['shots']};after={key(s):s for s in b['shots']}
assert len(before)==len(after)==18 and before.keys()==after.keys()
for k,x in before.items():
 y=after[k];assert not x['errors'] and not y['errors'];assert x['stateHash'] and x['stateHash']==y['stateHash'],k
 assert sorted(x['diagnostics']['m01']['characters']['loaded'])==sorted(y['diagnostics']['m01']['characters']['loaded']),('asset mismatch',k)
fixtures=json.loads((out/'camera-fixtures.json').read_text())
for f in fixtures:
 for q in ['medium','high','low']:
  for shot in [before[(f['name'],q)],after[(f['name'],q)]]:
   d=shot['diagnostics'];assert d['clock']==f['snapshot']['clock'];assert d['m01']['battleClock']==f['snapshot']['battleClock']
   for field in ['x','y','z','angle','pitch']:assert d['player'][field]==f['snapshot']['player'][field],(f['name'],q,field)
clock=lambda t:f'{int(t)//3600:02}:{int(t)%3600//60:02}:{int(t)%60:02}'
lines=['# Fixed-camera before / after', '',f'BASE: `codex/m01-schema2-determinism-audit @ 5f3cc34f53c61beec52255d67f8babd7194c9f7f`. Candidate runtime: `{code_head}`.', '',
'Production browser captures, 1280×720, identical full restored simulation state, staged camera position/angles, battle clock and explicit quality. Camera staging is evidence setup, not a production gameplay edit or a human playtest. All 18 full-state SHA-256 pairs match; all probes hold that state through capture while paused.', '',
'The baseline worktree contains only the same opt-in read-only `gameVerificationState` debug reader used by the candidate. No baseline simulation or renderer behaviour was patched. The source baseline is otherwise the exact approved commit.', '',
'High probes wait for all requested character/MG34/CKM LODs. PNG originals remain unchanged; paired JPEGs add only labels and side-by-side layout.', '',
'| Point | Camera x / y / z (m) | Mission seconds | Battle clock |', '|---|---|---:|---|']
for f in fixtures:
 s=f['snapshot'];p=s['player'];lines.append(f"| {f['name']} | {p['x']:.2f} / {p['y']:.2f} / {p['z']:.2f} | {s['clock']:.3f} | {clock(s['battleClock'])} |")
lines+=['','| Pair | BASE original | CANDIDATE original | Side by side |','|---|---|---|---|']
for q in ['medium','high']:
 for f in fixtures:
  name=f['name'];x=before[(name,q)];y=after[(name,q)];pair=f'screenshots/PAIR-{name}-{q}.jpg'
  im=Image.new('RGB',(2560,760),'#171b1c');draw=ImageDraw.Draw(im);draw.text((20,12),f'BASE - {name} - {q.upper()}',fill='white');draw.text((1300,12),f'CANDIDATE - {name} - {q.upper()}',fill='white')
  im.paste(Image.open(out/x['path']).convert('RGB'),(0,40));im.paste(Image.open(out/y['path']).convert('RGB'),(1280,40));im.save(out/pair,quality=88,subsampling=0)
  lines.append(f"| {name} / {q} | [BASE]({x['path']}) | [CANDIDATE]({y['path']}) | [Pair]({pair}) |")
lines+=['','Low is recorded in the JSON/resource table for regression and cost, not used as the visual approval preset. Supplemental F is a genuine repair-area bomb damage record at 0.6 s, exposing pressure dust/chips without inventing a new event.','',
'Reproduce: build a detached baseline worktree (with the documented reader), then run `tools/verification/m01-environment-capture.mjs <this-folder> BASE <baseline-root>` and again with `CANDIDATE <candidate-root>`. Set `CHROME_EXECUTABLE` to an installed WebGL2-capable Chromium and optionally `VISUAL_PORT` (default 4183). Run this report script after both complete.']
(out/'BEFORE_AFTER.md').write_text('\n'.join(lines)+'\n')
p=out/'PERFORMANCE.md';text=p.read_text().split('\n<!-- MEASUREMENTS -->')[0].replace('Measured comparison table is generated from BASE-report.json and CANDIDATE-report.json after final captures.','All counters below are direct `renderer.info` samples from the matching production probes. Geometry/texture counts reflect resources actually rendered, including the first-person pass, rather than an asset-manifest count.')
rows=['','<!-- MEASUREMENTS -->','| Scene / quality | Calls BASE → CANDIDATE | Triangles BASE → CANDIDATE | Change | Geometries BASE → CANDIDATE | Textures BASE → CANDIDATE |','|---|---:|---:|---:|---:|---:|']
for k,x in before.items():
 y=after[k];u=x['diagnostics'];v=y['diagnostics'];delta=(v['triangles']/u['triangles']-1)*100
 rows.append(f"| {k[0]} / {k[1]} | {u['drawCalls']} → {v['drawCalls']} | {u['triangles']} → {v['triangles']} | {delta:+.1f}% | {u['geometries']} → {v['geometries']} | {u['textures']} → {v['textures']} |")
p.write_text(text+'\n'+'\n'.join(rows)+'\n')
(out/'BROWSER_EQUIVALENCE.json').write_text(json.dumps({'pass':True,'pairs':18,'pauseHeld':True,'assetSetsEqual':True,'cameraFixturesSha256':hashlib.sha256((out/'camera-fixtures.json').read_bytes()).hexdigest(),'stateHashes':[{ 'name':k[0],'quality':k[1],'base':x['stateHash'],'candidate':after[k]['stateHash']} for k,x in before.items()]},indent=2)+'\n')
print('PASS: 18 matching full states/assets, paired images and workload tables generated')
