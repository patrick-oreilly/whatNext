package io.github.patrickoreilly.whatnext.mobile.settings

import com.russhwolf.settings.Settings

class CredentialStore(private val settings: Settings) {
    companion object {
        private const val KEY_TOKEN = "player_token"
        private const val KEY_NAME = "player_name"
        private const val KEY_ROOM = "room_id"
    }

    var playerToken: String?
        get() = settings.getStringOrNull(KEY_TOKEN)
        set(value) { if (value != null) settings.putString(KEY_TOKEN, value) else settings.remove(KEY_TOKEN) }

    var playerName: String?
        get() = settings.getStringOrNull(KEY_NAME)
        set(value) { if (value != null) settings.putString(KEY_NAME, value) else settings.remove(KEY_NAME) }

    var roomId: String?
        get() = settings.getStringOrNull(KEY_ROOM)
        set(value) { if (value != null) settings.putString(KEY_ROOM, value) else settings.remove(KEY_ROOM) }

    fun clear() {
        settings.remove(KEY_TOKEN)
        settings.remove(KEY_NAME)
        settings.remove(KEY_ROOM)
    }
}
