plugins {
    java
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "com.flower"
version = "0.0.2-preflight"

repositories {
    mavenCentral()
    intellijPlatform { defaultRepositories() }
}

dependencies {
    intellijPlatform {
        intellijIdea("2026.1.4")
        bundledModule("com.intellij.modules.vcs")
        bundledPlugin("com.intellij.java")
    }
}

java {
    toolchain { languageVersion.set(JavaLanguageVersion.of(21)) }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion { sinceBuild = "261" }
    }
}
