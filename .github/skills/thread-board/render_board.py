#!/usr/bin/env python3
"""Rendert THREADS.json als eigenständige Lavish-HTML-Seite (Thread-Baum, Topics, Fragen)."""
import html, json, re, sys

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


KIND = {"feedback": ("💬 aus Chat", "#334155"), "question": ("❓ Frage an dich", "#713f12"),
        "decision": ("📐 Entscheid", "#3b0764"), "task": ("📋 Aufgabe", "#1e293b")}


def kind_badge(t):
    k = t.get("kind", "task")
    own = t.get("owner", "")
    if k == "task" and own not in ("", "manager", "user"):
        live = t["status"] == "running"
        return (f'<span class="b k{" live" if live else ""}" style="background:{"#065f46" if live else "#1e293b"}">'
                f'🤖 {"Agent arbeitet" if live else "Agent-Auftrag"}</span>')
    lab, bg = KIND.get(k, KIND["task"])
    return f'<span class="b k" style="background:{bg}">{lab}</span>'


REPO = ""
HEX = re.compile(r"(?<![-\w])([0-9a-f]{7,40})(?![-\w])")


def link(txt):
    t = html.escape(txt)
    if not REPO:
        return t
    return HEX.sub(lambda m: (f'<a class="gh" href="https://github.com/{REPO}/commit/{m[1]}" target="_blank">{m[1]}</a>'
                              if re.search(r"\d", m[1]) and re.search(r"[a-f]", m[1]) else m[1]), t)


def repo_slug(d):
    if d.get("repo"):
        return d["repo"]
    import subprocess
    try:
        u = subprocess.run(["git", "remote", "get-url", "origin"], capture_output=True, text=True).stdout.strip()
    except OSError:
        return ""
    m = re.search(r"github\.com[:/](.+?)(?:\.git)?$", u)
    return m[1] if m else ""


HUES = [217, 262, 160, 32, 330, 190]


def node(t, kids, depth=0, idx=0, path=()):
    e = html.escape
    h = HUES[depth % len(HUES)]
    light = 17 + (idx % 2) * 5
    style = (f'style="background:hsl({h},35%,{light}%);border-left:4px solid hsl({h},75%,58%)"')
    crumb = " › ".join(path + (t["id"],))
    refs = " · ".join(link(r) for r in t.get("refs", []))
    q = ""
    if t.get("kind") == "question" and t["status"] == "needs-user":
        opts = t.get("options") or ["Ja", "Nein"]
        q = (f'<details class="qd" open><summary>Frage &amp; Empfehlung</summary><p>{e(t.get("question", t["title"]))}</p>'
             + (f'<p><b>Empfehlung:</b> {e(t["recommendation"])}</p>' if t.get("recommendation") else "") + '</details>')
        q += (f'<form data-lavish-question="{e(t["id"])}" onsubmit="event.preventDefault();'
             f'const v=new FormData(this).get(\'a\');if(v)window.lavish?.queuePrompt(\'{e(t["id"])}: \'+v,'
             f'{{tag:\'choice\',text:\'{e(t["id"])} → \'+v,element:this,data:{{thread:\'{e(t["id"])}\',answer:v}}}});">'
             + "".join(f'<label><input type="radio" name="a" value="{e(o)}"> {e(o)}</label> ' for o in opts)
             + '<button>Antwort vormerken</button></form>')
    arch = t.get("archived", False)
    act = "Wiederherstellen" if arch else "Archivieren"
    q += (f' <button type="button" class="ab" onclick="window.lavish?.queuePrompt(\'{act} {e(t["id"])}\','
          f'{{tag:\'archive\',text:\'{act} {e(t["id"])}\',element:this,data:{{thread:\'{e(t["id"])}\',archive:{str(not arch).lower()}}}}})">{act}</button>')
    inner = "".join(node(c, kids, depth + 1, i, path + (t["id"],)) for i, c in enumerate(kids.get(t["id"], [])))
    return (f'<details open class="{"arch" if arch else ""}" {style}><summary title="{e(crumb)}"><span class="lv" style="color:hsl({h},75%,70%)">L{depth}</span> '
            f'<span class="cr">{e(crumb)}</span><br><b>{e(t["id"])}</b> {e(t["title"])} {kind_badge(t)} {badge(rollup(t, kids))}'
            f' <span class="o">{e(t.get("owner", ""))}</span>{f' <code class="sid">{e(t["agent_id"][:8])}</code>' if t.get("agent_id") else ""}{" <span class=\"b\">📦 archiviert</span>" if arch else ""}</summary>'
            f'<div class="m">{link(t.get("note", ""))} <span class="r">{refs}</span>{q}</div>{inner}</details>')


