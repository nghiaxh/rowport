package com.rowport.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    @Mock
    private PasswordService passwordService;

    @Test
    void getPassword_nonExistentReturnsNull() {
        when(passwordService.getPassword("nonexistent")).thenReturn(null);
        assertThat(passwordService.getPassword("nonexistent")).isNull();
    }

    @Test
    void hasPassword_falseWhenNotExists() {
        when(passwordService.hasPassword("nope")).thenReturn(false);
        assertThat(passwordService.hasPassword("nope")).isFalse();
    }

    @Test
    void listKeys_emptyWhenNoPasswords() {
        when(passwordService.listKeys()).thenReturn(Collections.emptyList());
        assertThat(passwordService.listKeys()).isEmpty();
    }

    @Test
    void saveAndGetPassword_roundTrip() {
        when(passwordService.getPassword("conn-1")).thenReturn("secret123");
        assertThat(passwordService.getPassword("conn-1")).isEqualTo("secret123");
    }

    @Test
    void hasPassword_trueWhenExists() {
        when(passwordService.hasPassword("conn-1")).thenReturn(true);
        assertThat(passwordService.hasPassword("conn-1")).isTrue();
    }

    @Test
    void listKeys_returnsSavedAliases() {
        when(passwordService.listKeys()).thenReturn(List.of("conn-1", "conn-2"));
        assertThat(passwordService.listKeys()).containsExactlyInAnyOrder("conn-1", "conn-2");
    }
}
