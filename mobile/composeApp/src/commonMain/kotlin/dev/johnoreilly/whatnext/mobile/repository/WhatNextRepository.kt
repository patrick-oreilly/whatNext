package dev.johnoreilly.whatnext.mobile.repository

import dev.johnoreilly.whatnext.mobile.network.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

class WhatNextRepository(private val api: WhatNextApi = WhatNextApi()) {
    suspend fun getRooms(): RoomResult = api.listRooms()
    suspend fun createRoom(storyline: String, maxTurns: Int): CreateRoomResponse = api.createRoom(storyline, maxTurns)
    suspend fun joinRoom(roomId: String, playerName: String): JoinRoomResponse = api.joinRoom(roomId, playerName)
    suspend fun startGame(roomId: String, playerToken: String? = null): StartGameResponse = api.startGame(roomId, playerToken)
    suspend fun getRoomState(roomId: String): RoomState = api.getRoomState(roomId)
    suspend fun deleteRoom(roomId: String, playerToken: String? = null) = api.deleteRoom(roomId, playerToken)
    suspend fun submitInput(roomId: String, playerName: String, inputText: String, playerToken: String? = null): SubmitInputResponse = api.submitInput(roomId, playerName, inputText, playerToken)
    suspend fun castVote(roomId: String, voter: String, chosenPlayer: String, playerToken: String? = null): CastVoteResponse = api.castVote(roomId, voter, chosenPlayer, playerToken)
    suspend fun getVotingResults(roomId: String): VotingResultsResponse = api.getVotingResults(roomId)
    suspend fun advanceTurn(roomId: String, playerToken: String? = null): AdvanceTurnResponse = api.advanceTurn(roomId, playerToken)
    suspend fun getTimerStatus(roomId: String): TimerStatusResponse = api.getTimerStatus(roomId)
    suspend fun getVotingTimer(roomId: String): TimerStatusResponse = api.getVotingTimer(roomId)
    suspend fun triggerInputTimeout(roomId: String, playerToken: String? = null): TriggerTimeoutResponse = api.triggerInputTimeout(roomId, playerToken)
    suspend fun triggerVotingTimeout(roomId: String, playerToken: String? = null): TriggerVotingTimeoutResponse = api.triggerVotingTimeout(roomId, playerToken)
    suspend fun endGame(roomId: String, playerToken: String? = null): EndGameResponse = api.endGame(roomId, playerToken)
    fun createStoryStream(roomId: String): Flow<StoryStreamEvent> = api.createStoryStream(roomId)

    @Deprecated("Use startGame", ReplaceWith("startGame(roomId, playerToken)"))
    suspend fun startRoom(roomId: String) = api.startGame(roomId)

    fun observeRoomState(roomId: String, intervalMs: Long = 5_000L): Flow<Result<RoomState>> = flow {
        while (true) { val r = runCatching { api.getRoomState(roomId) }; emit(r); delay(intervalMs) }
    }.flowOn(Dispatchers.Default)
}
