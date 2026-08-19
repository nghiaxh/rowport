package com.rowport.ui;

import com.rowport.i18n.Messages;
import com.rowport.model.AppSettings;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.ConnectionStatus;
import com.rowport.model.HistoryEntry;
import com.rowport.model.QueryResult;
import com.rowport.RowportApp;
import com.rowport.service.DatabaseService;
import com.rowport.service.DetectionService;
import com.rowport.service.MetadataService;
import com.rowport.service.PasswordService;
import com.rowport.service.QueryExecutor;
import com.rowport.service.SchemaService;
import com.rowport.service.SettingsService;

import javax.swing.*;
import javax.swing.border.MatteBorder;
import javax.swing.tree.DefaultMutableTreeNode;
import javax.swing.tree.DefaultTreeModel;
import java.awt.*;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

public class MainPanel extends JPanel {

    private final DatabaseService databaseService;
    private final MetadataService metadataService;
    private final PasswordService passwordService;
    private final SettingsService settingsService;
    private final SchemaService schemaService;
    private final QueryExecutor queryExecutor;
    private final DetectionService detectionService;

    private DefaultTreeModel connectionTreeModel;
    private DefaultMutableTreeNode connectionRoot;
    private JTree connectionTree;

    private EditorPanel editorPanel;
    private GridPanel gridPanel;
    private SchemaPanel schemaPanel;
    private HistoryPanel historyPanel;
    private StatusBar statusBar;

    private ConnectionConfig currentConnection;
    private final Map<DefaultMutableTreeNode, ConnectionConfig> connectionItems = new HashMap<>();

    private JPanel rightPanel;
    private CardLayout rightCardLayout;
    private static final String SCHEMA_CARD = "schema";
    private static final String HISTORY_CARD = "history";

    private JPanel topActionBar;
    private JPanel formatBar;

    public MainPanel(DatabaseService databaseService, MetadataService metadataService,
                     PasswordService passwordService, SettingsService settingsService,
                     SchemaService schemaService, QueryExecutor queryExecutor,
                     DetectionService detectionService) {
        this.databaseService = databaseService;
        this.metadataService = metadataService;
        this.passwordService = passwordService;
        this.settingsService = settingsService;
        this.schemaService = schemaService;
        this.queryExecutor = queryExecutor;
        this.detectionService = detectionService;

        setLayout(new BorderLayout());
        buildUI();
        loadConnections();
    }

    private void buildUI() {
        JButton btnRun = new JButton(Messages.get("editor.run"));
        btnRun.setEnabled(false);
        JButton btnCancel = new JButton(Messages.get("editor.cancel"));
        btnCancel.setEnabled(false);
        JButton btnFormat = new JButton(Messages.get("editor.format"));
        JButton btnExport = new JButton(Messages.get("editor.export"));

        topActionBar = createTopActionBar(btnRun, btnCancel);
        add(topActionBar, BorderLayout.NORTH);
        add(createSidebar(), BorderLayout.WEST);
        add(createCenterPanel(btnRun, btnCancel, btnFormat, btnExport), BorderLayout.CENTER);
        add(createRightPanel(), BorderLayout.EAST);
        add(createStatusBar(), BorderLayout.SOUTH);
    }

    private JPanel createTopActionBar(JButton btnRun, JButton btnCancel) {
        JPanel bar = new JPanel(new FlowLayout(FlowLayout.CENTER, 4, 4));
        bar.setBorder(new MatteBorder(0, 0, 1, 0, UIManager.getColor("Separator.foreground")));
        bar.add(btnRun);
        bar.add(btnCancel);
        bar.setVisible(false);
        return bar;
    }

