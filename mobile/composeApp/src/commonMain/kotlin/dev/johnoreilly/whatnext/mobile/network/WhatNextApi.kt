package dev.johnoreilly.whatnext.mobile.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.*
import io.ktor.client.request.prepareGet
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.utils.io.readUTF8Line
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

sealed class StoryStreamEvent {
    data class Chunk(val text: String) : StoryStreamEvent()
    data object Done : StoryStreamEvent()
    data class Error(val message: String) : StoryStreamEvent()
}

@Serializable
data class RoomResult(val count: Int, val rooms: List<String>)
@Serializable
data class CreateRoomRequest(val storyline: String, @SerialName("max_turns") val maxTurns: Int)
@Serializable
data class CreateRoomResponse(@SerialName("room_id") val roomId: String, val storyline: String, val status: String)
@Serializable
data class JoinRoomResponse(@SerialName("room_id") val roomId: String, val players: List<String>, val status: String, @SerialName("player_token") val playerToken: String)
@Serializable
data class StartGameResponse(val status: String, @SerialName("room_id") val roomId: String, val turn: Int, val phase: String)
@Serializable
data class SubmitInputResponse(val status: String, val submissions: Int, @SerialName("total_players") val totalPlayers: Int, val phase: String)
@Serializable
data class CastVoteResponse(val status: String)
@Serializable
data class VotingResultsResponse(@SerialName("room_id") val roomId: String, @SerialName("winning_player") val winningPlayer: String, @SerialName("winning_input") val winningInput: String, @SerialName("vote_counts") val voteCounts: Map<String, Int>, @SerialName("was_tie") val wasTie: Boolean = false, @SerialName("tied_players") val tiedPlayers: List<String> = emptyList())
@Serializable
data class TimerStatusResponse(val active: Boolean, @SerialName("time_remaining") val timeRemaining: Int? = null, @SerialName("has_timed_out") val hasTimedOut: Boolean? = null, @SerialName("submitted_count") val submittedCount: Int? = null, @SerialName("total_players") val totalPlayers: Int? = null, @SerialName("timed_out_players") val timedOutPlayers: List<String>? = null)
@Serializable
data class AdvanceTurnResponse(val status: String, val turn: Int, val phase: String, @SerialName("final_scores") val finalScores: Map<String, Int>? = null)
@Serializable
data class EndGameResponse(val status: String, @SerialName("room_id") val roomId: String, @SerialName("final_scores") val finalScores: Map<String, Int>)
@Serializable
data class TriggerTimeoutResponse(val status: String, @SerialName("room_id") val roomId: String, val phase: String)
@Serializable
data class TriggerVotingTimeoutResponse(val status: String, @SerialName("room_id") val roomId: String, val winner: String, @SerialName("votes_received") val votesReceived: Map<String, Int>)
@Serializable
data class StoryTurnContent(val paragraph: String, val decision: String?, val status: String?)
@Serializable
data class StoryTurn(val turn: Int, val content: StoryTurnContent)
@Serializable
data class PlayerInput(@SerialName("player_name") val playerName: String, val text: String, val votes: Int = 0)
@Serializable
data class RoomState(
    @SerialName("room_id") val roomId: String, @SerialName("storyline") val storyLine: String, @SerialName("players") val players: List<String>,
    val scores: Map<String, Int>, val turn: Int, val phase: String, @SerialName("story_history") val storyHistory: List<StoryTurn>,
    @SerialName("max_turns") val maxTurns: Int, @SerialName("player_inputs") val playerInputs: List<PlayerInput>,
    @SerialName("input_phase_start_time") val inputPhaseStartTime: String? = null, @SerialName("voting_phase_start_time") val votingPhaseStartTime: String? = null,
    @SerialName("voting_timeout_seconds") val votingTimeoutSeconds: Int? = null, @SerialName("input_timeout_seconds") val inputTimeoutSeconds: Int? = null,
    @SerialName("timed_out_players") val timedOutPlayers: List<String> = emptyList(), @SerialName("story_has_ended") val storyHasEnded: Boolean = false,
)

@Serializable private data class JoinRoomRequest(@SerialName("room_id") val roomId: String, @SerialName("player_name") val playerName: String)
@Serializable private data class SubmitInputRequest(@SerialName("room_id") val roomId: String, @SerialName("player_name") val playerName: String, @SerialName("input_text") val inputText: String, @SerialName("player_token") val playerToken: String? = null)
@Serializable private data class CastVoteRequest(@SerialName("room_id") val roomId: String, val voter: String, @SerialName("chosen_player") val chosenPlayer: String, @SerialName("player_token") val playerToken: String? = null)
@Serializable private data class TokenBody(@SerialName("player_token") val playerToken: String?)

