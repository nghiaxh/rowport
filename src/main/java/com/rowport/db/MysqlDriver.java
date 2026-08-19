package com.rowport.db;

import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.QueryResult;
import com.rowport.model.TableInfo;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

public class MysqlDriver implements SqlDriver {

    @Override
    public Connection connect(ConnectionConfig config) throws SQLException {
        Properties props = new Properties();
        props.setProperty("user", config.getUser() != null ? config.getUser() : "");
        if (config.getPasswordRef() != null) {
            props.setProperty("password", config.getPasswordRef());
        }
        props.setProperty("connectTimeout", "10000");
        props.setProperty("characterEncoding", "UTF-8");
        props.setProperty("allowPublicKeyRetrieval", "true");

        String sslMode = config.getSslMode();
        if ("require".equals(sslMode)) {
            props.setProperty("sslMode", "REQUIRED");
        } else if ("verify-full".equals(sslMode)) {
            props.setProperty("sslMode", "VERIFY_CA");
        } else {
            props.setProperty("sslMode", "PREFERRED");
        }

        String url = config.getJdbcUrl();
        return DriverManager.getConnection(url, props);
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
        ConnectionConfig listConfig = new ConnectionConfig();
        listConfig.setType(config.getType());
        listConfig.setHost(config.getHost());
        listConfig.setPort(config.getPort());
        listConfig.setUser(config.getUser());
        listConfig.setPasswordRef(config.getPasswordRef());
        listConfig.setDatabase("information_schema");

        List<String> databases = new ArrayList<>();
        try (Connection conn = connect(listConfig);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SHOW DATABASES")) {
            while (rs.next()) {
                databases.add(rs.getString(1));
            }
        }
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
                info.setSchema(rs.getString("TABLE_SCHEM"));
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
        DatabaseMetaData meta = conn.getMetaData();

        try (ResultSet rs = meta.getColumns(null, null, table, "%")) {
            while (rs.next()) {
                ColumnInfo col = new ColumnInfo();
                col.setName(rs.getString("COLUMN_NAME"));
                col.setType(rs.getString("TYPE_NAME"));
                col.setNullable("YES".equals(rs.getString("IS_NULLABLE")));
                col.setDefaultValue(rs.getString("COLUMN_DEF"));
                columns.add(col);
            }
        }

        try (ResultSet rs = meta.getPrimaryKeys(null, null, table)) {
            while (rs.next()) {
                String pkCol = rs.getString("COLUMN_NAME");
                for (ColumnInfo col : columns) {
                    if (col.getName().equals(pkCol)) {
                        col.setPrimaryKey(true);
                        break;
                    }
                }
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
        return List.of(3306);
    }
}
