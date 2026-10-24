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

    new Setting(containerEl)
      .setName(zh ? 'Univer Bases 授权' : 'Univer Bases license')
      .setDesc(zh
        ? 'Univer Bases（关系表/多维表格）属于 Univer Pro。粘贴 license 文本以解除评估模式水印；留空则使用评估模式。内容只保存在本地 data.json。'
        : 'Univer Bases (relational table) is part of Univer Pro. Paste the license text to unlock evaluation mode; leave empty to stay in evaluation mode. It is stored only in the local data.json.')
      .addTextArea(textArea => textArea
        .setValue(this.plugin.settings.basesLicense)
        .setPlaceholder('-----BEGIN LICENSE-----')
        .onChange(async (value) => {
          this.plugin.settings.basesLicense = value
          await this.plugin.saveSettings()
        }))
      .addButton(button => button
        .setButtonText(zh ? '应用' : 'Apply')
        .onClick(async () => {
          await this.plugin.saveSettings()
          this.plugin.refreshOpenViews()
        }))
  }
}
