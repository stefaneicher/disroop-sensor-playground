package ch.disroop.sensorplayground.connection

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ConnectionHubTest {
    private val created = mutableListOf<FakeConnection>()

    private fun kotlinx.coroutines.test.TestScope.hub(timeout: Long = 1000) =
        ConnectionHub(this, timeout) { FakeConnection().also(created::add) }

    @Test fun `view change keeps the same connection`() = runTest {
        val hub = hub()
        val first = hub.acquire(ConnectionHub.Profile.FULL)
        runCurrent()
        hub.release()
        advanceTimeBy(500)
        assertSame(first, hub.acquire(ConnectionHub.Profile.FULL))
        runCurrent()
        assertEquals(1, created.size)
        assertEquals(1, created[0].runs)
        hub.disconnect()
    }

    @Test fun `other profile reconnects`() = runTest {
        val hub = hub()
        val first = hub.acquire(ConnectionHub.Profile.FULL)
        val second = hub.acquire(ConnectionHub.Profile.GAME)
        runCurrent()
        assertNotSame(first, second)
        assertEquals(2, created.size)
        hub.disconnect()
    }

    @Test fun `disconnects after background timeout`() = runTest {
        val hub = hub(1000)
        hub.acquire(ConnectionHub.Profile.FULL)
        runCurrent()
        hub.release()
        advanceTimeBy(1001)
        runCurrent()
        assertNull(hub.connection)
        assertEquals(LinkState.Idle, created[0].link.value)
    }

    @Test fun `explicit disconnect drops the link`() = runTest {
        val hub = hub()
        hub.acquire(ConnectionHub.Profile.FULL)
        runCurrent()
        hub.disconnect()
        runCurrent()
        assertNull(hub.connection)
        assertEquals(LinkState.Idle, created[0].link.value)
    }
}
