package com.rowport.service;

import com.rowport.db.DriverFactory;
import com.rowport.db.MongoDriver;
import com.rowport.db.SqlDriver;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.QueryResult;
import com.rowport.service.DatabaseService.ConnectionInstance;
import com.mongodb.client.MongoClient;

import javax.swing.*;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.function.Consumer;

public class QueryExecutor {

    private final DatabaseService databaseService;
    private final MetadataService metadataService;
    private volatile SwingWorker<Void, Void> currentWorker;
    private volatile Statement currentStatement;

    public QueryExecutor(DatabaseService databaseService, MetadataService metadataService) {
        this.databaseService = databaseService;
        this.metadataService = metadataService;
    }

    public void execute(String connectionId, String sql, Consumer<QueryResult> onResult) {
        cancelCurrent();

        ConnectionInstance instance = databaseService.getConnection(connectionId);
        if (instance == null || instance.getStatus() != com.rowport.model.ConnectionStatus.CONNECTED) {
            onResult.accept(new QueryResult("Not connected", 0));
            return;
        }

        SwingWorker<Void, Void> worker = new SwingWorker<>() {
            @Override
            protected Void doInBackground() throws Exception {
                long start = System.currentTimeMillis();
                try {
                    QueryResult result;
                    ConnectionConfig config = instance.getConfig();

                    if (DriverFactory.isMongoDb(config.getType())) {
                        MongoDriver mongoDriver = DriverFactory.getMongoDriver();
                        MongoClient mongoClient = instance.getMongoClient();
                        result = mongoDriver.executeOnMongo(mongoClient, config.getDatabase(), sql, 10000);
                    } else {
                        Connection conn = instance.getConnection();
                        SqlDriver driver = DriverFactory.getDriver(config);
                        Statement stmt = conn.createStatement();
                        currentStatement = stmt;
                        try {
                            result = driver.execute(conn, stmt, sql, 10000);
                        } finally {
                            currentStatement = null;
                            stmt.close();
                        }
                    }

                    SwingUtilities.invokeLater(() -> onResult.accept(result));

                    com.rowport.model.HistoryEntry history = new com.rowport.model.HistoryEntry();
                    history.setSql(sql);
                    history.setConnectionId(connectionId);
                    history.setConnectionName(config.getName());
                    history.setDurationMs(result.getDurationMs());
                    history.setRowCount(result.getRowCount());
                    history.setSuccess(!result.hasError());
                    metadataService.addHistoryEntry(history);

                } catch (Exception e) {
                    long duration = System.currentTimeMillis() - start;
                    SwingUtilities.invokeLater(() -> onResult.accept(new QueryResult(e.getMessage(), duration)));
                }
                return null;
            }
        };

        currentWorker = worker;
        worker.execute();
    }

    public void cancelCurrent() {
        if (currentStatement != null) {
            try {
                currentStatement.cancel();
            } catch (SQLException e) {
                // ignore
            }
            currentStatement = null;
        }
        if (currentWorker != null && !currentWorker.isDone()) {
            currentWorker.cancel(true);
            currentWorker = null;
        }
    }

    public boolean isRunning() {
        return currentWorker != null && !currentWorker.isDone();
    }
}