def main(src, dst):
    d = json.load(open(src, encoding="utf-8"))
    global REPO
    REPO = repo_slug(d)
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
        f'<li class="{"arch" if t.get("archived") else ""}">{e(t["id"])} {e(t["title"])} {badge(t["status"])}</li>' for t in v) + "</ul></div>"
        for k, v in fb.items())
    qs = [t for t in ts if t["status"] == "needs-user" and not t.get("archived")]
    feed = "".join(f'<li><span class="r">{e(x.get("t", ""))}</span> {link(x.get("msg", ""))}</li>'
                   for x in reversed(d.get("log", [])[-40:]))
    narch = sum(1 for t in ts if t.get("archived"))
    page = f"""<!doctype html><html lang="de" data-lavish-annotate="on"><head><meta charset="utf-8">
<title>{e(d.get('project', 'Projekt'))} – Thread-Board</title><style>
body{{margin:0;padding:20px;font-family:system-ui,sans-serif;background:#111827;color:#e5e7eb}}
h1{{font-size:20px;margin:0}}h2{{font-size:14px;text-transform:uppercase;color:#9ca3af;margin:20px 0 8px}}
.g{{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px}}@media(max-width:850px){{.g{{grid-template-columns:minmax(0,1fr)}}}}
details{{margin:6px 0 6px 12px;padding:4px 8px;border-radius:6px}}summary{{cursor:pointer;padding:3px 0}}.lv{{font-size:10px;font-weight:700}}.cr{{font-size:10px;color:#9ca3af}}
.b{{font-size:11px;padding:1px 6px;border-radius:6px;white-space:nowrap}}.o{{color:#93c5fd;font-size:12px}}
.m{{font-size:12px;color:#9ca3af;margin:0 0 4px 14px}}.r{{color:#6b7280}}.c{{background:#1f2937;border-radius:8px;padding:10px;margin-bottom:10px;font-size:13px}}
.bar{{height:8px;background:#374151;border-radius:9px;overflow:hidden}}.bar i{{display:block;height:100%;background:#22c55e}}
body.hide .arch{{display:none}}.arch{{opacity:.55}}.ab{{background:#4b5563;margin-left:6px}}.tg{{float:right;font-size:13px;color:#9ca3af;text-align:right}}.feed ul{{margin:0;padding-left:16px;max-height:260px;overflow:auto}}.feed li{{margin:2px 0}}.qd{{margin:6px 0;padding:4px 8px;background:#1f2937;border-radius:6px}}.qd p{{margin:4px 0;color:#e5e7eb}}a.gh{{color:#60a5fa;font-family:monospace}}.sid{{font-size:11px;color:#fbbf24}}.k{{color:#e5e7eb;margin-right:2px}}.live{{animation:pl 1.4s infinite}}@keyframes pl{{50%{{box-shadow:0 0 0 3px #10b98155}}}}.kh{{font-size:11px;margin-top:4px}}summary:focus{{outline:2px solid #fbbf24;outline-offset:2px;border-radius:4px}}
form{{margin-top:6px}}button{{font:inherit;font-size:12px;background:#2563eb;color:#fff;border:0;border-radius:5px;padding:3px 8px}}
</style></head><body><div class="tg"><button type="button" id="exA" title="E">⊞ Alle auf</button> <button type="button" id="coA" title="C">⊟ Alle zu</button> <button type="button" id="opA" title="O">Nur offene</button> <label><input type="checkbox" id="hideArch" checked> Archivierte ausblenden ({narch})</label> <label><input type="checkbox" id="live" checked> Live (10 s)</label><div class="kh">Tasten: J/K oder ↑/↓ bewegen · ←/→ zu/auf · Enter umschalten · E/C alle auf/zu · O nur offene · A Archiv · Doppelklick: Teilbaum auf/zu</div></div><h1>{e(d.get('project', 'Projekt'))} – Thread-Board</h1>
<p style="color:#9ca3af;font-size:13px">Stand {e(d.get('updated', ''))} · {done}/{total} Threads fertig · Session <code class="sid" title="{e(d.get('session', ''))}">{e(d.get('session', '–'))}</code></p>
<div class="bar"><i style="width:{int(100 * done / max(total, 1))}%"></i></div>
<div class="g"><div><h2>Threads</h2>{''.join(node(t, kids, 0, i) for i, t in enumerate(roots))}</div>
<div><h2>🛩 Cockpit – Copilot live</h2><div class="c feed"><ul>{feed or '<li>noch nichts</li>'}</ul></div>
<h2>Fragen an dich ({len(qs)})</h2>{''.join(node(t, {}) for t in qs) or '<p>keine</p>'}
<h2>Dein Feedback nach Topics</h2>{topics or '<p>keins</p>'}</div></div><script>
const cb=document.getElementById('hideArch');cb.checked=localStorage.getItem('tb-hide')!=='0';
const ap=()=>{{document.body.classList.toggle('hide',cb.checked);localStorage.setItem('tb-hide',cb.checked?'1':'0')}};cb.onchange=ap;ap();
const lv=document.getElementById('live');lv.checked=localStorage.getItem('tb-live')!=='0';lv.onchange=()=>localStorage.setItem('tb-live',lv.checked?'1':'0');
const st=JSON.parse(sessionStorage.getItem('tb-state')||'null');if(st){{D().forEach((d,i)=>{{if(i in st.o)d.open=st.o[i]}});scrollTo(0,st.y)}}
setInterval(()=>{{if(!lv.checked||document.activeElement?.closest('form,input'))return;sessionStorage.setItem('tb-state',JSON.stringify({{o:D().map(d=>d.open),y:scrollY}}));location.reload()}},10000);
const D=()=>[...document.querySelectorAll('.g details')],V=()=>[...document.querySelectorAll('.g summary')].filter(x=>x.offsetParent);
const all=o=>D().forEach(d=>d.open=o);
const onlyOpen=()=>D().forEach(d=>d.open=!d.querySelector(':scope>summary .b')?.textContent.includes('done'));
document.getElementById('exA').onclick=()=>all(true);document.getElementById('coA').onclick=()=>all(false);document.getElementById('opA').onclick=onlyOpen;
document.querySelectorAll('.g summary').forEach(s=>{{s.tabIndex=0;s.addEventListener('dblclick',ev=>{{ev.preventDefault();const d=s.parentElement,o=!d.open;d.open=o;d.querySelectorAll('details').forEach(x=>x.open=o)}})}});
document.addEventListener('keydown',ev=>{{if(ev.target.closest('input,textarea,select')||ev.ctrlKey||ev.metaKey||ev.altKey)return;
const k=ev.key.toLowerCase(),v=V(),i=v.indexOf(document.activeElement),f=document.activeElement?.tagName==='SUMMARY'?document.activeElement.parentElement:null;
const mv=n=>{{const t=v[Math.max(0,Math.min(v.length-1,n))];if(t){{t.focus();t.scrollIntoView({{block:'nearest'}})}}}};
if(k==='j'||k==='arrowdown')mv(i+1);else if(k==='k'||k==='arrowup')mv(i<0?0:i-1);
else if(k==='arrowright'&&f)f.open=true;else if(k==='arrowleft'&&f){{if(f.open)f.open=false;else f.parentElement.closest('details')?.querySelector(':scope>summary').focus()}}
else if(k==='e')all(true);else if(k==='c')all(false);else if(k==='o')onlyOpen();else if(k==='a'){{cb.checked=!cb.checked;ap()}}else return;ev.preventDefault()}});
</script></body></html>"""
    open(dst, "w", encoding="utf-8").write(page)
    print(f"board: {dst} ({total} threads, {done} done, {len(qs)} questions)", flush=True)


def log(src, msg):
    import datetime
    d = json.load(open(src, encoding="utf-8"))
    now = datetime.datetime.now().astimezone().strftime("%H:%M")
    d.setdefault("log", []).append({"t": now, "msg": msg})
    d["log"] = d["log"][-200:]
    d["updated"] = datetime.datetime.now().astimezone().isoformat(timespec="minutes")
    json.dump(d, open(src, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


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
    if len(sys.argv) > 2 and sys.argv[1] == "--log":
        log("THREADS.json", " ".join(sys.argv[2:]))
        sys.exit()
    args = [a for a in sys.argv[1:] if a != "--watch"]
    src = args[0] if args else "THREADS.json"
    dst = args[1] if len(args) > 1 else ".lavish/board.html"
    (watch if "--watch" in sys.argv else main)(src, dst)
