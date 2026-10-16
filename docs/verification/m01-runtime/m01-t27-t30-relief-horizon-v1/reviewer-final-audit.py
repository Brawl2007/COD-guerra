import json,hashlib,subprocess
from pathlib import Path
from PIL import Image,ImageChops
import numpy as np
ROOT=Path.cwd(); D=ROOT/'docs/verification/m01-runtime/m01-t27-t30-relief-horizon-v1'; R=ROOT/'.agent/runs/M01-T27-T30-20261012'
HEAD='4e5389b314f3e02b3197139cca953b79a5464d8f'; BASE='293a4f116b9b28818b7ff3bda4d83cc49b01014f'
def read(p):return json.loads(p.read_text())
def git(*a):return subprocess.check_output(['git',*a])
def sha(b):return hashlib.sha256(b).hexdigest()
assert git('rev-parse','HEAD').decode().strip()==HEAD
assert git('branch','--show-current').decode().strip()=='codex/m01-t27-t30-relief-horizon-v1'
manifest=read(D/'EVIDENCE_SHA256.json')
for p,h in manifest.items():assert sha((D/p).read_bytes())==h,p
frozen=read(D/'implementer-final-frozen-source.json')
for p,h in frozen.items():assert sha((ROOT/p).read_bytes())==h==sha(git('show',f'{HEAD}:{p}')),p
protected=['src/game','src/core','src/world','missions','assets','tools/assets','src/render/m01-track-bed.js','src/render/m01-props-runtime.js','src/render/m01-environment.js','src/render/m01-environment-props.js','src/render/m01-train-consist-detail.js','src/render/m01-locomotive.js','src/render/m01-train-wagons.js','src/render/m01-station-architecture.js','src/render/m01-field-structures.js','src/render/m01-bridge-structure.js','src/render/m01-terrain-material.js','src/render/m01-lighting.js','package.json','package-lock.json','playwright.config.js','vite.config.js']
assert not git('diff',BASE,HEAD,'--',*protected)
assert not git('diff','HEAD','--',*frozen)
assert git('-C',str(R/'baseline-checkout'),'rev-parse','HEAD').decode().strip()==BASE
assert not git('-C',str(R/'baseline-checkout'),'diff','HEAD')
# Validate independent source evidence against actual local frozen-source hashes.
for fname in ['verifier-final-source-probe.json','verifier-final-draw-family.json','verifier-final-evidence-audit.json']:
 x=read(D/fname);assert x['head']==HEAD
source=read(D/'verifier-final-source-probe.json');assert source['protected']['maxInterpolatedAttributeDelta']==source['protected']['maxRayDistanceDelta']==0
assert source['far']['actualMaximumPassesIncludingDoubleSidedMist']==5
union=read(D/'verifier-final-envelope-probe.json');assert union['protected1mSamples']==444600 and union['maxPhysicsHeightDelta']==union['maxVisualSamplerDelta']==0
views=read(D/'captures/same-paused-views.json');baseviews={v['name']:v for v in read(D/'baseline/same-paused-views.json')};pixels=[];budgets=[]
assert len(views)==6
for v in views:
 b=baseviews[v['name']];assert b['snapshot']==v['snapshot'];assert b['diagnostics']['clock']==v['clock'];assert b['diagnostics']['m01']['demolition']['camera']==v['camera'];assert not v['errors'] and not b['errors']
 g=v['diagnostics']['m01']['terrainRelief'];f=v['diagnostics']['m01']['farLandscape'];assert 0<g['triangles']<=52000 and 0<f['draws']<=10
 assert g['builds']==f['builds']==1
 assert v['diagnostics']['m01']['trackBed']['drawCalls']==4 and v['diagnostics']['m01']['environmentProps']['runtime']['loadedFiles']==42
 budgets.append({'name':v['name'],'ground':g['triangles'],'draws':g['draws'],'far':f['draws']})
 for s in v['samples']:
  feature=s['feature'];a=np.array(Image.open(D/f"captures/{v['name']}-{feature}-off.png").convert('RGB')).astype('int16');b=np.array(Image.open(D/f"captures/{v['name']}-{feature}-on.png").convert('RGB')).astype('int16');assert a.shape==b.shape==(720,1280,3)
  delta=np.abs(a-b).max(axis=2);ys,xs=np.where(delta>2);count=len(xs);control=int(delta[:24,:32].max());assert count>20 and control==0
  assert count==s['pixels']['changed'] and control==s['pixels']['controlMaxDiff']
  pixels.append({'name':v['name'],'feature':feature,'changed':count,'control':control,'bounds':[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]})
assert len(pixels)==10
plateau=read(D/'captures/restore-plateau.json');assert len(plateau['samples'])==5
for s in plateau['samples']:assert (s['geometries'],s['textures'],s['clock'])==(536,134,.05)
assert [(s['label'],s['geometries'],s['textures'],s['clock']) for s in plateau['initialWarmup']]==[(s['label'],s['geometries'],s['textures'],s['clock']) for s in plateau['reloadWarmup']]
allroutes=read(D/'futures-final-24.json');assert allroutes['candidateHead']==HEAD and allroutes['baselineHead']==BASE
parts={}
for suffix in ['a','b']:
 p=read(D/f'futures-final-{suffix}.json');assert p['candidateHead']==HEAD and p['baselineHead']==BASE and p['sourceHashes']==allroutes['sourceHashes'];assert len(p['routes'])==12
 assert 'PASS 12 complete real-control A/B futures:' in (D/f'futures-final-{suffix}.log').read_text()
 for r in p['routes']:assert (r['seed'],r['support']) not in parts;parts[r['seed'],r['support']]=r
assert len(parts)==24
pairs=0
for r in allroutes['routes']:
 assert r==parts[r['seed'],r['support']];assert r['complete'];assert r['finalSha256']==r['baselineFinalSha256'];assert r['finalCheckpointSha256']==r['baselineFinalCheckpointSha256']
 for cp in r['checkpointPairs']:assert cp['candidateSha256']==cp['baselineSha256'];pairs+=1
assert pairs==120
for p,h in allroutes['sourceHashes'].items():assert sha((ROOT/p).read_bytes())==h
normal=(D/'ci-final-node.log').read_text();browser=(D/'ci-final-browser.log').read_text();assert HEAD in normal and HEAD in browser
for marker in ['tests 669','pass 669','Ran 173 tests','92 modules transformed.']:assert marker in normal
assert '2 passed (6.6m)' in browser and 'Run git diff --exit-code' in browser
ci=read(D/'ci-final-status.json');assert ci['head']==HEAD and ci['normal']['conclusion']==ci['focused']['conclusion']=='success'
report={'status':'PASS','head':HEAD,'base':BASE,'manifestEntries':len(manifest),'publishedFrozenFiles':len(frozen),'protectedDiffEmpty':True,'canonicalAndSupplementPairs':6,'pixels':pixels,'budgets':budgets,'resourcePlateau':[536,134,.05],'futures':{'routes':len(parts),'ticks':sum(r['ticks'] for r in allroutes['routes']),'actorSamples':sum(r['actorSamples'] for r in allroutes['routes']),'checkpointPairs':pairs},'exactHeadCI':ci,'method':'Fresh reviewer hashes, Git scope/provenance, direct PNG inspection plus pixel recomputation, snapshot/camera/clock/plateau/route semantic audit. Existing executed test/browser/futures results retain their original runner attribution.'}
(R/'reviewer-final-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
