package com.rowport.ui;

import org.fife.ui.rsyntaxtextarea.RSyntaxTextArea;
import org.fife.ui.rsyntaxtextarea.SyntaxConstants;
import org.fife.ui.rsyntaxtextarea.Theme;
import org.fife.ui.rtextarea.RTextScrollPane;
import com.rowport.model.ConnectionConfig;
import com.rowport.model.QueryResult;
import com.rowport.service.QueryExecutor;
import com.rowport.util.SqlUtils;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.io.IOException;
import java.util.function.Consumer;

public class EditorPanel {

    private final JTabbedPane tabPane;
    private final JButton btnRun;
    private final JButton btnCancel;
    private final JButton btnFormat;
    private final JButton btnExport;
    private final QueryExecutor queryExecutor;
    private final Consumer<QueryResult> onQueryResult;

    private RSyntaxTextArea currentTextArea;
    private String connectionId;

    public EditorPanel(JTabbedPane tabPane, JButton btnRun, JButton btnCancel,
                       JButton btnFormat, JButton btnExport,
                       QueryExecutor queryExecutor, Consumer<QueryResult> onQueryResult) {
        this.tabPane = tabPane;
        this.btnRun = btnRun;
        this.btnCancel = btnCancel;
        this.btnFormat = btnFormat;
        this.btnExport = btnExport;
        this.queryExecutor = queryExecutor;
        this.onQueryResult = onQueryResult;

        setupButtons();
    }

    private void setupButtons() {
        btnRun.addActionListener(e -> executeQuery());
        btnCancel.addActionListener(e -> {
            if (queryExecutor != null) queryExecutor.cancelCurrent();
        });
        btnFormat.addActionListener(e -> formatQuery());
    }

    public void createEditorTab(ConnectionConfig config) {
        this.connectionId = config.getId();

        RSyntaxTextArea textArea = new RSyntaxTextArea();
        textArea.setSyntaxEditingStyle(SyntaxConstants.SYNTAX_STYLE_SQL);
        textArea.setCodeFoldingEnabled(true);
        textArea.setAntiAliasingEnabled(true);
        textArea.setFont(new Font("Consolas", Font.PLAIN, 14));
        textArea.setTabSize(4);

        try {
            Theme theme = Theme.load(getClass().getResourceAsStream("/org/fife/ui/rsyntaxtextarea/themes/dark.xml"));
            theme.apply(textArea);
        } catch (IOException e) {
            // fall back to default
        }

        RTextScrollPane scrollPane = new RTextScrollPane(textArea);
        scrollPane.setLineNumbersEnabled(true);
        scrollPane.setBorder(new EmptyBorder(0, 0, 0, 0));

        tabPane.addTab(config.getName(), scrollPane);
        tabPane.setSelectedIndex(tabPane.getTabCount() - 1);

        currentTextArea = textArea;
        btnRun.setEnabled(true);
    }

    private void executeQuery() {
        if (connectionId == null || queryExecutor == null) return;
        String sql = getSelectedOrAllText();
        if (sql.isBlank()) return;
        queryExecutor.execute(connectionId, sql, result -> {
            if (onQueryResult != null) onQueryResult.accept(result);
        });
    }

    private void formatQuery() {
        if (currentTextArea != null) {
            String text = currentTextArea.getText();
            if (text != null) {
                currentTextArea.setText(SqlUtils.formatSql(text));
            }
        }
    }

    public String getText() {
        return currentTextArea != null ? currentTextArea.getText() : "";
    }

    public void setText(String text) {
        if (currentTextArea != null) currentTextArea.setText(text);
    }

    public String getSelectedOrAllText() {
        if (currentTextArea == null) return "";
        String selection = currentTextArea.getSelectedText();
        if (selection != null && !selection.isBlank()) {
            return selection;
        }
        return currentTextArea.getText();
    }

    public void setRunning(boolean running) {
        SwingUtilities.invokeLater(() -> {
            btnRun.setEnabled(!running);
            btnCancel.setEnabled(running);
        });
    }
}
