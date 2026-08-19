package com.rowport.db;

import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.QueryResult;
import com.rowport.model.TableInfo;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public interface SqlDriver {

    Connection connect(ConnectionConfig config) throws SQLException;

    QueryResult execute(Connection conn, String sql, int maxRows) throws SQLException;

    default QueryResult execute(Connection conn, Statement stmt, String sql, int maxRows) throws SQLException {
        return execute(conn, sql, maxRows);
    }

    List<String> listDatabases(ConnectionConfig config) throws SQLException;

    List<TableInfo> getSchema(Connection conn, String database) throws SQLException;

    List<ColumnInfo> getColumns(Connection conn, String database, String table) throws SQLException;

    void disconnect(Connection conn) throws SQLException;

    boolean isValid(Connection conn);

    String getDefaultSql(ConnectionConfig config);

    List<Integer> getDefaultPorts();

    default QueryResult mapResultSet(ResultSet rs, long duration) throws SQLException {
        var meta = rs.getMetaData();
        int colCount = meta.getColumnCount();
        List<String> names = new ArrayList<>();
        List<String> types = new ArrayList<>();
        for (int i = 1; i <= colCount; i++) {
            names.add(meta.getColumnLabel(i));
            types.add(meta.getColumnTypeName(i));
        }

        List<List<Object>> rows = new ArrayList<>();
        while (rs.next()) {
            List<Object> row = new ArrayList<>(colCount);
            for (int i = 1; i <= colCount; i++) {
                row.add(rs.getObject(i));
            }
            rows.add(row);
        }
        return new QueryResult(names, types, rows, duration);
    }
}
