// Explanations of every physical quantity shown in the dashboard (German UI text, shown in ⓘ popovers and the
// "Messgrössen erklärt" table). docs/MESSGROESSEN.md mirrors these texts.

export interface GlossaryEntry {
  id: string;
  title: string;
  unit: string;
  sensor: string;
  /** 2–4 sentences: what it is physically and what to watch out for. */
  text: string;
  /** Measuring range, accuracy and bus address from the datasheet (optional). */
  spec?: string;
  /** Typical values / ranges. */
  typical: string;
  /** Snapshot fields (dot paths, prefix match) this entry explains. */
  fields: readonly string[];
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'temperature', title: 'Temperatur', unit: '°C', sensor: 'HTS221 (Temperatur/Feuchte)',
    spec: '−40…+120 °C, ±0.5 °C (15–40 °C), 16 Bit · I²C 0x5F',
    text: 'Lufttemperatur am Sensor in Grad Celsius. Die Elektronik und das Laden wärmen das Thingy leicht auf. Der Wert liegt deshalb oft 1–3 °C über der Raumluft.',
    typical: 'Wohnraum 20–23 °C',
    fields: ['environment.temperature_c'],
  },
  {
    id: 'humidity', title: 'Feuchte', unit: '% rel.', sensor: 'HTS221 (Temperatur/Feuchte)',
    spec: '0…100 % rH, ±3.5 % (20–80 %), 16 Bit · I²C 0x5F',
    text: 'Relative Luftfeuchte: wie viel Wasserdampf die Luft enthält, verglichen mit dem Maximum bei dieser Temperatur. Wird dieselbe Luft wärmer, sinkt die relative Feuchte.',
    typical: 'angenehm 40–60 %; unter 30 % trocken, über 70 % Schimmelgefahr',
    fields: ['environment.humidity_pct'],
  },
  {
    id: 'pressure', title: 'Luftdruck', unit: 'hPa', sensor: 'LPS22HB (Barometer)',
    spec: '260…1260 hPa, ±1 hPa absolut, ±0.1 hPa relativ, 24 Bit · I²C 0x5C',
    text: 'Gewicht der Luftsäule über dem Sensor in Hektopascal (1 hPa = 100 Pa = 1 mbar). Er sinkt mit der Höhe um etwa 1 hPa pro 8 m und schwankt mit dem Wetter um einige hPa.',
    typical: 'Meereshöhe ~1013 hPa; auf ~550 m ü. M. ~950 hPa',
    fields: ['environment.pressure_hpa'],
  },
  {
    id: 'altitude', title: 'Höhe', unit: 'm', sensor: 'LPS22HB (Barometer)',
    spec: 'Auflösung ca. 0.1 m; absolute Genauigkeit nur mit Kalibrierung, sonst Wetterdrift · I²C 0x5C',
    text: 'Aus dem Luftdruck mit der barometrischen Höhenformel berechnet (etwa 1 hPa je 8 m). Das Wetter verschiebt den Druck um einige hPa, deshalb driftet die absolute Höhe über Stunden. Kalibriere mit einer bekannten Höhe (m ü. M.) oder setze mit „Hier = 0 m“ einen Nullpunkt, dann zeigt sie nur Höhenunterschiede.',
    typical: 'Treppenstufe ~0.2 m, Stockwerk ~3 m; Genauigkeit kurzfristig ca. ±1 m',
    fields: [],
  },
  {
    id: 'eco2', title: 'eCO₂', unit: 'ppm', sensor: 'CCS811 (Gassensor)',
    spec: '400…8192 ppm, Schätzwert · I²C 0x5A',
    text: 'Geschätzter CO₂-Gehalt in Teilen pro Million (equivalent CO₂). Der CCS811 misst kein CO₂ direkt. Er misst den Widerstand einer Metalloxid-Schicht, die auf flüchtige Gase reagiert, und rechnet daraus einen CO₂-Wert hoch. Nach dem Einschalten braucht er etwa 20 min Einlaufzeit.',
    typical: 'Aussenluft ~400 ppm; unter 800 gut, ab 1000 lüften, über 1500 schlecht',
    fields: ['environment.eco2_ppm'],
  },
  {
    id: 'tvoc', title: 'TVOC', unit: 'ppb', sensor: 'CCS811 (Gassensor)',
    spec: '0…1187 ppb, Schätzwert · I²C 0x5A',
    text: 'Total Volatile Organic Compounds: die Summe flüchtiger organischer Stoffe in Teilen pro Milliarde. Solche Stoffe kommen z. B. aus Reinigungsmitteln, Farben, Parfum, Kochen oder dem Atem. Wie eCO₂ wird der Wert aus dem Gas-Widerstand geschätzt (~20 min Einlaufzeit). Er eignet sich für Trends, nicht als exakte Messung.',
    typical: 'unter 220 ppb gut, 220–660 mässig, über 660 lüften',
    fields: ['environment.tvoc_ppb'],
  },
  {
    id: 'color', title: 'Farbe (RGBC)', unit: 'Rohwerte (ohne Einheit)', sensor: 'BH1745 (Farb-/Lichtsensor)',
    spec: '4 Kanäle × 16 Bit, Gain 1×/2×/16×, Messzeit 160–5120 ms · I²C 0x38',
    text: 'Der Lichtsensor hat vier Kanäle: Rot, Grün, Blau und Clear. Clear ist ungefiltert und entspricht ungefähr der Helligkeit. Die Zahlen sind Rohzählwerte. Das Farbfeld zeigt das daraus normierte RGB.',
    typical: 'dunkel: C nahe 0; Tageslicht: C mehrere Hundert bis Tausende',
    fields: ['environment.color'],
  },
  {
    id: 'accel', title: 'Beschleunigung', unit: 'g (1 g = 9.81 m/s²)', sensor: 'MPU-9250 (9-Achsen-Bewegungssensor)',
    spec: '±2/4/8/16 g wählbar, 16 Bit · I²C 0x68',
    text: 'Beschleunigung entlang der x-, y- und z-Achse in Vielfachen der Erdbeschleunigung. Auch in Ruhe misst der Sensor die Schwerkraft. Flach liegend zeigt z deshalb etwa +1 g, x und y etwa 0 g.',
    typical: 'ruhig liegend z ≈ 1 g (Rauschen ±0.05 g); Schütteln bis einige g',
    fields: ['motion.accel_g'],
  },
  {
    id: 'gyro', title: 'Gyroskop (Drehrate)', unit: '°/s', sensor: 'MPU-9250 (9-Achsen-Bewegungssensor)',
    spec: '±250/500/1000/2000 °/s wählbar, 16 Bit · I²C 0x68',
    text: 'Drehgeschwindigkeit um die x-, y- und z-Achse in Grad pro Sekunde. In Ruhe liegt sie nahe 0. Eine volle Umdrehung pro Sekunde entspricht 360 °/s.',
    typical: 'ruhig ±2 °/s; Handbewegung 50–300 °/s',
    fields: ['motion.gyro_dps'],
  },
  {
    id: 'magnet', title: 'Magnetfeld', unit: 'µT (Mikrotesla)', sensor: 'MPU-9250 (Magnetometer AK8963)',
    spec: '±4912 µT, 16 Bit (0.15 µT/Bit) · AK8963 an I²C 0x0C',
    text: 'Magnetische Flussdichte entlang der drei Achsen. Der Kompass berechnet daraus den Kurs. Eisen, Magnete, Laptops und Stromkabel in der Nähe verfälschen den Wert stark. Der Betrag ist die Gesamtstärke des Felds.',
    typical: 'Erdmagnetfeld 25–65 µT (Schweiz ~48 µT); ausserhalb davon stört etwas',
    fields: ['motion.compass_ut'],
  },
  {
    id: 'heading', title: 'Kurs (Heading)', unit: '° (0–360)', sensor: 'MPU-9250 (Magnetometer + Sensorfusion)',
    text: 'Richtung, in die die Oberkante (y-Achse) des Thingy zeigt, im Uhrzeigersinn ab magnetisch Nord: 0° = N, 90° = O, 180° = S, 270° = W. Gemeint ist der magnetische, nicht der geografische Norden. Der Kompass ist störanfällig: Metall in der Nähe oder fehlende Kalibrierung verfälschen ihn leicht um viele Grad.',
    typical: 'Kalibrieren: Thingy in einer 8er-Bewegung drehen',
    fields: ['motion.heading_deg'],
  },
  {
    id: 'attitude', title: 'Lage (Roll/Pitch/Yaw)', unit: '°', sensor: 'MPU-9250 (Sensorfusion)',
    text: 'Roll ist die seitliche Neigung, Pitch die Neigung nach vorn oder hinten, Yaw die Drehung um die Hochachse. Das Thingy fusioniert Beschleunigung, Drehrate und Magnetfeld zu diesen Winkeln. Der künstliche Horizont zeigt Roll und Pitch wie im Cockpit. Das Hoch- bzw. Querformat leitet die Firmware aus der Lage ab.',
    typical: 'flach liegend Roll ≈ 0°, Pitch ≈ 0°; Roll/Yaw ±180°, Pitch ±90°',
    fields: ['motion.euler_deg', 'motion.orientation'],
  },
  {
    id: 'quaternion', title: 'Quaternion', unit: 'ohne Einheit', sensor: 'MPU-9250 (Sensorfusion)',
    text: 'Vier Zahlen (w, x, y, z) beschreiben die 3D-Lage ohne Sonderfälle. Anders als bei Eulerwinkeln gibt es keinen „Gimbal Lock“. Der Betrag ist immer 1; w = 1 mit x = y = z = 0 bedeutet die Grundlage. Der 3D-Würfel wird direkt damit gedreht.',
    typical: 'jede Komponente zwischen −1 und +1',
    fields: ['motion.quaternion'],
  },
  {
    id: 'steps', title: 'Schritte', unit: 'Anzahl', sensor: 'MPU-9250 (Schrittzähler der Firmware)',
    text: 'Der Schrittzähler erkennt das typische Beschleunigungsmuster beim Gehen. Er zählt seit dem Einschalten des Thingy. Auch Schütteln kann Schritte auslösen.',
    typical: 'steigt beim Tragen um ~1–2 pro Sekunde',
    fields: ['motion.steps'],
  },
  {
    id: 'tap', title: 'Tap', unit: 'Richtung × Anzahl', sensor: 'MPU-9250 (Tap-Erkennung)',
    text: 'Die Tap-Erkennung meldet ein kurzes Antippen des Gehäuses. Angezeigt werden die Achse samt Richtung, z. B. Z+ für einen Tap von oben, und die Anzahl Taps in Folge (Doppeltap = ×2).',
    typical: 'Achsen X±, Y±, Z±; ×1 oder ×2',
    fields: ['motion.tap'],
  },
  {
    id: 'level', title: 'Mikrofon-Pegel', unit: 'dBFS', sensor: 'MEMS-Mikrofon (PDM)',
    text: 'Lautstärke in Dezibel relativ zum digitalen Vollausschlag (Full Scale). 0 dBFS ist das lauteste mögliche Signal, alle anderen Werte sind negativ. +6 dB entsprechen etwa der doppelten Amplitude; es ist kein kalibrierter Schalldruck (dB SPL). Das Mikrofon misst nur, wenn es eingeschaltet ist.',
    typical: 'Stille ~−70 dBFS; Sprechen −40 bis −20; sehr laut nahe 0',
    fields: ['sound.level_dbfs', 'sound.mic_enabled', 'sound.mic_blocked'],
  },
  {
    id: 'rssi', title: 'Signalstärke (RSSI)', unit: 'dBm', sensor: 'Bluetooth-Funk (nRF52832 / PC-Adapter)',
    text: 'Empfangene Funkleistung der Bluetooth-Verbindung in Dezibel bezogen auf 1 mW. Die Werte sind negativ, je näher an 0, desto besser. 10 dB weniger bedeuten ein zehnmal schwächeres Signal.',
    typical: 'über −60 dBm sehr gut; −60 bis −80 ok; unter −90 drohen Abbrüche',
    fields: ['device.rssi'],
  },
  {
    id: 'battery', title: 'Akku', unit: '%', sensor: 'Akkuspannungs-Messung (nRF52832)',
    text: 'Ladestand des Akkus in Prozent, geschätzt aus der Akkuspannung. Die Werksfirmware meldet nicht, ob geladen wird. Der Trend („⚡ lädt“ / „Akkubetrieb“) wird deshalb aus dem Verlauf des Akkustands geschätzt und reagiert erst nach einigen Minuten.',
    typical: '100 % voll; unter 20 % bald laden',
    fields: ['device.battery_pct', 'device.battery_trend'],
  },
];

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return BY_ID.get(id);
}

/** True if some entry explains the snapshot field at `path` (or one of its parents). */
export function isExplained(path: string): boolean {
  return GLOSSARY.some((e) => e.fields.some((f) => path === f || path.startsWith(`${f}.`)));
}
