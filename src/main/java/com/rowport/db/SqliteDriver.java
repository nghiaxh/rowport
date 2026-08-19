package com.rowport.db;

import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.QueryResult;
import com.rowport.model.TableInfo;

import java.io.File;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class SqliteDriver implements SqlDriver {

    @Override
    public Connection connect(ConnectionConfig config) throws SQLException {
        String dbPath = config.getDatabase();
        if (dbPath != null && !dbPath.startsWith(":memory:")) {
            File dbFile = new File(dbPath);
            File parent = dbFile.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }
        }
        return DriverManager.getConnection("jdbc:sqlite:" + dbPath);
    }

    @Override
    public QueryResult execute(Connection conn, String sql, int maxRows) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            return executeWithStatement(conn, stmt, sql, maxRows);
        }
    }

    @Override
    public QueryResult execute(Connection conn, Statement stmt, String sql, int maxRows) throws SQLException {
        return executeWithStatement(conn, stmt, sql, maxRows);
    }

    private QueryResult executeWithStatement(Connection conn, Statement stmt, String sql, int maxRows) throws SQLException {
        long start = System.currentTimeMillis();
        if (maxRows > 0) stmt.setMaxRows(maxRows);
        boolean hasResults = stmt.execute(sql);
        long duration = System.currentTimeMillis() - start;

        if (!hasResults) {
            int updateCount = stmt.getUpdateCount();
            return new QueryResult(List.of("Result"), List.of("String"),
                List.of(List.of(updateCount + " rows affected")), duration);
        }

        try (ResultSet rs = stmt.getResultSet()) {
            return mapResultSet(rs, duration);
        }
    }

    @Override
    public List<String> listDatabases(ConnectionConfig config) throws SQLException {
        String dbPath = config.getDatabase();
        List<String> databases = new ArrayList<>();
        if (dbPath != null) {
            File dbFile = new File(dbPath);
            if (dbFile.exists()) {
                databases.add(dbFile.getName());
            } else {
                databases.add(dbPath);
            }
        }
        databases.add(":memory:");
        return databases;
    }

    @Override
    public List<TableInfo> getSchema(Connection conn, String database) throws SQLException {
        List<TableInfo> tables = new ArrayList<>();
        DatabaseMetaData meta = conn.getMetaData();

        try (ResultSet rs = meta.getTables(null, null, "%", new String[]{"TABLE", "VIEW"})) {
            while (rs.next()) {
                TableInfo info = new TableInfo();
                info.setName(rs.getString("TABLE_NAME"));
                info.setSchema(null);
                info.setType(rs.getString("TABLE_TYPE"));
                info.setColumns(getColumns(conn, database, rs.getString("TABLE_NAME")));
                tables.add(info);
            }
        }
        return tables;
    }

    @Override
    public List<ColumnInfo> getColumns(Connection conn, String database, String table) throws SQLException {
        List<ColumnInfo> columns = new ArrayList<>();
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("PRAGMA table_info('" + table.replace("'", "''") + "')")) {
            while (rs.next()) {
                ColumnInfo col = new ColumnInfo();
                col.setName(rs.getString("name"));
                col.setType(rs.getString("type"));
                col.setNullable(rs.getInt("notnull") == 0);
                col.setPrimaryKey(rs.getInt("pk") == 1);
                col.setDefaultValue(rs.getString("dflt_value"));
                columns.add(col);
            }
        }
        return columns;
    }

    @Override
    public void disconnect(Connection conn) throws SQLException {
        if (conn != null && !conn.isClosed()) {
            conn.close();
        }
    }

    @Override
    public boolean isValid(Connection conn) {
        try {
            return conn != null && !conn.isClosed() && conn.isValid(5);
        } catch (SQLException e) {
            return false;
        }
    }

    @Override
    public String getDefaultSql(ConnectionConfig config) {
        return "SELECT 1 AS connected";
    }

    @Override
    public List<Integer> getDefaultPorts() {
        return List.of();
    }
}
