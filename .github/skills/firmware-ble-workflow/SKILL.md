---
name: firmware-ble-workflow
description: "Firmware-Build im Container (Zephyr / nRF Connect SDK), Host-Unit-Tests, GATT-Profil gegen docs/protocol.md, Programmierweg."
---

# firmware-ble-workflow (lokal verfasst für Disroop Motion One, Herkunft: Primärdokumentation der Werkzeuge; noch ohne getestetes Beispiel, wird nach den Smoke-Tests §5 ergänzt)

- Kodierer als reines C ohne Hardwareabhängigkeit, Host-Tests mit denselben Testvektoren wie `bridge/internal/thingy/*_test.go`.
- Build: `west build -b <board>` im Firmware-Image; Image-Grösse und SHA-256 festhalten.
- Nichts flashen ohne Anweisung des Users.
