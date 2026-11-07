plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "ch.disroop.thingyarcade"
    compileSdk = 36

    defaultConfig {
        applicationId = "ch.disroop.thingyarcade"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        // DEMO ONLY: fixed, publicly committed debug keystore so that reinstalls work across
        // local and CI builds. Never use it for anything that needs to be trusted.
        getByName("debug") {
            storeFile = rootProject.file("keystore/demo-debug.keystore")
            storePassword = "android"
            keyAlias = "thingylive-demo"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    androidResources {
        localeFilters += setOf("de", "en")
    }

    sourceSets.getByName("main").assets.srcDir(rootProject.file("../tennis/dist"))

    buildFeatures {
        compose = true
    }

    lint {
        abortOnError = true
        checkDependencies = true
        disable += setOf("GradleDependency", "AndroidGradlePluginVersion", "NewerVersionAvailable", "OldTargetApi")
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
        unitTests.isIncludeAndroidResources = true
    }
}

// Screenshot tests (Roborazzi + Robolectric) only run on demand: ./project android screenshots
// (-Pscreenshots). They record PNGs to build/screenshots and are excluded from the normal test run.
val screenshots = providers.gradleProperty("screenshots").isPresent
tasks.withType<Test>().configureEach {
    if (screenshots) {
        filter.includeTestsMatching("*ScreenshotTest")
        systemProperty("roborazzi.test.record", "true")
        // Robolectric's SDK 36 sandbox needs JDK internals (FileDescriptor via SharedSecrets) on JDK 17+.
        jvmArgs("--add-opens=java.base/jdk.internal.access=ALL-UNNAMED", "--add-exports=java.base/jdk.internal.access=ALL-UNNAMED")
        outputs.upToDateWhen { false }
    } else {
        exclude("**/*ScreenshotTest*")
    }
}

dependencies {
    implementation(project(":protocol"))
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
}
