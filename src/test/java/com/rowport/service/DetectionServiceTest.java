package com.rowport.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.ServerSocket;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class DetectionServiceTest {

    private DetectionService service;

    @BeforeEach
    void setUp() {
        service = new DetectionService();
    }

    @AfterEach
    void tearDown() {
        service.shutdown();
    }

    @Test
    void probe_unreachableHost_returnsFalse() throws Exception {
        CompletableFuture<Boolean> future = service.probe("192.0.2.1", 1);
        Boolean result = future.get(5, TimeUnit.SECONDS);
        assertThat(result).isFalse();
    }

    @Test
    void probe_openPort_returnsTrue() throws Exception {
        try (ServerSocket server = new ServerSocket(0)) {
            int port = server.getLocalPort();
            CompletableFuture<Boolean> future = service.probe("localhost", port);
            Boolean result = future.get(5, TimeUnit.SECONDS);
            assertThat(result).isTrue();
        }
    }

    @Test
    void probePorts_returnsOpenPorts() throws Exception {
        try (ServerSocket server1 = new ServerSocket(0);
             ServerSocket server2 = new ServerSocket(0)) {
            int port1 = server1.getLocalPort();
            int port2 = server2.getLocalPort();

            CompletableFuture<List<Integer>> future = service.probePorts(
                "localhost", List.of(port1, port2, 1)
            );

            List<Integer> result = future.get(5, TimeUnit.SECONDS);
            assertThat(result).contains(port1, port2);
            assertThat(result).doesNotContain(1);
        }
    }

    @Test
    void detectMongoDb_unreachablePort_returnsFalse() throws Exception {
        CompletableFuture<Boolean> future = service.detectMongoDb("192.0.2.1", 27017);
        Boolean result = future.get(5, TimeUnit.SECONDS);
        assertThat(result).isFalse();
    }
}
