'use client';
import { useState, useEffect, useCallback } from 'react';
import { ru } from './locales/ru';
import { uz } from './locales/uz';
import { en } from './locales/en';

/* ─── Types ─── */
export type Locale = 'ru' | 'uz' | 'en';
export type TranslationDict = typeof ru;

/* ─── Registry ─── */
const DICTIONARIES: Record<Locale, TranslationDict> = { ru, uz, en };

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: 'Русский',
  uz: "O'zbek",
  en: 'English',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  ru: 'RU',
  uz: 'UZ',
  en: 'EN',
};

const STORAGE_KEY = 'ai_capital_locale';
const DEFAULT_LOCALE: Locale = 'ru';

/* ─── Listeners (simple pub/sub for cross-component sync) ─── */
type LocaleListener = (locale: Locale) => void;
const listeners = new Set<LocaleListener>();

function notifyAll(locale: Locale) {
  listeners.forEach(fn => fn(locale));
}

/* ─── Public helpers ─── */
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in DICTIONARIES) return saved as Locale;
  return DEFAULT_LOCALE;
}

export function setStoredLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  notifyAll(locale);
}

/* ─── React hook ─── */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Initialize from storage
    setLocaleState(getStoredLocale());

    // Subscribe to changes from other components
    const handler: LocaleListener = (newLocale) => {
      setLocaleState(newLocale);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
    // Update <html lang="..."> dynamically
    document.documentElement.lang = newLocale;
  }, []);

  const t = DICTIONARIES[locale];

  return { locale, setLocale, t };
}

/* ─── Non-hook translation getter (for server/static contexts) ─── */
export function getTranslations(locale: Locale): TranslationDict {
  return DICTIONARIES[locale];
}
