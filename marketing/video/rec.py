"""Record a web page into numbered JPEG frames (30 fps).
usage: rec.py NAME URL MODE DURATION [WARMUP_S]
MODE: still -> one screenshot to build/shots/NAME.jpg
      det  -> page exposes renderAt(t, D)
      shim -> virtual clock: rAF/performance.now/Date stepped per frame
      rt   -> real-time screenshots, resampled to 30 fps later
"""
import asyncio, sys, os, time, json, shutil
from lang import BUILD, LANG
from playwright.async_api import async_playwright
name, url, mode, D = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
url = url.replace("{lang}", LANG)
if D.startswith("scene:"):  # e.g. scene:s7*0.45 -> fraction of scene s7's length (narration + pads)
    sid, _, frac = D[6:].partition("*")
    D = (json.load(open(f"{BUILD}/durations.json"))[sid] + 1.5) * float(frac or 1) + 0.2
D = float(D)
warm = float(sys.argv[5]) if len(sys.argv) > 5 else 0
FPS = 30
CHROME = os.environ.get("CHROME_BIN", "/usr/bin/chromium")
out = f"{BUILD}/clips/{name}"
if mode != "still":
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
os.makedirs(f"{BUILD}/shots", exist_ok=True)

SHIM = """
(() => {
  let vt = 0; const t0 = Date.now(); let q = [], id = 0;
  performance.now = () => vt;
  const RD = Date; const now = () => t0 + vt;
  Date.now = now;
  window.requestAnimationFrame = cb => { q.push([++id, cb]); return id; };
  window.cancelAnimationFrame = i => { q = q.filter(x => x[0] !== i); };
  window.__step = ms => { vt += ms; const cur = q; q = []; for (const [, cb] of cur) { try { cb(vt); } catch (e) { console.error(e); } } };
})();
"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME,
            args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--no-sandbox"])
        VW, VH = (1280, 720) if mode == "shim" else (1920, 1080)
        pg = await b.new_page(viewport={"width": VW, "height": VH})
        pg.on("pageerror", lambda e: print("PAGEERR", e))
        if mode == "shim": await pg.add_init_script(SHIM)
        await pg.goto(url, timeout=60000)
        if mode == "still":
            # embedded players (e.g. the YouTube video on the home page) stay out of the stills
            await pg.add_style_tag(content="h2:has(+ .video), .video { display: none !important }")
            await pg.wait_for_timeout(3000)
            await pg.screenshot(path=f"{BUILD}/shots/{name}.jpg", type="jpeg", quality=92)
            await b.close(); return
        if mode == "det":
            await pg.wait_for_function("window.ready===true", timeout=120000)
        else:
            await pg.wait_for_timeout(4000)
        if mode == "shim":
            for _ in range(int(warm * 15)): await pg.evaluate("__step(1000/15)")
        n = int(round(D * FPS))
        if mode == "rt":
            if warm: await pg.wait_for_timeout(int(warm * 1000))
            t0 = time.time(); stamps = []
            i = 0
            while time.time() - t0 < D:
                await pg.screenshot(path=f"{out}/raw{i:05d}.jpg", type="jpeg", quality=90)
                stamps.append(time.time() - t0); i += 1
            # resample to 30 fps by nearest earlier capture
            k = 0
            for f in range(n):
                t = f / FPS
                while k + 1 < len(stamps) and stamps[k + 1] <= t: k += 1
                shutil.copy(f"{out}/raw{k:05d}.jpg", f"{out}/f{f:05d}.jpg")
            print(name, "rt captures", len(stamps))
        else:
            ts = time.time()
            for f in range(n):
                if mode == "det": await pg.evaluate(f"renderAt({f/FPS},{D})")
                else: await pg.evaluate("__step(1000/30)")
                await pg.screenshot(path=f"{out}/f{f:05d}.jpg", type="jpeg", quality=90)
                if f == 0: print(name, "first frame", round(time.time() - ts, 2), "s", flush=True)
            print(name, "frames", n, round(time.time() - ts), "s")
        await b.close()
asyncio.run(main())
