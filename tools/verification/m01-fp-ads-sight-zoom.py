#!/usr/bin/env python3
"""R6-b: BEFORE | AFTER montages of the centre of the frame (the sight picture and the lower-centre region) at full resolution, 2x enlarged.

  python3 tools/verification/m01-fp-ads-sight-zoom.py docs/verification/m01-runtime/fp-ads-sight-2026-10-24 ["ANTES (bc6d4b0)" "DEPOIS (R6-b)"]

Reads before/NN-name.png and after/NN-name.png (1280 x 720, captured by m01-fp-hands-evidence.mjs --ads) and writes zoom/NN-name.jpg: the 480 x 360 window
centred on the aim point and shifted down so that it shows the sights and everything under them, side by side, enlarged 2x with nearest-neighbour.
"""
import os
import sys

from PIL import Image, ImageDraw

root = sys.argv[1]
label_before = sys.argv[2] if len(sys.argv) > 2 else 'ANTES (bc6d4b0)'
label_after = sys.argv[3] if len(sys.argv) > 3 else 'DEPOIS (R6-b)'
before, after, out = (os.path.join(root, d) for d in ('before', 'after', 'zoom'))
os.makedirs(out, exist_ok=True)
box = (640 - 240, 360 - 90, 640 + 240, 360 + 270)
names = sorted(f[:-4] for f in os.listdir(before) if f.endswith('.png') and not f.endswith(('-right.png', '-top.png')) and os.path.exists(os.path.join(after, f)))
for name in names:
    a = Image.open(os.path.join(before, name + '.png')).convert('RGB').crop(box).resize((960, 720), Image.NEAREST)
    b = Image.open(os.path.join(after, name + '.png')).convert('RGB').crop(box).resize((960, 720), Image.NEAREST)
    sheet = Image.new('RGB', (a.width + b.width + 8, a.height), (255, 255, 255))
    sheet.paste(a, (0, 0))
    sheet.paste(b, (a.width + 8, 0))
    draw = ImageDraw.Draw(sheet)
    for x, label in ((0, label_before), (a.width + 8, label_after)):
        draw.rectangle((x, 0, x + 300, 22), fill=(0, 0, 0))
        draw.text((x + 6, 5), label, fill=(255, 255, 255))
    sheet.save(os.path.join(out, name + '.jpg'), quality=85)
print(len(names), 'zoom montages in', out)
