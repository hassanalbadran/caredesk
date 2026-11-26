package com.hasn2mr.caredesk.admin.data

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.Serializable

/** A signed-in clinic account (up to 3 on one phone). Data and notification settings are isolated per [id]. */
@Serializable
data class Account(
    val id: String,
    val username: String,
    val email: String = "",
    val session: String = "",
)

@Entity(
    tableName = "sessions",
    primaryKeys = ["accountId", "id"],
    indices = [Index("accountId", "date")],
)
data class SessionEntity(
    val accountId: String,
    val id: String,
    val date: String,          // yyyy-MM-dd
    val time: String,          // HH:mm
    val patientName: String,
    val type: String,
    val device: String,
    val status: String,        // booked | arrived | in_session | attended | cancelled | missed
    val vip: Boolean = false,
    val walkIn: Boolean = false,
    val updatedAt: Long,
)

data class DayCount(val date: String, val count: Int)

@Dao
interface SessionDao {
    @Query(
        "SELECT date AS date, COUNT(*) AS count FROM sessions " +
            "WHERE accountId = :acc AND date BETWEEN :from AND :to AND status != 'cancelled' GROUP BY date"
    )
    fun dayCounts(acc: String, from: String, to: String): Flow<List<DayCount>>

    @Query(
        "SELECT COUNT(*) FROM sessions WHERE accountId = :acc AND date BETWEEN :from AND :to AND status != 'cancelled'"
    )
    fun countBetween(acc: String, from: String, to: String): Flow<Int>

    @Query("SELECT * FROM sessions WHERE accountId = :acc AND date = :date ORDER BY time, id")
    fun forDay(acc: String, date: String): Flow<List<SessionEntity>>

    @Upsert
    suspend fun upsert(list: List<SessionEntity>)

    @Query("DELETE FROM sessions WHERE accountId = :acc AND id IN (:ids)")
    suspend fun delete(acc: String, ids: List<String>)

    @Query("DELETE FROM sessions WHERE accountId = :acc")
    suspend fun clear(acc: String)

    /** Differential sync cursor: only rows changed after this are requested from the server. */
    @Query("SELECT MAX(updatedAt) FROM sessions WHERE accountId = :acc")
    suspend fun lastUpdated(acc: String): Long?

    @Query("SELECT COUNT(*) FROM sessions WHERE accountId = :acc")
    suspend fun total(acc: String): Int
}

@Database(entities = [SessionEntity::class], version = 1, exportSchema = true)
abstract class AppDb : RoomDatabase() {
    abstract fun sessions(): SessionDao
}
