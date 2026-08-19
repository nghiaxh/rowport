package com.rowport.db;

import com.rowport.model.ConnectionConfig;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class DriverFactory {

    private static final Map<String, SqlDriver> DRIVERS = new ConcurrentHashMap<>();

    static {
        DRIVERS.put("postgresql", new PostgresDriver());
        DRIVERS.put("mysql", new MysqlDriver());
        DRIVERS.put("sqlite", new SqliteDriver());
        DRIVERS.put("mongodb", new MongoDriver());
    }

    public static SqlDriver getDriver(String type) {
        SqlDriver driver = DRIVERS.get(type.toLowerCase());
        if (driver == null) {
            throw new IllegalArgumentException("Unsupported database type: " + type);
        }
        return driver;
    }

    public static SqlDriver getDriver(ConnectionConfig config) {
        return getDriver(config.getType());
    }

    public static MongoDriver getMongoDriver() {
        return (MongoDriver) DRIVERS.get("mongodb");
    }

    public static boolean isMongoDb(String type) {
        return "mongodb".equalsIgnoreCase(type);
    }

    public static boolean isSupported(String type) {
        return DRIVERS.containsKey(type.toLowerCase());
    }

    public static Map<String, SqlDriver> getAllDrivers() {
        return Map.copyOf(DRIVERS);
    }
}
