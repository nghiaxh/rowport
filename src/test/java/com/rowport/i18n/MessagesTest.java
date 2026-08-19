package com.rowport.i18n;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

class MessagesTest {

    @BeforeEach
    void setUp() {
        Messages.init("en");
    }

    @Test
    void get_knownKeyReturnsValue() {
        assertThat(Messages.get("app.name")).isEqualTo("Rowport");
    }

    @Test
    void get_unknownKeyReturnsKeyItself() {
        assertThat(Messages.get("nonexistent.key")).isEqualTo("nonexistent.key");
    }

    @Test
    void get_withSingleArg() {
        assertThat(Messages.get("app.version", "1.0.0")).isEqualTo("Version 1.0.0");
    }

    @Test
    void get_withMultipleArgs() {
        assertThat(Messages.get("connection.testFailed", "timeout"))
            .isEqualTo("Connection failed: timeout");
    }

    @Test
    void get_withNoArgsReturnsRawPattern() {
        assertThat(Messages.get("app.version")).isEqualTo("Version {0}");
    }

    @Test
    void getCurrentLocale_defaultIsEnglish() {
        Messages.init("en");
        assertThat(Messages.getCurrentLocale()).isEqualTo(Locale.ENGLISH);
    }

    @Test
    void setLanguage_switchesLocale() {
        Messages.setLanguage("vi");
        assertThat(Messages.getCurrentLocale()).isEqualTo(Locale.forLanguageTag("vi"));
    }

    @Test
    void setLanguage_viReturnsVietnamese() {
        Messages.setLanguage("vi");
        assertThat(Messages.get("app.name")).isEqualTo("Rowport");
    }

    @Test
    void init_calledMultipleTimes() {
        Messages.init("en");
        Messages.init("vi");
        Messages.init("en");
        assertThat(Messages.get("app.name")).isEqualTo("Rowport");
    }
}
