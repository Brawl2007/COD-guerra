"""Métrica antes/depois da silhueta do Ju 87 nas capturas do raid (raid-capture.mjs).

Cada imagem é segmentada sozinha, numa janela 1:1 de 160×120 em torno do centro registado em raid-capture*.json:
o fundo local é um filtro de mediana 21×21 (o avião é fino e desaparece no filtro) e o avião são os píxeis cuja
luminância se afasta mais de 18 do fundo. Reporta píxeis, cor média, luminância mediana do avião e do fundo, e o
contraste (fundo − avião). Não é uma medida de qualidade absoluta; só compara a mesma vista na base e na candidata.
Uso: python3 -I tools/verification/m01-ju87-silhouette-metrics.py <pasta captures> > SILHOUETTE_METRICS.json
"""
import json
import statistics
import sys
from pathlib import Path

from PIL import Image, ImageFilter

root = Path(sys.argv[1])
lum = lambda p: 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def measure(path, centre):
    cx, cy = centre
    win = Image.open(path).convert('RGB').crop((cx - 80, cy - 60, cx + 80, cy + 60))
    bg = win.filter(ImageFilter.MedianFilter(21))
    plane, sky = [], []
    for y in range(win.height):
        for x in range(win.width):
            p, b = win.getpixel((x, y)), bg.getpixel((x, y))
            (plane if abs(lum(p) - lum(b)) > 18 else sky).append(p)
    if not plane:
        return None
    m = statistics.median(lum(p) for p in plane)
    s = statistics.median(lum(p) for p in sky)
    return {'pixels': len(plane), 'mean_rgb': [round(sum(p[k] for p in plane) / len(plane), 1) for k in range(3)],
            'median_luminance': round(m, 1), 'sky_median_luminance': round(s, 1), 'contrast': round(s - m, 1)}


out = []
for base_json in sorted((root / 'BASE').glob('raid-capture*.json')):
    cand_json = root / 'CANDIDATE' / base_json.name
    if not cand_json.exists():
        continue
    base, cand = json.loads(base_json.read_text()), json.loads(cand_json.read_text())
    for b in base['shots']:
        c = next((s for s in cand['shots'] if s['quality'] == b['quality']), None)
        if c is None:
            continue
        out.append({'file': b['file'], 'quality': b['quality'],
                    'base': measure(root / 'BASE' / b['file'], b['cropCentre']),
                    'candidate': measure(root / 'CANDIDATE' / c['file'], c['cropCentre'])})
json.dump(out, sys.stdout, indent=2)
print()
