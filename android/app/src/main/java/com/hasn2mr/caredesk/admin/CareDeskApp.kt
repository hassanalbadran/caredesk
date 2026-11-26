package com.hasn2mr.caredesk.admin

import android.app.Application
import androidx.room.Room
import com.hasn2mr.caredesk.admin.data.AccountStore
import com.hasn2mr.caredesk.admin.data.AppDb
import com.hasn2mr.caredesk.admin.data.GasClient
import com.hasn2mr.caredesk.admin.data.Repository
import com.hasn2mr.caredesk.admin.data.SettingsStore
import com.hasn2mr.caredesk.admin.push.Notifications

/** Hand-rolled dependency container (no DI framework needed at this size). */
class AppContainer(app: Application) {
    val gas = GasClient(app)
    val db: AppDb = Room.databaseBuilder(app, AppDb::class.java, "caredesk.db").fallbackToDestructiveMigration().build()
    val accounts = AccountStore(app)
    val settings = SettingsStore(app)
    val repo = Repository(gas, db, accounts)
}

class CareDeskApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
        Notifications.createChannels(this)
    }
}