    public JMenuBar buildMenuBar() {
        JMenuBar menuBar = new JMenuBar();
        menuBar.setBorder(null);

        JMenu fileMenu = new JMenu(Messages.get("menu.file"));
        fileMenu.add(createMenuItem(Messages.get("menu.newConnection"), e -> showConnectionDialog(new ConnectionConfig())));
        fileMenu.add(createMenuItem(Messages.get("menu.newFolder"), e -> showNewFolderDialog()));
        fileMenu.addSeparator();
        fileMenu.add(createMenuItem(Messages.get("menu.exit"), e -> {
            Window w = SwingUtilities.getWindowAncestor(this);
            if (w != null) w.dispose();
        }));
        menuBar.add(fileMenu);

        JMenu editMenu = new JMenu(Messages.get("menu.edit"));
        editMenu.add(createMenuItem(Messages.get("menu.cut"), e -> forwardClipboardAction("cut")));
        editMenu.add(createMenuItem(Messages.get("menu.copy"), e -> forwardClipboardAction("copy")));
        editMenu.add(createMenuItem(Messages.get("menu.paste"), e -> forwardClipboardAction("paste")));
        editMenu.add(createMenuItem(Messages.get("menu.selectAll"), e -> forwardClipboardAction("selectAll")));
        menuBar.add(editMenu);

        JMenu viewMenu = new JMenu(Messages.get("menu.view"));
        viewMenu.add(createMenuItem(Messages.get("menu.schemaPanel"), e -> showRightPanel(SCHEMA_CARD)));
        viewMenu.add(createMenuItem(Messages.get("menu.historyPanel"), e -> showRightPanel(HISTORY_CARD)));
        viewMenu.addSeparator();
        viewMenu.add(createMenuItem(Messages.get("menu.settings"), e -> showSettingsDialog()));
        menuBar.add(viewMenu);

        JMenu windowMenu = new JMenu(Messages.get("menu.window"));
        windowMenu.add(createMenuItem(Messages.get("menu.minimize"), e -> {
            Window w = SwingUtilities.getWindowAncestor(this);
            if (w instanceof JFrame f) f.setState(Frame.ICONIFIED);
        }));
        windowMenu.add(createMenuItem(Messages.get("menu.maximize"), e -> {
            Window w = SwingUtilities.getWindowAncestor(this);
            if (w instanceof JFrame f) {
                f.setExtendedState(f.getExtendedState() == Frame.MAXIMIZED_BOTH
                    ? Frame.NORMAL : Frame.MAXIMIZED_BOTH);
            }
        }));
        menuBar.add(windowMenu);

        JMenu helpMenu = new JMenu(Messages.get("menu.help"));
        helpMenu.add(createMenuItem(Messages.get("menu.about"), e -> showAboutDialog()));
        menuBar.add(helpMenu);

        return menuBar;
    }

    private JMenuItem createMenuItem(String text, java.awt.event.ActionListener action) {
        JMenuItem item = new JMenuItem(text);
        item.addActionListener(action);
        return item;
    }

    private void forwardClipboardAction(String action) {
        KeyboardFocusManager fm = KeyboardFocusManager.getCurrentKeyboardFocusManager();
        Component focused = fm.getFocusOwner();
        if (focused == null) return;

        int keyEvent;
        int keyCode;
        switch (action) {
            case "cut" -> { keyEvent = KeyEvent.KEY_PRESSED; keyCode = KeyEvent.VK_X; }
            case "copy" -> { keyEvent = KeyEvent.KEY_PRESSED; keyCode = KeyEvent.VK_C; }
            case "paste" -> { keyEvent = KeyEvent.KEY_PRESSED; keyCode = KeyEvent.VK_V; }
            case "selectAll" -> { keyEvent = KeyEvent.KEY_PRESSED; keyCode = KeyEvent.VK_A; }
            default -> { keyEvent = KeyEvent.KEY_PRESSED; keyCode = 0; }
        }
        KeyEvent e = new KeyEvent(focused, keyEvent, System.currentTimeMillis(),
            InputEvent.CTRL_DOWN_MASK, keyCode, KeyEvent.CHAR_UNDEFINED);
        focused.dispatchEvent(e);
    }

