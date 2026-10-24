import { FUniver } from '@univerjs/core/facade'
import { defaultTheme, LocaleType, mergeLocales, Univer } from '@univerjs/presets'
import { UniverRenderEnginePlugin } from '@univerjs/engine-render'
import { UniverUIPlugin } from '@univerjs/ui'

import DesignEnUS from '@univerjs/design/locale/en-US'
import DesignZhCN from '@univerjs/design/locale/zh-CN'
import UIEnUS from '@univerjs/ui/locale/en-US'
import UIZhCN from '@univerjs/ui/locale/zh-CN'

import { UniverBasesPlugin } from '@univerjs-pro/bases'
import BasesEnUS from '@univerjs-pro/bases/locale/en-US'
import BasesZhCN from '@univerjs-pro/bases/locale/zh-CN'
import { UniverBasesUIPlugin } from '@univerjs-pro/bases-ui'
import BasesUIEnUS from '@univerjs-pro/bases-ui/locale/en-US'
import BasesUIZhCN from '@univerjs-pro/bases-ui/locale/zh-CN'
import { UniverProFormulaEnginePlugin } from '@univerjs-pro/engine-formula'
import { UniverLicensePlugin } from '@univerjs-pro/license'

import '@univerjs/design/lib/index.css'
import '@univerjs/ui/lib/index.css'
import '@univerjs-pro/bases-ui/lib/index.css'
import '@univerjs-pro/bases/facade'
import '@univerjs-pro/bases-ui/facade'

export interface BasesBootOptions {
  locale: LocaleType
  darkMode: boolean
  license?: string
}

/**
 * Univer Bases is a separate product from Univer Sheets:
 * - its formula engine is `UniverProFormulaEnginePlugin`
 * - it requires `UniverLicensePlugin` (evaluation mode without a license)
 * - the UI is provided by `UniverBasesUIPlugin`
 */
export function bootBases(container: HTMLElement, options: BasesBootOptions) {
  const univer = new Univer({
    locale: options.locale,
    locales: {
      [LocaleType.EN_US]: mergeLocales(DesignEnUS, UIEnUS, BasesEnUS, BasesUIEnUS),
      [LocaleType.ZH_CN]: mergeLocales(DesignZhCN, UIZhCN, BasesZhCN, BasesUIZhCN),
    },
    theme: defaultTheme,
    darkMode: options.darkMode,
  })

  univer.registerPlugin(UniverLicensePlugin, {
    license: options.license?.trim() || undefined,
  })
  univer.registerPlugin(UniverRenderEnginePlugin)
  univer.registerPlugin(UniverUIPlugin, { container })
  univer.registerPlugin(UniverProFormulaEnginePlugin)
  univer.registerPlugin(UniverBasesPlugin)
  univer.registerPlugin(UniverBasesUIPlugin)

  const univerAPI = FUniver.newAPI(univer)
  return { univer, univerAPI }
}

export { LocaleType }
