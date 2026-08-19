package com.rowport.ui;

import com.rowport.db.DriverFactory;
import com.rowport.db.SqlDriver;
import com.rowport.i18n.Messages;
import com.rowport.model.ConnectionConfig;
import com.rowport.service.DatabaseService;
import com.rowport.service.MetadataService;
import com.rowport.service.PasswordService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.util.List;
import java.util.function.Consumer;

public class ConnectionDialog extends JDialog {

    private final JTextField txtName = new JTextField(20);
    private final JComboBox<String> cmbType = new JComboBox<>(new String[]{"PostgreSQL", "MySQL", "SQLite", "MongoDB"});
    private final JTextField txtHost = new JTextField(20);
    private final JTextField txtPort = new JTextField(6);
    private final JTextField txtDatabase = new JTextField(20);
    private final JTextField txtUser = new JTextField(20);
    private final JPasswordField txtPassword = new JPasswordField(20);
    private final JComboBox<String> cmbSslMode = new JComboBox<>(new String[]{"disable", "prefer", "require", "verify-ca", "verify-full"});
    private final JButton btnTest = new JButton();
    private final JButton btnListDatabases = new JButton();
    private final JLabel lblStatus = new JLabel(" ");

    private final DatabaseService databaseService;
    private final MetadataService metadataService;
    private final PasswordService passwordService;
    private final Consumer<ConnectionConfig> onSave;
    private ConnectionConfig editingConfig;

    public ConnectionDialog(Window owner, DatabaseService databaseService, MetadataService metadataService,
                            PasswordService passwordService, Consumer<ConnectionConfig> onSave) {
        super(owner, Messages.get("connection.new"), ModalityType.APPLICATION_MODAL);
        this.databaseService = databaseService;
        this.metadataService = metadataService;
        this.passwordService = passwordService;
        this.onSave = onSave;

        initUI();
        setupListeners();
    }

    private void initUI() {
        JPanel content = new JPanel(new BorderLayout(0, 8));
        content.setBorder(new EmptyBorder(16, 16, 16, 16));

        JPanel form = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(4, 4, 4, 4);
        gbc.anchor = GridBagConstraints.WEST;

        int row = 0;
        addFormRow(form, gbc, row++, Messages.get("connection.name"), txtName);
        addFormRow(form, gbc, row++, Messages.get("connection.type"), cmbType);
        addFormRow(form, gbc, row++, Messages.get("connection.host"), txtHost);
        addFormRow(form, gbc, row++, Messages.get("connection.port"), txtPort);
        addFormRow(form, gbc, row++, Messages.get("connection.database"), txtDatabase);
        addFormRow(form, gbc, row++, Messages.get("connection.username"), txtUser);
        addFormRow(form, gbc, row++, Messages.get("connection.password"), txtPassword);
        addFormRow(form, gbc, row++, Messages.get("connection.sslMode"), cmbSslMode);

        content.add(form, BorderLayout.CENTER);

        cmbSslMode.setSelectedItem("prefer");
        cmbType.setSelectedItem("PostgreSQL");
        onTypeChanged();

        // Buttons
        btnTest.setText(Messages.get("connection.test"));
        btnListDatabases.setText(Messages.get("connection.listDatabases"));
        JButton btnSave = new JButton(Messages.get("common.save"));
        JButton btnCancel = new JButton(Messages.get("common.cancel"));
        btnSave.addActionListener(e -> save());
        btnCancel.addActionListener(e -> dispose());

        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        buttons.add(btnTest);
        buttons.add(btnListDatabases);
        buttons.add(Box.createHorizontalStrut(16));
        buttons.add(btnSave);
        buttons.add(btnCancel);
        content.add(buttons, BorderLayout.SOUTH);

        lblStatus.setBorder(new EmptyBorder(4, 0, 0, 0));
        content.add(lblStatus, BorderLayout.NORTH);

        setContentPane(content);
        setSize(440, 520);
        setLocationRelativeTo(getOwner());
    }

    private void addFormRow(JPanel panel, GridBagConstraints gbc, int row, String label, JComponent field) {
        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.weightx = 0;
        panel.add(new JLabel(label + ":"), gbc);

        gbc.gridx = 1;
        gbc.weightx = 1.0;
        gbc.fill = GridBagConstraints.HORIZONTAL;
        panel.add(field, gbc);
        gbc.fill = GridBagConstraints.NONE;
    }

