package com.rowport.model;

import java.util.ArrayList;
import java.util.List;

public class TableInfo {

    private String name;
    private String schema;
    private String type;
    private List<ColumnInfo> columns;

    public TableInfo() {
        this.columns = new ArrayList<>();
    }

    public TableInfo(String name, String schema, String type) {
        this.name = name;
        this.schema = schema;
        this.type = type;
        this.columns = new ArrayList<>();
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSchema() {
        return schema;
    }

    public void setSchema(String schema) {
        this.schema = schema;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<ColumnInfo> getColumns() {
        return columns;
    }

    public void setColumns(List<ColumnInfo> columns) {
        this.columns = columns;
    }

    public void addColumn(ColumnInfo column) {
        this.columns.add(column);
    }

    @Override
    public String toString() {
        return (schema != null ? schema + "." : "") + name;
    }
}
