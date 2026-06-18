package io.github.patrickoreilly.whatnext.mobile.state

sealed class PollError {
    data class Retryable(val message: String) : PollError()
    data class Terminal(val message: String) : PollError()
    data object MaxRetriesExceeded : PollError()
}

class PollException(message: String, val type: PollError) : Exception(message) {
    companion object {
        fun Terminal(message: String) = PollException(message, PollError.Terminal(message))
        fun Retryable(message: String) = PollException(message, PollError.Retryable(message))
    }
}
