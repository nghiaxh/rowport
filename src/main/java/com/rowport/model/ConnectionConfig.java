package com.rowport.model;

public class ConnectionConfig {

    private String id;
    private String name;
    private String type;
    private String host;
    private int port;
    private String database;
    private String user;
    private String passwordRef;
    private String sslMode;
    private String colorTag;
    private String folderId;
    private boolean favorite;

    public ConnectionConfig() {
    }

    public ConnectionConfig(String id, String name, String type) {
        this.id = id;
        this.name = name;
        this.type = type;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getPasswordRef() {
        return passwordRef;
    }

    public void setPasswordRef(String passwordRef) {
        this.passwordRef = passwordRef;
    }

    public String getSslMode() {
        return sslMode;
    }

    public void setSslMode(String sslMode) {
        this.sslMode = sslMode;
    }

    public String getColorTag() {
        return colorTag;
    }

    public void setColorTag(String colorTag) {
        this.colorTag = colorTag;
    }

    public String getFolderId() {
        return folderId;
    }

    public void setFolderId(String folderId) {
        this.folderId = folderId;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
    }

    public String getJdbcUrl() {
        if (type == null) return "";
        return switch (type.toLowerCase()) {
            case "postgresql" -> "jdbc:postgresql://" + host + ":" + port + "/" + database;
            case "mysql" -> "jdbc:mysql://" + host + ":" + port + "/" + database;
            case "sqlite" -> "jdbc:sqlite:" + database;
            default -> "";
        };
    }

    public int getDefaultPort() {
        if (type == null) return 0;
        return switch (type.toLowerCase()) {
            case "postgresql" -> 5432;
            case "mysql" -> 3306;
            case "sqlite" -> 0;
            case "mongodb" -> 27017;
            default -> 0;
        };
    }
}
