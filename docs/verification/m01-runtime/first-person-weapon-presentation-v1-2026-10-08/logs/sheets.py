# Evidence image builder for the capture sheets, from the PNGs the capture tool writes. Usage:
#   python3 -I sheets.py pairs <baseDir> <candDir> <outDir> name1 name2 ...   -> BEFORE/AFTER stacked (JPEG)
#   python3 -I sheets.py zoom <capDir> <outDir> name x0 y0 x1 y1               -> that crop of the frame, 4x nearest-neighbour (PNG)
import sys, os
from PIL import Image, ImageDraw
def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 + 7 * len(text), 18], fill=(0, 0, 0)); d.text((4, 3), text, fill=(255, 255, 255)); return im
mode = sys.argv[1]
if mode == 'pairs':
    base, cand, out = sys.argv[2:5]; os.makedirs(out, exist_ok=True)
    for name in sys.argv[5:]:
        a = label(Image.open(f'{base}/{name}.png').convert('RGB'), f'BASE 99309d9 - {name}')
        b = label(Image.open(f'{cand}/{name}.png').convert('RGB'), f'CANDIDATE - {name}')
        w, h = a.size; sheet = Image.new('RGB', (w, h * 2)); sheet.paste(a, (0, 0)); sheet.paste(b, (0, h))
        sheet.thumbnail((1280, 1440)); sheet.save(f'{out}/{name}.jpg', quality=82)
elif mode == 'zoom':
    cap, out, name = sys.argv[2:5]; box = tuple(int(v) for v in sys.argv[5:9]); os.makedirs(out, exist_ok=True)
    crop = Image.open(f'{cap}/{name}.png').convert('RGB').crop(box)
    crop.resize((crop.width * 4, crop.height * 4), Image.NEAREST).save(f'{out}/{name}-zoom4x.png')
print('ok')
