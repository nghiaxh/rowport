package com.rowport;

import com.formdev.flatlaf.FlatDarkLaf;
import com.formdev.flatlaf.FlatLightLaf;
import com.rowport.i18n.Messages;
import com.rowport.model.AppSettings;
import com.rowport.service.DatabaseService;
import com.rowport.service.DetectionService;
import com.rowport.service.MetadataService;
import com.rowport.service.PasswordService;
import com.rowport.service.QueryExecutor;
import com.rowport.service.SchemaService;
import com.rowport.service.SettingsService;
import com.rowport.ui.MainPanel;

import javax.swing.*;
import java.awt.*;

public class RowportApp {

    private JFrame frame;
    private MainPanel mainPanel;

    private PasswordService passwordService;
    private SettingsService settingsService;
    private MetadataService metadataService;
    private DatabaseService databaseService;
    private SchemaService schemaService;
    private DetectionService detectionService;
    private QueryExecutor queryExecutor;

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new RowportApp().init());
    }

    private void init() {
        initServices();

        AppSettings settings = settingsService.getSettings();
        applyTheme(settings.getTheme());

        frame = new JFrame("Rowport");
        frame.setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        frame.setSize(1280, 800);
        frame.setMinimumSize(new Dimension(900, 600));
        frame.setLocationRelativeTo(null);

        mainPanel = new MainPanel(databaseService, metadataService, passwordService,
            settingsService, schemaService, queryExecutor, detectionService);
        frame.setContentPane(mainPanel);
        frame.setJMenuBar(mainPanel.buildMenuBar());

        frame.addWindowListener(new java.awt.event.WindowAdapter() {
            @Override
            public void windowClosing(java.awt.event.WindowEvent e) {
                shutdown();
            }
        });

        frame.setVisible(true);
    }

    private void initServices() {
        passwordService = new PasswordService();
        settingsService = new SettingsService();
        metadataService = new MetadataService();
        databaseService = new DatabaseService(passwordService);
        schemaService = new SchemaService();
        detectionService = new DetectionService();
        queryExecutor = new QueryExecutor(databaseService, metadataService);

        AppSettings settings = settingsService.getSettings();
        Messages.setLanguage(settings.getLanguage());
    }

    private void shutdown() {
        if (databaseService != null) {
            databaseService.disconnectAll();
        }
        if (detectionService != null) {
            detectionService.shutdown();
        }
    }

    public static void applyTheme(String theme) {
        try {
            if ("light".equals(theme)) {
                FlatLightLaf.setup();
            } else {
                FlatDarkLaf.setup();
            }
            for (Window window : Window.getWindows()) {
                SwingUtilities.updateComponentTreeUI(window);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public JFrame getFrame() {
        return frame;
    }
}
