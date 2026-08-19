package com.rowport.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AppSettingsTest {

    @Test
    void defaults_returnsNonNull() {
        assertThat(AppSettings.defaults()).isNotNull();
    }

    @Test
    void defaults_hasCorrectValues() {
        AppSettings settings = AppSettings.defaults();
        assertThat(settings.getTheme()).isEqualTo("dark");
        assertThat(settings.getFontFamily()).isEqualTo("Consolas");
        assertThat(settings.getFontSize()).isEqualTo(14);
        assertThat(settings.getLineHeight()).isEqualTo(20);
        assertThat(settings.getRowDensity()).isEqualTo("normal");
        assertThat(settings.getLanguage()).isEqualTo("en");
        assertThat(settings.getMaxHistoryEntries()).isEqualTo(500);
        assertThat(settings.getQueryTimeoutSeconds()).isEqualTo(30);
    }

    @Test
    void getRowHeight_compact() {
        AppSettings settings = new AppSettings();
        settings.setRowDensity("compact");
        assertThat(settings.getRowHeight()).isEqualTo(24.0);
    }

    @Test
    void getRowHeight_comfortable() {
        AppSettings settings = new AppSettings();
        settings.setRowDensity("comfortable");
        assertThat(settings.getRowHeight()).isEqualTo(36.0);
    }

    @Test
    void getRowHeight_normal() {
        AppSettings settings = new AppSettings();
        settings.setRowDensity("normal");
        assertThat(settings.getRowHeight()).isEqualTo(30.0);
    }

    @Test
    void getRowHeight_unknownDensityDefaultsTo30() {
        AppSettings settings = new AppSettings();
        settings.setRowDensity("something");
        assertThat(settings.getRowHeight()).isEqualTo(30.0);
    }

    @Test
    void constructor_setsDefaults() {
        AppSettings settings = new AppSettings();
        assertThat(settings.getTheme()).isEqualTo("dark");
        assertThat(settings.getRowDensity()).isEqualTo("normal");
    }

    @Test
    void gettersSetters_roundTrip() {
        AppSettings settings = new AppSettings();
        settings.setTheme("light");
        settings.setFontFamily("Courier New");
        settings.setFontSize(16);
        settings.setLineHeight(24);
        settings.setRowDensity("compact");
        settings.setLanguage("vi");
        settings.setMaxHistoryEntries(1000);
        settings.setQueryTimeoutSeconds(60);

        assertThat(settings.getTheme()).isEqualTo("light");
        assertThat(settings.getFontFamily()).isEqualTo("Courier New");
        assertThat(settings.getFontSize()).isEqualTo(16);
        assertThat(settings.getLineHeight()).isEqualTo(24);
        assertThat(settings.getRowDensity()).isEqualTo("compact");
        assertThat(settings.getLanguage()).isEqualTo("vi");
        assertThat(settings.getMaxHistoryEntries()).isEqualTo(1000);
        assertThat(settings.getQueryTimeoutSeconds()).isEqualTo(60);
    }
}
