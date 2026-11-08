# Prozessanforderungen: Tests, Abdeckung, Anforderungssprache, Toolchain

**Status: Entwurf zum Iterieren. Nichts davon ist umgesetzt.** Das Dokument sammelt, was der User am 2026-11-08 gefordert hat, mit meiner
Empfehlung und den offenen Fragen je Punkt. Die Anforderungen an die *Firmware* stehen im [SRS](02_SRS.md), hier stehen die Anforderungen
an den *Entwicklungs- und Nachweisprozess* (`PRQ-nnn`). Bezug: [Lücken](08_Luecken.md), `IDEEN.md`, `TODO.md`.

## 1. Zusammenfassung der Empfehlungen

| Thema | Empfehlung | Aufwand | Offen |
|---|---|---|---|
| Coverage | **MC/DC entschieden.** 100 % für die reinen C-Module, Statement + Branch für die Adapter, Ausnahmen begründet und gelistet | mittel bis hoch | Gilt 100 % nur für die reinen Module? ({OPEN-10}) |
| Testframework | **GoogleTest entschieden**, auf x86 (Hauptweg). Auf dem Gerät **ZTest** (Zephyr) als Option, nicht GoogleTest | mittel | Tests von Unity umschreiben? |
| Adapter testen | Zephyr-Code läuft auf dem PC mit **`native_sim`**, damit auch BLE-, IMU- und UI-Adapter Tests bekommen | hoch | Machbarkeit prüfen |
| Gherkin | Sinnvoll als **Verifikationsspezifikation** für Verhalten an der BLE-Schnittstelle, nicht als Ersatz für das SRS und nicht für Algorithmen | niedrig bis mittel | SRS oder Features als Quelle? |
| Avionik-Sprache | Kandidaten: **EARS**, **FRET**, **AADL (SAE AS5506)**, **SCADE**. Ich empfehle EARS für die SRS-Sätze | niedrig | Welche war gemeint? ({OPEN-11}) |
| Toolchain | **Compiler entschieden:** Clang, ARM-GCC, IAR (drei). Matrix, Warnungen als Fehler, Conan 2, modernes CMake, Docker je Compilerfamilie, parallele Jobs | hoch | Versionen, IAR-Lizenz |
| Normkonformität | Dokumentation weiterhin als Dokument-als-Code, Nachweise (Abdeckung, Testberichte) automatisch erzeugt | mittel | Zweckbestimmung (OPEN-01) |

## 2. Abdeckung (Coverage)

### Begriffe zuerst

Der User nennt „Multi-Condition Decision Coverage“ und „MCDC“. Das sind **zwei verschiedene Kriterien**:

| Kriterium | Bedeutung | Testfälle bei n Bedingungen |
|---|---|---|
| Statement / Branch | jede Anweisung / jeder Zweig einmal | wenige |
| **MC/DC** (*Modified Condition/Decision Coverage*) | jede Bedingung ändert **für sich allein** das Ergebnis der Entscheidung | etwa n+1 |
| **MCC** (*Multiple Condition Coverage*, auch „Multi-Condition“) | alle Kombinationen aller Bedingungen | 2ⁿ |

MC/DC ist das Kriterium aus der Avionik (DO-178C, Stufe A) und der Automobilnorm ISO 26262 (ASIL D). MCC ist deutlich teurer und fast nie gefordert.
**Entschieden (User, 2026-11-08): MC/DC.**

Wichtig für die Einordnung: **IEC 62304 verlangt kein MC/DC.** Sie verlangt Abnahmekriterien für Einheiten, bei Klasse C zusätzliche
(Abschnitt 5.5.4, Nummer ungeprüft). Die FDA verlangt Testnachweise, aber keine bestimmte Abdeckung. 100 % MC/DC ist also eine
**selbst gesetzte, strengere Anforderung**. Das ist zulässig und ein starkes Signal in einem Audit, wenn sie eingehalten wird.

### Anforderungen

