#!/usr/bin/env python3
"""R6-a: side-by-side BEFORE | AFTER montages (JPEG, half size) of the first-person frames captured by m01-fp-hands-evidence.mjs.

  python3 tools/verification/m01-fp-hands-compare.py docs/verification/m01-runtime/fp-hands-2026-10-23
"""
import os
import sys

from PIL import Image, ImageDraw

root = sys.argv[1]
before, after, out = (os.path.join(root, d) for d in ('before', 'after', 'compare'))
os.makedirs(out, exist_ok=True)
names = sorted(f[:-4] for f in os.listdir(before) if f.endswith('.png') and not f.endswith(('-right.png', '-top.png')))
for name in names:
    a, b = Image.open(os.path.join(before, name + '.png')).convert('RGB'), Image.open(os.path.join(after, name + '.png')).convert('RGB')
    sheet = Image.new('RGB', (a.width + b.width, a.height))
    sheet.paste(a, (0, 0))
    sheet.paste(b, (a.width, 0))
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, 260, 22), fill=(0, 0, 0))
    draw.text((6, 5), 'ANTES (e7f5f28)', fill=(255, 255, 255))
    draw.rectangle((a.width, 0, a.width + 260, 22), fill=(0, 0, 0))
    draw.text((a.width + 6, 5), 'DEPOIS (R6-a, ronda 2)', fill=(255, 255, 255))
    sheet.resize((sheet.width // 2, sheet.height // 2), Image.LANCZOS).save(os.path.join(out, name + '.jpg'), quality=82)
print(len(names), 'montages in', out)
