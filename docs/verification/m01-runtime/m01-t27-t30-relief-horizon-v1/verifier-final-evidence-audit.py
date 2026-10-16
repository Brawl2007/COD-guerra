import json,hashlib,subprocess
from pathlib import Path
from PIL import Image
import numpy as np
root=Path.cwd(); d=root/'docs/verification/m01-runtime/m01-t27-t30-relief-horizon-v1'; run=root/'.agent/runs/M01-T27-T30-20261012'
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(); assert head=='4e5389b314f3e02b3197139cca953b79a5464d8f'
hash=lambda b:hashlib.sha256(b).hexdigest()
manifest=json.loads((d/'EVIDENCE_SHA256.json').read_text())
for name,h in manifest.items(): assert hash((d/name).read_bytes())==h,name
frozen=json.loads((d/'implementer-final-frozen-source.json').read_text())
for name,h in frozen.items():
 assert hash((root/name).read_bytes())==h,name
 assert hash(subprocess.check_output(['git','show',f'{head}:{name}']))==h,name
base=json.loads((d/'baseline/same-paused-views.json').read_text()); current=json.loads((d/'captures/same-paused-views.json').read_text()); assert len(base)==len(current)==6
pixels=[]; cameras=[]
for a,b in zip(base,current):
 assert a['name']==b['name']; assert a['snapshot']==b['snapshot']; assert a['diagnostics']['clock']==b['diagnostics']['clock']; assert a['diagnostics']['m01']['demolition']['camera']==b['camera']; assert b['camera']==b['diagnostics']['m01']['demolition']['camera']; assert a['errors']==b['errors']==[]
 cameras.append({'view':b['name'],'snapshotCameraClockExact':True,'groundTriangles':b['diagnostics']['m01']['terrainRelief']['triangles'],'groundDraws':b['diagnostics']['m01']['terrainRelief']['draws'],'farTriangles':b['diagnostics']['m01']['farLandscape']['triangles'],'farDraws':b['diagnostics']['m01']['farLandscape']['draws']})
 for sample in b['samples']:
  feature=sample['feature']; before=np.asarray(Image.open(d/f"captures/{b['name']}-{feature}-off.png").convert('RGB'),dtype=np.int16); after=np.asarray(Image.open(d/f"captures/{b['name']}-{feature}-on.png").convert('RGB'),dtype=np.int16)
  diff=np.max(np.abs(before-after),axis=2); changed=int((diff>2).sum()); control=int(diff[:24,:32].max()); assert changed==sample['pixels']['changed']; assert control==sample['pixels']['controlMaxDiff']==0; assert changed>20
  pixels.append({'view':b['name'],'feature':feature,'changed':changed,'controlMaxDiff':control})
f=json.loads((d/'futures-final-24.json').read_text()); seeds=[19390901,1,2,3,7,17,41,73,99,1234,1945,4294967295]; assert f['candidateHead']==head; assert f['baselineHead']=='293a4f116b9b28818b7ff3bda4d83cc49b01014f'; assert sorted(f['seeds'])==sorted(seeds)
assert len(f['routes'])==24; assert {(r['seed'],r['support']) for r in f['routes']}=={(s,t) for s in seeds for t in [False,True]}
cp=0
for r in f['routes']:
 assert r['complete'] and r['battleClock']==25500
 assert r['finalSha256']==r['baselineFinalSha256']; assert r['finalCheckpointSha256']==r['baselineFinalCheckpointSha256']; assert len(r['checkpoints'])==4
 for p in r['checkpointPairs']: assert p['candidateSha256']==p['baselineSha256']; cp+=1
for name,h in f['sourceHashes'].items(): assert hash((root/name).read_bytes())==h,name
parts=[json.loads((d/f'futures-final-{part}.json').read_text()) for part in ['a','b']]; assert {(r['seed'],r['support']):r for p in parts for r in p['routes']}=={(r['seed'],r['support']):r for r in f['routes']}
for part in ['a','b']: assert 'PASS 12 complete real-control A/B futures' in (d/f'futures-final-{part}.log').read_text()
assert subprocess.check_output(['git','-C',str(run/'baseline-checkout'),'rev-parse','HEAD'],text=True).strip()==f['baselineHead']; assert not subprocess.check_output(['git','-C',str(run/'baseline-checkout'),'diff','--name-only'],text=True).strip()
report={'status':'PASS','head':head,'manifestEntriesVerified':len(manifest),'frozenPublishedSourceFiles':len(frozen),'pausedCameras':cameras,'pixelsIndependentlyRecomputed':pixels,'futuresEvidenceAudited':{'routes':24,'seeds':seeds,'ticks':sum(r['ticks'] for r in f['routes']),'actorSamples':sum(r['actorSamples'] for r in f['routes']),'checkpointPairs':cp,'finalPairs':24,'terminalPartitionPasses':2},'note':'Actual new independent hashes/pixel computations and artifact semantic audit; settled browser/futures execution remains attributed to original runners.'}
(run/'verifier-final-evidence-audit.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
