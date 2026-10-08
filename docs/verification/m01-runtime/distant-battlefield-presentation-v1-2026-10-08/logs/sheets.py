# Evidence image builder for the capture sheets, from the PNGs the capture tool writes. Usage:
#   python3 -I sheets.py layers <capDir> <outDir> name1 name2 ...   -> frame | layer mask side by side (JPEG)
#   python3 -I sheets.py zoom <capDir> <outDir> name x0 y0 x1 y1     -> that crop of the frame, 4x nearest-neighbour (PNG)
import sys, os
from PIL import Image, ImageDraw
def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 + 7 * len(text), 18], fill=(0, 0, 0)); d.text((4, 3), text, fill=(255, 255, 255)); return im
mode = sys.argv[1]
if mode == 'layers':
    cap, out = sys.argv[2:4]; os.makedirs(out, exist_ok=True)
    for name in sys.argv[4:]:
        a = label(Image.open(f'{cap}/{name}.png').convert('RGB'), name)
        b = label(Image.open(f'{cap}/{name}.layer.png').convert('RGB'), 'distant layer only (other pixels dimmed)')
        w, h = a.size; sheet = Image.new('RGB', (w * 2, h)); sheet.paste(a, (0, 0)); sheet.paste(b, (w, 0))
        sheet.thumbnail((1920, 540)); sheet.save(f'{out}/{name}.jpg', quality=82)
elif mode == 'zoom':
    cap, out, name = sys.argv[2:5]; box = tuple(int(v) for v in sys.argv[5:9]); os.makedirs(out, exist_ok=True)
    crop = Image.open(f'{cap}/{name}.png').convert('RGB').crop(box)
    crop.resize((crop.width * 4, crop.height * 4), Image.NEAREST).save(f'{out}/{name}-zoom4x.png')
print('ok')
