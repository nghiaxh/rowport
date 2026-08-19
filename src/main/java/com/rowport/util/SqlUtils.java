package com.rowport.util;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public final class SqlUtils {

    private static final Pattern LINE_COMMENT = Pattern.compile("--[^\n]*");
    private static final Pattern BLOCK_COMMENT = Pattern.compile("/\\*[\\s\\S]*?\\*/");

    private SqlUtils() {
    }

    public static List<String> splitStatements(String sql) {
        List<String> statements = new ArrayList<>();
        if (sql == null || sql.isBlank()) return statements;

        String cleaned = removeComments(sql);
        String[] parts = cleaned.split(";");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                statements.add(trimmed);
            }
        }
        return statements;
    }

    public static String removeComments(String sql) {
        if (sql == null) return "";
        String result = BLOCK_COMMENT.matcher(sql).replaceAll("");
        result = LINE_COMMENT.matcher(result).replaceAll("");
        return result;
    }

    public static String extractSelectedSql(String fullSql, String selection) {
        if (selection != null && !selection.isBlank()) {
            return selection.trim();
        }
        return fullSql.trim();
    }

    public static String formatSql(String sql) {
        if (sql == null || sql.isBlank()) return sql;

        String formatted = sql.trim();
        formatted = formatted.replaceAll("\\s+", " ");

        String[] keywords = {
            "SELECT", "FROM", "WHERE", "AND", "OR", "ORDER BY",
            "GROUP BY", "HAVING", "LIMIT", "JOIN", "LEFT JOIN",
            "RIGHT JOIN", "INNER JOIN", "OUTER JOIN", "CROSS JOIN",
            "ON", "INSERT INTO", "VALUES", "UPDATE", "SET",
            "DELETE FROM", "CREATE TABLE", "ALTER TABLE", "DROP TABLE"
        };

        for (String keyword : keywords) {
            String regex = "(?i)\\b" + Pattern.quote(keyword) + "\\b";
            formatted = formatted.replaceAll(regex, "\n" + keyword);
        }

        return formatted.trim();
    }

    public static String getFirstWord(String sql) {
        if (sql == null || sql.isBlank()) return "";
        String trimmed = sql.trim();
        int spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx == -1) return trimmed.toUpperCase();
        return trimmed.substring(0, spaceIdx).toUpperCase();
    }

    public static boolean isSelectQuery(String sql) {
        String first = getFirstWord(sql);
        return "SELECT".equals(first) || "WITH".equals(first);
    }

    public static boolean isModificationQuery(String sql) {
        String first = getFirstWord(sql);
        return "INSERT".equals(first) || "UPDATE".equals(first)
            || "DELETE".equals(first) || "DROP".equals(first)
            || "ALTER".equals(first) || "CREATE".equals(first);
    }
}
