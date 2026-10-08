"""Build comparison boards from actual PNG captures. Requires Pillow, verification only.

Full PNGs and uncompressed raw reports remain in the Actions artifact. Full-resolution
JPEGs, comparison boards, raw report gzip copies and measured pixel/renderer metrics
are the durable repository evidence. No generated or retouched game imagery.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat

root = Path(os.environ.get('M01_V7_EVIDENCE', 'docs/verification/m01-runtime/final-approved-deliveries-integration-v7'))
records = []
reports = {}
for name in ['VISUAL_COMPARISON', 'TRANSIENT_COMPARISON']:
    file = root / (name + '.json')
    data = file.read_bytes()
    reports[name] = json.loads(data)
    assert len(reports[name]['captures']) == (72 if name == 'VISUAL_COMPARISON' else 42)
    with (root / (name + '.json.gz')).open('wb') as out:
        with gzip.GzipFile(fileobj=out, mode='wb', mtime=0) as compressed:
            compressed.write(data)
    records.extend(reports[name]['captures'])

pairs = []
for quality in ['low', 'medium', 'high']:
    for name in sorted({r['name'] for r in records}):
        pair = sorted([r for r in records if r['name'] == name and r['quality'] == quality], key=lambda r: r['version'])
        assert [r['version'] for r in pair] == ['V6', 'V7']
        assert pair[0]['snapshotSha256'] == pair[1]['snapshotSha256']
        images = [Image.open(root / r['file']).convert('RGB') for r in pair]
        assert images[0].size == images[1].size == (1280, 720)
        stats = ImageStat.Stat(ImageChops.difference(*images))
        images_rgba = [Image.open(root / r['file']).convert('RGBA') for r in pair]
        row = {'name': name, 'quality': quality, 'clock': pair[0]['clock'], 'snapshotSha256': pair[0]['snapshotSha256'],
               'pixelsIdentical': images_rgba[0].tobytes() == images_rgba[1].tobytes(),
               'meanAbsoluteRgbDifference': stats.mean, 'versions': {}}
        for r, image in zip(pair, images):
            png = root / r['file']
            jpg = png.with_suffix('.jpg')
            image.save(jpg, quality=92, subsampling=0, optimize=True)
            measured = {k: r[k] for k in ['drawCalls', 'triangles', 'textures', 'geometries', 'environmentInstances'] if k in r}
            if 'state' in r:
                measured['fixtureRender'] = r['state'].get('render')
                if measured['fixtureRender'] is None:
                    measured['metricLimit'] = 'Protected V6 fixture does not expose render counters; production-app pairs do.'
            row['versions'][r['version']] = {'png': r['file'], 'pngSha256': hashlib.sha256(png.read_bytes()).hexdigest(),
                                            'jpeg': str(jpg.relative_to(root)), 'jpegSha256': hashlib.sha256(jpg.read_bytes()).hexdigest(),
                                            'pngBytes': png.stat().st_size, 'jpegBytes': jpg.stat().st_size, **measured}
        pairs.append(row)

groups = {'station': ['station-frontal', 'station-oblique', 'station-yard', 'station-platform', 'station-window'],
          'world': ['bridge-west', 'bridge-east', 'train-963', 'panzerzug', 'soldiers', 'evacuation', 'roll-call'],
          'weapon': ['weapon-hip', 'weapon-ads-turn', 'weapon-shot', 'weapon-brass', 'weapon-reload'],
          'fx': ['grenade-explosion', 'east-demolition']}
boards = []
board_root = root / 'boards'
board_root.mkdir(exist_ok=True)
for quality in ['low', 'medium', 'high']:
    for group, names in groups.items():
        board = Image.new('RGB', (1280, 52 + len(names) * 388), '#151918')
        draw = ImageDraw.Draw(board)
        draw.text((12, 12), f'M01 V7 / {quality.upper()} / {group} | actual matched captures, player-height or real stepped fixture', fill='white')
        draw.text((12, 30), 'V6 protected cbc7de5', fill='#b6c9d2')
        draw.text((652, 30), 'V7 integrated (same camera / state / quality)', fill='#b6c9d2')
        for y, name in enumerate(names):
            for x, version in enumerate(['V6', 'V7']):
                record = next(r for r in records if r['name'] == name and r['quality'] == quality and r['version'] == version)
                image = Image.open(root / record['file']).convert('RGB')
                image.thumbnail((640, 360), Image.Resampling.LANCZOS)
                top = 52 + y * 388
                draw.text((x * 640 + 12, top + 6), f'{version} / {name} / t={record["clock"]:.3f}', fill='white')
                board.paste(image, (x * 640, top + 28))
        file = board_root / f'{group}-{quality}.jpg'
        board.save(file, quality=92, subsampling=0, optimize=True)
        boards.append(str(file.relative_to(root)))

summary = {'taskId': 'M01-FINAL-APPROVED-DELIVERIES-INTEGRATION-V7', 'base': reports['VISUAL_COMPARISON']['base'],
           'testedHead': reports['VISUAL_COMPARISON']['testedHead'], 'browsers': {'production': reports['VISUAL_COMPARISON']['browserVersion'], 'transients': reports['TRANSIENT_COMPARISON']['browser']},
           'pairs': pairs, 'pairCount': len(pairs), 'captureCount': len(records), 'allSnapshotsEquivalent': True, 'boards': boards,
           'fpsMeasured': False, 'physicalGpuMemoryMeasured': False,
           'imageEncoding': 'Pixel measurements from original lossless PNG; repository JPEG copies at original 1280x720, quality 92, no retouch. Lossless PNGs in Actions artifact.'}
assert len(pairs) == 57
(root / 'VISUAL_SUMMARY.json').write_text(json.dumps(summary, indent=2) + '\n')
print(f'PASS: {len(pairs)} matched pairs, {len(records)} full-resolution copies, {len(boards)} comparison boards; no gameplay-state differences')
