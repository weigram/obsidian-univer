import { getLanguage, moment } from 'obsidian'

/**
 * Obsidian's UI language.
 *
 * `getLanguage()` only exists on newer versions (1.14+), so fall back to the
 * value Obsidian stores in localStorage and finally to moment's locale.
 */
export function obsidianLanguage(): string {
  try {
    if (typeof getLanguage === 'function') {
      const language = getLanguage()
      if (language)
        return language
    }
  }
  catch {
    // Older Obsidian versions do not export getLanguage.
  }

  try {
    const stored = window.localStorage.getItem('language')
    if (stored)
      return stored
  }
  catch {
    // localStorage can be unavailable in restricted contexts.
  }

  return moment.locale()
}

export function isChinese(): boolean {
  return obsidianLanguage().toLowerCase().startsWith('zh')
}
