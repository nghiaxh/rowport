package com.rowport.service;

import com.rowport.db.DriverFactory;
import com.rowport.db.MongoDriver;
import com.rowport.db.SqlDriver;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.ConnectionStatus;
import com.mongodb.client.MongoClient;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class DatabaseService {

    private final Map<String, ConnectionInstance> connections = new ConcurrentHashMap<>();
    private final PasswordService passwordService;

    public DatabaseService(PasswordService passwordService) {
        this.passwordService = passwordService;
    }

    public ConnectionInstance connect(ConnectionConfig config) throws SQLException {
        disconnect(config.getId());

        String password = passwordService.getPassword(config.getId());
        if (password != null) {
            config.setPasswordRef(password);
        }

        ConnectionInstance instance = new ConnectionInstance(config);

        if (DriverFactory.isMongoDb(config.getType())) {
            MongoDriver mongoDriver = DriverFactory.getMongoDriver();
            MongoClient mongoClient = mongoDriver.connectMongo(config);
            instance.setMongoClient(mongoClient);
            instance.setStatus(ConnectionStatus.CONNECTED);
        } else {
            SqlDriver driver = DriverFactory.getDriver(config);
            Connection conn = driver.connect(config);
            instance.setConnection(conn);
            instance.setStatus(ConnectionStatus.CONNECTED);
        }

        connections.put(config.getId(), instance);
        return instance;
    }

    public void disconnect(String connectionId) throws SQLException {
        ConnectionInstance instance = connections.remove(connectionId);
        if (instance != null) {
            instance.close();
        }
    }

    public void disconnectAll() {
        for (ConnectionInstance instance : connections.values()) {
            try {
                instance.close();
            } catch (Exception e) {
                // ignore during bulk disconnect
            }
        }
        connections.clear();
    }

    public ConnectionInstance getConnection(String connectionId) {
        return connections.get(connectionId);
    }

    public boolean isConnected(String connectionId) {
        ConnectionInstance instance = connections.get(connectionId);
        return instance != null && instance.getStatus() == ConnectionStatus.CONNECTED;
    }

    public List<String> listDatabases(ConnectionConfig config) throws SQLException {
        SqlDriver driver = DriverFactory.getDriver(config);
        return driver.listDatabases(config);
    }

    public boolean testConnection(ConnectionConfig config) {
        try {
            ConnectionInstance instance = connect(config);
            boolean valid = instance.isValid();
            disconnect(config.getId());
            return valid;
        } catch (Exception e) {
            return false;
        }
    }

    public int getActiveConnectionCount() {
        return connections.size();
    }

    public static class ConnectionInstance {
        private final ConnectionConfig config;
        private Connection connection;
        private MongoClient mongoClient;
        private ConnectionStatus status;
        private String statusMessage;

        public ConnectionInstance(ConnectionConfig config) {
            this.config = config;
            this.status = ConnectionStatus.CONNECTING;
        }

        public ConnectionConfig getConfig() {
            return config;
        }

        public Connection getConnection() {
            return connection;
        }

        public void setConnection(Connection connection) {
            this.connection = connection;
        }

        public MongoClient getMongoClient() {
            return mongoClient;
        }

        public void setMongoClient(MongoClient mongoClient) {
            this.mongoClient = mongoClient;
        }

        public ConnectionStatus getStatus() {
            return status;
        }

        public void setStatus(ConnectionStatus status) {
            this.status = status;
        }

        public String getStatusMessage() {
            return statusMessage;
        }

        public void setStatusMessage(String statusMessage) {
            this.statusMessage = statusMessage;
        }

        public boolean isValid() {
            if (status == ConnectionStatus.CONNECTED) {
                if (mongoClient != null) {
                    MongoDriver mongoDriver = DriverFactory.getMongoDriver();
                    return mongoDriver.isValidMongo(mongoClient);
                }
                SqlDriver driver = DriverFactory.getDriver(config);
                return driver.isValid(connection);
            }
            return false;
        }

        public void close() throws SQLException {
            if (mongoClient != null) {
                MongoDriver mongoDriver = DriverFactory.getMongoDriver();
                mongoDriver.disconnectMongo(mongoClient);
                mongoClient = null;
            }
            if (connection != null) {
                SqlDriver driver = DriverFactory.getDriver(config);
                driver.disconnect(connection);
                connection = null;
            }
            status = ConnectionStatus.DISCONNECTED;
        }
    }
}
