package ch.disroop.sensorplayground.connection

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GattQueueTest {
    @Test fun `operations run one after another`() = runTest {
        val queue = GattQueue(timeoutMs = 1000)
        val started = mutableListOf<String>()
        val first = async { queue.execute { started += "a"; true } }
        val second = async { queue.execute { started += "b"; true } }
        runCurrent()
        assertEquals(listOf("a"), started)

        queue.complete(GattResult(GattResult.SUCCESS, byteArrayOf(7)))
        runCurrent()
        assertEquals(listOf("a", "b"), started)
        queue.complete(GattResult(GattResult.SUCCESS))

        assertArrayEquals(byteArrayOf(7), first.await().value)
        assertTrue(second.await().success)
    }

    @Test fun `operation that cannot start fails immediately`() = runTest {
        val queue = GattQueue(timeoutMs = 1000)
        assertFalse(queue.execute { false }.success)
    }

    @Test fun `operation without callback times out`() = runTest {
        val queue = GattQueue(timeoutMs = 1000)
        val result = async { queue.execute { true } }
        advanceUntilIdle()
        assertEquals(GattResult.TIMEOUT, result.await().status)
        // the queue is usable again afterwards
        val next = async { queue.execute { true } }
        runCurrent()
        queue.complete(GattResult(GattResult.SUCCESS))
        assertTrue(next.await().success)
    }

    @Test fun `late completions are ignored`() = runTest {
        val queue = GattQueue(timeoutMs = 1000)
        queue.complete(GattResult(GattResult.SUCCESS))
        val next = async { queue.execute { true } }
        advanceUntilIdle()
        assertEquals(GattResult.TIMEOUT, next.await().status)
    }
}
