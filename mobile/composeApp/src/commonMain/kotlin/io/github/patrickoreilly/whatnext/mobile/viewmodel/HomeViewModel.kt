package io.github.patrickoreilly.whatnext.mobile.viewmodel

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

data class HomeUiState(
    val isLoading: Boolean = true,
    val message: String? = null,
)

class HomeViewModel {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun dismissLoading() {
        _uiState.update { it.copy(isLoading = false) }
    }

    fun setMessage(message: String) {
        _uiState.update { it.copy(message = message) }
    }
}
