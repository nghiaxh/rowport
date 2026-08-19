package com.rowport.service;

import com.rowport.db.DriverFactory;
import com.rowport.db.MongoDriver;
import com.rowport.db.SqlDriver;
import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.TableInfo;
import com.mongodb.client.MongoClient;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SchemaService {

    private final Map<String, List<TableInfo>> schemaCache = new ConcurrentHashMap<>();

    public List<TableInfo> getSchema(Connection conn, ConnectionConfig config, String database) throws SQLException {
        return getSchema(conn, config, database, null);
    }

    public List<TableInfo> getSchema(Connection conn, ConnectionConfig config, String database, DatabaseService databaseService) throws SQLException {
        String cacheKey = config.getId() + ":" + database;
        List<TableInfo> cached = schemaCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        List<TableInfo> tables;
        if (DriverFactory.isMongoDb(config.getType())) {
            MongoDriver mongoDriver = DriverFactory.getMongoDriver();
            MongoClient mongoClient = null;
            boolean ownsClient = false;
            if (databaseService != null) {
                DatabaseService.ConnectionInstance instance = databaseService.getConnection(config.getId());
                if (instance != null) {
                    mongoClient = instance.getMongoClient();
                }
            }
            if (mongoClient == null) {
                mongoClient = mongoDriver.connectMongo(config);
                ownsClient = true;
            }
            try {
                tables = mongoDriver.getSchemaMongo(mongoClient, database);
            } finally {
                if (ownsClient) {
                    mongoDriver.disconnectMongo(mongoClient);
                }
            }
        } else {
            SqlDriver driver = DriverFactory.getDriver(config);
            tables = driver.getSchema(conn, database);
        }

        schemaCache.put(cacheKey, tables);
        return tables;
    }

    public List<ColumnInfo> getColumns(Connection conn, ConnectionConfig config, String database, String table) throws SQLException {
        if (DriverFactory.isMongoDb(config.getType())) {
            List<TableInfo> cached = schemaCache.get(config.getId() + ":" + database);
            if (cached != null) {
                for (TableInfo t : cached) {
                    if (t.getName().equals(table)) {
                        return t.getColumns();
                    }
                }
            }
            return Collections.emptyList();
        }

        SqlDriver driver = DriverFactory.getDriver(config);
        return driver.getColumns(conn, database, table);
    }

    public void refreshSchema(Connection conn, ConnectionConfig config, String database) throws SQLException {
        String cacheKey = config.getId() + ":" + database;
        schemaCache.remove(cacheKey);
        getSchema(conn, config, database);
    }

    public void clearCache(String connectionId) {
        schemaCache.keySet().removeIf(key -> key.startsWith(connectionId + ":"));
    }

    public void clearAllCache() {
        schemaCache.clear();
    }
}
