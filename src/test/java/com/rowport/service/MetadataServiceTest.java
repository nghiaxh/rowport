package com.rowport.service;

import com.rowport.model.ConnectionConfig;
import com.rowport.model.HistoryEntry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MetadataServiceTest {

    private MockedStatic<DriverManager> mockedDriverManager;
    private Connection mockConnection;
    private MetadataService service;

    @BeforeEach
    void setUp() throws SQLException {
        mockConnection = mock(Connection.class);
        mockedDriverManager = mockStatic(DriverManager.class);
        mockedDriverManager.when(() -> DriverManager.getConnection(anyString()))
            .thenReturn(mockConnection);

        Statement mockStmt = mock(Statement.class);
        when(mockConnection.createStatement()).thenReturn(mockStmt);
        when(mockStmt.executeUpdate(anyString())).thenReturn(0);

        service = new MetadataService();
    }

    @AfterEach
    void tearDown() throws SQLException {
        mockedDriverManager.close();
        if (mockConnection != null && !mockConnection.isClosed()) {
            mockConnection.close();
        }
    }

    @Test
    void getAllConnections_emptyByDefault() throws SQLException {
        Statement mockStmt = mock(Statement.class);
        when(mockConnection.createStatement()).thenReturn(mockStmt);

        ResultSet mockRs = mock(ResultSet.class);
        when(mockStmt.executeQuery(anyString())).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false);

        assertThat(service.getAllConnections()).isEmpty();
    }

    @Test
    void getConnection_nonExistentReturnsNull() throws SQLException {
        PreparedStatement mockPs = mock(PreparedStatement.class);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockPs);

        ResultSet mockRs = mock(ResultSet.class);
        when(mockPs.executeQuery()).thenReturn(mockRs);
        when(mockRs.next()).thenReturn(false);

        assertThat(service.getConnection("nope")).isNull();
    }

    @Test
    void deleteHistoryEntry_executesWithoutError() throws SQLException {
        PreparedStatement mockPs = mock(PreparedStatement.class);
        when(mockConnection.prepareStatement(anyString())).thenReturn(mockPs);
        when(mockPs.executeUpdate()).thenReturn(1);

        service.deleteHistoryEntry("h1");
    }

    @Test
    void clearHistory_executesDeleteAll() throws SQLException {
        Statement mockStmt = mock(Statement.class);
        when(mockConnection.createStatement()).thenReturn(mockStmt);
        when(mockStmt.executeUpdate(anyString())).thenReturn(0);

        service.clearHistory();
    }
}
