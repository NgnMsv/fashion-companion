import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { de } from './de.ts'
import { en, type MessageKey } from './en.ts'

/*
 * A deliberately small i18n layer: two typed dictionaries and a `t()`
 * function. Keys are checked by TypeScript, so a typo or a missing German
 * text is a compile error instead of a blank label at runtime.
 */

export const LANGUAGES = ['en', 'de'] as const
export type Language = (typeof LANGUAGES)[number]
export type { MessageKey }

export const LANGUAGE_STORAGE_KEY = 'fc-language'

const dictionaries: Record<Language, Record<MessageKey, string>> = { en, de }

export type Params = Record<string, string | number>

export function translate(language: Language, key: MessageKey, params: Params = {}): string {
  return dictionaries[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  )
}

export type Translate = (key: MessageKey, params?: Params) => string

interface I18n {
  language: Language
  setLanguage: (language: Language) => void
  t: Translate
  /** "a, b and c" in the current language. */
  list: (items: string[]) => string
}

function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value)
}

/** The saved choice, otherwise German for German browsers, otherwise English. */
export function detectLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage blocked: fall through to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Language }) {
  const [language, setLanguageState] = useState<Language>(() => initial ?? detectLanguage())

  useEffect(() => {
    document.documentElement.lang = language
    document.title = translate(language, 'app.name')
  }, [language])

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      // Still switches for this visit.
    }
  }, [])

  const value = useMemo<I18n>(() => {
    const listFormat = new Intl.ListFormat(language, { type: 'conjunction' })
    return {
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
      list: (items) => listFormat.format(items),
    }
  }, [language, setLanguage])

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
