package com.rowport.ui;

import com.rowport.model.HistoryEntry;
import com.rowport.service.MetadataService;

import javax.swing.*;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.List;
import java.util.function.Consumer;

public class HistoryPanel {

    private final JList<HistoryEntry> list;
    private final DefaultListModel<HistoryEntry> listModel;
    private MetadataService metadataService;
    private Consumer<String> onQuerySelected;

    public HistoryPanel() {
        listModel = new DefaultListModel<>();
        list = new JList<>(listModel);
        list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        list.setCellRenderer(new HistoryCellRenderer());
    }

    public void init(MetadataService metadataService, Consumer<String> onQuerySelected) {
        this.metadataService = metadataService;
        this.onQuerySelected = onQuerySelected;

        list.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (e.getClickCount() == 2) {
                    HistoryEntry selected = list.getSelectedValue();
                    if (selected != null && onQuerySelected != null) {
                        onQuerySelected.accept(selected.getSql());
                    }
                }
            }
        });
    }

    public void loadHistory() {
        if (metadataService == null) return;
        List<HistoryEntry> entries = metadataService.getHistoryEntries(200);
        listModel.clear();
        for (HistoryEntry entry : entries) {
            listModel.addElement(entry);
        }
    }

    public void addEntry(HistoryEntry entry) {
        listModel.add(0, entry);
    }

    public void clear() {
        listModel.clear();
    }

    public JList<HistoryEntry> getList() {
        return list;
    }

    private static class HistoryCellRenderer extends DefaultListCellRenderer {
        @Override
        public Component getListCellRendererComponent(JList<?> list, Object value,
                int index, boolean isSelected, boolean cellHasFocus) {
            if (value instanceof HistoryEntry entry) {
                JPanel panel = new JPanel(new BorderLayout(0, 2));
                panel.setBorder(BorderFactory.createEmptyBorder(4, 8, 4, 8));

                if (isSelected) {
                    panel.setBackground(list.getSelectionBackground());
                } else {
                    panel.setBackground(list.getBackground());
                }

                JLabel sqlLabel = new JLabel("<html><pre style='font-family:monospace;font-size:11px;margin:0'>"
                    + escapeHtml(entry.getShortSql()) + "</pre></html>");
                sqlLabel.setForeground(isSelected ? list.getSelectionForeground() : list.getForeground());

                String meta = String.format("%dms - %d rows", entry.getDurationMs(), entry.getRowCount());
                if (!entry.isSuccess()) meta = "ERROR - " + meta;
                JLabel metaLabel = new JLabel(meta);
                metaLabel.setFont(metaLabel.getFont().deriveFont(10f));
                metaLabel.setForeground(isSelected ? list.getSelectionForeground()
                    : UIManager.getColor("Label.disabledForeground"));

                panel.add(sqlLabel, BorderLayout.CENTER);
                panel.add(metaLabel, BorderLayout.SOUTH);
                return panel;
            }
            return super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus);
        }

        private static String escapeHtml(String text) {
            if (text == null) return "";
            return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("\n", "<br>");
        }
    }
}
