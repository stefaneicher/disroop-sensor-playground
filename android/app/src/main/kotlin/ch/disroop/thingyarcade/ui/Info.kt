package ch.disroop.thingyarcade.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Explanation shown by an ⓘ button; texts mirror the web dashboard glossary (bridge/web/static/js/glossary.js). */
class InfoEntry(val title: String, val unit: String, val sensor: String, val text: String, val typical: String)

object Glossary {
    val temperature = InfoEntry(
        "Temperatur", "°C", "HTS221 (Temperatur/Feuchte)",
        "Lufttemperatur am Sensor in Grad Celsius. Die Elektronik und das Laden wärmen das Thingy leicht auf. Der Wert liegt deshalb oft 1–3 °C über der Raumluft.",
        "Wohnraum 20–23 °C",
    )
    val humidity = InfoEntry(
        "Feuchte", "% rel.", "HTS221 (Temperatur/Feuchte)",
        "Relative Luftfeuchte: wie viel Wasserdampf die Luft enthält, verglichen mit dem Maximum bei dieser Temperatur. Wird dieselbe Luft wärmer, sinkt die relative Feuchte.",
        "angenehm 40–60 %; unter 30 % trocken, über 70 % Schimmelgefahr",
    )
    val pressure = InfoEntry(
        "Luftdruck", "hPa", "LPS22HB (Barometer)",
        "Gewicht der Luftsäule über dem Sensor in Hektopascal (1 hPa = 100 Pa = 1 mbar). Er sinkt mit der Höhe um etwa 1 hPa pro 8 m und schwankt mit dem Wetter um einige hPa.",
        "Meereshöhe ~1013 hPa; auf ~550 m ü. M. ~950 hPa",
    )
    val eco2 = InfoEntry(
        "eCO₂", "ppm", "CCS811 (Gassensor)",
        "Geschätzter CO₂-Gehalt in Teilen pro Million (equivalent CO₂). Der CCS811 misst kein CO₂ direkt. Er misst den Widerstand einer Metalloxid-Schicht, die auf flüchtige Gase reagiert, und rechnet daraus einen CO₂-Wert hoch. Nach dem Einschalten braucht er etwa 20 min Einlaufzeit.",
        "Aussenluft ~400 ppm; unter 800 gut, ab 1000 lüften, über 1500 schlecht",
    )
    val tvoc = InfoEntry(
        "TVOC", "ppb", "CCS811 (Gassensor)",
        "Total Volatile Organic Compounds: die Summe flüchtiger organischer Stoffe in Teilen pro Milliarde, z. B. aus Reinigungsmitteln, Farben, Parfum, Kochen oder dem Atem. Wie eCO₂ wird der Wert aus dem Gas-Widerstand geschätzt (~20 min Einlaufzeit). Er eignet sich für Trends, nicht als exakte Messung.",
        "unter 220 ppb gut, 220–660 mässig, über 660 lüften",
    )
    val color = InfoEntry(
        "Farbe (RGBC)", "Rohwerte (ohne Einheit)", "BH1745 (Farb-/Lichtsensor)",
        "Der Lichtsensor hat vier Kanäle: Rot, Grün, Blau und Clear. Clear ist ungefiltert und entspricht ungefähr der Helligkeit. Die Zahlen sind Rohzählwerte. Das Farbfeld zeigt das daraus normierte RGB.",
        "dunkel: C nahe 0; Tageslicht: C mehrere Hundert bis Tausende",
    )
    val accel = InfoEntry(
        "Beschleunigung", "g (1 g = 9.81 m/s²)", "MPU-9250 (9-Achsen-Bewegungssensor)",
        "Beschleunigung entlang der x-, y- und z-Achse in Vielfachen der Erdbeschleunigung. Auch in Ruhe misst der Sensor die Schwerkraft. Flach liegend zeigt z deshalb etwa +1 g, x und y etwa 0 g.",
        "ruhig liegend z ≈ 1 g (Rauschen ±0.05 g); Schütteln bis einige g",
    )
    val gyro = InfoEntry(
        "Gyroskop (Drehrate)", "°/s", "MPU-9250 (9-Achsen-Bewegungssensor)",
        "Drehgeschwindigkeit um die x-, y- und z-Achse in Grad pro Sekunde. In Ruhe liegt sie nahe 0. Eine volle Umdrehung pro Sekunde entspricht 360 °/s.",
        "ruhig ±2 °/s; Handbewegung 50–300 °/s",
    )
    val magnet = InfoEntry(
        "Magnetfeld", "µT (Mikrotesla)", "MPU-9250 (Magnetometer AK8963)",
        "Magnetische Flussdichte entlang der drei Achsen. Der Kompass berechnet daraus den Kurs. Eisen, Magnete, Laptops und Stromkabel in der Nähe verfälschen den Wert stark. Der Betrag ist die Gesamtstärke des Felds.",
        "Erdmagnetfeld 25–65 µT (Schweiz ~48 µT); ausserhalb davon stört etwas",
    )
    val heading = InfoEntry(
        "Kurs (Heading)", "° (0–360)", "MPU-9250 (Magnetometer + Sensorfusion)",
        "Richtung, in die die Oberkante (y-Achse) des Thingy zeigt, im Uhrzeigersinn ab magnetisch Nord: 0° = N, 90° = O, 180° = S, 270° = W. Gemeint ist der magnetische, nicht der geografische Norden. Der Kompass ist störanfällig: Metall in der Nähe oder fehlende Kalibrierung verfälschen ihn leicht um viele Grad.",
        "Kalibrieren: Thingy in einer 8er-Bewegung drehen",
    )
    val attitude = InfoEntry(
        "Lage (Roll/Pitch/Yaw)", "°", "MPU-9250 (Sensorfusion)",
        "Roll ist die seitliche Neigung, Pitch die Neigung nach vorn oder hinten, Yaw die Drehung um die Hochachse. Das Thingy fusioniert Beschleunigung, Drehrate und Magnetfeld zu diesen Winkeln. Der künstliche Horizont zeigt Roll und Pitch wie im Cockpit. Das Hoch- bzw. Querformat leitet die Firmware aus der Lage ab.",
        "flach liegend Roll ≈ 0°, Pitch ≈ 0°; Roll/Yaw ±180°, Pitch ±90°",
    )
    val quaternion = InfoEntry(
        "Quaternion", "ohne Einheit", "MPU-9250 (Sensorfusion)",
        "Vier Zahlen (w, x, y, z) beschreiben die 3D-Lage ohne Sonderfälle. Anders als bei Eulerwinkeln gibt es keinen „Gimbal Lock“. Der Betrag ist immer 1; w = 1 mit x = y = z = 0 bedeutet die Grundlage.",
        "jede Komponente zwischen −1 und +1",
    )
    val steps = InfoEntry(
        "Schritte", "Anzahl", "MPU-9250 (Schrittzähler der Firmware)",
        "Der Schrittzähler erkennt das typische Beschleunigungsmuster beim Gehen. Er zählt seit dem Einschalten des Thingy. Auch Schütteln kann Schritte auslösen.",
        "steigt beim Tragen um ~1–2 pro Sekunde",
    )
    val tap = InfoEntry(
        "Tap", "Richtung × Anzahl", "MPU-9250 (Tap-Erkennung)",
        "Die Tap-Erkennung meldet ein kurzes Antippen des Gehäuses. Angezeigt werden die Achse samt Richtung, z. B. Z+ für einen Tap von oben, und die Anzahl Taps in Folge (Doppeltap = ×2).",
        "Achsen X±, Y±, Z±; ×1 oder ×2",
    )
    val level = InfoEntry(
        "Mikrofon-Pegel", "dBFS", "MEMS-Mikrofon (PDM)",
        "Lautstärke in Dezibel relativ zum digitalen Vollausschlag (Full Scale). 0 dBFS ist das lauteste mögliche Signal, alle anderen Werte sind negativ. +6 dB entsprechen etwa der doppelten Amplitude; es ist kein kalibrierter Schalldruck (dB SPL). Das Mikrofon misst nur, wenn es eingeschaltet ist.",
        "Stille ~−70 dBFS; Sprechen −40 bis −20; sehr laut nahe 0",
    )
    val rssi = InfoEntry(
        "Signalstärke (RSSI)", "dBm", "Bluetooth-Funk (nRF52832 / Handy)",
        "Empfangene Funkleistung der Bluetooth-Verbindung in Dezibel bezogen auf 1 mW. Die Werte sind negativ, je näher an 0, desto besser. 10 dB weniger bedeuten ein zehnmal schwächeres Signal.",
        "über −60 dBm sehr gut; −60 bis −80 ok; unter −90 drohen Abbrüche",
    )
    val battery = InfoEntry(
        "Akku", "%", "Akkuspannungs-Messung (nRF52832)",
        "Ladestand des Akkus in Prozent, geschätzt aus der Akkuspannung. Die Werksfirmware meldet nicht, ob geladen wird. Der Trend („⚡ lädt“ / „Akkubetrieb“) wird deshalb aus dem Verlauf des Akkustands geschätzt und reagiert erst nach einigen Minuten.",
        "100 % voll; unter 20 % bald laden",
    )
}

