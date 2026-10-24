"""VIS-a evidence helper: projects the flashes the view reported (gameDiagnostics().m01.distantFire.list) with the grabbed camera and writes
(1) the frame with 1 px rings around each reported flash and (2) a nearest-neighbour zoomed crop around the German ones.
Usage: python3 -I m01-distant-fire-crop.py <report.json> <captureDir> <outDir> [zoom=5] [crop_w=260] [crop_h=146] [fixed_cx,fixed_cy]
A fixed centre gives identical regions for the before/after pairs (the before build reports no flash positions).
Rings are drawn on a COPY so the plain grab stays untouched. No gameplay data is read from the image."""
import json, math, sys
from PIL import Image, ImageDraw

report, cap, out = sys.argv[1], sys.argv[2], sys.argv[3]
zoom = int(sys.argv[4]) if len(sys.argv) > 4 else 5
cw = int(sys.argv[5]) if len(sys.argv) > 5 else 260
ch = int(sys.argv[6]) if len(sys.argv) > 6 else 146
fixed = tuple(float(v) for v in sys.argv[7].split(',')) if len(sys.argv) > 7 else None
W, H = 1366, 768

def rot(q):
    x, y, z, w = q
    return [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]

def project(cam, p):
    R = rot(cam['quaternion']); c = cam['position']
    d = [p[i]-c[i] for i in range(3)]
    v = [sum(R[r][col]*d[r] for r in range(3)) for col in range(3)]   # world -> camera (R^T d)
    if v[2] >= 0: return None
    f = (H/2)/math.tan(math.radians(cam['fov'])/2)
    return (W/2 + f*v[0]/-v[2], H/2 - f*v[1]/-v[2], -v[2])

rep = json.load(open(report))
for shot in rep['shots']:
    for f in shot['files']:
        pts = []
        for e in (f['distant'] or {}).get('list', []):
            s = project(f['camera'], (e['x'], e['y'], e['z']))
            if s and 0 <= s[0] < W and 0 <= s[1] < H: pts.append((e['by'], s, e['heavy']))
        im = Image.open(f"{cap}/{f['file']}").convert('RGB')
        ring = im.copy(); dr = ImageDraw.Draw(ring)
        for by, (sx, sy, dist), heavy in pts:
            dr.ellipse((sx-14, sy-14, sx+14, sy+14), outline=(255, 40, 40) if by.startswith('de_') else (40, 220, 255))
        german = [s for by, s, h in pts if by.startswith('de_')]
        base = f['file'][:-4]
        ring.save(f"{out}/{base}-rings.png")
        if fixed:
            cx, cy = fixed
        elif german:
            cx = sum(s[0] for s in german)/len(german); cy = sum(s[1] for s in german)/len(german)
        else:
            cx, cy = W/2, H/2-10
        x0 = int(max(0, min(W-cw, cx-cw/2))); y0 = int(max(0, min(H-ch, cy-ch/2)))
        im.crop((x0, y0, x0+cw, y0+ch)).resize((cw*zoom, ch*zoom), Image.NEAREST).save(f"{out}/{base}-zoom.png")
        print(f['file'], [(by, round(s[0]), round(s[1]), round(s[2])) for by, s, h in pts], 'crop', (x0, y0))
