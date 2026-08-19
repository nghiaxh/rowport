package com.rowport.ui;

import com.rowport.model.ColumnInfo;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.TableInfo;
import com.rowport.service.DatabaseService;
import com.rowport.service.SchemaService;

import javax.swing.*;
import javax.swing.tree.DefaultMutableTreeNode;
import javax.swing.tree.DefaultTreeModel;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.function.Consumer;

public class SchemaPanel {

    private final JTree tree;
    private final DefaultMutableTreeNode rootNode;
    private final DefaultTreeModel treeModel;
    private SchemaService schemaService;
    private DatabaseService databaseService;
    private Consumer<String> onInsertText;

    public SchemaPanel() {
        rootNode = new DefaultMutableTreeNode("Schema");
        treeModel = new DefaultTreeModel(rootNode);
        tree = new JTree(treeModel);
        tree.setRootVisible(false);
        tree.setShowsRootHandles(true);
    }

    public void init(SchemaService schemaService, DatabaseService databaseService, Consumer<String> onInsertText) {
        this.schemaService = schemaService;
        this.databaseService = databaseService;
        this.onInsertText = onInsertText;

        tree.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent e) {
                if (e.getClickCount() == 2) {
                    DefaultMutableTreeNode selected = (DefaultMutableTreeNode) tree
                        .getLastSelectedPathComponent();
                    if (selected != null && selected != rootNode && onInsertText != null) {
                        Object userObj = selected.getUserObject();
                        if (userObj instanceof String value && !value.contains("(")) {
                            onInsertText.accept(value);
                        }
                    }
                }
            }
        });
    }

    public void loadSchema(Connection conn, ConnectionConfig config, String database) {
        rootNode.removeAllChildren();
        try {
            List<TableInfo> tables = schemaService.getSchema(conn, config, database, databaseService);
            DefaultMutableTreeNode tablesNode = new DefaultMutableTreeNode("Tables");
            DefaultMutableTreeNode viewsNode = new DefaultMutableTreeNode("Views");

            for (TableInfo table : tables) {
                DefaultMutableTreeNode tableItem = new DefaultMutableTreeNode(table.getName());
                for (ColumnInfo col : table.getColumns()) {
                    String label = col.getName() + " (" + col.getType() + ")"
                        + (col.isPrimaryKey() ? " PK" : "");
                    tableItem.add(new DefaultMutableTreeNode(label));
                }

                if ("VIEW".equalsIgnoreCase(table.getType())) {
                    viewsNode.add(tableItem);
                } else {
                    tablesNode.add(tableItem);
                }
            }

            if (tablesNode.getChildCount() > 0) {
                rootNode.add(tablesNode);
            }
            if (viewsNode.getChildCount() > 0) {
                rootNode.add(viewsNode);
            }
        } catch (SQLException e) {
            rootNode.add(new DefaultMutableTreeNode("Error: " + e.getMessage()));
        }
        treeModel.reload();
    }

    public void clear() {
        rootNode.removeAllChildren();
        treeModel.reload();
    }

    public JTree getTree() {
        return tree;
    }
}