| ID | Anforderung | Status |
|---|---|---|
| <a id="PRQ-001"></a>**PRQ-001** | Für die reinen C-Module (`codec`, `fusion`, `icm`, `power`, `input`) wird **100 % MC/DC** gemessen und gefordert. | Entwurf |
| <a id="PRQ-002"></a>**PRQ-002** | Für die Zephyr-Adapter (`ble_thingy`, `imu_task`, `ui`, `ext`, `battery`, `main`, `board_early`) gilt **100 % Statement und Branch**, MC/DC nach Möglichkeit. | Entwurf, Vorschlag |
| <a id="PRQ-003"></a>**PRQ-003** | Jede Ausnahme (nicht erreichbarer Code, defensive Prüfung, Hardwarefehler, die sich nicht erzeugen lassen) steht in einer Liste mit Begründung und Prüfdatum. Ein Prozent ohne Begründung zählt nicht. | Entwurf |
| <a id="PRQ-004"></a>**PRQ-004** | Gemessen wird mit **GCC ab Version 14** (`-fcondition-coverage`, Bericht mit `gcov --conditions`) oder **Clang ab Version 18** (`-fcoverage-mcdc`, Bericht mit `llvm-cov`). Beide werden in der Compiler-Matrix ({PRQ-040}) geführt. | Entwurf, Versionen prüfen |
| <a id="PRQ-005"></a>**PRQ-005** | Der Abdeckungsbericht (HTML und maschinenlesbar) wird in der CI erzeugt, als Artefakt abgelegt und **blockiert den Merge**, wenn ein Modul unter dem Sollwert liegt. | Entwurf |
| <a id="PRQ-006"></a>**PRQ-006** | Der Bericht verweist je Datei auf die Anforderungen ({SRS-001} usw.), damit die Abdeckung Teil des Verifikationsnachweises ist. | Entwurf |

### Einschätzung (kritisch)

- **Machbar** für die reinen Module: Sie sind klein (rund 1500 Zeilen C, ohne Tests), ohne Hardware, und die Entscheidungen sind meist kurz.
  MC/DC braucht grob n+1 Testfälle je Entscheidung mit n Bedingungen, also mehr als Branch-Abdeckung. Wie viele es hier sind, zeigt erst das Pilotmodul (Abschnitt 8).
- **Nicht ehrlich machbar** für den Zephyr-Kern und den BLE-Stack (SOUP): nicht unser Code, nicht messbar. Nur eigener Code zählt.
- **Aussagekraft:** Abdeckung auf **x86** misst den Quelltext, nicht das Programm auf dem Cortex-M4. Für Klasse C ist das mit Begründung üblich.
  Wer es auf Objektcode-Ebene braucht (Avionik Stufe A), muss auf dem Gerät messen. Das ist deutlich aufwändiger (Instrumentierung, Platz, kein UART im Gerät, siehe ADR-0002).
- **Fallen:** Entscheidungen mit Nebenwirkungen im Ausdruck, Makros, die mehrere Bedingungen verstecken (`MIN`, `BIT`, `ARRAY_SIZE`), Zeitbedingungen
  und `volatile`. Das Werkzeug zählt Bedingungen im vorverarbeiteten Code. Manche Ausdrücke sind **nicht MC/DC-testbar**, weil Bedingungen nicht unabhängig sind
  (z. B. `x > 0 && x < 10` ist abhängig von `x`). Dort wird der Code vereinfacht statt der Test verbogen.
- GCC begrenzt Ausdrücke für MC/DC auf 64 Bedingungen. Das ist hier kein Thema.
- **Alternative bei Bedarf:** Kommerzielle Werkzeuge (VectorCAST, LDRA, Cantata, BullseyeCoverage) liefern Berichte, die Auditoren kennen, und messen auch auf dem Gerät.
  Sie kosten Lizenzen. Für den Start reichen GCC 14 und Clang 18.

## 3. Testframework

### Entscheid: GoogleTest auf x86, ZTest auf dem Gerät

