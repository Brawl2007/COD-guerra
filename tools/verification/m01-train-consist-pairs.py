# Side-by-side BEFORE/AFTER JPEGs for the train consist captures (Pillow). Originals stay untouched.
# Use: python3 tools/verification/m01-train-consist-pairs.py <before-output-dir> <after-output-dir> <out-dir>
import sys,glob,os
from PIL import Image,ImageDraw,ImageFont
before,after,out=sys.argv[1:4]
os.makedirs(out,exist_ok=True)
try: font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22)
except Exception: font=ImageFont.load_default()
for b in sorted(glob.glob(before+'/*/*.png')):
    name=os.path.basename(b);a=glob.glob(after+'/*/'+name)
    if not a: print('missing after',name);continue
    A=Image.open(a[0]).convert('RGB');B=Image.open(b).convert('RGB')
    w,h=B.size;P=Image.new('RGB',(w*2+8,h),(20,20,20));P.paste(B,(0,0));P.paste(A,(w+8,0))
    d=ImageDraw.Draw(P)
    for x,t in [(0,'BEFORE 99309d9'),(w+8,'AFTER')]:
        d.rectangle([x+10,10,x+10+300,44],fill=(0,0,0));d.text((x+18,14),t,fill=(255,255,255),font=font)
    d.rectangle([w*2+8-10-420,10,w*2+8-10,44],fill=(0,0,0));d.text((w*2+8-420,14),name[:-4],fill=(255,230,150),font=font)
    P.resize((w,h//2)).save(os.path.join(out,'PAIR-'+name[:-4]+'.jpg'),quality=88)
    print('pair',name)
