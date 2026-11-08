"""Fragt Lagerbestand bei JLCPCB (oeffentliche Teilesuche) ab. Ausgabe: CSV auf stdout."""
import json, sys, urllib.request, datetime
URL = "https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/selectSmtComponentList"
def q(k):
    req = urllib.request.Request(URL, data=json.dumps({"keyword": k, "currentPage": 1, "pageSize": 6}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    d = json.load(urllib.request.urlopen(req, timeout=30))
    return d["data"]["componentPageInfo"]["list"] or []
print("abfrage_utc,suchwort,lcsc,mpn,typ,lager,preis_1_usd")
ts = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
for k in sys.argv[1:]:
    for c in q(k):
        p = (c.get("componentPrices") or [{}])[0].get("productPrice", "")
        print(f'{ts},{k},{c["componentCode"]},{c["componentModelEn"]},{c.get("componentLibraryType")},{c.get("stockCount")},{p}')
