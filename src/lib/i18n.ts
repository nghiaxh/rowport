import { useCallback } from 'react'
import { useSettingsStore } from '../stores/useSettingsStore'
import { en, type TranslationKey } from './i18n/en'
import { vi } from './i18n/vi'

export type SupportedLocale = 'en' | 'vi'
export type { TranslationKey }

const dictionaries: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en,
  vi
}

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  vi: 'Tiếng Việt'
}

export function detectLocale(): SupportedLocale {
  const language = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase()
  return language.startsWith('vi') ? 'vi' : 'en'
}

export type TranslateParams = Record<string, string | number>

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

function translate(locale: SupportedLocale, key: TranslationKey, params?: TranslateParams): string {
  const template = dictionaries[locale][key] ?? en[key]
  return interpolate(template, params)
}

export function t(key: TranslationKey, params?: TranslateParams): string {
  return translate(useSettingsStore.getState().language, key, params)
}

export function useT(): (key: TranslationKey, params?: TranslateParams) => string {
  const language = useSettingsStore((s) => s.language)
  return useCallback((key, params) => translate(language, key, params), [language])
}
