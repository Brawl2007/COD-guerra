"""Contact sheets from the real browser captures and encoded review videos.

Requires Pillow and ffmpeg; never generates or edits character geometry/poses.
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[4]
parser = argparse.ArgumentParser()
parser.add_argument('--out', type=Path, default=ROOT / 'docs/verification/m01-runtime/soldier-motion-clips-production-v1')
args = parser.parse_args()
out = args.out.resolve()
manifest = json.loads((ROOT / 'assets/models/provisional/m01/characters/motion-clips-v1/manifest.json').read_text())
sheet_dir = out / 'sheets'
sheet_dir.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
rows = []
for spec in manifest['clips']:
    name = spec['name']
    for view, y in [('front', 0), ('side', 380)]:
        sheet = Image.new('RGB', (1920, 584), '#18272d')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 8), f'{name} | {view} | Base em cima; novo clip em baixo | 0%, 25%, 50%, 75%, 100%', font=font, fill='#edf1ee')
        for column, percent in enumerate([0, 25, 50, 75, 100]):
            original = Image.open(out / 'captures' / f'{name}-{percent:03d}.jpg')
            for row, x in enumerate([0, 560]):
                tile = original.crop((x, y + 28, x + 560, y + 380)).resize((384, 241), Image.Resampling.LANCZOS)
                sheet.paste(tile, (column * 384, 54 + row * 261))
                draw.text((column * 384 + 10, 32 + row * 261), f'{percent}% · {"base" if row == 0 else "novo"}', font=small, fill='#edf1ee')
        file = f'sheets/{name}-{view}.jpg'
        sheet.save(out / file, quality=91)
        rows.append({'file': file, 'kind': 'five exact requested phases from raw screenshots', 'views': [view]})
    with tempfile.TemporaryDirectory(prefix='m01-motion-film-') as temporary:
        # Nine chronological samples of the encoded video, not new rendered poses.
        times = [0, .12, .24, .37, .50, .62, .74, .88, .99]
        sheet = Image.new('RGB', (2016, 342), '#18272d')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 8), f'{name} | frames da sequencia MP4 real | Novo clip: frontal / lateral', font=font, fill='#edf1ee')
        for column, phase in enumerate(times):
            seconds = phase * spec['duration_s']
            frame = Path(temporary) / f'{column}.png'
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{seconds:.6f}', '-i', str(out / 'sequences' / f'{name}.mp4'), '-frames:v', '1', str(frame)], check=True)
            image = Image.open(frame).crop((560, 28, 1120, 744)).resize((224, 286), Image.Resampling.LANCZOS)
            sheet.paste(image, (column * 224, 54))
            draw.text((column * 224 + 8, 33), f'{seconds:.3f} s', font=small, fill='#edf1ee')
        file = f'sheets/{name}-sequence.jpg'
        sheet.save(out / file, quality=93)
        rows.append({'file': file, 'kind': 'chronological frames extracted from encoded MP4', 'sample_times_s': [p * spec['duration_s'] for p in times]})
    # Six original models in the same authored pose; candidate front / side.
    variants = [(nation, lod) for nation in ['pl', 'de'] for lod in [0, 1, 2]]
    sheet = Image.new('RGB', (2016, 492), '#18272d')
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 8), f'{name} | compatibilidade PL / DE e LOD0 / LOD1 / LOD2 | novo: frontal / lateral', font=font, fill='#edf1ee')
    for column, (nation, lod) in enumerate(variants):
        original = Image.open(out / 'captures' / f'compat-{nation}-lod{lod}-{name}.jpg')
        tile = original.crop((560, 28, 1120, 744)).resize((336, 430), Image.Resampling.LANCZOS)
        sheet.paste(tile, (column * 336, 60))
        draw.text((column * 336 + 8, 36), f'{nation.upper()} LOD{lod}', font=font, fill='#edf1ee')
    file = f'sheets/{name}-compat.jpg'
    sheet.save(out / file, quality=93)
    rows.append({'file': file, 'kind': 'six real textured original models at a shared clip phase', 'variants': [{'nation': n, 'lod': l} for n, l in variants]})
(out / 'contact-sheets.json').write_text(json.dumps(rows, indent=2) + '\n')
print(json.dumps({'sheets': len(rows), 'video_sequences_sampled': len(manifest['clips']), 'compatibility_sheets': len(manifest['clips'])}))
