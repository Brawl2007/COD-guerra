# Summary of fixture-frame-cost.mjs output (one JSON line per run): frames, total and median ms, and per frame
# [ms, mission clock, weapon state]. Usage: python3 -I fixture-frame-cost-summary.py <raw.jsonl> raw-label=label ... > summary.jsonl
import json, sys
names = dict(a.split('=', 1) for a in sys.argv[2:])
for line in open(sys.argv[1]):
    r = json.loads(line); fr = r['frames']
    print(json.dumps({'label': names.get(r['label'], r['label']), 'frames': len(fr), 'totalMs': sum(f[0] for f in fr),
                      'medianMs': sorted(f[0] for f in fr)[len(fr) // 2], 'perFrame': [[f[0], f[1], f[2]] for f in fr]}))