| Kriterium | GoogleTest | Unity (heute) | ZTest (Zephyr) | CppUTest |
|---|---|---|---|---|
| Sprache | C++ (testet C über `extern "C"`) | C | C | C++ |
| Läuft auf x86 | ja | ja | ja (über `native_sim`) | ja |
| Läuft auf Cortex-M4 (256 KB RAM) | **nein praktisch**: braucht C++-Laufzeit, Ausnahmen, RTTI, viel Platz | ja | **ja**, gebaut für Zephyr | möglich, aber nicht unser Weg |
| Mocking | **GoogleMock** | von Hand | `fff` (Fake-Funktionen) | CppUMock |
| Parametrisierte Tests, XML-Bericht | **ja** | nein / mit Zusatz | XML über Twister | teilweise |
| Passt zur MC/DC-Messung | ja (beliebiger Compiler) | ja | ja | ja |

Begründung: GoogleTest ist auf dem PC das bequemste und verbreitetste Werkzeug (Mocks, Parametertests, Berichte für Nachweise). Auf dem Gerät
ist es zu schwer. Dort bietet Zephyr **ZTest** mit **Twister** als Testläufer. Die Frage „GTest oder CPU-Test“ ist mit der Bestätigung des Users für **GoogleTest** beantwortet ({OPEN-12}).

| ID | Anforderung | Status |
|---|---|---|
| <a id="PRQ-010"></a>**PRQ-010** | Unit-Tests laufen mit **GoogleTest auf x86** (Linux, im Docker-Image). Die Testdateien sind C++ und rufen die C-Module über `extern "C"` auf. Die Firmware bleibt C. | Entwurf |
| <a id="PRQ-011"></a>**PRQ-011** | Die Ports `icm_bus_t` und `vbat_port_t` werden mit GoogleMock oder handgeschriebenen Fakes ersetzt. | Entwurf |
| <a id="PRQ-012"></a>**PRQ-012** | Die bestehenden 69 Unity-Tests werden nach GoogleTest übernommen. Umschreiben ist mechanisch, das Verhalten bleibt gleich. Ein Test gilt erst als übernommen, wenn er auf demselben Code **fehlschlägt**, wenn man die Prüfung umkehrt (Gegenprobe). | Entwurf, Aufwand klein bis mittel |
| <a id="PRQ-013"></a>**PRQ-013** | **Option:** Dieselben Testfälle sind auf dem Gerät ausführbar (**ZTest** über Twister, Ergebnis per RTT, da kein UART). Zweck: Gleitkomma- und Zeitverhalten auf dem echten Prozessor, Treiber-Integration. | Option |
| <a id="PRQ-014"></a>**PRQ-014** | Gemeinsame Testvektoren (Eingabe, erwartete Bytes) liegen als Daten vor (Header oder Datei), damit GoogleTest und ZTest dieselben Fälle prüfen, ohne die Testlogik doppelt zu pflegen. | Entwurf |
| <a id="PRQ-015"></a>**PRQ-015** | Die Zephyr-Adapter werden auf dem PC mit **`native_sim`** gebaut und getestet (simulierte GPIO, SPI, Bluetooth-Controller). Dadurch bekommen die Einheiten UNIT-12 bis UNIT-18 Tests. | Entwurf, Machbarkeit prüfen |

### Einschätzung

- Ohne `native_sim` (PRQ-015) bleiben die Adapter ungetestet, und 100 % bei PRQ-002 wird nicht erreichbar. Das ist die grösste technische Unbekannte.
  Zephyr bringt dafür einen Bluetooth-Controller-Ersatz (virtuell) mit. Ob er unseren GATT-Code ausreichend abdeckt, muss ein Spike zeigen.
- Auf dem x86-PC laufen `float` mit SSE, auf dem Cortex-M4F mit der Single-Precision-FPU. Beides ist IEEE 754, Ergebnisse können sich durch
  Fused-Multiply-Add (`-ffp-contract`) in der letzten Stelle unterscheiden. Darum PRQ-013 als Option und Toleranzen in den Fusion-Tests.
- Das Hauptrisiko liegt nicht im Framework, sondern in den Zeit- und Nebenläufigkeitsfällen der Adapter.

## 4. Anforderungen als Gherkin (Feature-Dateien)

Gherkin beschreibt Verhalten in der Form *Gegeben / Wenn / Dann*, in Dateien `*.feature`. Beispiel für {SRS-010}:

