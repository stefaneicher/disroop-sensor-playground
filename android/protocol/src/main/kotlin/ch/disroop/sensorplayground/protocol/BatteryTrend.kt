package ch.disroop.sensorplayground.protocol

/**
 * Estimated charging state (`device.battery_trend`). The stock firmware only exposes the level in %
 * (derived from the battery voltage), not whether USB power is connected, so this is a heuristic.
 */
enum class BatteryTrend(val jsonName: String) { CHARGING("charging"), DISCHARGING("discharging"), UNKNOWN("unknown") }

/**
 * Estimates [BatteryTrend] from battery levels (same rule as the bridge, see docs/protocol.md "Akku-Trend"):
 * the level is held between notifications, resampled every [STEP_MS] over the last [WINDOW_MS], median
 * filtered (≈ 1 min, removes short dips under load) and fitted with a line. A change of at least
 * [THRESHOLD_PCT] up or down decides; a smaller change keeps the last decision (e.g. "full" at 100 %).
 * [BatteryTrend.UNKNOWN] until [MIN_SPAN_MS] of data. Not thread-safe.
 */
class BatteryTrendTracker {
    private data class Sample(val atMs: Long, val level: Double)

    private val samples = ArrayList<Sample>()
    var trend = BatteryTrend.UNKNOWN
        private set

    /** Forgets all data, e.g. after a reconnect. */
    fun reset() {
        samples.clear()
        trend = BatteryTrend.UNKNOWN
    }

    /** Records [levelPct] received at [atMs] and returns the trend at that time. */
    fun add(atMs: Long, levelPct: Int): BatteryTrend {
        samples += Sample(atMs, levelPct.toDouble())
        return evaluate(atMs)
    }

    /** Re-evaluates the trend at [nowMs] with the last known level held until then. */
    fun evaluate(nowMs: Long): BatteryTrend {
        if (samples.isEmpty() || nowMs - samples.first().atMs < MIN_SPAN_MS) return trend
        prune(nowMs - WINDOW_MS)
        val start = maxOf(samples.first().atMs, nowMs - WINDOW_MS)
        val levels = median(resample(start, nowMs))
        val change = slope(levels) * (levels.size - 1)
        trend = when {
            change >= THRESHOLD_PCT - EPSILON -> BatteryTrend.CHARGING
            change <= -THRESHOLD_PCT + EPSILON -> BatteryTrend.DISCHARGING
            else -> trend
        }
        return trend
    }

    /** Drops samples before [fromMs], keeping the last one as the level at the window start. */
    private fun prune(fromMs: Long) {
        while (samples.size > 1 && samples[1].atMs <= fromMs) samples.removeAt(0)
    }

    private fun resample(startMs: Long, nowMs: Long): List<Double> {
        val out = ArrayList<Double>()
        var i = 0
        var at = startMs
        while (at <= nowMs) {
            while (i + 1 < samples.size && samples[i + 1].atMs <= at) i++
            out += samples[i].level
            at += STEP_MS
        }
        return out
    }

    private fun median(v: List<Double>): List<Double> = v.indices.map { i ->
        val w = v.subList(maxOf(0, i - MEDIAN_RADIUS), minOf(v.size, i + MEDIAN_RADIUS + 1)).sorted()
        (w[(w.size - 1) / 2] + w[w.size / 2]) / 2
    }

    private fun slope(v: List<Double>): Double {
        if (v.size < 2) return 0.0
        val mx = (v.size - 1) / 2.0
        val my = v.average()
        var sxy = 0.0
        var sxx = 0.0
        v.forEachIndexed { i, y ->
            val dx = i - mx
            sxy += dx * (y - my)
            sxx += dx * dx
        }
        return sxy / sxx
    }

    companion object {
        const val WINDOW_MS = 5 * 60_000L
        const val MIN_SPAN_MS = 2 * 60_000L
        const val STEP_MS = 15_000L
        const val THRESHOLD_PCT = 1.0
        private const val MEDIAN_RADIUS = 2
        private const val EPSILON = 1e-9
    }
}
