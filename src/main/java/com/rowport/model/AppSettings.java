package com.rowport.model;

public class AppSettings {

    private String theme;
    private String fontFamily;
    private int fontSize;
    private int lineHeight;
    private String rowDensity;
    private String language;
    private int maxHistoryEntries;
    private int queryTimeoutSeconds;

    public AppSettings() {
        this.theme = "dark";
        this.fontFamily = "Consolas";
        this.fontSize = 14;
        this.lineHeight = 20;
        this.rowDensity = "normal";
        this.language = "en";
        this.maxHistoryEntries = 500;
        this.queryTimeoutSeconds = 30;
    }

    public static AppSettings defaults() {
        return new AppSettings();
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public String getFontFamily() {
        return fontFamily;
    }

    public void setFontFamily(String fontFamily) {
        this.fontFamily = fontFamily;
    }

    public int getFontSize() {
        return fontSize;
    }

    public void setFontSize(int fontSize) {
        this.fontSize = fontSize;
    }

    public int getLineHeight() {
        return lineHeight;
    }

    public void setLineHeight(int lineHeight) {
        this.lineHeight = lineHeight;
    }

    public String getRowDensity() {
        return rowDensity;
    }

    public void setRowDensity(String rowDensity) {
        this.rowDensity = rowDensity;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public int getMaxHistoryEntries() {
        return maxHistoryEntries;
    }

    public void setMaxHistoryEntries(int maxHistoryEntries) {
        this.maxHistoryEntries = maxHistoryEntries;
    }

    public int getQueryTimeoutSeconds() {
        return queryTimeoutSeconds;
    }

    public void setQueryTimeoutSeconds(int queryTimeoutSeconds) {
        this.queryTimeoutSeconds = queryTimeoutSeconds;
    }

    public double getRowHeight() {
        return switch (rowDensity) {
            case "compact" -> 24.0;
            case "comfortable" -> 36.0;
            default -> 30.0;
        };
    }
}
