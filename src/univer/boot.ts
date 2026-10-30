import { createUniver, defaultTheme, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import enUS from '@univerjs/preset-sheets-core/locales/en-US'
import zhCN from '@univerjs/preset-sheets-core/locales/zh-CN'

import '@univerjs/preset-sheets-core/lib/index.css'

export interface BootOptions {
  locale: LocaleType
  darkMode: boolean
  header?: boolean
  toolbar?: boolean
  formulaBar?: boolean
  footer?: boolean
  ribbonType?: 'collapsed' | 'simple' | 'classic' | 'grid'
}

/**
 * Create the Univer instance used by a single .usheet view.
 *
 * Only the "sheets core" preset is registered on purpose: this plugin is a
 * spreadsheet viewer/editor, not a Word clone. Keeping the plugin list small
 * keeps the bundle lean and the toolbar close to Obsidian's own UI.
 */
export function bootUniver(container: HTMLElement, options: BootOptions) {
  const { univer, univerAPI } = createUniver({
    locale: options.locale,
    locales: {
      [LocaleType.EN_US]: mergeLocales(enUS as Parameters<typeof mergeLocales>[0]),
      [LocaleType.ZH_CN]: mergeLocales(zhCN as Parameters<typeof mergeLocales>[0]),
    },
    theme: defaultTheme,
    darkMode: options.darkMode,
    presets: [
      UniverSheetsCorePreset({
        container,
        header: options.header ?? true,
        toolbar: options.toolbar ?? true,
        footer: options.footer === false ? false : {},
        formulaBar: options.formulaBar ?? true,
        ribbonType: options.ribbonType ?? 'simple',
        contextMenu: true,
      }),
    ],
  })

  return { univer, univerAPI }
}

export { LocaleType }
