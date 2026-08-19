package com.rowport.model;

import java.util.Collections;
import java.util.List;

public class QueryResult {

    private final List<String> columnNames;
    private final List<String> columnTypes;
    private final List<List<Object>> rows;
    private final long durationMs;
    private final String error;

    public QueryResult(List<String> columnNames, List<String> columnTypes, List<List<Object>> rows, long durationMs) {
        this.columnNames = columnNames;
        this.columnTypes = columnTypes;
        this.rows = rows;
        this.durationMs = durationMs;
        this.error = null;
    }

    public QueryResult(String error, long durationMs) {
        this.columnNames = List.of();
        this.columnTypes = List.of();
        this.rows = List.of();
        this.durationMs = durationMs;
        this.error = error;
    }

    public List<String> getColumnNames() {
        return Collections.unmodifiableList(columnNames);
    }

    public List<String> getColumnTypes() {
        return Collections.unmodifiableList(columnTypes);
    }

    public List<List<Object>> getRows() {
        return Collections.unmodifiableList(rows);
    }

    public long getDurationMs() {
        return durationMs;
    }

    public String getError() {
        return error;
    }

    public boolean hasError() {
        return error != null;
    }

    public int getRowCount() {
        return rows.size();
    }

    public int getColumnCount() {
        return columnNames.size();
    }

    public String toCsv() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < columnNames.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(escapeCsv(columnNames.get(i)));
        }
        sb.append("\n");
        for (List<Object> row : rows) {
            for (int i = 0; i < row.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(escapeCsv(String.valueOf(row.get(i))));
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    public String toJson() {
        StringBuilder sb = new StringBuilder("[\n");
        for (int r = 0; r < rows.size(); r++) {
            sb.append("  {");
            List<Object> row = rows.get(r);
            for (int i = 0; i < columnNames.size() && i < row.size(); i++) {
                if (i > 0) sb.append(", ");
                sb.append("\"").append(escapeJson(columnNames.get(i))).append("\": ");
                Object val = row.get(i);
                if (val == null) {
                    sb.append("null");
                } else if (val instanceof Number) {
                    sb.append(val);
                } else {
                    sb.append("\"").append(escapeJson(String.valueOf(val))).append("\"");
                }
            }
            sb.append("}");
            if (r < rows.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("]");
        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }
}