```gherkin
@SRS-010
Feature: Motion-Konfiguration über BLE
  Scenario: Frequenz ausserhalb des Bereichs wird abgelehnt
    Given das Gerät ist verbunden
    When der Client in EF680401 die Frequenz 300 Hz schreibt
    Then antwortet das Gerät mit "Value not allowed"
    And die Konfiguration bleibt unverändert
```

| ID | Anforderung | Status |
|---|---|---|
| <a id="PRQ-020"></a>**PRQ-020** | Verhalten an der BLE-Schnittstelle und am Taster wird als Feature-Dateien unter `devices/motion-one/regulatory/features/` festgehalten. | Entwurf |
| <a id="PRQ-021"></a>**PRQ-021** | Jedes Szenario trägt Tags auf die Anforderung (`@SRS-nnn`) und, falls vorhanden, auf die Gefährdung (`@HAZ-nn`). Die Rückverfolgbarkeitsmatrix wird daraus erzeugt. | Entwurf |
| <a id="PRQ-022"></a>**PRQ-022** | Die Szenarien laufen auf zwei Ebenen: (a) auf x86 gegen die C-Module bzw. `native_sim` (mit `cucumber-cpp` und GoogleTest), (b) am Gerät über BLE (z. B. Python-Schritte mit `behave` und `bleak` gegen das echte Gerät, Hardware-in-the-Loop). | Entwurf |
| <a id="PRQ-023"></a>**PRQ-023** | Es gibt **eine** Quelle der Wahrheit je Anforderung. Entscheid offen ({OPEN-13}). | offen |

### Einschätzung: sinnvoll, aber mit Grenzen

**Dafür:** Szenarien sind für Fachleute ohne Programmierkenntnis lesbar, prüfbar und wiederholbar. Sie eignen sich gut für Zustände und Protokoll
(Verbinden, Abonnieren, Fehlerantworten, Taster kurz/lang, Abschaltung). Die Tags liefern die Rückverfolgbarkeit, die IEC 62304 verlangt.

**Dagegen:**
- Für Zahlen und Algorithmen (Filtergenauigkeit, Bias-Schwelle, Kodierung auf Bit-Ebene) sind Gherkin-Szenarien umständlich. Dort bleiben Tabellen und Testvektoren besser.
- Gherkin ist **nicht formal**: Es prüft nichts von allein, ein Szenario ist nur so gut wie die Schritte dahinter.
- Eine zweite Beschreibung neben dem SRS führt zu Doppelpflege. Deshalb PRQ-023.

**Mein Vorschlag:** Das SRS (ID, Satz, Tag) bleibt die **Anforderung**. Gherkin ist die **Verifikationsspezifikation** (Testfall in lesbarer Form).
Die Matrix verbindet beides über die Tags. Nur Verhalten, das sich als Szenario klar sagen lässt, wird als Feature geschrieben (geschätzt 60–70 % der Anforderungen).

## 5. Formale Anforderungssprache aus der Avionik

Der User erinnert sich an „eine Sprache aus der Avionik mit einer Nummer“. Ich kenne mehrere Kandidaten ({OPEN-11}):

| Kandidat | Was es ist | Nummer? | Passt hier? |
|---|---|---|---|
| **EARS** | *Easy Approach to Requirements Syntax*: Satzschablonen („Wenn <Ereignis>, soll das System <Reaktion>“), aus der Luftfahrt (Rolls-Royce) | nein | **ja**, leicht, bleibt Markdown |
| **FRET** (NASA) | strukturierte Sprache (FRETish) mit Übersetzung in Temporallogik, Prüfung mit Modellprüfern | nein | ja, wenn echte formale Prüfung gewünscht |
| **AADL** | *Architecture Analysis & Design Language*, **SAE AS5506** | **ja (AS5506)** | eher für Architektur (SAD) als für Anforderungen |
| **SCADE / Lustre** | modellbasierte Sprache für sicherheitskritische Steuerungen, qualifizierter Codegenerator (DO-178C) | nein | Overkill, bräuchte Werkzeug und Lizenz |
| **DO-178C** (+ DO-331 Modellbasiert, DO-333 Formale Methoden) | **Norm**, keine Sprache, aber der Rahmen, in dem MC/DC und strenge Anforderungen stammen | **ja (DO-178C)** | als Vorbild für Abdeckung und Anforderungsstil |

