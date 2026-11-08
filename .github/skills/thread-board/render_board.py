#!/usr/bin/env python3
"""Rendert THREADS.json als eigenständige Lavish-HTML-Seite (Thread-Baum, Topics, Fragen)."""
import html, json, sys

SYM = {"done": ("✓", "#14532d", "#bbf7d0"), "running": ("▶", "#1e3a8a", "#bfdbfe"),
       "open": ("○", "#374151", "#d1d5db"), "blocked": ("✕", "#7f1d1d", "#fecaca"),
       "needs-user": ("?", "#78350f", "#fde68a")}


def rollup(t, kids):
    ch = kids.get(t["id"], [])
    if not ch:
        return t["status"]
    st = [rollup(c, kids) for c in ch] + [t["status"]]
    for s in ("needs-user", "blocked", "running", "open"):
        if s in st:
            return s
    return "done"


def badge(s):
    sym, bg, fg = SYM.get(s, SYM["open"])
    return f'<span class="b" style="background:{bg};color:{fg}">{sym} {s}</span>'


HUES = [217, 262, 160, 32, 330, 190]


def node(t, kids, depth=0, idx=0, path=()):
    e = html.escape
    h = HUES[depth % len(HUES)]
    light = 17 + (idx % 2) * 5
    style = (f'style="background:hsl({h},35%,{light}%);border-left:4px solid hsl({h},75%,58%)"')
    crumb = " › ".join(path + (t["id"],))
    refs = " · ".join(e(r) for r in t.get("refs", []))
    q = ""
    if t.get("kind") == "question" and t["status"] == "needs-user":
        opts = t.get("options") or ["Ja", "Nein"]
        q = (f'<form data-lavish-question="{e(t["id"])}" onsubmit="event.preventDefault();'
             f'const v=new FormData(this).get(\'a\');if(v)window.lavish?.queuePrompt(\'{e(t["id"])}: \'+v,'
             f'{{tag:\'choice\',text:\'{e(t["id"])} → \'+v,element:this,data:{{thread:\'{e(t["id"])}\',answer:v}}}});">'
             + "".join(f'<label><input type="radio" name="a" value="{e(o)}"> {e(o)}</label> ' for o in opts)
             + '<button>Antwort vormerken</button></form>')
    inner = "".join(node(c, kids, depth + 1, i, path + (t["id"],)) for i, c in enumerate(kids.get(t["id"], [])))
    return (f'<details open {style}><summary title="{e(crumb)}"><span class="lv" style="color:hsl({h},75%,70%)">L{depth}</span> '
            f'<span class="cr">{e(crumb)}</span><br><b>{e(t["id"])}</b> {e(t["title"])} {badge(rollup(t, kids))}'
            f' <span class="o">{e(t.get("owner", ""))}</span></summary>'
            f'<div class="m">{e(t.get("note", ""))} <span class="r">{refs}</span>{q}</div>{inner}</details>')


def main(src, dst):
    d = json.load(open(src, encoding="utf-8"))
    ts = d["threads"]
    kids = {}
    for t in ts:
        kids.setdefault(t.get("parent"), []).append(t)
    roots = kids.get(None, [])
    total = len(ts)
    done = sum(1 for t in ts if t["status"] == "done")
    fb = {}
    for t in ts:
        if t.get("kind") == "feedback":
            fb.setdefault(t.get("topic", "Allgemein"), []).append(t)
    e = html.escape
    topics = "".join(f'<div class="c"><b>{e(k)}</b><ul>' + "".join(
        f'<li>{e(t["id"])} {e(t["title"])} {badge(t["status"])}</li>' for t in v) + "</ul></div>"
        for k, v in fb.items())
    qs = [t for t in ts if t["status"] == "needs-user"]
    page = f"""<!doctype html><html lang="de" data-lavish-annotate="on"><head><meta charset="utf-8">
<title>{e(d.get('project', 'Projekt'))} – Thread-Board</title><style>
body{{margin:0;padding:20px;font-family:system-ui,sans-serif;background:#111827;color:#e5e7eb}}
h1{{font-size:20px;margin:0}}h2{{font-size:14px;text-transform:uppercase;color:#9ca3af;margin:20px 0 8px}}
.g{{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px}}@media(max-width:850px){{.g{{grid-template-columns:minmax(0,1fr)}}}}
details{{margin:6px 0 6px 12px;padding:4px 8px;border-radius:6px}}summary{{cursor:pointer;padding:3px 0}}.lv{{font-size:10px;font-weight:700}}.cr{{font-size:10px;color:#9ca3af}}
.b{{font-size:11px;padding:1px 6px;border-radius:6px;white-space:nowrap}}.o{{color:#93c5fd;font-size:12px}}
.m{{font-size:12px;color:#9ca3af;margin:0 0 4px 14px}}.r{{color:#6b7280}}.c{{background:#1f2937;border-radius:8px;padding:10px;margin-bottom:10px;font-size:13px}}
.bar{{height:8px;background:#374151;border-radius:9px;overflow:hidden}}.bar i{{display:block;height:100%;background:#22c55e}}
form{{margin-top:6px}}button{{font:inherit;font-size:12px;background:#2563eb;color:#fff;border:0;border-radius:5px;padding:3px 8px}}
</style></head><body><h1>{e(d.get('project', 'Projekt'))} – Thread-Board</h1>
<p style="color:#9ca3af;font-size:13px">Stand {e(d.get('updated', ''))} · {done}/{total} Threads fertig</p>
<div class="bar"><i style="width:{int(100 * done / max(total, 1))}%"></i></div>
<div class="g"><div><h2>Threads</h2>{''.join(node(t, kids, 0, i) for i, t in enumerate(roots))}</div>
<div><h2>Fragen an dich ({len(qs)})</h2>{''.join(node(t, {}) for t in qs) or '<p>keine</p>'}
<h2>Dein Feedback nach Topics</h2>{topics or '<p>keins</p>'}</div></div></body></html>"""
    open(dst, "w", encoding="utf-8").write(page)
    print(f"board: {dst} ({total} threads, {done} done, {len(qs)} questions)", flush=True)


def watch(src, dst, interval=1.0):
    import os
    import time
    last = None
    while True:
        m = os.path.getmtime(src)
        if m != last:
            last = m
            try:
                main(src, dst)
            except (ValueError, KeyError) as err:
                print(f"board: {src} ungueltig ({err}), warte auf naechste Aenderung")
        time.sleep(interval)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--watch"]
    src = args[0] if args else "THREADS.json"
    dst = args[1] if len(args) > 1 else ".lavish/board.html"
    (watch if "--watch" in sys.argv else main)(src, dst)
