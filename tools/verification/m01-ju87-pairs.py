"""Pares lado a lado BASE | CANDIDATE dos recortes do raid (raid-capture.mjs) e tabela de contadores do renderer.

Os recortes são 1:1 ampliados ×3 por vizinho mais próximo; o par só acrescenta etiquetas e a moldura.
Uso: python3 -I tools/verification/m01-ju87-pairs.py <pasta captures> <pasta de saída dos pares>
Imprime a tabela Markdown dos contadores (drawCalls, triângulos, geometrias, texturas) por captura.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

root, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
rows = []
for base_json in sorted((root / 'BASE').glob('raid-capture*.json')):
    cand_json = root / 'CANDIDATE' / base_json.name
    if not cand_json.exists():
        continue
    base, cand = json.loads(base_json.read_text()), json.loads(cand_json.read_text())
    for b in base['shots']:
        c = next((s for s in cand['shots'] if s['quality'] == b['quality']), None)
        if c is None:
            continue
        left, right = Image.open(root / 'BASE' / b['crop']).convert('RGB'), Image.open(root / 'CANDIDATE' / c['crop']).convert('RGB')
        pair = Image.new('RGB', (left.width + right.width + 8, left.height + 28), (24, 24, 24))
        pair.paste(left, (0, 28)); pair.paste(right, (left.width + 8, 28))
        draw = ImageDraw.Draw(pair)
        tag = b['crop'].replace('-crop3x.png', '')
        draw.text((8, 8), f"BASE 99309d9 - {tag} - clock {b['clock']:.2f} s - recorte 1:1 x3", fill=(235, 235, 235))
        draw.text((left.width + 16, 8), f"CANDIDATA - {tag} - clock {c['clock']:.2f} s - recorte 1:1 x3", fill=(235, 235, 235))
        name = f'PAIR-{tag}.png'
        pair.save(out / name, optimize=True)
        rb, rc = b['render'], c['render']
        rows.append((tag, b['quality'], rb, rc, name))
print('| Captura | Qualidade | Draw calls BASE → CANDIDATA | Triângulos BASE → CANDIDATA | Geometrias | Texturas | Par |')
print('|---|---|---:|---:|---:|---:|---|')
for tag, q, rb, rc, name in rows:
    dt = (rc['triangles'] - rb['triangles']) / rb['triangles'] * 100
    print(f"| {tag} | {q} | {rb['drawCalls']} → {rc['drawCalls']} | {rb['triangles']} → {rc['triangles']} ({dt:+.2f} %) | {rb['geometries']} → {rc['geometries']} | {rb['textures']} → {rc['textures']} | [{name}](pairs/{name}) |")
