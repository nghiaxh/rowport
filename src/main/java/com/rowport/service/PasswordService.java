package com.rowport.service;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

public class PasswordService {

    private static final String KEYSTORE_TYPE = "PKCS12";
    private static final String KEYSTORE_FILE = ".rowport/keystore.p12";
    private static final char[] DEFAULT_PASSWORD = "rowport-internal".toCharArray();

    private KeyStore keyStore;
    private Path keyStorePath;

    public PasswordService() {
        this.keyStorePath = Path.of(System.getProperty("user.home"), KEYSTORE_FILE);
        loadOrCreate();
    }

    private void loadOrCreate() {
        try {
            keyStore = KeyStore.getInstance(KEYSTORE_TYPE);
            if (Files.exists(keyStorePath)) {
                try (FileInputStream fis = new FileInputStream(keyStorePath.toFile())) {
                    keyStore.load(fis, DEFAULT_PASSWORD);
                }
            } else {
                keyStore.load(null, DEFAULT_PASSWORD);
                save();
            }
        } catch (IOException | KeyStoreException | NoSuchAlgorithmException | CertificateException e) {
            throw new RuntimeException("Failed to initialize keystore", e);
        }
    }

    public void savePassword(String connectionId, String password) {
        try {
            KeyStore.PasswordProtection protection = new KeyStore.PasswordProtection(DEFAULT_PASSWORD);
            byte[] passwordBytes = password.getBytes(StandardCharsets.UTF_8);
            KeyStore.SecretKeyEntry entry = new KeyStore.SecretKeyEntry(
                new javax.crypto.spec.SecretKeySpec(passwordBytes, "RowportPass")
            );
            keyStore.setEntry(connectionId, entry, protection);
            save();
        } catch (KeyStoreException e) {
            throw new RuntimeException("Failed to save password for: " + connectionId, e);
        }
    }

    public String getPassword(String connectionId) {
        try {
            if (!keyStore.containsAlias(connectionId)) {
                return null;
            }
            KeyStore.PasswordProtection protection = new KeyStore.PasswordProtection(DEFAULT_PASSWORD);
            KeyStore.Entry entry = keyStore.getEntry(connectionId, protection);
            if (entry instanceof KeyStore.SecretKeyEntry skEntry) {
                byte[] passwordBytes = skEntry.getSecretKey().getEncoded();
                return new String(passwordBytes, StandardCharsets.UTF_8);
            }
            return null;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get password for: " + connectionId, e);
        }
    }

    public void deletePassword(String connectionId) {
        try {
            if (keyStore.containsAlias(connectionId)) {
                keyStore.deleteEntry(connectionId);
                save();
            }
        } catch (KeyStoreException e) {
            throw new RuntimeException("Failed to delete password for: " + connectionId, e);
        }
    }

    public boolean hasPassword(String connectionId) {
        try {
            return keyStore.containsAlias(connectionId);
        } catch (KeyStoreException e) {
            return false;
        }
    }

    public List<String> listKeys() {
        List<String> keys = new ArrayList<>();
        try {
            Enumeration<String> aliases = keyStore.aliases();
            while (aliases.hasMoreElements()) {
                keys.add(aliases.nextElement());
            }
        } catch (KeyStoreException e) {
            // ignore
        }
        return keys;
    }

    private void save() {
        try {
            Files.createDirectories(keyStorePath.getParent());
            try (FileOutputStream fos = new FileOutputStream(keyStorePath.toFile())) {
                keyStore.store(fos, DEFAULT_PASSWORD);
            }
        } catch (IOException | KeyStoreException | NoSuchAlgorithmException | CertificateException e) {
            throw new RuntimeException("Failed to save keystore", e);
        }
    }
}
