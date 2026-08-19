package com.rowport.db;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.QueryResult;
import com.rowport.model.TableInfo;

import org.bson.Document;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class MongoDriver implements SqlDriver {

    @Override
    public Connection connect(ConnectionConfig config) throws SQLException {
        throw new SQLException("MongoDB does not use JDBC connections. Use MongoClient directly.");
    }

    public MongoClient connectMongo(ConnectionConfig config) {
        String connectionString = buildConnectionString(config);
        MongoClientSettings settings = MongoClientSettings.builder()
            .applyConnectionString(new ConnectionString(connectionString))
            .applyToSocketSettings(builder -> builder.connectTimeout(10000, TimeUnit.MILLISECONDS))
            .applyToClusterSettings(builder -> builder.serverSelectionTimeout(10000, TimeUnit.MILLISECONDS))
            .build();
        return MongoClients.create(settings);
    }

    @Override
    public QueryResult execute(Connection conn, String sql, int maxRows) throws SQLException {
        throw new SQLException("Use executeOnMongo for MongoDB queries.");
    }

    public QueryResult executeOnMongo(MongoClient client, String database, String command, int maxRows) {
        long start = System.currentTimeMillis();
        try {
            MongoDatabase db = client.getDatabase(database);
            Document result = db.runCommand(Document.parse(command));
            long duration = System.currentTimeMillis() - start;

            List<String> names = new ArrayList<>(result.keySet());
            List<String> types = new ArrayList<>();
            List<Object> values = new ArrayList<>();
            for (String key : names) {
                Object val = result.get(key);
                types.add(val != null ? val.getClass().getSimpleName() : "null");
                values.add(val);
            }
            return new QueryResult(names, types, List.of(values), duration);
        } catch (Exception e) {
            return new QueryResult(e.getMessage(), System.currentTimeMillis() - start);
        }
    }

    @Override
    public List<String> listDatabases(ConnectionConfig config) throws SQLException {
        List<String> databases = new ArrayList<>();
        try (MongoClient client = connectMongo(config)) {
            for (String name : client.listDatabaseNames()) {
                databases.add(name);
            }
        }
        return databases;
    }

    @Override
    public List<TableInfo> getSchema(Connection conn, String database) throws SQLException {
        throw new SQLException("Use getSchemaMongo for MongoDB.");
    }

    public List<TableInfo> getSchemaMongo(MongoClient client, String database) {
        List<TableInfo> collections = new ArrayList<>();
        MongoDatabase db = client.getDatabase(database);
        for (String name : db.listCollectionNames()) {
            TableInfo info = new TableInfo(name, database, "COLLECTION");
            try {
                Document stats = db.getCollection(name).aggregate(
                    Arrays.asList(new Document("$sample", new Document("size", 1)))
                ).first();
                if (stats != null) {
                    for (String key : stats.keySet()) {
                        Object val = stats.get(key);
                        String typeName = val != null ? val.getClass().getSimpleName() : "null";
                        ColumnInfo col = new ColumnInfo(key, typeName, true, false);
                        info.addColumn(col);
                    }
                }
            } catch (Exception e) {
                // collection may be empty or inaccessible
            }
            collections.add(info);
        }
        return collections;
    }

    @Override
    public List<ColumnInfo> getColumns(Connection conn, String database, String table) throws SQLException {
        throw new SQLException("Use getColumnsMongo for MongoDB.");
    }

    @Override
    public void disconnect(Connection conn) throws SQLException {
        // no-op for MongoDB
    }

    public void disconnectMongo(MongoClient client) {
        if (client != null) {
            client.close();
        }
    }

    @Override
    public boolean isValid(Connection conn) {
        return false;
    }

    public boolean isValidMongo(MongoClient client) {
        if (client == null) return false;
        try {
            client.listDatabaseNames().first();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String getDefaultSql(ConnectionConfig config) {
        return "{ ping: 1 }";
    }

    @Override
    public List<Integer> getDefaultPorts() {
        return List.of(27017);
    }

    private String buildConnectionString(ConnectionConfig config) {
        String user = config.getUser();
        String password = config.getPasswordRef();
        String host = config.getHost() != null ? config.getHost() : "localhost";
        int port = config.getPort() > 0 ? config.getPort() : 27017;

        if (user != null && !user.isEmpty() && password != null) {
            return "mongodb://" + user + ":" + password + "@" + host + ":" + port;
        }
        return "mongodb://" + host + ":" + port;
    }
}
