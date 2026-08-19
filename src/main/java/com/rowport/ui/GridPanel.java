package com.rowport.ui;

import com.rowport.model.QueryResult;
import com.rowport.util.GridUtils;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.awt.datatransfer.StringSelection;
import java.util.List;

public class GridPanel extends JPanel {

    private final JTable table;
    private final DefaultTableModel tableModel;
    private final JLabel resultStatus;
    private QueryResult currentResult;

    public GridPanel() {
        setLayout(new BorderLayout());

        tableModel = new DefaultTableModel() {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        table = new JTable(tableModel);
        table.setSelectionMode(ListSelectionModel.MULTIPLE_INTERVAL_SELECTION);
        table.setFillsViewportHeight(true);
        table.setAutoCreateRowSorter(true);
        table.getTableHeader().setReorderingAllowed(false);

        resultStatus = new JLabel("Ready");
        resultStatus.setBorder(BorderFactory.createEmptyBorder(4, 8, 4, 8));
        resultStatus.setFont(resultStatus.getFont().deriveFont(11f));

        add(new JScrollPane(table), BorderLayout.CENTER);
        add(resultStatus, BorderLayout.SOUTH);
    }

    public void displayResult(QueryResult result) {
        this.currentResult = result;
        tableModel.setRowCount(0);
        tableModel.setColumnCount(0);

        if (result == null || result.hasError()) {
            if (result != null && result.hasError()) {
                resultStatus.setText("Error: " + result.getError());
            } else {
                resultStatus.setText("Ready");
            }
            return;
        }

        GridUtils.populateTable(tableModel, result);
        resultStatus.setText(String.format("%d rows in %dms", result.getRowCount(), result.getDurationMs()));
    }

    public void clear() {
        tableModel.setRowCount(0);
        tableModel.setColumnCount(0);
        resultStatus.setText("Ready");
        currentResult = null;
    }

    public QueryResult getCurrentResult() {
        return currentResult;
    }

    public JTable getTable() {
        return table;
    }

    public void copySelectedCell() {
        int[] rows = table.getSelectedRows();
        if (rows.length == 0) return;

        StringBuilder sb = new StringBuilder();
        for (int row : rows) {
            for (int col = 0; col < table.getColumnCount(); col++) {
                if (col > 0) sb.append("\t");
                Object val = table.getValueAt(row, col);
                sb.append(val != null ? val.toString() : "");
            }
            sb.append("\n");
        }

        StringSelection selection = new StringSelection(sb.toString());
        Toolkit.getDefaultToolkit().getSystemClipboard().setContents(selection, null);
    }
}