    private JPanel createSidebar() {
        JPanel sidebar = new JPanel(new BorderLayout());
        sidebar.setPreferredSize(new Dimension(220, 0));
        sidebar.setBorder(new MatteBorder(0, 0, 0, 1, UIManager.getColor("Separator.foreground")));

        connectionRoot = new DefaultMutableTreeNode("Connections");
        connectionTreeModel = new DefaultTreeModel(connectionRoot);
        connectionTree = new JTree(connectionTreeModel);
        connectionTree.setRootVisible(false);
        connectionTree.setShowsRootHandles(true);

        connectionTree.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (e.getClickCount() == 2) {
                    DefaultMutableTreeNode node = (DefaultMutableTreeNode) connectionTree
                        .getLastSelectedPathComponent();
                    if (node != null && connectionItems.containsKey(node)) {
                        connectTo(connectionItems.get(node));
                    }
                }
            }

            @Override
            public void mousePressed(MouseEvent e) {
                showContextMenu(e);
            }

            @Override
            public void mouseReleased(MouseEvent e) {
                showContextMenu(e);
            }

            private void showContextMenu(MouseEvent e) {
                if (e.isPopupTrigger()) {
                    JPopupMenu popup = new JPopupMenu();
                    JMenuItem newConn = new JMenuItem(Messages.get("sidebar.newConnection"));
                    newConn.addActionListener(ev -> showConnectionDialog(new ConnectionConfig()));
                    JMenuItem newFolder = new JMenuItem(Messages.get("sidebar.newFolder"));
                    newFolder.addActionListener(ev -> showNewFolderDialog());
                    popup.add(newConn);
                    popup.add(newFolder);
                    popup.show(connectionTree, e.getX(), e.getY());
                }
            }
        });

        sidebar.add(new JScrollPane(connectionTree), BorderLayout.CENTER);
        return sidebar;
    }

    private JPanel createCenterPanel(JButton btnRun, JButton btnCancel, JButton btnFormat, JButton btnExport) {
        JPanel center = new JPanel(new BorderLayout());

        formatBar = new JPanel(new FlowLayout(FlowLayout.CENTER, 4, 4));
        formatBar.setBorder(new MatteBorder(0, 0, 1, 0, UIManager.getColor("Separator.foreground")));
        formatBar.add(btnFormat);
        formatBar.add(btnExport);
        formatBar.setVisible(false);
        center.add(formatBar, BorderLayout.NORTH);

        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.addChangeListener(e -> {
            boolean hasTabs = tabbedPane.getTabCount() > 0;
            topActionBar.setVisible(hasTabs);
            formatBar.setVisible(hasTabs);
        });

        editorPanel = new EditorPanel(tabbedPane, btnRun, btnCancel, btnFormat, btnExport, queryExecutor,
            result -> {
                if (gridPanel != null) gridPanel.displayResult(result);
                if (result != null && statusBar != null) statusBar.updateRowCount(result.getRowCount());
            });
        center.add(tabbedPane, BorderLayout.CENTER);

        gridPanel = new GridPanel();
        center.add(gridPanel, BorderLayout.SOUTH);
        gridPanel.setPreferredSize(new Dimension(0, 250));

        return center;
    }

    private JPanel createRightPanel() {
        rightCardLayout = new CardLayout();
        rightPanel = new JPanel(rightCardLayout);
        rightPanel.setPreferredSize(new Dimension(250, 0));
        rightPanel.setBorder(new MatteBorder(0, 1, 0, 0, UIManager.getColor("Separator.foreground")));

        schemaPanel = new SchemaPanel();
        schemaPanel.init(schemaService, databaseService, text -> {
            if (editorPanel != null) {
                editorPanel.setText(editorPanel.getText() + " " + text);
            }
        });

        historyPanel = new HistoryPanel();
        historyPanel.init(metadataService, sql -> {
            if (editorPanel != null) {
                editorPanel.setText(sql);
            }
        });

        rightPanel.add(new JScrollPane(schemaPanel.getTree()), SCHEMA_CARD);
        rightPanel.add(new JScrollPane(historyPanel.getList()), HISTORY_CARD);

        return rightPanel;
    }

    private void showRightPanel(String cardName) {
        rightCardLayout.show(rightPanel, cardName);
        rightPanel.setVisible(true);
        rightPanel.revalidate();
        rightPanel.repaint();
    }

    private JPanel createStatusBar() {
        statusBar = new StatusBar(databaseService, settingsService,
            () -> toggleTheme(), () -> showSettingsDialog());
        return statusBar.getPanel();
    }

    public void loadConnections() {
        schemaPanel.init(schemaService, databaseService, text -> {
            if (editorPanel != null) {
                editorPanel.setText(editorPanel.getText() + " " + text);
            }
        });
        historyPanel.init(metadataService, sql -> {
            if (editorPanel != null) {
                editorPanel.setText(sql);
            }
        });

        List<ConnectionConfig> configs = metadataService.getAllConnections();
        connectionRoot.removeAllChildren();
        connectionItems.clear();

        for (ConnectionConfig config : configs) {
            DefaultMutableTreeNode node = new DefaultMutableTreeNode(config.getName());
            connectionItems.put(node, config);
            connectionRoot.add(node);
        }
        connectionTreeModel.reload();

        historyPanel.loadHistory();
    }

    private void connectTo(ConnectionConfig config) {
        statusBar.updateConnection(config.getName(), ConnectionStatus.CONNECTING);
        Thread.ofVirtual().start(() -> {
            try {
                databaseService.connect(config);
                currentConnection = config;
                SwingUtilities.invokeLater(() -> {
                    statusBar.updateConnection(config.getName(), ConnectionStatus.CONNECTED);
                    editorPanel.createEditorTab(config);
                    loadSchema(config);
                });
            } catch (Exception e) {
                SwingUtilities.invokeLater(() ->
                    statusBar.updateConnection(config.getName(), ConnectionStatus.ERROR));
            }
        });
    }

    private void loadSchema(ConnectionConfig config) {
        var instance = databaseService.getConnection(config.getId());
        if (instance != null && instance.getStatus() == ConnectionStatus.CONNECTED) {
            schemaPanel.loadSchema(instance.getConnection(), config, config.getDatabase());
        }
    }

    public void showConnectionDialog(ConnectionConfig config) {
        ConnectionDialog dialog = new ConnectionDialog(
            SwingUtilities.getWindowAncestor(this),
            databaseService, metadataService, passwordService,
            saved -> loadConnections());
        dialog.setEditingConfig(config);
        dialog.setVisible(true);
    }

    private void showNewFolderDialog() {
        String name = JOptionPane.showInputDialog(this,
            Messages.get("connection.folderNamePrompt"),
            Messages.get("sidebar.newFolder"),
            JOptionPane.PLAIN_MESSAGE);
        if (name != null && !name.isBlank()) {
            DefaultMutableTreeNode folderNode = new DefaultMutableTreeNode(name);
            connectionRoot.add(folderNode);
            connectionTreeModel.reload();
            connectionTree.expandRow(0);
        }
    }

    public void showSettingsDialog() {
        SettingsDialog dialog = new SettingsDialog(
            SwingUtilities.getWindowAncestor(this),
            settingsService, settings -> {
                applyTheme(settings.getTheme());
                statusBar.updateTheme(settings.getTheme());
            });
        dialog.setVisible(true);
    }

    private void toggleTheme() {
        AppSettings settings = settingsService.getSettings();
        String newTheme = "dark".equals(settings.getTheme()) ? "light" : "dark";
        settings.setTheme(newTheme);
        settingsService.updateSettings(settings);
        applyTheme(newTheme);
        statusBar.updateTheme(newTheme);
    }

    private void applyTheme(String theme) {
        RowportApp.applyTheme(theme);
    }

    private void showAboutDialog() {
        JOptionPane.showMessageDialog(this,
            "Rowport 1.0.0\nModern desktop database client for multi-database workflows.",
            Messages.get("menu.about"),
            JOptionPane.INFORMATION_MESSAGE);
    }
}
