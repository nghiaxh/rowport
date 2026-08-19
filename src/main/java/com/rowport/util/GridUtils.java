package com.rowport.util;

import com.rowport.model.QueryResult;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.util.List;

public final class GridUtils {

    private GridUtils() {
    }

    public static void populateTable(DefaultTableModel model, QueryResult result) {
        model.setRowCount(0);
        model.setColumnCount(0);

        if (result == null || result.hasError()) return;

        List<String> columnNames = result.getColumnNames();
        String[] columns = columnNames.toArray(new String[0]);
        model.setColumnIdentifiers(columns);

        for (List<Object> row : result.getRows()) {
            Object[] rowData = row.toArray();
            model.addRow(rowData);
        }
    }

    public static void exportCsv(JTable table, String filePath) throws IOException {
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < table.getColumnCount(); i++) {
            if (i > 0) sb.append(",");
            sb.append(escapeCsv(table.getColumnName(i)));
        }
        sb.append("\n");

        for (int row = 0; row < table.getRowCount(); row++) {
            for (int col = 0; col < table.getColumnCount(); col++) {
                if (col > 0) sb.append(",");
                Object val = table.getValueAt(row, col);
                sb.append(escapeCsv(val != null ? val.toString() : ""));
            }
            sb.append("\n");
        }

        try (Writer writer = new FileWriter(filePath)) {
            writer.write(sb.toString());
        }
    }

    private static String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