Falls der User die Nummer meint, ist es am wahrscheinlichsten **AS5506 (AADL)** oder die Norm **DO-178C**. Eine reine Anforderungssprache mit Nummer kenne ich nicht sicher.

| ID | Anforderung | Status |
|---|---|---|
| <a id="PRQ-030"></a>**PRQ-030** | SRS-Sätze folgen den **EARS**-Schablonen (ereignisgesteuert, zustandsgesteuert, unerwünschtes Verhalten, optional). | Entwurf, Empfehlung |
| <a id="PRQ-031"></a>**PRQ-031** | Für 3–5 kritische Anforderungen (z. B. {SRS-052}, {SRS-043}) wird als Versuch eine **formale Fassung** (FRET) erstellt und geprüft. | Option |

Einschätzung: EARS kostet fast nichts und macht Sätze eindeutiger („soll“ statt „sollte“, ein Auslöser, eine Reaktion). Formale Methoden lohnen sich erst bei
wenigen, besonders kritischen Anforderungen. Für Klasse C ist beides **nicht verlangt**.

## 6. Toolchain, Compiler-Matrix, Build

(Aus der Anforderung des Users von früher am selben Tag, hier konsolidiert. Matrix-Entwurf: `IDEEN.md`.)

| ID | Anforderung | Status |
|---|---|---|
| <a id="PRQ-040"></a>**PRQ-040** | Die Compiler-Matrix steht in **einer Datei** (`toolchain_matrix.yml`). Sie legt Compiler, Version und Zweck fest (Host-Tests, Zielgerät, Abdeckung). | Entwurf |
| <a id="PRQ-041"></a>**PRQ-041** | **Warnungen sind Fehler**, null Warnungen, auf allen Compilern der Matrix (`-Wall -Wextra -Werror` und ein strengerer Satz je Compiler). | Entwurf |
| <a id="PRQ-042"></a>**PRQ-042** | Compiler (User, 2026-11-08): **Clang, ARM-GCC (`arm-none-eabi-gcc`, ein Compiler) und IAR**, je in mehreren Versionen. Welche Versionen genau und ob eine IAR-Lizenz vorhanden ist, ist offen ({OPEN-14}). | entschieden, Versionen offen |
| <a id="PRQ-043"></a>**PRQ-043** | Der Build nutzt **CMake mit Targets** (`target_link_libraries`, `target_compile_options`, ein Interface-Target für die Warnungen) und **Conan 2** für Abhängigkeiten (GoogleTest, cucumber-cpp, ggf. Zephyr-fremde Bibliotheken). | Entwurf |
| <a id="PRQ-044"></a>**PRQ-044** | Aus der Matrix werden **Docker-Images je Compilerfamilie** gebaut (Basis per Digest festgelegt). | Entwurf |
| <a id="PRQ-045"></a>**PRQ-045** | Die CI führt je Matrixzeile einen eigenen Job **parallel** aus (GitHub-Actions-Matrix, erzeugt aus der Datei). | Entwurf |
| <a id="PRQ-046"></a>**PRQ-046** | IAR ist kommerziell: Es läuft nur auf einem eigenen Runner mit Lizenz, nicht in einem öffentlichen Image. Die Lizenzbedingungen sind vor der Nutzung zu prüfen. | Entwurf, Einschränkung |

Einschätzung: Der Aufwand liegt bei PRQ-043. Die Firmware ist heute mit `west` und Zephyr-CMake gebaut. Ein **Zwei-Schichten-Ansatz** ist realistisch:
die reinen C-Module als CMake-Bibliotheken (Targets) für alle Compiler und für die Tests, die Zephyr-App weiter mit `west`, aber diese Bibliotheken einbindend.
Mit mehreren Compilern auf dem **Zielgerät** geht es nur so weit, wie Zephyr sie unterstützt (GCC ja, Clang und IAR eingeschränkt, prüfen).

## 7. Dokumentation für FDA und IEC 62304