    private void setupListeners() {
        cmbType.addActionListener(e -> onTypeChanged());
        btnTest.addActionListener(e -> testConnection());
        btnListDatabases.addActionListener(e -> listDatabases());
    }

    private void onTypeChanged() {
        String type = (String) cmbType.getSelectedItem();
        boolean isSql = type != null && !type.equals("SQLite") && !type.equals("MongoDB");
        boolean isSqlite = "SQLite".equals(type);

        txtHost.setEnabled(!isSqlite);
        txtPort.setEnabled(!isSqlite);
        txtUser.setEnabled(!isSqlite);
        txtPassword.setEnabled(!isSqlite);
        cmbSslMode.setEnabled(!isSqlite);
        btnListDatabases.setVisible(!isSqlite);

        if (type != null) {
            SqlDriver driver = DriverFactory.getDriver(type);
            List<Integer> ports = driver.getDefaultPorts();
            if (!ports.isEmpty()) {
                txtPort.setText(String.valueOf(ports.get(0)));
            }
        }
    }

    public void setEditingConfig(ConnectionConfig config) {
        this.editingConfig = config;
        if (config.getId() != null) {
            txtName.setText(config.getName());
            cmbType.setSelectedItem(config.getType());
            txtHost.setText(config.getHost());
            txtPort.setText(config.getPort() > 0 ? String.valueOf(config.getPort()) : "");
            txtDatabase.setText(config.getDatabase());
            txtUser.setText(config.getUser());
            cmbSslMode.setSelectedItem(config.getSslMode() != null ? config.getSslMode() : "prefer");
            onTypeChanged();
        }
    }

    private void testConnection() {
        ConnectionConfig config = buildConfig();
        lblStatus.setText("Testing...");
        lblStatus.setForeground(UIManager.getColor("Label.disabledForeground"));

        Thread.ofVirtual().start(() -> {
            boolean success = databaseService.testConnection(config);
            SwingUtilities.invokeLater(() -> {
                if (success) {
                    lblStatus.setText(Messages.get("connection.testSuccess"));
                    lblStatus.setForeground(new Color(35, 134, 54));
                } else {
                    lblStatus.setText(Messages.get("connection.testFailed", "Connection refused"));
                    lblStatus.setForeground(new Color(218, 54, 51));
                }
            });
        });
    }

    private void listDatabases() {
        ConnectionConfig config = buildConfig();
        lblStatus.setText("Loading databases...");
        Thread.ofVirtual().start(() -> {
            try {
                List<String> databases = databaseService.listDatabases(config);
                SwingUtilities.invokeLater(() -> {
                    txtDatabase.setText("");
                    if (!databases.isEmpty()) {
                        txtDatabase.setText(databases.get(0));
                    }
                    lblStatus.setText(databases.size() + " databases found");
                    lblStatus.setForeground(UIManager.getColor("Label.disabledForeground"));
                });
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> {
                    lblStatus.setText("Failed: " + e.getMessage());
                    lblStatus.setForeground(new Color(218, 54, 51));
                });
            }
        });
    }

    private void save() {
        ConnectionConfig config = buildConfig();
        if (config.getName() == null || config.getName().isBlank()) {
            lblStatus.setText("Name is required");
            lblStatus.setForeground(new Color(218, 54, 51));
            return;
        }

        if (editingConfig != null && editingConfig.getId() != null) {
            config.setId(editingConfig.getId());
        }

        metadataService.saveConnection(config);
        String password = new String(txtPassword.getPassword());
        if (password != null && !password.isBlank()) {
            passwordService.savePassword(config.getId(), password);
        }

        if (onSave != null) onSave.accept(config);
        dispose();
    }

    private ConnectionConfig buildConfig() {
        ConnectionConfig config = new ConnectionConfig();
        if (editingConfig != null) config.setId(editingConfig.getId());
        config.setName(txtName.getText());
        config.setType((String) cmbType.getSelectedItem());
        config.setHost(txtHost.getText());
        try {
            config.setPort(Integer.parseInt(txtPort.getText()));
        } catch (NumberFormatException e) {
            config.setPort(0);
        }
        config.setDatabase(txtDatabase.getText());
        config.setUser(txtUser.getText());
        config.setSslMode((String) cmbSslMode.getSelectedItem());
        return config;
    }
}