class WhatNextApi(
    private val baseUrl: String = "https://whats-next-backend-684653559017.us-central1.run.app",
    enableLogging: Boolean = true,
    client: HttpClient? = null,
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true; explicitNulls = false }
    val client: HttpClient = client ?: HttpClient {
        expectSuccess = true
        install(ContentNegotiation) { json(json) }
        if (enableLogging) { install(Logging) { level = LogLevel.INFO; logger = object : Logger { override fun log(message: String) { println("[Ktor] $message") } } } }
        install(HttpTimeout) { requestTimeoutMillis = 30_000; connectTimeoutMillis = 30_000; socketTimeoutMillis = 30_000 }
    }

    suspend fun listRooms(): RoomResult = client.get("$baseUrl/rooms").body()
    suspend fun createRoom(storyline: String, maxTurns: Int): CreateRoomResponse = client.post("$baseUrl/api/rooms/create") { contentType(ContentType.Application.Json); setBody(CreateRoomRequest(storyline, maxTurns)) }.body()
    suspend fun joinRoom(roomId: String, playerName: String): JoinRoomResponse = client.post("$baseUrl/api/rooms/join") { contentType(ContentType.Application.Json); setBody(JoinRoomRequest(roomId, playerName)) }.body()
    suspend fun startGame(roomId: String, playerToken: String? = null): StartGameResponse = client.post("$baseUrl/api/rooms/$roomId/start") { contentType(ContentType.Application.Json); setBody(TokenBody(playerToken)) }.body()
    suspend fun getRoomState(roomId: String): RoomState = client.get("$baseUrl/api/rooms/$roomId/state").body()
    suspend fun deleteRoom(roomId: String, playerToken: String? = null) { client.delete("$baseUrl/api/rooms/$roomId") { contentType(ContentType.Application.Json); setBody(TokenBody(playerToken)) } }
    suspend fun submitInput(roomId: String, playerName: String, inputText: String, playerToken: String? = null): SubmitInputResponse = client.post("$baseUrl/api/input/submit") { contentType(ContentType.Application.Json); setBody(SubmitInputRequest(roomId, playerName, inputText, playerToken)) }.body()
    suspend fun castVote(roomId: String, voter: String, chosenPlayer: String, playerToken: String? = null): CastVoteResponse = client.post("$baseUrl/api/voting/cast") { contentType(ContentType.Application.Json); setBody(CastVoteRequest(roomId, voter, chosenPlayer, playerToken)) }.body()
    suspend fun getVotingResults(roomId: String): VotingResultsResponse = client.get("$baseUrl/api/voting/results/$roomId").body()
    suspend fun advanceTurn(roomId: String, playerToken: String? = null): AdvanceTurnResponse = client.post("$baseUrl/api/turn/advance/$roomId") { contentType(ContentType.Application.Json); setBody(TokenBody(playerToken)) }.body()
    suspend fun getTimerStatus(roomId: String): TimerStatusResponse = client.get("$baseUrl/api/rooms/$roomId/timer").body()
    suspend fun getVotingTimer(roomId: String): TimerStatusResponse = client.get("$baseUrl/api/voting/$roomId/timer").body()
    suspend fun triggerInputTimeout(roomId: String, playerToken: String? = null): TriggerTimeoutResponse = client.post("$baseUrl/api/rooms/$roomId/timeout") { contentType(ContentType.Application.Json); setBody(TokenBody(playerToken)) }.body()
    suspend fun triggerVotingTimeout(roomId: String, playerToken: String? = null): TriggerVotingTimeoutResponse = client.post("$baseUrl/api/voting/$roomId/timeout") { contentType(ContentType.Application.Json); setBody(TokenBody(playerToken)) }.body()
    suspend fun endGame(roomId: String, playerToken: String? = null): EndGameResponse = client.post("$baseUrl/api/game/end/$roomId") { contentType(ContentType.Application.Json); setBody(TokenBody(playerToken)) }.body()

    fun createStoryStream(roomId: String): Flow<StoryStreamEvent> = flow {
        client.prepareGet("$baseUrl/api/story/stream/$roomId").execute { response ->
            val channel = response.bodyAsChannel()
            while (!channel.isClosedForRead) {
                val line = channel.readUTF8Line() ?: break
                if (line.isEmpty()) continue
                if (!line.startsWith("data: ")) continue
                val data = line.removePrefix("data: ")
                when {
                    data == "[DONE]" -> { emit(StoryStreamEvent.Done); return@execute }
                    data.startsWith("[ERROR]") -> { emit(StoryStreamEvent.Error(data.removePrefix("[ERROR] "))); return@execute }
                    else -> try {
                        val parsed = json.parseToJsonElement(data).jsonObject
                        parsed["paragraph"]?.jsonPrimitive?.content?.let { emit(StoryStreamEvent.Chunk(it)) }
                            ?: run { emit(StoryStreamEvent.Error("SSE payload missing 'paragraph' key: $data")) }
                    } catch (e: Exception) {
                        emit(StoryStreamEvent.Error("Failed to parse SSE payload: ${e.message}"))
                    }
                }
            }
        }
    }

    @Deprecated("Use listRooms()", ReplaceWith("listRooms()")) suspend fun fetchRooms() = listRooms()
    @Deprecated("Use getRoomState(roomId)", ReplaceWith("getRoomState(roomId)")) suspend fun fetchRoomState(roomId: String) = getRoomState(roomId)
    @Deprecated("Use startGame(roomId)", ReplaceWith("startGame(roomId)")) suspend fun startRoom(roomId: String) = startGame(roomId)
}
