# Evidence image builder for the capture sheets (labelled composites of the PNGs a capture tool writes). Usage:
#   python3 -I sheets.py pairs <baseDir> <candDir> <outDir> name1 name2 ...   -> BEFORE/AFTER stacked JPEGs + originals copied
#   python3 -I sheets.py layers <capDir> <outDir> name1 name2 ...             -> frame | layer-mask side by side JPEGs
import sys, os, shutil
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
elif mode == 'layers':
    cap, out = sys.argv[2:4]; os.makedirs(out, exist_ok=True)
    for name in sys.argv[4:]:
        a = label(Image.open(f'{cap}/{name}.png').convert('RGB'), name)
        b = label(Image.open(f'{cap}/{name}.layer.png').convert('RGB'), 'distant layer only (other pixels dimmed)')
        w, h = a.size; sheet = Image.new('RGB', (w * 2, h)); sheet.paste(a, (0, 0)); sheet.paste(b, (w, 0))
        sheet.thumbnail((1920, 540)); sheet.save(f'{out}/{name}.jpg', quality=82)
print('ok')