/** The small italic ⓘ button next to labels; opens the explanation of [entry]. */
@Composable
fun InfoButton(entry: InfoEntry, modifier: Modifier = Modifier, size: Dp = 17.dp) {
    var open by remember { mutableStateOf(false) }
    Box(
        modifier
            .size(size)
            .clip(CircleShape)
            .background(Palette.inset)
            .border(BorderStroke(1.dp, Color(0xFF4B5563)), CircleShape)
            .clickable { open = true }
            .semantics { contentDescription = "Erklärung: ${entry.title}" },
        contentAlignment = Alignment.Center,
    ) {
        Text("i", color = Palette.muted, fontSize = (size.value * 0.65f).sp, fontStyle = FontStyle.Italic, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Serif)
    }
    if (open) InfoDialog(entry) { open = false }
}

@Composable
private fun InfoDialog(entry: InfoEntry, onClose: () -> Unit) = AlertDialog(
    onDismissRequest = onClose,
    containerColor = Palette.bezel,
    shape = RoundedCornerShape(12.dp),
    title = { Text(entry.title, color = Palette.accent, style = MaterialTheme.typography.titleMedium) },
    text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(entry.text, color = Palette.text, fontSize = 13.5.sp, lineHeight = 19.sp)
            Fact("Einheit", entry.unit)
            Fact("Sensor", entry.sensor)
            Fact("Typisch", entry.typical)
        }
    },
    confirmButton = { TextButton(onClose) { Text("Schliessen", color = Palette.teal) } },
)

@Composable
private fun Fact(label: String, value: String) = Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
    Text(label.uppercase(), Modifier.padding(top = 2.dp).width(62.dp), color = Palette.muted, fontSize = 10.sp, letterSpacing = 0.6.sp)
    Text(value, color = Palette.text, fontSize = 12.5.sp)
}
