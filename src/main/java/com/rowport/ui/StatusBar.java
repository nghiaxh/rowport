package com.rowport.ui;

import com.rowport.i18n.Messages;
import com.rowport.model.ConnectionStatus;
import com.rowport.service.DatabaseService;
import com.rowport.service.SettingsService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.MatteBorder;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.function.Consumer;
import java.util.function.Supplier;

public class StatusBar {

    private final JPanel panel;
    private final JLabel statusConnection;
    private final JLabel statusRows;
    private final JLabel statusTheme;

    public StatusBar(DatabaseService databaseService, SettingsService settingsService,
                     Runnable onThemeToggle, Runnable onSettingsClick) {
        panel = new JPanel(new BorderLayout());
        panel.setBorder(new MatteBorder(1, 0, 0, 0, UIManager.getColor("Separator.foreground")));
        panel.setPreferredSize(new Dimension(0, 24));

        statusConnection = new JLabel("No connection");
        statusConnection.setBorder(new EmptyBorder(0, 8, 0, 0));
        statusConnection.setFont(statusConnection.getFont().deriveFont(11f));
        statusConnection.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        statusConnection.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (onSettingsClick != null) onSettingsClick.run();
            }
        });

        statusRows = new JLabel(" ");
        statusRows.setFont(statusRows.getFont().deriveFont(11f));

        statusTheme = new JLabel();
        statusTheme.setBorder(new EmptyBorder(0, 0, 0, 8));
        statusTheme.setFont(statusTheme.getFont().deriveFont(11f));
        statusTheme.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        statusTheme.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (onThemeToggle != null) onThemeToggle.run();
            }
        });

        // Initialize theme label
        String theme = settingsService.getSettings().getTheme();
        updateTheme(theme);

        panel.add(statusConnection, BorderLayout.WEST);
        panel.add(statusRows, BorderLayout.CENTER);
        panel.add(statusTheme, BorderLayout.EAST);
    }

    public void updateConnection(String name, ConnectionStatus status) {
        String text = switch (status) {
            case CONNECTED -> "Connected: " + name;
            case CONNECTING -> "Connecting: " + name + "...";
            case ERROR -> "Error: " + name;
            default -> "No connection";
        };
        SwingUtilities.invokeLater(() -> statusConnection.setText(text));
    }

    public void updateRowCount(int count) {
        SwingUtilities.invokeLater(() -> statusRows.setText(count > 0 ? count + " rows" : " "));
    }

    public void updateDuration(long ms) {
        SwingUtilities.invokeLater(() -> {
            String current = statusRows.getText();
            statusRows.setText(current + (ms > 0 ? " (" + ms + "ms)" : ""));
        });
    }

    public void updateTheme(String theme) {
        SwingUtilities.invokeLater(() ->
            statusTheme.setText("dark".equals(theme) ? "Dark" : "Light"));
    }

    public void clear() {
        SwingUtilities.invokeLater(() -> {
            statusConnection.setText("No connection");
            statusRows.setText(" ");
        });
    }

    public JPanel getPanel() {
        return panel;
    }
}
