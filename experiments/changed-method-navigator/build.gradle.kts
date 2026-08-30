import org.jetbrains.intellij.platform.gradle.TestFrameworkType

plugins {
    java
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "com.flower"
version = "0.0.6-preflight"

repositories {
    mavenCentral()
    intellijPlatform { defaultRepositories() }
}

dependencies {
    intellijPlatform {
        intellijIdea("2026.2.1")
        bundledModule("com.intellij.modules.vcs")
        bundledPlugin("com.intellij.java")
        testFramework(TestFrameworkType.Platform)
        testFramework(TestFrameworkType.Plugin.Java)
    }
    testImplementation("junit:junit:4.13.2")
}

java {
    toolchain { languageVersion.set(JavaLanguageVersion.of(25)) }
}

intellijPlatform {
    pluginConfiguration {
        ideaVersion { sinceBuild = "261" }
    }
    pluginVerification {
        ides {
            current()
        }
    }
}
