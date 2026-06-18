package io.github.patrickoreilly.whatnext.mobile.settings

import com.russhwolf.settings.Settings

class InMemorySettings : Settings {
    private val store = mutableMapOf<String, String>()

    override fun putString(key: String, value: String) { store[key] = value }
    override fun getStringOrNull(key: String): String? = store[key]
    override fun getString(key: String, defaultValue: String): String = store[key] ?: defaultValue
    override fun remove(key: String) { store.remove(key) }
    override fun hasKey(key: String): Boolean = key in store
    override val keys: Set<String> get() = store.keys
    override val size: Int get() = store.size
    override fun clear() { store.clear() }

    override fun putInt(key: String, value: Int) {}
    override fun getInt(key: String, defaultValue: Int): Int = defaultValue
    override fun getIntOrNull(key: String): Int? = null
    override fun putLong(key: String, value: Long) {}
    override fun getLong(key: String, defaultValue: Long): Long = defaultValue
    override fun getLongOrNull(key: String): Long? = null
    override fun putFloat(key: String, value: Float) {}
    override fun getFloat(key: String, defaultValue: Float): Float = defaultValue
    override fun getFloatOrNull(key: String): Float? = null
    override fun putDouble(key: String, value: Double) {}
    override fun getDouble(key: String, defaultValue: Double): Double = defaultValue
    override fun getDoubleOrNull(key: String): Double? = null
    override fun putBoolean(key: String, value: Boolean) {}
    override fun getBoolean(key: String, defaultValue: Boolean): Boolean = defaultValue
    override fun getBooleanOrNull(key: String): Boolean? = null
}
