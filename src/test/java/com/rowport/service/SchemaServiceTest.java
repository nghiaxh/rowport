package com.rowport.service;

import com.rowport.db.DriverFactory;
import com.rowport.db.MongoDriver;
import com.rowport.db.SqlDriver;
import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.TableInfo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchemaServiceTest {

    private SchemaService schemaService;

    @Mock
    private SqlDriver mockSqlDriver;

    @Mock
    private Connection mockConnection;

    @BeforeEach
    void setUp() {
        schemaService = new SchemaService();
    }

    @Test
    void getSchema_sqlDriver_cachesResult() throws SQLException {
        ConnectionConfig config = createConfig("c1", "postgresql");
        List<TableInfo> tables = List.of(createTable("users"));

        try (var driverFactory = mockStatic(DriverFactory.class)) {
            driverFactory.when(() -> DriverFactory.isMongoDb("postgresql")).thenReturn(false);
            driverFactory.when(() -> DriverFactory.getDriver(config)).thenReturn(mockSqlDriver);

            when(mockSqlDriver.getSchema(mockConnection, "mydb")).thenReturn(tables);

            List<TableInfo> result1 = schemaService.getSchema(mockConnection, config, "mydb");
            List<TableInfo> result2 = schemaService.getSchema(mockConnection, config, "mydb");

            assertThat(result1).isEqualTo(tables);
            assertThat(result2).isEqualTo(tables);
            verify(mockSqlDriver, times(1)).getSchema(mockConnection, "mydb");
        }
    }

    @Test
    void refreshSchema_invalidatesCacheAndFetchesAgain() throws SQLException {
        ConnectionConfig config = createConfig("c1", "postgresql");
        List<TableInfo> tables1 = List.of(createTable("users"));
        List<TableInfo> tables2 = List.of(createTable("orders"));

        try (var driverFactory = mockStatic(DriverFactory.class)) {
            driverFactory.when(() -> DriverFactory.isMongoDb("postgresql")).thenReturn(false);
            driverFactory.when(() -> DriverFactory.getDriver(config)).thenReturn(mockSqlDriver);

            when(mockSqlDriver.getSchema(mockConnection, "mydb"))
                .thenReturn(tables1)
                .thenReturn(tables2);

            schemaService.getSchema(mockConnection, config, "mydb");
            schemaService.refreshSchema(mockConnection, config, "mydb");

            List<TableInfo> result = schemaService.getSchema(mockConnection, config, "mydb");
            assertThat(result).isEqualTo(tables2);
            verify(mockSqlDriver, times(2)).getSchema(mockConnection, "mydb");
        }
    }

    @Test
    void clearCache_removesEntriesForConnection() throws SQLException {
        ConnectionConfig config = createConfig("c1", "postgresql");
        List<TableInfo> tables = List.of(createTable("users"));

        try (var driverFactory = mockStatic(DriverFactory.class)) {
            driverFactory.when(() -> DriverFactory.isMongoDb("postgresql")).thenReturn(false);
            driverFactory.when(() -> DriverFactory.getDriver(config)).thenReturn(mockSqlDriver);

            when(mockSqlDriver.getSchema(mockConnection, "mydb")).thenReturn(tables);

            schemaService.getSchema(mockConnection, config, "mydb");
            schemaService.clearCache("c1");

            schemaService.getSchema(mockConnection, config, "mydb");
            verify(mockSqlDriver, times(2)).getSchema(mockConnection, "mydb");
        }
    }

    @Test
    void clearAllCache_emptiesCache() throws SQLException {
        ConnectionConfig config = createConfig("c1", "postgresql");
        List<TableInfo> tables = List.of(createTable("users"));

        try (var driverFactory = mockStatic(DriverFactory.class)) {
            driverFactory.when(() -> DriverFactory.isMongoDb("postgresql")).thenReturn(false);
            driverFactory.when(() -> DriverFactory.getDriver(config)).thenReturn(mockSqlDriver);

            when(mockSqlDriver.getSchema(mockConnection, "mydb")).thenReturn(tables);

            schemaService.getSchema(mockConnection, config, "mydb");
            schemaService.clearAllCache();

            schemaService.getSchema(mockConnection, config, "mydb");
            verify(mockSqlDriver, times(2)).getSchema(mockConnection, "mydb");
        }
    }

    @Test
    void getColumns_sqlDriver_delegatesToDriver() throws SQLException {
        ConnectionConfig config = createConfig("c1", "postgresql");
        ColumnInfo col = new ColumnInfo("id", "integer", true, true);

        try (var driverFactory = mockStatic(DriverFactory.class)) {
            driverFactory.when(() -> DriverFactory.isMongoDb("postgresql")).thenReturn(false);
            driverFactory.when(() -> DriverFactory.getDriver(config)).thenReturn(mockSqlDriver);

            when(mockSqlDriver.getColumns(mockConnection, "mydb", "users"))
                .thenReturn(List.of(col));

            List<ColumnInfo> columns = schemaService.getColumns(mockConnection, config, "mydb", "users");
            assertThat(columns).hasSize(1);
            assertThat(columns.get(0).getName()).isEqualTo("id");
        }
    }

    private ConnectionConfig createConfig(String id, String type) {
        ConnectionConfig config = new ConnectionConfig();
        config.setId(id);
        config.setType(type);
        config.setHost("localhost");
        config.setDatabase("mydb");
        return config;
    }

    private TableInfo createTable(String name) {
        TableInfo table = new TableInfo();
        table.setName(name);
        return table;
    }
}
