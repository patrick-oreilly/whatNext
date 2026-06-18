package io.github.patrickoreilly.whatnext.mobile.state

import dev.johnoreilly.whatnext.mobile.network.RoomState
import dev.johnoreilly.whatnext.mobile.repository.WhatNextRepository
import io.ktor.client.plugins.ClientRequestException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class RoomStateHolder(
    private val fetchState: suspend (roomId: String) -> RoomState = { WhatNextRepository().getRoomState(it) },
    private val scope: CoroutineScope,
    lobbyIntervalMs: Long = 10_000L,
    activeIntervalMs: Long = 3_000L,
) {
    private val _state = MutableStateFlow<RoomState?>(null)
    val state: StateFlow<RoomState?> = _state.asStateFlow()

    private val _error = MutableStateFlow<PollError?>(null)
    val error: StateFlow<PollError?> = _error.asStateFlow()

    private var pollingJob: Job? = null
    private val lobbyInterval = lobbyIntervalMs
    private val activeInterval = activeIntervalMs

    fun phaseToIntervalMs(phase: String): Long = when (phase) {
        "lobby" -> lobbyInterval
        else -> activeInterval
    }

    fun startPolling(roomId: String) {
        stopPolling()
        pollingJob = scope.launch {
            var currentInterval = activeInterval
            while (isActive) {
                val result = runCatching { fetchState(roomId) }
                when {
                    result.isSuccess -> {
                        _error.value = null
                        _state.value = result.getOrNull()
                        currentInterval = phaseToIntervalMs(_state.value?.phase ?: "lobby")
                    }
                    else -> {
                        val throwable = result.exceptionOrNull() ?: continue
                        val pollError = classifyError(throwable)
                        when (pollError) {
                            is PollError.Terminal -> {
                                _error.value = pollError
                                return@launch
                            }
                            is PollError.Retryable -> {
                                _error.value = pollError
                                if (!retryWithBackoff(roomId)) {
                                    _error.value = PollError.MaxRetriesExceeded
                                    return@launch
                                }
                                currentInterval = phaseToIntervalMs(_state.value?.phase ?: "lobby")
                            }
                            is PollError.MaxRetriesExceeded -> return@launch
                        }
                    }
                }
                delay(currentInterval)
            }
        }
    }

    private suspend fun retryWithBackoff(roomId: String): Boolean {
        var delayMs = 500L
        repeat(3) {
            delay(delayMs)
            val result = runCatching { fetchState(roomId) }
            if (result.isSuccess) {
                _error.value = null
                _state.value = result.getOrNull()
                return true
            }
            val retryError = classifyError(result.exceptionOrNull() ?: return false)
            when (retryError) {
                is PollError.Terminal -> {
                    _error.value = retryError
                    return false
                }
                is PollError.Retryable -> {
                    _error.value = retryError
                }
                is PollError.MaxRetriesExceeded -> return false
            }
            delayMs *= 2
        }
        return false
    }

    private fun classifyError(e: Throwable): PollError = when (e) {
        is ClientRequestException -> PollError.Terminal(e.message ?: "Client error")
        is PollException -> e.type
        else -> PollError.Retryable(e.message ?: "Request failed")
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    companion object {
        val instance: RoomStateHolder by lazy {
            RoomStateHolder(scope = CoroutineScope(Dispatchers.Default + SupervisorJob()))
        }
    }
}
