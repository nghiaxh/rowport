package com.rowport.i18n;

import java.util.Locale;
import java.util.ResourceBundle;

public final class Messages {

    private static ResourceBundle bundle;
    private static Locale currentLocale;

    private Messages() {
    }

    public static void init(String language) {
        currentLocale = Locale.forLanguageTag(language);
        bundle = ResourceBundle.getBundle("i18n.messages", currentLocale);
    }

    public static String get(String key) {
        if (bundle == null) {
            init("en");
        }
        try {
            return bundle.getString(key);
        } catch (java.util.MissingResourceException e) {
            return key;
        }
    }

    public static String get(String key, Object... args) {
        String pattern = get(key);
        if (args.length == 0) return pattern;
        for (int i = 0; i < args.length; i++) {
            pattern = pattern.replace("{" + i + "}", String.valueOf(args[i]));
        }
        return pattern;
    }

    public static Locale getCurrentLocale() {
        if (currentLocale == null) {
            currentLocale = Locale.ENGLISH;
        }
        return currentLocale;
    }

    public static void setLanguage(String language) {
        init(language);
    }
}
