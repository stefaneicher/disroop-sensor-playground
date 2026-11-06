# Ziel

Live-Demo mit dem **Nordic Thingy:52**, komplett von der AI aufgebaut. Alle Tools laufen in Docker, nichts wird lokal installiert.

1. **Terminal:** ein Windows-Programm (`thingy.exe`) gibt Beschleunigung, Gyro, Kompass, Lage, Temperatur, Feuchte, Druck, eCO₂/TVOC, Farbe, Lautstärke, Taster und Akku live aus.
2. **Lied:** „Highway to Hell“ läuft über den Lautsprecher des Thingy und die LED blinkt dazu.
3. **Web-GUI:** zeigt alle Werte live als Datenstream vom Gerät (`http://localhost:8052`).
4. **Android-App:** zeigt dieselben Werte. Das Handy an den Thingy halten öffnet die App per NFC.

Datenquelle ist die Thingy-Werksfirmware über Bluetooth LE. Dafür ist keine Debug-Probe nötig.
