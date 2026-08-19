package com.rowport.db;

import com.rowport.model.ConnectionConfig;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DriverFactoryTest {

    @Test
    void getDriver_postgresqlReturnsPostgresDriver() {
        SqlDriver driver = DriverFactory.getDriver("postgresql");
        assertThat(driver).isInstanceOf(PostgresDriver.class);
    }

    @Test
    void getDriver_mysqlReturnsMysqlDriver() {
        SqlDriver driver = DriverFactory.getDriver("mysql");
        assertThat(driver).isInstanceOf(MysqlDriver.class);
    }

    @Test
    void getDriver_sqliteReturnsSqliteDriver() {
        SqlDriver driver = DriverFactory.getDriver("sqlite");
        assertThat(driver).isInstanceOf(SqliteDriver.class);
    }

    @Test
    void getDriver_mongodbReturnsMongoDriver() {
        SqlDriver driver = DriverFactory.getDriver("mongodb");
        assertThat(driver).isInstanceOf(MongoDriver.class);
    }

    @Test
    void getDriver_caseInsensitive() {
        SqlDriver driver = DriverFactory.getDriver("PostgreSQL");
        assertThat(driver).isInstanceOf(PostgresDriver.class);
    }

    @Test
    void getDriver_unknownTypeThrowsException() {
        assertThatThrownBy(() -> DriverFactory.getDriver("oracle"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("oracle");
    }

    @Test
    void getDriver_withConfigDelegates() {
        ConnectionConfig config = new ConnectionConfig();
        config.setType("sqlite");
        SqlDriver driver = DriverFactory.getDriver(config);
        assertThat(driver).isInstanceOf(SqliteDriver.class);
    }

    @Test
    void isMongoDb_mongodbReturnsTrue() {
        assertThat(DriverFactory.isMongoDb("mongodb")).isTrue();
    }

    @Test
    void isMongoDb_caseInsensitive() {
        assertThat(DriverFactory.isMongoDb("MongoDB")).isTrue();
    }

    @Test
    void isMongoDb_otherTypeReturnsFalse() {
        assertThat(DriverFactory.isMongoDb("postgresql")).isFalse();
    }

    @Test
    void isSupported_allSupportedTypes() {
        assertThat(DriverFactory.isSupported("postgresql")).isTrue();
        assertThat(DriverFactory.isSupported("mysql")).isTrue();
        assertThat(DriverFactory.isSupported("sqlite")).isTrue();
        assertThat(DriverFactory.isSupported("mongodb")).isTrue();
    }

    @Test
    void isSupported_unsupportedType() {
        assertThat(DriverFactory.isSupported("oracle")).isFalse();
    }

    @Test
    void getAllDrivers_returnsFourDrivers() {
        assertThat(DriverFactory.getAllDrivers()).hasSize(4);
    }

    @Test
    void getAllDrivers_returnsUnmodifiableMap() {
        assertThatThrownBy(() -> DriverFactory.getAllDrivers().put("test", null))
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void getMongoDriver_returnsMongoDriver() {
        assertThat(DriverFactory.getMongoDriver()).isInstanceOf(MongoDriver.class);
    }
}
