package com.rowport.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HistoryEntryTest {

    @Test
    void constructor_setsFields() {
        HistoryEntry entry = new HistoryEntry("id-1", "SELECT 1", "conn-1");
        assertThat(entry.getId()).isEqualTo("id-1");
        assertThat(entry.getSql()).isEqualTo("SELECT 1");
        assertThat(entry.getConnectionId()).isEqualTo("conn-1");
        assertThat(entry.getExecutedAt()).isNotNull();
    }

    @Test
    void getShortSql_nullReturnsEmpty() {
        HistoryEntry entry = new HistoryEntry();
        assertThat(entry.getShortSql()).isEmpty();
    }

    @Test
    void getShortSql_shortSqlReturnedAsIs() {
        HistoryEntry entry = new HistoryEntry();
        entry.setSql("SELECT * FROM users");
        assertThat(entry.getShortSql()).isEqualTo("SELECT * FROM users");
    }

    @Test
    void getShortSql_exactly80CharsNotTruncated() {
        HistoryEntry entry = new HistoryEntry();
        String sql = "a".repeat(80);
        entry.setSql(sql);
        assertThat(entry.getShortSql()).isEqualTo(sql);
        assertThat(entry.getShortSql()).hasSize(80);
    }

    @Test
    void getLongSql_truncatedWithEllipsis() {
        HistoryEntry entry = new HistoryEntry();
        String sql = "a".repeat(100);
        entry.setSql(sql);
        assertThat(entry.getShortSql()).hasSize(83);
        assertThat(entry.getShortSql()).endsWith("...");
        assertThat(entry.getShortSql()).startsWith("aaa");
    }

    @Test
    void getShortSql_trimsWhitespace() {
        HistoryEntry entry = new HistoryEntry();
        entry.setSql("   SELECT 1   ");
        assertThat(entry.getShortSql()).isEqualTo("SELECT 1");
    }

    @Test
    void gettersSetters_roundTrip() {
        HistoryEntry entry = new HistoryEntry();
        entry.setId("id-2");
        entry.setSql("INSERT INTO t VALUES (1)");
        entry.setConnectionId("conn-2");
        entry.setConnectionName("My DB");
        entry.setDurationMs(150L);
        entry.setRowCount(10);
        entry.setSuccess(true);

        assertThat(entry.getId()).isEqualTo("id-2");
        assertThat(entry.getSql()).isEqualTo("INSERT INTO t VALUES (1)");
        assertThat(entry.getConnectionId()).isEqualTo("conn-2");
        assertThat(entry.getConnectionName()).isEqualTo("My DB");
        assertThat(entry.getDurationMs()).isEqualTo(150L);
        assertThat(entry.getRowCount()).isEqualTo(10);
        assertThat(entry.isSuccess()).isTrue();
    }
}
