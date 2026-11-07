package ch.disroop.thingyarcade.protocol

data class Vec3(val x: Double, val y: Double, val z: Double)

data class EulerAngles(val roll: Double, val pitch: Double, val yaw: Double)

data class Quaternion(val w: Double, val x: Double, val y: Double, val z: Double)

data class Rgbc(val r: Int, val g: Int, val b: Int, val clear: Int)

data class Rgb(val r: Int, val g: Int, val b: Int) {
    companion object {
        val OFF = Rgb(0, 0, 0)
    }
}

data class GasReading(val eco2Ppm: Int, val tvocPpb: Int)

data class Steps(val count: Long, val timeMs: Long)

data class RawMotion(val accelG: Vec3, val gyroDps: Vec3, val compassUt: Vec3)

enum class TapDirection(val code: Int, val label: String) {
    X_POS(1, "X+"), X_NEG(2, "X−"), Y_POS(3, "Y+"), Y_NEG(4, "Y−"), Z_POS(5, "Z+"), Z_NEG(6, "Z−");

    companion object {
        fun of(code: Int): TapDirection =
            entries.firstOrNull { it.code == code } ?: throw IllegalArgumentException("tap direction $code")
    }
}

data class Tap(val direction: TapDirection, val count: Int)

enum class Orientation(val code: Int, val jsonName: String) {
    PORTRAIT(0, "portrait"),
    LANDSCAPE(1, "landscape"),
    REVERSE_PORTRAIT(2, "reverse_portrait"),
    REVERSE_LANDSCAPE(3, "reverse_landscape");

    companion object {
        fun of(code: Int): Orientation =
            entries.firstOrNull { it.code == code } ?: throw IllegalArgumentException("orientation $code")
    }
}
