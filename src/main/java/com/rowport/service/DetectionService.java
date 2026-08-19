package com.rowport.service;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DetectionService {

    private static final int TIMEOUT_MS = 2000;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    public CompletableFuture<Boolean> probe(String host, int port) {
        return CompletableFuture.supplyAsync(() -> {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
                return true;
            } catch (IOException e) {
                return false;
            }
        }, executor);
    }

    public CompletableFuture<List<Integer>> probePorts(String host, List<Integer> ports) {
        return CompletableFuture.supplyAsync(() -> {
            List<Integer> openPorts = new ArrayList<>();
            for (int port : ports) {
                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(host, port), TIMEOUT_MS);
                    openPorts.add(port);
                } catch (IOException e) {
                    // port not open
                }
            }
            return openPorts;
        }, executor);
    }

    public CompletableFuture<Boolean> detectMongoDb(String host, int port) {
        return probe(host, port);
    }

    public void shutdown() {
        executor.shutdownNow();
    }
}
