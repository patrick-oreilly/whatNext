package io.github.patrickoreilly.whatnext.mobile.settings

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class CredentialStoreTest {
    @Test
    fun `stores and retrieves credentials independently of instance lifecycle`() {
        val settings = InMemorySettings()

        val store1 = CredentialStore(settings)
        store1.playerToken = "tok_abc"
        store1.playerName = "Alice"
        store1.roomId = "ABCDEF"

        val store2 = CredentialStore(settings)
        assertEquals("tok_abc", store2.playerToken)
        assertEquals("Alice", store2.playerName)
        assertEquals("ABCDEF", store2.roomId)
    }

    @Test
    fun `clear removes all persisted credentials`() {
        val settings = InMemorySettings()

        val store = CredentialStore(settings)
        store.playerToken = "tok_xyz"
        store.playerName = "Bob"
        store.roomId = "UVWXYZ"

        store.clear()

        assertNull(store.playerToken)
        assertNull(store.playerName)
        assertNull(store.roomId)
    }

    @Test
    fun `stores and retrieves individual credential keys`() {
        val settings = InMemorySettings()

        val store = CredentialStore(settings)
        store.playerToken = "tok_test"

        assertEquals("tok_test", store.playerToken)
        assertNull(store.playerName)
        assertNull(store.roomId)
    }

    @Test
    fun `replacing values updates persisted storage`() {
        val settings = InMemorySettings()

        val store = CredentialStore(settings)
        store.playerName = "Charlie"
        store.playerName = "Diana"

        assertEquals("Diana", store.playerName)
        assertEquals("Diana", CredentialStore(settings).playerName)
    }
}
