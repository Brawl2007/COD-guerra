"""VIS-a evidence helper: stacks the zoomed crops of the before and after captures of one snapshot into one image per frame pair.
Usage: python3 -I m01-distant-fire-pairs.py <beforeCropDir> <afterCropDir> <outDir> <snapshotName> [frames=4]
Left = before (eedc860), right = after (this branch). The two builds run in real time from the same save, so the frames are the same scene, not the same instant."""
import sys
from PIL import Image, ImageDraw

b, a, out, name = sys.argv[1:5]
n = int(sys.argv[5]) if len(sys.argv) > 5 else 4
for i in range(n):
    try:
        L = Image.open(f"{b}/{name}-before-{i}-zoom.png"); R = Image.open(f"{a}/{name}-after-{i}-zoom.png")
    except FileNotFoundError:
        continue
    im = Image.new('RGB', (L.width + R.width + 8, max(L.height, R.height) + 22), (20, 20, 20))
    im.paste(L, (0, 22)); im.paste(R, (L.width + 8, 22))
    d = ImageDraw.Draw(im); d.text((6, 4), 'before eedc860', fill=(255, 255, 255)); d.text((L.width + 14, 4), 'after VIS-a', fill=(255, 255, 255))
    im.save(f"{out}/{name}-pair-{i}.png")
