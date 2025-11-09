package dev.johnoreilly.whatnext.mobile.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.request.*
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.json.Json
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName


@Serializable
data class RoomResult(val count: Int, val rooms: List<String>)

@Serializable
data class StoryTurnContent(
    val paragraph: String,
    val decision: String?,
    val status: String?
)

@Serializable
data class StoryTurn(
    val turn: Int,
    val content: StoryTurnContent
)


@Serializable
data class PlayerInput(
    @SerialName("player_name") val playerName: String,
    val text: String,
    val votes: Int = 0,
)


@Serializable
data class RoomState(
    @SerialName("room_id") val roomId: String,
    @SerialName("storyline") val storyLine: String,
    @SerialName("players") val players: List<String>,
    val scores: Map<String, Int>,
    val turn: Int,
    val phase: String,
    @SerialName("story_history") val storyHistory: List<StoryTurn>,
    @SerialName("max_turns") val maxTurns: Int,
    @SerialName("player_inputs") val playerInputs: List<PlayerInput>,
    )

@Serializable
private data class JoinRoomRequest(
    @SerialName("room_id") val roomId: String,
    @SerialName("player_name") val playerName: String,
)

@Serializable
private data class SubmitInputRequest(
    @SerialName("room_id") val roomId: String,
    @SerialName("player_name") val playerName: String,
    @SerialName("input_text") val inputText: String,
)

/**
 * Basic multiplatform Ktor API client configured for the What's Next backend.
 *
 * You can use it from commonMain across all platforms. Engines are provided per-platform
 * via Gradle dependencies. Create one instance and reuse it.
 */
class WhatNextApi(
    private val baseUrl: String = "https://whats-next-backend-684653559017.us-central1.run.app",
    enableLogging: Boolean = true,
) {
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        explicitNulls = false
    }

    val client: HttpClient = HttpClient {
        expectSuccess = true

        install(ContentNegotiation) {
            json(json)
        }
        if (enableLogging) {
            install(Logging) {
                level = LogLevel.INFO
                logger = object : Logger {
                    override fun log(message: String) {
                        println("[Ktor] $message")
                    }
                }
            }
        }
        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 30_000
            socketTimeoutMillis = 30_000
        }
    }

    suspend fun fetchRooms() = client.get("$baseUrl/rooms").body<RoomResult>()

    suspend fun fetchRoomState(roomId: String) = client.get("$baseUrl/api/rooms/$roomId/state").body<RoomState>()

    suspend fun joinRoom(roomId: String, playerName: String) =
        client.post("$baseUrl/api/rooms/join") {
            contentType(ContentType.Application.Json)
            setBody(JoinRoomRequest(roomId = roomId, playerName = playerName))
        }

    suspend fun submitInput(roomId: String, playerName: String, inputText: String) =
        client.post("$baseUrl/api/input/submit") {
            contentType(ContentType.Application.Json)
            setBody(SubmitInputRequest(roomId = roomId, playerName = playerName, inputText = inputText))
        }

    suspend fun startRoom(roomId: String) =
        client.post("$baseUrl/api/rooms/$roomId/start")

}