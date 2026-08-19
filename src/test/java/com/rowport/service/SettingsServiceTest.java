package com.rowport.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.rowport.model.AppSettings;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class SettingsServiceTest {

    @TempDir
    Path tempDir;

    private String originalUserHome;
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    @BeforeEach
    void setUp() {
        originalUserHome = System.getProperty("user.home");
        System.setProperty("user.home", tempDir.toString());
    }

    @AfterEach
    void tearDown() {
        System.setProperty("user.home", originalUserHome);
    }

    @Test
    void load_noFileReturnsDefaults() {
        SettingsService service = new SettingsService();
        AppSettings settings = service.getSettings();
        assertThat(settings).isNotNull();
        assertThat(settings.getTheme()).isEqualTo("dark");
        assertThat(settings.getFontFamily()).isEqualTo("Consolas");
    }

    @Test
    void load_validJsonFile() throws IOException {
        AppSettings custom = new AppSettings();
        custom.setTheme("light");
        custom.setFontSize(18);

        Path settingsPath = tempDir.resolve(".rowport/settings.json");
        Files.createDirectories(settingsPath.getParent());
        Files.writeString(settingsPath, GSON.toJson(custom));

        SettingsService service = new SettingsService();
        AppSettings settings = service.getSettings();
        assertThat(settings.getTheme()).isEqualTo("light");
        assertThat(settings.getFontSize()).isEqualTo(18);
    }

    @Test
    void load_corruptJsonReturnsDefaults() throws IOException {
        Path settingsPath = tempDir.resolve(".rowport/settings.json");
        Files.createDirectories(settingsPath.getParent());
        Files.writeString(settingsPath, "{{invalid json}}");

        SettingsService service = new SettingsService();
        AppSettings settings = service.getSettings();
        assertThat(settings.getTheme()).isEqualTo("dark");
    }

    @Test
    void save_createsFileAndDirectory() throws IOException {
        SettingsService service = new SettingsService();
        AppSettings updated = service.getSettings();
        updated.setTheme("light");
        service.updateSettings(updated);

        Path settingsPath = tempDir.resolve(".rowport/settings.json");
        assertThat(Files.exists(settingsPath)).isTrue();
        String content = Files.readString(settingsPath);
        assertThat(content).contains("\"light\"");
    }

    @Test
    void update_appliesConsumerAndSaves() throws IOException {
        SettingsService service = new SettingsService();
        service.update(s -> s.setFontSize(20));
        assertThat(service.getSettings().getFontSize()).isEqualTo(20);

        SettingsService reloaded = new SettingsService();
        assertThat(reloaded.getSettings().getFontSize()).isEqualTo(20);
    }

    @Test
    void roundTrip_persistsAllSettings() throws IOException {
        SettingsService service = new SettingsService();
        AppSettings settings = service.getSettings();
        settings.setTheme("light");
        settings.setFontFamily("Courier");
        settings.setFontSize(20);
        settings.setLineHeight(28);
        settings.setRowDensity("compact");
        settings.setLanguage("vi");
        settings.setMaxHistoryEntries(200);
        settings.setQueryTimeoutSeconds(120);
        service.updateSettings(settings);

        SettingsService reloaded = new SettingsService();
        AppSettings loaded = reloaded.getSettings();
        assertThat(loaded.getTheme()).isEqualTo("light");
        assertThat(loaded.getFontFamily()).isEqualTo("Courier");
        assertThat(loaded.getFontSize()).isEqualTo(20);
        assertThat(loaded.getLineHeight()).isEqualTo(28);
        assertThat(loaded.getRowDensity()).isEqualTo("compact");
        assertThat(loaded.getLanguage()).isEqualTo("vi");
        assertThat(loaded.getMaxHistoryEntries()).isEqualTo(200);
        assertThat(loaded.getQueryTimeoutSeconds()).isEqualTo(120);
    }
}
