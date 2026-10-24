import type UniverPlugin from './main'

import { App, PluginSettingTab, Setting } from 'obsidian'
import { isChinese } from './lang'

export class UniverSettingTab extends PluginSettingTab {
  plugin: UniverPlugin

  constructor(app: App, plugin: UniverPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    const zh = isChinese()

    new Setting(containerEl)
      .setName(zh ? '界面语言' : 'Interface language')
      .setDesc(zh
        ? 'Univer 工具栏与菜单的语言。自动会跟随 Obsidian 的语言设置。'
        : 'Language of the Univer toolbar and menus. Auto follows Obsidian.')
      .addDropdown(dropdown => dropdown
        .addOption('auto', zh ? '自动' : 'Auto')
        .addOption('zh', '简体中文')
        .addOption('en', 'English')
        .setValue(this.plugin.settings.language)
        .onChange(async (value) => {
          this.plugin.settings.language = value as typeof this.plugin.settings.language
          await this.plugin.saveSettings()
          this.plugin.refreshOpenViews()
        }))
  }
}