| ID | Anforderung | Status |
|---|---|---|
| <a id="PRQ-050"></a>**PRQ-050** | Die Dokumentation bleibt **Dokument-als-Code** (Markdown im Repo, HTML erzeugt, Links in den Code, automatische Prüfung). | umgesetzt (Entwurf, siehe [README](README.md)) |
| <a id="PRQ-051"></a>**PRQ-051** | Nachweise (Testbericht, Abdeckungsbericht, SBOM, Compilerprotokoll) werden von der CI erzeugt und mit Commit-ID als **Nachweispaket** je Release abgelegt. | Entwurf |
| <a id="PRQ-052"></a>**PRQ-052** | Jede Klausel von IEC 62304 (Klasse C) und jedes erwartete FDA-Dokument ist in der [Lückenanalyse](08_Luecken.md) einem Nachweis zugeordnet. | umgesetzt als Entwurf |
| <a id="PRQ-053"></a>**PRQ-053** | Die frei verfügbaren **FDA-Leitfäden** werden als PDF abgelegt und im Text mit Abschnittsnummern zitiert. | offen: Zugriff, siehe unten |

Hinweis zum Zugriff: Der User schreibt, `fda.gov` sei jetzt erreichbar. Aus dieser Sitzung antwortet der Server noch nicht (Verbindung scheitert). Die Änderung gilt
vermutlich erst für neue Sitzungen. Die Normen selbst (IEC, ISO) bleiben kostenpflichtig und kommen nicht ins öffentliche Repo.

## 8. Reihenfolge zum Iterieren

1. Begriffe klären ({OPEN-10} bis {OPEN-14}), damit die Anforderungen eindeutig sind.
2. **Spike `native_sim`** (PRQ-015): Läuft der Zephyr-Code auf dem PC mit simuliertem BLE? Davon hängt ab, ob PRQ-002 erreichbar ist.
3. **Pilotmodul** `codec` mit GoogleTest und MC/DC (PRQ-001, PRQ-010, PRQ-004): Wie viele Testfälle, wie viele nicht testbare Ausdrücke?
4. SRS auf EARS umstellen und Gherkin-Pilot für zehn Anforderungen (PRQ-020, PRQ-030).
5. Compiler-Matrix zuerst für die reinen Module (PRQ-040 bis PRQ-045).
6. Gerätetests mit ZTest nur, wenn der x86-Weg steht (PRQ-013).

## 9. Offene Fragen

- <a id="OPEN-10"></a>**OPEN-10** ~~Ist MC/DC gemeint?~~ **Ja, MC/DC** (User, 2026-11-08). Offen bleibt: Gilt 100 % für alle eigenen Module oder nur für die reinen C-Module (mein Vorschlag)?
- <a id="OPEN-11"></a>**OPEN-11** Welche Avionik-Sprache war gemeint (EARS, FRET, AADL AS5506, SCADE, Norm DO-178C)? Hast du einen Namen oder eine Quelle?
- <a id="OPEN-12"></a>**OPEN-12** ~~GoogleTest oder CppUTest?~~ **GoogleTest** (User, 2026-11-08). Für das Gerät bleibt ZTest meine Empfehlung als Option, solange nichts dagegen spricht.
- <a id="OPEN-13"></a>**OPEN-13** Soll das **SRS** (Tabelle) oder die **Feature-Datei** die Quelle sein? Ich empfehle SRS als Quelle und Gherkin als Testbeschreibung.
- <a id="OPEN-14"></a>**OPEN-14** ~~Welche Compiler?~~ **Clang, ARM-GCC, IAR** (User, 2026-11-08; ARM-GCC ist ein einzelner Compiler). Offen: Welche Versionen? Gibt es eine IAR-Lizenz? Für die Tests auf x86 nehme ich Clang (MC/DC ab 18). Soll zusätzlich der x86-GCC (MC/DC ab 14) laufen?
- <a id="OPEN-15"></a>**OPEN-15** Der User bestätigt GoogleTest. Offen: Zuerst MC/DC mit den bestehenden Unity-Tests messen (billiger Einstieg) und danach migrieren, oder sofort migrieren?
