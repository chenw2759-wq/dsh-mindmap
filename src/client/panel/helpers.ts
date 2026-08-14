/**
 * Shared panel helpers: the active-dictionary pick (document-language based,
 * dsh-ssh precedent) bound to the dsh-mindmap interpolator in locales.ts.
 */

import { en, t, zh, type MindmapKey } from '../locales.ts'

/** Template values accepted by the interpolator. */
export type TranslateValues = Record<string, string | number>

/** Active dictionary, picked by the document language at call time. */
export function dictionary(): Record<string, string> {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'zh'
  return lang.toLowerCase().startsWith('en') ? { ...en } : { ...zh }
}

/** Translate a key with optional {name} template params (current language). */
export function tt(key: MindmapKey, values?: TranslateValues): string {
  return t(dictionary(), key, values)
}
