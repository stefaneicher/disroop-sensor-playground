"""Compose the explainer: HUD frame, captions, zooms and crossfades over recorded clips (build/clips) and stills (build/shots).
usage: render.py preview | <scene index>...  -> build/scenes/<id>.mp4"""
import json, math, os, subprocess, sys, random, re
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

W, H, FPS = 1920, 1080, 30
from lang import SCRIPT, BUILD, UI
os.chdir(BUILD)   # clips/, shots/, tts/, durations.json of this language

SC = json.load(open(SCRIPT, encoding="utf-8"))
DUR = json.load(open("durations.json")) if os.path.exists("durations.json") else {}
PAD_IN, PAD_OUT = 0.6, 0.9   # silence before/after each narration clip

CYAN = (64, 224, 208); GREEN = (132, 230, 90); DIM = (90, 120, 120); WHITE = (235, 245, 245)
F = lambda p, s: ImageFont.truetype(p, s)
import glob
def font(*names):
    for n in names:
        hit = glob.glob(f"/usr/share/fonts/**/{n}", recursive=True)
        if hit: return hit[0]
    raise SystemExit(f"font missing: {names}")
MONO = font("DejaVuSansMono.ttf")
MONOB = font("DejaVuSansMono-Bold.ttf")
INTER = font("Inter-SemiBold.otf", "Inter-SemiBold.ttf", "DejaVuSans-Bold.ttf")
INTERB = font("Inter-ExtraBold.otf", "Inter-ExtraBold.ttf", "Inter-Bold.otf", "DejaVuSans-Bold.ttf")
fm, fmb, fcap, ftitle, fsub = F(MONO, 22), F(MONOB, 24), F(INTER, 40), F(INTERB, 120), F(MONO, 30)

PX, PY, PW, PH = 192, 100, 1536, 864   # image panel

def background():
    a = np.zeros((H, W, 3), np.float32); a[:] = (5, 9, 11)
    for x in range(0, W, 64): a[:, x] += (6, 12, 12)
    for y in range(0, H, 64): a[y, :] += (6, 12, 12)
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W/2)/(W/2))**2 + ((yy - H/2)/(H/2))**2)
    a *= (1.15 - 0.45*d)[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def scan_overlay():
    a = np.zeros((H, W, 4), np.uint8)
    a[::3, :, 3] = 38
    return Image.fromarray(a, "RGBA")

BG, SCAN = background(), scan_overlay()

def load(p):
    im = Image.open(p)
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (8, 12, 14)); bg.paste(im, mask=im.split()[3]); im = bg
    im = im.convert("RGB")
    # fit into panel aspect (cover for wide, contain for tall)
    r = PW/PH; ir = im.width/im.height
    if ir < r*0.75:  # tall image (phone) -> contain on dark
        c = Image.new("RGB", (int(im.height*r), im.height), (8, 12, 14))
        c.paste(im, ((c.width-im.width)//2, 0)); im = c
    return im

def crop(im, z, fx, fy):
    r = PW/PH
    if im.width/im.height > r: bw, bh = im.height*r, im.height
    else: bw, bh = im.width, im.width/r
    cw, ch = bw/z, bh/z
    cx = (im.width-cw)*fx; cy = (im.height-ch)*fy
    return im.resize((PW, PH), Image.BILINEAR, box=(cx, cy, cx+cw, cy+ch))

E = lambda x: 0.5-0.5*math.cos(math.pi*max(0, min(1, x)))
_cache = {}
def src_frame(spec, ct):
    if "clip" in spec:
        d = f"clips/{spec['clip']}"
        if d not in _cache: _cache[d] = sorted(os.listdir(d))
        fs = [f for f in _cache[d] if f.startswith("f")]
        i = max(0, min(len(fs)-1, int(ct*FPS)))
        return Image.open(f"{d}/{fs[i]}").convert("RGB")
    if spec["src"] not in _cache: _cache[spec["src"]] = load(spec["src"])
    return _cache[spec["src"]]

def seg_pic(segs, k, t, total):
    sp = segs[k]; a = sp.get("off", 0)*total; b = sp.get("until", 1)*total
    lt = (t-a)/(b-a)
    same = k > 0 and segs[k-1].get("clip") and segs[k-1].get("clip") == sp.get("clip")
    ct = t if same else t-a
    z0, z1 = sp.get("z", [1, 1.1]); (fx0, fy0), (fx1, fy1) = sp.get("f", [[.5, .5], [.5, .5]])
    e = E(lt)
    pic = crop(src_frame(sp, ct), z0+(z1-z0)*e, fx0+(fx1-fx0)*e, fy0+(fy1-fy0)*e)
    if sp.get("dim"): pic = Image.blend(pic, Image.new("RGB", pic.size, (5, 9, 11)), sp["dim"])
    return pic

def composite(segs, t, total):
    k = 0
    for i, sp in enumerate(segs):
        if t >= sp.get("off", 0)*total: k = i
    pic = seg_pic(segs, k, t, total)
    if k+1 < len(segs):
        nb = segs[k+1].get("off", 1)*total
        if t > nb-0.5: pic = Image.blend(pic, seg_pic(segs, k+1, nb, total), (t-(nb-0.5))/0.5)
    return pic

def brackets(d, x, y, w, h, col, L=34, wd=3):
    for (ax, ay, sx, sy) in [(x, y, 1, 1), (x+w, y, -1, 1), (x, y+h, 1, -1), (x+w, y+h, -1, -1)]:
        d.line([(ax, ay), (ax+sx*L, ay)], fill=col, width=wd)
        d.line([(ax, ay), (ax, ay+sy*L)], fill=col, width=wd)

def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?:])\s+', text) if s.strip()]

