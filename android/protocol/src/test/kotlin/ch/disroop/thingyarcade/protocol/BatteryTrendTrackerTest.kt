package ch.disroop.thingyarcade.protocol

import ch.disroop.thingyarcade.protocol.BatteryTrend.CHARGING
import ch.disroop.thingyarcade.protocol.BatteryTrend.DISCHARGING
import ch.disroop.thingyarcade.protocol.BatteryTrend.UNKNOWN
import org.junit.Assert.assertEquals
import org.junit.Test

class BatteryTrendTrackerTest {
    private val minute = 60_000L
    private val tracker = BatteryTrendTracker()

    /** Adds one level every [everyMs] from t = 0; returns the trend after the last one. */
    private fun feed(everyMs: Long, vararg levels: Int): BatteryTrend =
        levels.foldIndexed(UNKNOWN) { i, _, level -> tracker.add(i * everyMs, level) }

    @Test fun `unknown until two minutes of data`() {
        assertEquals(UNKNOWN, tracker.evaluate(0))
        assertEquals(UNKNOWN, feed(30_000, 60, 61, 62, 63))
    }

    @Test fun `rising level is charging`() = assertEquals(CHARGING, feed(minute, 60, 61, 62))

    @Test fun `falling level is discharging`() = assertEquals(DISCHARGING, feed(minute, 80, 79, 78))

    @Test fun `steady level stays unknown`() = assertEquals(UNKNOWN, feed(30_000, *IntArray(11) { 66 }))

    @Test fun `one point jitter is ignored`() =
        assertEquals(UNKNOWN, feed(30_000, *IntArray(12) { if (it % 2 == 0) 66 else 65 }))

    @Test fun `short dip under load is filtered`() {
        feed(minute, 66, 66, 66)
        tracker.add(130_000, 60)
        tracker.add(150_000, 66)
        listOf(0L, 30_000, minute, 2 * minute, 4 * minute).forEach {
            assertEquals("$it ms after the dip", UNKNOWN, tracker.evaluate(150_000 + it))
        }
    }

    @Test fun `steady full level keeps the last decision`() {
        feed(minute, 97, 98, 99, 100)
        (1..20).forEach { assertEquals("full for $it min", CHARGING, tracker.evaluate((3 + it) * minute)) }
    }

    @Test fun `unplugging switches to discharging`() {
        feed(minute, 60, 61, 62, 63)
        (1..4).forEach { tracker.add((3 + it) * minute, 63 - it) }
        assertEquals(DISCHARGING, tracker.evaluate(7 * minute))
    }

    @Test fun `single step with sparse notifications is detected`() {
        tracker.add(0, 70)
        tracker.add(3 * minute, 69)
        assertEquals(DISCHARGING, tracker.evaluate(4 * minute))
    }

    @Test fun `reset forgets everything`() {
        feed(minute, 60, 61, 62)
        tracker.reset()
        assertEquals(UNKNOWN, tracker.trend)
        assertEquals(UNKNOWN, tracker.add(3 * minute, 62))
    }
}
