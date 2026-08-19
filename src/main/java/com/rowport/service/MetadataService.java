package com.rowport.service;

import com.rowport.model.ConnectionConfig;
import com.rowport.model.HistoryEntry;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class MetadataService {

    private static final String DB_FILE = ".rowport/app.db";
    private static final String JDBC_URL = "jdbc:sqlite:" + System.getProperty("user.home") + "/" + DB_FILE;

    public MetadataService() {
        initializeDatabase();
    }

    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(JDBC_URL);
    }

    private void initializeDatabase() {
        try (Connection conn = getConnection(); Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS connections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    host TEXT,
                    port INTEGER,
                    database_name TEXT,
                    username TEXT,
                    password_ref TEXT,
                    ssl_mode TEXT DEFAULT 'prefer',
                    color_tag TEXT,
                    folder_id TEXT,
                    favorite INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """);

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS connection_folders (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    parent_id TEXT,
                    position INTEGER DEFAULT 0
                )
            """);

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS query_history (
                    id TEXT PRIMARY KEY,
                    sql_text TEXT NOT NULL,
                    connection_id TEXT,
                    connection_name TEXT,
                    duration_ms INTEGER,
                    row_count INTEGER,
                    success INTEGER DEFAULT 1,
                    executed_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """);

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS saved_queries (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    sql_text TEXT NOT NULL,
                    connection_id TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """);
        } catch (SQLException e) {
            throw new RuntimeException("Failed to initialize metadata database", e);
        }
    }

    public List<ConnectionConfig> getAllConnections() {
        List<ConnectionConfig> list = new ArrayList<>();
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM connections ORDER BY name")) {
            while (rs.next()) {
                list.add(mapConnection(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fetch connections", e);
        }
        return list;
    }

    public ConnectionConfig getConnection(String id) {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT * FROM connections WHERE id = ?")) {
            ps.setString(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return mapConnection(rs);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fetch connection: " + id, e);
        }
        return null;
    }

    public void saveConnection(ConnectionConfig config) {
        if (config.getId() == null) {
            config.setId(UUID.randomUUID().toString());
        }
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("""
                INSERT OR REPLACE INTO connections
                (id, name, type, host, port, database_name, username, password_ref, ssl_mode, color_tag, folder_id, favorite, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             """)) {
            ps.setString(1, config.getId());
            ps.setString(2, config.getName());
            ps.setString(3, config.getType());
            ps.setString(4, config.getHost());
            ps.setInt(5, config.getPort());
            ps.setString(6, config.getDatabase());
            ps.setString(7, config.getUser());
            ps.setString(8, config.getPasswordRef());
            ps.setString(9, config.getSslMode());
            ps.setString(10, config.getColorTag());
            ps.setString(11, config.getFolderId());
            ps.setInt(12, config.isFavorite() ? 1 : 0);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to save connection", e);
        }
    }

    public void deleteConnection(String id) {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM connections WHERE id = ?")) {
            ps.setString(1, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete connection: " + id, e);
        }
    }

    public void addHistoryEntry(HistoryEntry entry) {
        if (entry.getId() == null) {
            entry.setId(UUID.randomUUID().toString());
        }
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("""
                INSERT INTO query_history
                (id, sql_text, connection_id, connection_name, duration_ms, row_count, success, executed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             """)) {
            ps.setString(1, entry.getId());
            ps.setString(2, entry.getSql());
            ps.setString(3, entry.getConnectionId());
            ps.setString(4, entry.getConnectionName());
            ps.setLong(5, entry.getDurationMs());
            ps.setInt(6, entry.getRowCount());
            ps.setInt(7, entry.isSuccess() ? 1 : 0);
            ps.setString(8, entry.getExecutedAt() != null ? entry.getExecutedAt().toString() : LocalDateTime.now().toString());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to add history entry", e);
        }
    }

    public List<HistoryEntry> getHistoryEntries(int limit) {
        List<HistoryEntry> list = new ArrayList<>();
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(
                 "SELECT * FROM query_history ORDER BY executed_at DESC LIMIT ?")) {
            ps.setInt(1, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(mapHistory(rs));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to fetch history", e);
        }
        return list;
    }

    public void deleteHistoryEntry(String id) {
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement("DELETE FROM query_history WHERE id = ?")) {
            ps.setString(1, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to delete history entry: " + id, e);
        }
    }

    public void clearHistory() {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("DELETE FROM query_history");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to clear history", e);
        }
    }

    private ConnectionConfig mapConnection(ResultSet rs) throws SQLException {
        ConnectionConfig c = new ConnectionConfig();
        c.setId(rs.getString("id"));
        c.setName(rs.getString("name"));
        c.setType(rs.getString("type"));
        c.setHost(rs.getString("host"));
        c.setPort(rs.getInt("port"));
        c.setDatabase(rs.getString("database_name"));
        c.setUser(rs.getString("username"));
        c.setPasswordRef(rs.getString("password_ref"));
        c.setSslMode(rs.getString("ssl_mode"));
        c.setColorTag(rs.getString("color_tag"));
        c.setFolderId(rs.getString("folder_id"));
        c.setFavorite(rs.getInt("favorite") == 1);
        return c;
    }

    private HistoryEntry mapHistory(ResultSet rs) throws SQLException {
        HistoryEntry h = new HistoryEntry();
        h.setId(rs.getString("id"));
        h.setSql(rs.getString("sql_text"));
        h.setConnectionId(rs.getString("connection_id"));
        h.setConnectionName(rs.getString("connection_name"));
        h.setDurationMs(rs.getLong("duration_ms"));
        h.setRowCount(rs.getInt("row_count"));
        h.setSuccess(rs.getInt("success") == 1);
        String executedAt = rs.getString("executed_at");
        if (executedAt != null) {
            h.setExecutedAt(LocalDateTime.parse(executedAt));
        }
        return h;
    }
}
