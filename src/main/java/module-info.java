module com.rowport {

    requires java.desktop;
    requires java.sql;

    requires com.formdev.flatlaf;
    requires com.formdev.flatlaf.extras;
    requires org.fife.RSyntaxTextArea;

    requires org.xerial.sqlitejdbc;
    requires org.postgresql.jdbc;
    requires mysql.connector.j;
    requires org.mongodb.driver.sync.client;
    requires org.mongodb.driver.core;
    requires org.mongodb.bson;

    requires com.google.gson;

    exports com.rowport;
    exports com.rowport.model;
    exports com.rowport.db;
    exports com.rowport.service;
    exports com.rowport.ui;
    exports com.rowport.util;
    exports com.rowport.i18n;
}
