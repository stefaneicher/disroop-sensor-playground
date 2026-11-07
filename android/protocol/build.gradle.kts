plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    jvmToolchain(21)
}

// shared/chorus.json is the single source of truth for the song; it is copied into the
// jar resources at build time instead of keeping a duplicate in this module.
val copySharedSong by tasks.registering(Sync::class) {
    from(rootProject.layout.projectDirectory.file("../shared/chorus.json")) {
        into("ch/disroop/sensorplayground/protocol")
    }
    into(layout.buildDirectory.dir("generated/sharedResources"))
}
sourceSets.main {
    resources.srcDir(copySharedSong)
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
    testImplementation(libs.junit)
}
