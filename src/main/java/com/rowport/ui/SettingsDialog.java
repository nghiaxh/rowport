package com.rowport.ui;

import com.rowport.i18n.Messages;
import com.rowport.model.AppSettings;
import com.rowport.service.SettingsService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.util.function.Consumer;

public class SettingsDialog extends JDialog {

    private final JComboBox<String> cmbTheme = new JComboBox<>(new String[]{"Dark", "Light"});
    private final JTextField txtFontFamily = new JTextField(15);
    private final JSlider sldFontSize = new JSlider(10, 24, 14);
    private final JSlider sldLineHeight = new JSlider(16, 40, 20);
    private final JComboBox<String> cmbRowDensity = new JComboBox<>(new String[]{"Compact", "Normal", "Comfortable"});
    private final JComboBox<String> cmbLanguage = new JComboBox<>(new String[]{"English", "Ti\u1EBFng Vi\u1EC7t"});
    private final JTextField txtQueryTimeout = new JTextField(6);
    private final JTextField txtMaxHistory = new JTextField(6);

    private final SettingsService settingsService;
    private final Consumer<AppSettings> onSettingsChanged;

    public SettingsDialog(Window owner, SettingsService settingsService, Consumer<AppSettings> onSettingsChanged) {
        super(owner, Messages.get("settings.title"), ModalityType.APPLICATION_MODAL);
        this.settingsService = settingsService;
        this.onSettingsChanged = onSettingsChanged;

        initUI();
    }

    private void initUI() {
        JPanel content = new JPanel(new BorderLayout(0, 8));
        content.setBorder(new EmptyBorder(16, 16, 16, 16));

        JTabbedPane tabs = new JTabbedPane();

        // Appearance tab
        JPanel appearance = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(4, 4, 4, 4);
        gbc.anchor = GridBagConstraints.WEST;
        gbc.fill = GridBagConstraints.HORIZONTAL;

        int row = 0;
        addFormRow(appearance, gbc, row++, Messages.get("settings.theme"), cmbTheme);
        addFormRow(appearance, gbc, row++, Messages.get("settings.fontFamily"), txtFontFamily);

        JPanel fontSizePanel = new JPanel(new BorderLayout(8, 0));
        sldFontSize.setMajorTickSpacing(2);
        sldFontSize.setPaintTicks(true);
        sldFontSize.setPaintLabels(true);
        fontSizePanel.add(sldFontSize, BorderLayout.CENTER);
        JLabel fontSizeVal = new JLabel("14");
        sldFontSize.addChangeListener(e -> fontSizeVal.setText(String.valueOf(sldFontSize.getValue())));
        fontSizePanel.add(fontSizeVal, BorderLayout.EAST);
        addFormRow(appearance, gbc, row++, Messages.get("settings.fontSize"), fontSizePanel);

        JPanel lineHeightPanel = new JPanel(new BorderLayout(8, 0));
        sldLineHeight.setMajorTickSpacing(4);
        sldLineHeight.setPaintTicks(true);
        sldLineHeight.setPaintLabels(true);
        lineHeightPanel.add(sldLineHeight, BorderLayout.CENTER);
        JLabel lineHeightVal = new JLabel("20");
        sldLineHeight.addChangeListener(e -> lineHeightVal.setText(String.valueOf(sldLineHeight.getValue())));
        lineHeightPanel.add(lineHeightVal, BorderLayout.EAST);
        addFormRow(appearance, gbc, row++, Messages.get("settings.lineHeight"), lineHeightPanel);

        addFormRow(appearance, gbc, row++, Messages.get("settings.rowDensity"), cmbRowDensity);
        addFormRow(appearance, gbc, row++, Messages.get("settings.language"), cmbLanguage);

        tabs.addTab("Appearance", appearance);

        // Advanced tab
        JPanel advanced = new JPanel(new GridBagLayout());
        GridBagConstraints gbc2 = new GridBagConstraints();
        gbc2.insets = new Insets(4, 4, 4, 4);
        gbc2.anchor = GridBagConstraints.WEST;
        gbc2.fill = GridBagConstraints.HORIZONTAL;
        int row2 = 0;
        addFormRow(advanced, gbc2, row2++, Messages.get("settings.queryTimeout"), txtQueryTimeout);
        addFormRow(advanced, gbc2, row2++, Messages.get("settings.maxHistory"), txtMaxHistory);
        tabs.addTab("Advanced", advanced);

        content.add(tabs, BorderLayout.CENTER);

        // Load current settings
        AppSettings settings = settingsService.getSettings();
        cmbTheme.setSelectedItem("dark".equals(settings.getTheme()) ? "Dark" : "Light");
        txtFontFamily.setText(settings.getFontFamily());
        sldFontSize.setValue(settings.getFontSize());
        sldLineHeight.setValue(settings.getLineHeight());
        cmbRowDensity.setSelectedItem(settings.getRowDensity().substring(0, 1).toUpperCase() + settings.getRowDensity().substring(1));
        cmbLanguage.setSelectedItem("en".equals(settings.getLanguage()) ? "English" : "Ti\u1EBFng Vi\u1EC7t");
        txtQueryTimeout.setText(String.valueOf(settings.getQueryTimeoutSeconds()));
        txtMaxHistory.setText(String.valueOf(settings.getMaxHistoryEntries()));

        // Buttons
        JButton btnSave = new JButton(Messages.get("common.save"));
        JButton btnCancel = new JButton(Messages.get("common.cancel"));
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        buttons.add(btnSave);
        buttons.add(btnCancel);
        content.add(buttons, BorderLayout.SOUTH);

        btnSave.addActionListener(e -> save());
        btnCancel.addActionListener(e -> dispose());

        setContentPane(content);
        setSize(420, 480);
        setLocationRelativeTo(getOwner());
    }

    private void addFormRow(JPanel panel, GridBagConstraints gbc, int row, String label, JComponent field) {
        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.weightx = 0;
        panel.add(new JLabel(label + ":"), gbc);

        gbc.gridx = 1;
        gbc.weightx = 1.0;
        panel.add(field, gbc);
    }

    private void save() {
        AppSettings settings = settingsService.getSettings();
        settings.setTheme("Dark".equals(cmbTheme.getSelectedItem()) ? "dark" : "light");
        settings.setFontFamily(txtFontFamily.getText());
        settings.setFontSize(sldFontSize.getValue());
        settings.setLineHeight(sldLineHeight.getValue());
        settings.setRowDensity(((String) cmbRowDensity.getSelectedItem()).toLowerCase());
        settings.setLanguage("English".equals(cmbLanguage.getSelectedItem()) ? "en" : "vi");
        try {
            settings.setQueryTimeoutSeconds(Integer.parseInt(txtQueryTimeout.getText()));
        } catch (NumberFormatException e) {
            settings.setQueryTimeoutSeconds(30);
        }
        try {
            settings.setMaxHistoryEntries(Integer.parseInt(txtMaxHistory.getText()));
        } catch (NumberFormatException e) {
            settings.setMaxHistoryEntries(500);
        }

        settingsService.updateSettings(settings);
        if (onSettingsChanged != null) onSettingsChanged.accept(settings);
        dispose();
    }
}
