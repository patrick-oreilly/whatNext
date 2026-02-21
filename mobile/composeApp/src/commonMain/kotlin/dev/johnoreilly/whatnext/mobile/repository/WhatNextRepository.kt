package dev.johnoreilly.whatnext.mobile.repository

import dev.johnoreilly.whatnext.mobile.network.RoomResult
import dev.johnoreilly.whatnext.mobile.network.RoomState
import dev.johnoreilly.whatnext.mobile.network.WhatNextApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

/**
 * Simple repository wrapper around [WhatNextApi].
 * Provides a clean API for the UI layer.
 */
class WhatNextRepository(
    private val api: WhatNextApi = WhatNextApi()
) {
    suspend fun getRooms(): RoomResult = api.fetchRooms()
    suspend fun getRoomState(roomId: String): RoomState = api.fetchRoomState(roomId)
    suspend fun joinRoom(roomId: String, playerName: String) = api.joinRoom(roomId, playerName)
    suspend fun submitInput(roomId: String, playerName: String, inputText: String) =
        api.submitInput(roomId, playerName, inputText)

    suspend fun startRoom(roomId: String) = api.startRoom(roomId)

    /**
     * Polls the room state every [intervalMs] milliseconds and emits the latest result.
     * The first fetch happens immediately upon collection.
     */
    fun observeRoomState(roomId: String, intervalMs: Long = 5_000L): Flow<Result<RoomState>> = flow {
        while (true) {
            val result = runCatching { api.fetchRoomState(roomId) }
            emit(result)
            delay(intervalMs)
        }
    }.flowOn(Dispatchers.Default)
}