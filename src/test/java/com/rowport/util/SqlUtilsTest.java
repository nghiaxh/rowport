package com.rowport.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SqlUtilsTest {

    @Test
    void splitStatements_nullReturnsEmptyList() {
        assertThat(SqlUtils.splitStatements(null)).isEmpty();
    }

    @Test
    void splitStatements_blankReturnsEmptyList() {
        assertThat(SqlUtils.splitStatements("")).isEmpty();
        assertThat(SqlUtils.splitStatements("   ")).isEmpty();
    }

    @Test
    void splitStatements_singleStatement() {
        List<String> result = SqlUtils.splitStatements("SELECT * FROM users");
        assertThat(result).containsExactly("SELECT * FROM users");
    }

    @Test
    void splitStatements_multipleStatements() {
        List<String> result = SqlUtils.splitStatements("SELECT 1; SELECT 2; SELECT 3");
        assertThat(result).containsExactly("SELECT 1", "SELECT 2", "SELECT 3");
    }

    @Test
    void splitStatements_trimsWhitespace() {
        List<String> result = SqlUtils.splitStatements("  SELECT 1  ;  SELECT 2  ");
        assertThat(result).containsExactly("SELECT 1", "SELECT 2");
    }

    @Test
    void splitStatements_ignoresTrailingSemicolon() {
        List<String> result = SqlUtils.splitStatements("SELECT 1;");
        assertThat(result).containsExactly("SELECT 1");
    }

    @Test
    void splitStatements_stripsComments() {
        String sql = "-- comment\nSELECT 1; /* block */ SELECT 2";
        List<String> result = SqlUtils.splitStatements(sql);
        assertThat(result).containsExactly("SELECT 1", "SELECT 2");
    }

    @Test
    void removeComments_nullReturnsEmpty() {
        assertThat(SqlUtils.removeComments(null)).isEmpty();
    }

    @Test
    void removeComments_removesLineComments() {
        assertThat(SqlUtils.removeComments("SELECT 1 -- comment"))
            .isEqualTo("SELECT 1 ");
    }

    @Test
    void removeComments_removesBlockComments() {
        assertThat(SqlUtils.removeComments("SELECT /* comment */ 1"))
            .isEqualTo("SELECT  1");
    }

    @Test
    void removeComments_removesMultipleComments() {
        String sql = "-- line\nSELECT /* block */ 1 -- another";
        assertThat(SqlUtils.removeComments(sql)).isEqualTo("\nSELECT  1 ");
    }

    @Test
    void extractSelectedSql_nullSelectionReturnsFullSql() {
        assertThat(SqlUtils.extractSelectedSql("SELECT 1", null))
            .isEqualTo("SELECT 1");
    }

    @Test
    void extractSelectedSql_blankSelectionReturnsFullSql() {
        assertThat(SqlUtils.extractSelectedSql("SELECT 1", "  "))
            .isEqualTo("SELECT 1");
    }

    @Test
    void extractSelectedSql_nonBlankSelectionReturnsTrimmedSelection() {
        assertThat(SqlUtils.extractSelectedSql("SELECT 1", "  SELECT 2  "))
            .isEqualTo("SELECT 2");
    }

    @Test
    void formatSql_nullReturnsNull() {
        assertThat(SqlUtils.formatSql(null)).isNull();
    }

    @Test
    void formatSql_blankReturnsBlank() {
        assertThat(SqlUtils.formatSql("")).isEmpty();
    }

    @Test
    void formatSql_collapsesWhitespace() {
        assertThat(SqlUtils.formatSql("SELECT   *   FROM    users"))
            .isEqualTo("SELECT * \nFROM users");
    }

    @Test
    void getFirstWord_nullReturnsEmpty() {
        assertThat(SqlUtils.getFirstWord(null)).isEmpty();
    }

    @Test
    void getFirstWord_blankReturnsEmpty() {
        assertThat(SqlUtils.getFirstWord("  ")).isEmpty();
    }

    @Test
    void getFirstWord_returnsUppercaseFirstWord() {
        assertThat(SqlUtils.getFirstWord("select * from users")).isEqualTo("SELECT");
    }

    @Test
    void getFirstWord_singleWord() {
        assertThat(SqlUtils.getFirstWord("SELECT")).isEqualTo("SELECT");
    }

    @Test
    void isSelectQuery_selectReturnsTrue() {
        assertThat(SqlUtils.isSelectQuery("SELECT * FROM users")).isTrue();
    }

    @Test
    void isSelectQuery_withReturnsTrue() {
        assertThat(SqlUtils.isSelectQuery("WITH cte AS (SELECT 1) SELECT * FROM cte")).isTrue();
    }

    @Test
    void isSelectQuery_insertReturnsFalse() {
        assertThat(SqlUtils.isSelectQuery("INSERT INTO users VALUES (1)")).isFalse();
    }

    @Test
    void isModificationQuery_insertReturnsTrue() {
        assertThat(SqlUtils.isModificationQuery("INSERT INTO users VALUES (1)")).isTrue();
    }

    @Test
    void isModificationQuery_updateReturnsTrue() {
        assertThat(SqlUtils.isModificationQuery("UPDATE users SET name='a'")).isTrue();
    }

    @Test
    void isModificationQuery_deleteReturnsTrue() {
        assertThat(SqlUtils.isModificationQuery("DELETE FROM users")).isTrue();
    }

    @Test
    void isModificationQuery_dropReturnsTrue() {
        assertThat(SqlUtils.isModificationQuery("DROP TABLE users")).isTrue();
    }

    @Test
    void isModificationQuery_alterReturnsTrue() {
        assertThat(SqlUtils.isModificationQuery("ALTER TABLE users ADD col INT")).isTrue();
    }

    @Test
    void isModificationQuery_createReturnsTrue() {
        assertThat(SqlUtils.isModificationQuery("CREATE TABLE users (id INT)")).isTrue();
    }

    @Test
    void isModificationQuery_selectReturnsFalse() {
        assertThat(SqlUtils.isModificationQuery("SELECT * FROM users")).isFalse();
    }
}