def wrap(d, text, font, maxw):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur+" "+w_).strip()
        if d.textlength(t, font=font) > maxw and cur: lines.append(cur); cur = w_
        else: cur = t
    lines.append(cur); return lines

def caption_at(scene, t_audio, dur_audio):
    ss = sentences(scene["text"]); tot = sum(len(s) for s in ss); acc = 0
    for s in ss:
        acc += len(s)
        if t_audio <= dur_audio*acc/tot: return s
    return ss[-1]

def glitch(img, k):
    a = np.array(img); rnd = random.Random(k)
    for _ in range(7):
        y = rnd.randrange(0, H-40); h = rnd.randrange(6, 40); s = rnd.randrange(-60, 60)
        a[y:y+h] = np.roll(a[y:y+h], s, axis=1)
    a[..., 0] = np.roll(a[..., 0], 6, axis=1)
    return Image.fromarray(a)

def frame(si, scene, t, total, imgs, gt):
    img = BG.copy(); d = ImageDraw.Draw(img)
    p = t/total
    if scene.get("title"):
        a = min(1, t/1.2)
        if imgs: img.paste(crop(composite(imgs, t, total), 1.0, .5, .5).resize((W, H)), (0, 0)); d = ImageDraw.Draw(img)
        title1, title2 = "DISROOP", "SENSOR PLAYGROUND"
        y0 = 360
        d.text((W/2, y0-70), UI["tag"], font=fsub, fill=tuple(int(c*a) for c in CYAN), anchor="mm")
        for i, (txt, col) in enumerate([(title1, WHITE), (title2, GREEN)]):
            n = int(len(txt)*min(1, max(0, (t-0.4-0.6*i)/1.0)))
            d.text((W/2, y0+60+i*140), txt[:n], font=ftitle, fill=col, anchor="mm")
        if t > 2.2:
            d.text((W/2, 760), UI["sub"], font=fsub, fill=DIM, anchor="mm")
    else:
        pic = composite(imgs, t, total)
        if scene.get("outro") and p > 0.55:
            f = min(1, (p-0.55)/0.25); pic = Image.blend(pic, Image.new("RGB", pic.size, (5, 9, 11)), f*0.85)
        img.paste(pic, (PX, PY))
        d.rectangle([PX-1, PY-1, PX+PW, PY+PH], outline=(20, 60, 60), width=1)
        brackets(d, PX-12, PY-12, PW+24, PH+24, CYAN)
        if scene.get("outro") and p > 0.6:
            a = min(1, (p-0.6)/0.15)
            d.text((W/2, H/2-40), "SENSOR PLAYGROUND", font=F(INTERB, 96), fill=tuple(int(c*a) for c in WHITE), anchor="mm")
            d.text((W/2, H/2+50), "stefaneicher.github.io/disroop-sensor-playground", font=fsub, fill=tuple(int(c*a) for c in GREEN), anchor="mm")
    # HUD top bar
    blink = (int(gt*2) % 2) == 0
    d.ellipse([40, 34, 58, 52], fill=(230, 60, 60) if blink else (90, 30, 30))
    d.text((72, 43), "DISROOP  //  SENSOR PLAYGROUND", font=fmb, fill=CYAN, anchor="lm")
    d.text((W-40, 43), scene["label"], font=fmb, fill=GREEN, anchor="rm")
    mm, ss_ = divmod(int(gt), 60)
    d.text((40, H-40), f"T+{mm:02d}:{ss_:02d}.{int((gt%1)*30):02d}", font=fm, fill=DIM, anchor="lm")
    d.text((W-40, H-40), f"SIG {92+int(5*math.sin(gt*1.7))}%  ·  BLE 2.4 GHz", font=fm, fill=DIM, anchor="rm")
    # progress ticks
    for i in range(len(SC)):
        d.rectangle([W/2-len(SC)*22+i*44, H-44, W/2-len(SC)*22+i*44+34, H-38], fill=GREEN if i <= si else (30, 50, 50))
    # caption
    ta = t-PAD_IN
    if 0 <= ta <= DURA[si] + 0.2 and not (scene.get("outro") and p > 0.6):
        cap = caption_at(scene, ta, DURA[si])
        lines = wrap(d, cap, fcap, 1400)
        yb = PY+PH-40 if not scene.get("title") else 920
        for j, ln in enumerate(lines):
            y = yb - (len(lines)-1-j)*52
            tw = d.textlength(ln, font=fcap)
            d.rectangle([W/2-tw/2-18, y-30, W/2+tw/2+18, y+26], fill=(0, 0, 0))
            d.text((W/2, y), ln, font=fcap, fill=WHITE, anchor="mm")
    img.paste(SCAN, (0, 0), SCAN)
    if t < 0.2 and si > 0: img = glitch(img, int(t*100)+si)
    return img

