package com.rowport.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.rowport.model.AppSettings;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class SettingsService {

    private static final String SETTINGS_FILE = ".rowport/settings.json";
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    private final Path settingsPath;
    private AppSettings settings;

    public SettingsService() {
        this.settingsPath = Path.of(System.getProperty("user.home"), SETTINGS_FILE);
        this.settings = load();
    }

    public AppSettings getSettings() {
        return settings;
    }

    public void updateSettings(AppSettings newSettings) {
        this.settings = newSettings;
        save();
    }

    public void update(java.util.function.Consumer<AppSettings> updater) {
        updater.accept(settings);
        save();
    }

    private AppSettings load() {
        if (Files.exists(settingsPath)) {
            try {
                String json = Files.readString(settingsPath);
                AppSettings loaded = GSON.fromJson(json, AppSettings.class);
                if (loaded != null) return loaded;
            } catch (IOException | com.google.gson.JsonSyntaxException e) {
                System.err.println("Failed to load settings, using defaults: " + e.getMessage());
            }
        }
        return AppSettings.defaults();
    }

    private void save() {
        try {
            Files.createDirectories(settingsPath.getParent());
            String json = GSON.toJson(settings);
            Files.writeString(settingsPath, json);
        } catch (IOException e) {
            System.err.println("Failed to save settings: " + e.getMessage());
        }
    }
}
