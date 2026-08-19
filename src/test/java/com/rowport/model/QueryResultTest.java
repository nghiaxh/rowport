package com.rowport.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QueryResultTest {

    @Test
    void successResult_hasErrorFalse() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"), List.of(List.of(1)), 10L
        );
        assertThat(result.hasError()).isFalse();
        assertThat(result.getError()).isNull();
    }

    @Test
    void errorResult_hasErrorTrue() {
        QueryResult result = new QueryResult("timeout", 100L);
        assertThat(result.hasError()).isTrue();
        assertThat(result.getError()).isEqualTo("timeout");
    }

    @Test
    void getRowCount_returnsCorrectCount() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"),
            List.of(List.of(1), List.of(2), List.of(3)), 10L
        );
        assertThat(result.getRowCount()).isEqualTo(3);
    }

    @Test
    void getRowCount_emptyRows() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"), List.of(), 10L
        );
        assertThat(result.getRowCount()).isEqualTo(0);
    }

    @Test
    void getColumnCount_returnsCorrectCount() {
        QueryResult result = new QueryResult(
            List.of("id", "name"), List.of("INT", "VARCHAR"),
            List.of(List.of(1, "alice")), 10L
        );
        assertThat(result.getColumnCount()).isEqualTo(2);
    }

    @Test
    void getColumnNames_returnsUnmodifiableList() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"), List.of(), 10L
        );
        assertThatThrownBy(() -> result.getColumnNames().add("extra"))
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void getRows_returnsUnmodifiableList() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"), List.of(List.of(1)), 10L
        );
        assertThatThrownBy(() -> result.getRows().add(List.of(2)))
            .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void toCsv_singleRow() {
        QueryResult result = new QueryResult(
            List.of("id", "name"), List.of("INT", "VARCHAR"),
            List.of(List.of(1, "alice")), 10L
        );
        assertThat(result.toCsv()).isEqualTo("id,name\n1,alice\n");
    }

    @Test
    void toCsv_multipleRows() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"),
            List.of(List.of(1), List.of(2)), 10L
        );
        assertThat(result.toCsv()).isEqualTo("id\n1\n2\n");
    }

    @Test
    void toCsv_escapesCommas() {
        QueryResult result = new QueryResult(
            List.of("val"), List.of("VARCHAR"),
            List.of(List.of("a,b")), 10L
        );
        assertThat(result.toCsv()).isEqualTo("val\n\"a,b\"\n");
    }

    @Test
    void toCsv_escapesQuotes() {
        QueryResult result = new QueryResult(
            List.of("val"), List.of("VARCHAR"),
            List.of(List.of("say \"hello\"")), 10L
        );
        assertThat(result.toCsv()).isEqualTo("val\n\"say \"\"hello\"\"\"\n");
    }

    @Test
    void toJson_singleRow() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"),
            List.of(List.of(1)), 10L
        );
        assertThat(result.toJson()).isEqualTo("[\n  {\"id\": 1}\n]");
    }

    @Test
    void toJson_stringValue() {
        QueryResult result = new QueryResult(
            List.of("name"), List.of("VARCHAR"),
            List.of(List.of("alice")), 10L
        );
        assertThat(result.toJson()).isEqualTo("[\n  {\"name\": \"alice\"}\n]");
    }

    @Test
    void toJson_nullValue() {
        java.util.List<Object> row = new java.util.ArrayList<>();
        row.add(null);
        QueryResult result = new QueryResult(
            List.of("name"), List.of("VARCHAR"),
            List.of(row), 10L
        );
        assertThat(result.toJson()).isEqualTo("[\n  {\"name\": null}\n]");
    }

    @Test
    void toJson_multipleRows() {
        QueryResult result = new QueryResult(
            List.of("id"), List.of("INT"),
            List.of(List.of(1), List.of(2)), 10L
        );
        assertThat(result.toJson()).isEqualTo("[\n  {\"id\": 1},\n  {\"id\": 2}\n]");
    }

    @Test
    void toJson_escapesSpecialChars() {
        QueryResult result = new QueryResult(
            List.of("val"), List.of("VARCHAR"),
            List.of(List.of("line1\nline2\ttab")), 10L
        );
        assertThat(result.toJson()).contains("line1\\nline2\\ttab");
    }

    @Test
    void getDurationMs_returnsCorrectValue() {
        QueryResult result = new QueryResult(
            List.of(), List.of(), List.of(), 42L
        );
        assertThat(result.getDurationMs()).isEqualTo(42L);
    }
}
