package dev.johnoreilly.whatnext.mobile.network

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.HttpRequestData
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.ByteReadChannel
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class WhatNextApiTest {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true; explicitNulls = false }
    private fun createClient(engine: MockEngine): HttpClient = HttpClient(engine) { install(ContentNegotiation) { json(this@WhatNextApiTest.json) } }
    private fun readBody(request: HttpRequestData): String = (request.body as TextContent).text

    @Test fun testListRooms() = runTest {
        val e = MockEngine { respond(ByteReadChannel("""{"count":2,"rooms":["A","B"]}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json")) }
        val r = WhatNextApi(client = createClient(e)).listRooms()
        assertEquals(2, r.count); assertEquals(listOf("A","B"), r.rooms)
    }

    @Test fun testCreateRoom() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            val b = json.parseToJsonElement(readBody(r)).jsonObject
            assertEquals("hoop_dreams", b["storyline"]?.jsonPrimitive?.content)
            assertEquals(10, b["max_turns"]?.jsonPrimitive?.content?.toIntOrNull())
            respond(ByteReadChannel("""{"room_id":"X","storyline":"hoop_dreams","status":"created"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).createRoom("hoop_dreams", 10)
        assertEquals("X", res.roomId); assertEquals("hoop_dreams", res.storyline); assertEquals("created", res.status)
    }

    @Test fun testJoinRoom() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            val b = json.parseToJsonElement(readBody(r)).jsonObject
            assertEquals("ABC", b["room_id"]?.jsonPrimitive?.content)
            assertEquals("Alice", b["player_name"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"room_id":"ABC","players":["Alice","Bob"],"status":"joined","player_token":"tok"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).joinRoom("ABC", "Alice")
        assertEquals("ABC", res.roomId); assertEquals(listOf("Alice","Bob"), res.players); assertEquals("joined", res.status); assertEquals("tok", res.playerToken)
    }

    @Test fun testStartGame() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            assertEquals("tok-host", json.parseToJsonElement(readBody(r)).jsonObject["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"started","room_id":"A","turn":1,"phase":"player_input"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).startGame("A", "tok-host")
        assertEquals("started", res.status); assertEquals("A", res.roomId); assertEquals(1, res.turn)
    }

    @Test fun testStartGameNoToken() = runTest {
        val e = MockEngine { r ->
            assertTrue(!json.parseToJsonElement(readBody(r)).jsonObject.containsKey("player_token"))
            respond(ByteReadChannel("""{"status":"started","room_id":"A","turn":1,"phase":"player_input"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        assertEquals("started", WhatNextApi(client = createClient(e)).startGame("A").status)
    }

    @Test fun testGetRoomState() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Get, r.method)
            respond(ByteReadChannel("""{"room_id":"A","storyline":"hoop_dreams","players":["Alice"],"scores":{"Alice":5},"turn":2,"phase":"voting","story_history":[],"player_inputs":[],"max_turns":10}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).getRoomState("A")
        assertEquals("A", res.roomId); assertEquals(2, res.turn); assertEquals("voting", res.phase); assertEquals(mapOf("Alice" to 5), res.scores)
    }

    @Test fun testDeleteRoom() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Delete, r.method)
            assertEquals("tok-host", json.parseToJsonElement(readBody(r)).jsonObject["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"deleted","room_id":"A"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        WhatNextApi(client = createClient(e)).deleteRoom("A", "tok-host")
    }

    @Test fun testSubmitInput() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            val b = json.parseToJsonElement(readBody(r)).jsonObject
            assertEquals("A", b["room_id"]?.jsonPrimitive?.content)
            assertEquals("Alice", b["player_name"]?.jsonPrimitive?.content)
            assertEquals("Hi", b["input_text"]?.jsonPrimitive?.content)
            assertEquals("tok", b["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"submitted","submissions":1,"total_players":2,"phase":"player_input"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).submitInput("A","Alice","Hi","tok")
        assertEquals("submitted", res.status); assertEquals(1, res.submissions)
    }

    @Test fun testCastVote() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            val b = json.parseToJsonElement(readBody(r)).jsonObject
            assertEquals("A", b["room_id"]?.jsonPrimitive?.content)
            assertEquals("Alice", b["voter"]?.jsonPrimitive?.content)
            assertEquals("Bob", b["chosen_player"]?.jsonPrimitive?.content)
            assertEquals("tok", b["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"voted"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        assertEquals("voted", WhatNextApi(client = createClient(e)).castVote("A","Alice","Bob","tok").status)
    }

    @Test fun testGetVotingResults() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Get, r.method)
            respond(ByteReadChannel("""{"room_id":"A","winning_player":"Bob","winning_input":"Best","vote_counts":{"Bob":2,"Alice":1},"was_tie":false,"tied_players":[]}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).getVotingResults("A")
        assertEquals("A", res.roomId); assertEquals("Bob", res.winningPlayer); assertEquals("Best", res.winningInput)
        assertEquals(mapOf("Bob" to 2, "Alice" to 1), res.voteCounts); assertEquals(false, res.wasTie)
    }

    @Test fun testAdvanceTurn() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            assertEquals("tok", json.parseToJsonElement(readBody(r)).jsonObject["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"advanced","turn":3,"phase":"generating_story"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).advanceTurn("A","tok")
        assertEquals("advanced", res.status); assertEquals(3, res.turn)
    }

    @Test fun testGetTimerStatus() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Get, r.method)
            respond(ByteReadChannel("""{"active":true,"time_remaining":45,"submitted_count":2,"total_players":4}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).getTimerStatus("A")
        assertEquals(true, res.active); assertEquals(45, res.timeRemaining); assertEquals(2, res.submittedCount); assertEquals(4, res.totalPlayers)
    }

    @Test fun testGetVotingTimer() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Get, r.method)
            respond(ByteReadChannel("""{"active":true,"time_remaining":30}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).getVotingTimer("A")
        assertEquals(true, res.active); assertEquals(30, res.timeRemaining)
    }

    @Test fun testTriggerInputTimeout() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            assertEquals("tok", json.parseToJsonElement(readBody(r)).jsonObject["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"timeout","room_id":"A","phase":"voting"}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).triggerInputTimeout("A","tok")
        assertEquals("timeout", res.status); assertEquals("A", res.roomId); assertEquals("voting", res.phase)
    }

    @Test fun testTriggerVotingTimeout() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            assertEquals("tok", json.parseToJsonElement(readBody(r)).jsonObject["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"timeout","room_id":"A","winner":"Bob","votes_received":{"Bob":3,"Alice":1}}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).triggerVotingTimeout("A","tok")
        assertEquals("timeout", res.status); assertEquals("A", res.roomId); assertEquals("Bob", res.winner); assertEquals(mapOf("Bob" to 3, "Alice" to 1), res.votesReceived)
    }

    @Test fun testEndGame() = runTest {
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Post, r.method)
            assertEquals("tok", json.parseToJsonElement(readBody(r)).jsonObject["player_token"]?.jsonPrimitive?.content)
            respond(ByteReadChannel("""{"status":"ended","room_id":"A","final_scores":{"Alice":10}}"""), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"application/json"))
        }
        val res = WhatNextApi(client = createClient(e)).endGame("A","tok")
        assertEquals("ended", res.status); assertEquals("A", res.roomId); assertEquals(mapOf("Alice" to 10), res.finalScores)
    }

    @Test fun testSseChunk() = runTest {
        val d = "data: {\"paragraph\":\"Hello \"}\n\ndata: {\"paragraph\":\"world\"}\n\ndata: [DONE]\n\n"
        val e = MockEngine { r ->
            assertEquals(HttpMethod.Get, r.method)
            respond(ByteReadChannel(d), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"text/event-stream"))
        }
        val ev = WhatNextApi(client = createClient(e)).createStoryStream("A").toList()
        assertEquals(3, ev.size)
        assertTrue(ev[0] is StoryStreamEvent.Chunk); assertEquals("Hello ", (ev[0] as StoryStreamEvent.Chunk).text)
        assertTrue(ev[1] is StoryStreamEvent.Chunk); assertEquals("world", (ev[1] as StoryStreamEvent.Chunk).text)
        assertTrue(ev[2] is StoryStreamEvent.Done)
    }

    @Test fun testSseDone() = runTest {
        val e = MockEngine { respond(ByteReadChannel("data: [DONE]\n\n"), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"text/event-stream")) }
        val ev = WhatNextApi(client = createClient(e)).createStoryStream("A").toList()
        assertTrue(ev.single() is StoryStreamEvent.Done)
    }

    @Test fun testSseError() = runTest {
        val e = MockEngine { respond(ByteReadChannel("data: [ERROR] boom\n\n"), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"text/event-stream")) }
        val ev = WhatNextApi(client = createClient(e)).createStoryStream("A").toList()
        assertTrue(ev.single() is StoryStreamEvent.Error)
        assertEquals("boom", (ev[0] as StoryStreamEvent.Error).message)
    }

    @Test fun testSseMalformedJsonEmitsError() = runTest {
        val e = MockEngine { respond(ByteReadChannel("data: {not json}\n\n"), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"text/event-stream")) }
        val ev = WhatNextApi(client = createClient(e)).createStoryStream("A").toList()
        assertEquals(1, ev.size)
        assertTrue(ev[0] is StoryStreamEvent.Error)
        assertTrue((ev[0] as StoryStreamEvent.Error).message.contains("Failed to parse"))
    }

    @Test fun testSseMissingParagraphKeyEmitsError() = runTest {
        val e = MockEngine { respond(ByteReadChannel("data: {\"status\":\"ok\"}\n\n"), HttpStatusCode.OK, headersOf(HttpHeaders.ContentType,"text/event-stream")) }
        val ev = WhatNextApi(client = createClient(e)).createStoryStream("A").toList()
        assertEquals(1, ev.size)
        assertTrue(ev[0] is StoryStreamEvent.Error)
        assertTrue((ev[0] as StoryStreamEvent.Error).message.contains("missing 'paragraph'"))
    }
}
