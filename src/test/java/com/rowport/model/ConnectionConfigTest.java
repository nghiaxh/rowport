package com.rowport.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConnectionConfigTest {

    @Test
    void getJdbcUrl_postgresql() {
        ConnectionConfig config = createConfig("postgresql", "localhost", 5432, "mydb");
        assertThat(config.getJdbcUrl()).isEqualTo("jdbc:postgresql://localhost:5432/mydb");
    }

    @Test
    void getJdbcUrl_mysql() {
        ConnectionConfig config = createConfig("mysql", "10.0.0.1", 3306, "testdb");
        assertThat(config.getJdbcUrl()).isEqualTo("jdbc:mysql://10.0.0.1:3306/testdb");
    }

    @Test
    void getJdbcUrl_sqlite() {
        ConnectionConfig config = createConfig("sqlite", null, 0, "/path/to/db.sqlite");
        assertThat(config.getJdbcUrl()).isEqualTo("jdbc:sqlite:/path/to/db.sqlite");
    }

    @Test
    void getJdbcUrl_unknownTypeReturnsEmpty() {
        ConnectionConfig config = createConfig("oracle", "localhost", 1521, "orcl");
        assertThat(config.getJdbcUrl()).isEmpty();
    }

    @Test
    void getDefaultPort_postgresql() {
        ConnectionConfig config = new ConnectionConfig();
        config.setType("postgresql");
        assertThat(config.getDefaultPort()).isEqualTo(5432);
    }

    @Test
    void getDefaultPort_mysql() {
        ConnectionConfig config = new ConnectionConfig();
        config.setType("mysql");
        assertThat(config.getDefaultPort()).isEqualTo(3306);
    }

    @Test
    void getDefaultPort_sqlite() {
        ConnectionConfig config = new ConnectionConfig();
        config.setType("sqlite");
        assertThat(config.getDefaultPort()).isEqualTo(0);
    }

    @Test
    void getDefaultPort_mongodb() {
        ConnectionConfig config = new ConnectionConfig();
        config.setType("mongodb");
        assertThat(config.getDefaultPort()).isEqualTo(27017);
    }

    @Test
    void getDefaultPort_unknownType() {
        ConnectionConfig config = new ConnectionConfig();
        config.setType("oracle");
        assertThat(config.getDefaultPort()).isEqualTo(0);
    }

    @Test
    void defaultConstructor_allFieldsNullOrDefaults() {
        ConnectionConfig config = new ConnectionConfig();
        assertThat(config.getId()).isNull();
        assertThat(config.getName()).isNull();
        assertThat(config.getType()).isNull();
        assertThat(config.isFavorite()).isFalse();
    }

    @Test
    void gettersSetters_roundTrip() {
        ConnectionConfig config = new ConnectionConfig();
        config.setId("id-1");
        config.setName("Test DB");
        config.setType("postgresql");
        config.setHost("localhost");
        config.setPort(5432);
        config.setDatabase("mydb");
        config.setUser("admin");
        config.setPasswordRef("ref-1");
        config.setSslMode("require");
        config.setColorTag("#ff0000");
        config.setFolderId("folder-1");
        config.setFavorite(true);

        assertThat(config.getId()).isEqualTo("id-1");
        assertThat(config.getName()).isEqualTo("Test DB");
        assertThat(config.getType()).isEqualTo("postgresql");
        assertThat(config.getHost()).isEqualTo("localhost");
        assertThat(config.getPort()).isEqualTo(5432);
        assertThat(config.getDatabase()).isEqualTo("mydb");
        assertThat(config.getUser()).isEqualTo("admin");
        assertThat(config.getPasswordRef()).isEqualTo("ref-1");
        assertThat(config.getSslMode()).isEqualTo("require");
        assertThat(config.getColorTag()).isEqualTo("#ff0000");
        assertThat(config.getFolderId()).isEqualTo("folder-1");
        assertThat(config.isFavorite()).isTrue();
    }

    private ConnectionConfig createConfig(String type, String host, int port, String database) {
        ConnectionConfig config = new ConnectionConfig();
        config.setType(type);
        config.setHost(host);
        config.setPort(port);
        config.setDatabase(database);
        return config;
    }
}
