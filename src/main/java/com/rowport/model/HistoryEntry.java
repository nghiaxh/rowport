package com.rowport.model;

import java.time.LocalDateTime;

public class HistoryEntry {

    private String id;
    private String sql;
    private String connectionId;
    private String connectionName;
    private long durationMs;
    private int rowCount;
    private boolean success;
    private LocalDateTime executedAt;

    public HistoryEntry() {
    }

    public HistoryEntry(String id, String sql, String connectionId) {
        this.id = id;
        this.sql = sql;
        this.connectionId = connectionId;
        this.executedAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSql() {
        return sql;
    }

    public void setSql(String sql) {
        this.sql = sql;
    }

    public String getConnectionId() {
        return connectionId;
    }

    public void setConnectionId(String connectionId) {
        this.connectionId = connectionId;
    }

    public String getConnectionName() {
        return connectionName;
    }

    public void setConnectionName(String connectionName) {
        this.connectionName = connectionName;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(long durationMs) {
        this.durationMs = durationMs;
    }

    public int getRowCount() {
        return rowCount;
    }

    public void setRowCount(int rowCount) {
        this.rowCount = rowCount;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public LocalDateTime getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(LocalDateTime executedAt) {
        this.executedAt = executedAt;
    }

    public String getShortSql() {
        if (sql == null) return "";
        String trimmed = sql.trim();
        if (trimmed.length() > 80) {
            return trimmed.substring(0, 80) + "...";
        }
        return trimmed;
    }
}
