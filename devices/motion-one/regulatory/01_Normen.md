# Normen und Leitfäden

Stand der Angaben: aus meinem Wissen (Stand Juni 2026), **nicht gegen die Originaltexte geprüft**. Ausgabejahre und Klauselnummern vor
Verwendung in einer Einreichung mit dem gekauften Normtext abgleichen. Die Links konnte ich aus dieser Umgebung nicht abrufen.

## Kernnormen für die Firmware

| Norm | Titel (sinngemäss) | Rolle für Motion One | Bezugsquelle |
|---|---|---|---|
| **IEC 62304** (Ed. 1.1, 2006 + A1:2015) | Medizingeräte-Software: Software-Lebenszyklus-Prozesse | Hauptnorm: Planung, SRS, Architektur, Detailentwurf, Test, Release, Wartung, Konfiguration, Problemlösung | [IEC Webstore](https://webstore.iec.ch/en/search?q=62304) |
| **ISO 14971:2019** | Risikomanagement für Medizinprodukte | Gefährdungen, Risikokontrollen, Restrisiko. 62304 verlangt es für die Klasseneinteilung | [ISO 14971](https://www.iso.org/standard/72704.html) |
| **ISO 13485:2016** | Qualitätsmanagementsystem | Rahmen für alle Prozesse. In den USA wird er über die QMSR (21 CFR 820) Teil der FDA-Anforderungen | [ISO 13485](https://www.iso.org/standard/59752.html) |
| **IEC 60601-1** (+ 60601-1-2 EMV, ggf. 60601-1-11 Heimanwendung) | Elektrische Sicherheit, wesentliche Leistungsmerkmale | Akku, Laden, Motor und Summer, programmierbare elektrische Systeme (Kap. 14) | [IEC Webstore](https://webstore.iec.ch/en/search?q=60601-1) |
| **IEC 82304-1** | Gesundheitssoftware: Produktanforderungen | nur relevant, wenn die Software allein ein Produkt ist (hier: Auswerte-App, nicht die Firmware) | [IEC Webstore](https://webstore.iec.ch/en/search?q=82304) |
| **IEC 62366-1** | Gebrauchstauglichkeit | Taster, LED, Summer, Vibration als Benutzerschnittstelle | [IEC Webstore](https://webstore.iec.ch/en/search?q=62366) |
| **IEC 81001-5-1** | Cybersicherheit im Software-Lebenszyklus | BLE ohne Kopplung ist hier der grösste Befund | [IEC Webstore](https://webstore.iec.ch/en/search?q=81001-5-1) |
| **IEC/TR 80002-1** | Leitfaden zur Anwendung von ISO 14971 auf Software | Hilfe für die Gefährdungsanalyse | [IEC Webstore](https://webstore.iec.ch/en/search?q=80002-1) |

## FDA (USA)

| Dokument | Zweck | Quelle |
|---|---|---|
| *Content of Premarket Submissions for Device Software Functions* (Leitfaden, 2023) | Welche Software-Unterlagen eine Einreichung enthält; Dokumentationsstufe *Basic* oder *Enhanced*. Für diese Firmware wäre *Enhanced* zu erwarten | [FDA-Leitfäden](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/content-premarket-submissions-device-software-functions) |
| *Cybersecurity in Medical Devices: Quality System Considerations and Content of Premarket Submissions* | Bedrohungsmodell, SBOM, Updatefähigkeit, Sicherheitsarchitektur | [FDA-Leitfäden](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cybersecurity-medical-devices-quality-system-considerations-and-content-premarket-submissions) |
| 21 CFR Part 820 (QMSR, seit 2026 mit ISO 13485 abgestimmt) | Qualitätssystem, Design Controls | [eCFR](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-820) |
| Datenbank der anerkannten Konsensnormen | Zeigt, welche Ausgabe von IEC 62304 usw. die FDA anerkennt | [FDA-Datenbank](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfStandards/search.cfm) |

Hinweis: Die FDA verlangt kein Zertifikat „nach IEC 62304“. Sie erwartet die Unterlagen nach dem Software-Leitfaden. 62304 ist anerkannte
Norm und der übliche Weg, die Erwartungen zu erfüllen.

## Warum keine PDFs im Repo liegen

- **IEC- und ISO-Normen** sind urheberrechtlich geschützt und kostenpflichtig. Sie in ein öffentliches Repo zu legen wäre unzulässig.
- **FDA-Leitfäden** sind frei, aber `fda.gov` war aus dieser Sitzung nicht erreichbar (Netzwerkregel, Antwort 403). Ich habe das nicht umgangen.
- Vorschlag: Die FDA-PDFs lokal von den Seiten oben laden und in einem **nicht öffentlichen** Ordner ablegen. Lizenzierte Normen nur intern halten. In der Doku verweisen wir auf Klauseln, nie auf kopierten Text.

## Sicherheitsklassen nach IEC 62304 (Kurzfassung)

| Klasse | Bedeutung | Konsequenz |
|---|---|---|
| A | Keine Verletzung oder Gesundheitsschädigung möglich | wenig Pflichtdokumente |
| B | Verletzung möglich, aber nicht schwer | Architektur und Detailentwurf auf Einheitenebene |
| **C** | Tod oder schwere Verletzung möglich | alles aus B, plus Detailentwurf je Einheit, Abnahmekriterien, strengere Prüfungen |

Die Klasse folgt aus der Risikoanalyse, nicht aus dem Wunsch. Hier ist **C** gesetzt (konservativ), siehe [Risiko](06_Risiko.md).
