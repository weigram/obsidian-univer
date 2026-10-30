import { moment } from 'obsidian'

/**
 * Obsidian's UI language.
 *
 * Obsidian keeps moment's locale in sync with the language selected in
 * Settings → General, so reading it avoids depending on newer APIs.
 */
export function obsidianLanguage(): string {
  return moment.locale() || 'en'
}

export function isChinese(): boolean {
  return obsidianLanguage().toLowerCase().startsWith('zh')
}
