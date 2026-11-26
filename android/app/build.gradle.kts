import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
}

// Version comes from CI (tag android-vX.Y.Z[-suffix] -> VERSION_NAME, run number -> versionCode)
val versionNameEnv = System.getenv("VERSION_NAME") ?: "0.1.0-dev"
val versionCodeEnv = (System.getenv("VERSION_CODE") ?: "1").toInt()

android {
    namespace = "com.hasn2mr.caredesk.admin"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.hasn2mr.caredesk.admin"
        minSdk = 26
        targetSdk = 34
        versionCode = versionCodeEnv
        versionName = versionNameEnv
        // Same Google Apps Script web app as the desktop dashboard.
        buildConfigField(
            "String", "GAS_URL",
            "\"https://script.google.com/macros/s/AKfycbwyw1oqllhszr4L06RHbYM_2Nqmin4JV5arLcKWdt8zI7HR8ctqGxJLBdChAxDmZf7n/exec\""
        )
        buildConfigField("String", "GITHUB_REPO", "\"hassanalbadran/caredesk\"")
        // Releases of this app are tagged android-v*; the desktop app uses plain v* tags.
        buildConfigField("String", "RELEASE_TAG_PREFIX", "\"android-v\"")
    }

    signingConfigs {
        // Filled from GitHub Actions secrets (KEYSTORE_BASE64 is decoded to KEYSTORE_PATH by the workflow).
        create("release") {
            val path = System.getenv("KEYSTORE_PATH")
            if (path != null && file(path).exists()) {
                storeFile = file(path)
                // PKCS12 is what current keytool creates; the workflow passes the detected type ("jks" for old keystores).
                storeType = System.getenv("KEYSTORE_TYPE") ?: "pkcs12"
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            val rel = signingConfigs.getByName("release")
            // Without a keystore (local builds) fall back to the debug key so the APK is still installable.
            signingConfig = if (rel.storeFile != null) rel else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.09.02")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.animation:animation")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.navigation:navigation-compose:2.8.1")

    // Offline-first cache
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Network + JSON
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Push notifications
    implementation(platform("com.google.firebase:firebase-bom:33.3.0"))
    implementation("com.google.firebase:firebase-messaging")
}
