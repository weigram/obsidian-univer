import { moment } from 'obsidian'

/**
 * Obsidian's UI language.
 *
 * `getLanguage()` only exists on Obsidian 1.14+, and using it would force a
 * higher `minAppVersion`. Obsidian stores the selected language in
 * localStorage and keeps moment's locale in sync, so both are enough here.
 */
export function obsidianLanguage(): string {
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