DURA = [DUR.get(s["id"], len(s["text"])/15.0) for s in SC]
TOT = [d_ + PAD_IN + PAD_OUT for d_ in DURA]

def render_scene(si, frames_only=None):
    scene = SC[si]; imgs = scene["images"]
    total = TOT[si]; n = int(round(total*FPS)); g0 = sum(TOT[:si])
    if frames_only is not None:
        for fr in frames_only:
            frame(si, scene, fr, total, imgs, g0+fr).save(f"preview_{scene['id']}_{fr:.1f}.jpg", quality=90)
        return
    tmp = f"scenes/{scene['id']}.tmp.mp4"
    pr = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for i in range(n):
        pr.stdin.write(frame(si, scene, i/FPS, total, imgs, g0+i/FPS).tobytes())
    pr.stdin.close()
    if pr.wait() == 0: os.replace(tmp, f"scenes/{scene['id']}.mp4")
    print("done", scene["id"], n, flush=True)

if __name__ == "__main__":
    os.makedirs("scenes", exist_ok=True)
    if sys.argv[1] == "preview":
        for si, tt in [(0, 3.0), (2, 6.0), (5, 9.0), (7, TOT[7]-1)]:
            render_scene(si, [tt])
    else:
        for si in map(int, sys.argv[1:]): render_scene(si)
