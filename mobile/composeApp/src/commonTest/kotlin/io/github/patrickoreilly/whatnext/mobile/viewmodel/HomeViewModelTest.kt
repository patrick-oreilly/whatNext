package io.github.patrickoreilly.whatnext.mobile.viewmodel

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class HomeViewModelTest {

    @Test fun `starts with loading state`() {
        val vm = HomeViewModel()
        assertEquals(true, vm.uiState.value.isLoading)
        assertNull(vm.uiState.value.message)
    }

    @Test fun `dismissLoading clears loading state`() {
        val vm = HomeViewModel()
        vm.dismissLoading()
        assertEquals(false, vm.uiState.value.isLoading)
    }

    @Test fun `setMessage stores the message`() {
        val vm = HomeViewModel()
        vm.setMessage("Your previous session ended. Welcome back!")
        assertEquals("Your previous session ended. Welcome back!", vm.uiState.value.message)
    }
}
