"""Lager-/Preisabfrage JLCPCB (oeffentliche Teilesuche-API, ohne Login). Aufruf: jlc_query.py out.json KEY... ; KEY = C-Nr oder Suchwort."""
import json, sys, urllib.request, datetime
URL = "https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/selectSmtComponentList"
def q(k, n=4):
    req = urllib.request.Request(URL, data=json.dumps({"keyword": k, "currentPage": 1, "pageSize": n}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(req, timeout=30))["data"]["componentPageInfo"]["list"] or []
out, res = sys.argv[1], []
for k in sys.argv[2:]:
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    try:
        lst = q(k)
    except Exception as e:
        print(k, "ERROR", e); continue
    if k.startswith("C") and k[1:].isdigit():
        lst = [c for c in lst if c["componentCode"] == k] or lst[:1]
    for c in lst:
        pr = [(p.get("startNumber"), p.get("productPrice")) for p in (c.get("componentPrices") or [])]
        r = dict(query=k, utc=ts, lcsc=c["componentCode"], mpn=c.get("componentModelEn"), type=c.get("componentLibraryType"),
                 stock=c.get("stockCount"), price=pr[:3], pkg=c.get("componentSpecificationEn"), desc=(c.get("describe") or "")[:90],
                 url="https://jlcpcb.com/partdetail/" + c["componentCode"], datasheet=c.get("dataManualUrl"))
        res.append(r)
        print(f'{k:14} {r["lcsc"]:10} {str(r["mpn"])[:26]:26} {r["type"]:7} {r["stock"]:>9} {pr[:1]} {r["pkg"]} | {r["desc"][:60]}')
json.dump(res, open(out, "w"), indent=1)
