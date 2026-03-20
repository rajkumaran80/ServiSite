import en from './locales/en.json';
import es from './locales/es.json';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const messages: Record<Locale, typeof en> = {
  en,
  es,
};

export function getTranslations(locale: Locale = defaultLocale) {
  return messages[locale] || messages[defaultLocale];
}

type NestedKeyOf<T, Key extends keyof T = keyof T> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ? `${Key}.${NestedKeyOf<T[Key]>}`
    : `${Key}`
  : never;

type TranslationKey = NestedKeyOf<typeof en>;

export function t(key: TranslationKey, locale: Locale = defaultLocale): string {
  const translations = getTranslations(locale);
  const parts = key.split('.');
  let result: any = translations;

  for (const part of parts) {
    if (result && typeof result === 'object' && part in result) {
      result = result[part];
    } else {
      return key; // Return key as fallback
    }
  }

  return typeof result === 'string' ? result : key;
}

// Client-side hook-like function
export function useTranslations(locale?: Locale) {
  const resolvedLocale = locale || defaultLocale;

  return (key: string): string => {
    const parts = key.split('.');
    const translations = getTranslations(resolvedLocale);
    let result: any = translations;

    for (const part of parts) {
      if (result && typeof result === 'object' && part in result) {
        result = result[part];
      } else {
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  };
}
