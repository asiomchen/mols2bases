import { PluginSettingTab, App, Setting } from 'obsidian';
import type Mols2BasesPlugin from './main';

export class Mols2BasesSettingTab extends PluginSettingTab {
  plugin: Mols2BasesPlugin;

  constructor(app: App, plugin: Mols2BasesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Remove hydrogens')
      .setDesc('Strip hydrogen atoms from molecules before rendering.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.removeHs)
          .onChange(async (value) => {
            this.plugin.settings.removeHs = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Use original coordinates')
      .setDesc('Use coordinates from the input data. When off, generates clean 2D layouts.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.useCoords)
          .onChange(async (value) => {
            this.plugin.settings.useCoords = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Store MOL block in frontmatter')
      .setDesc('Include the full MOL block when importing SDF files. SMILES are always stored.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.storeMolblock)
          .onChange(async (value) => {
            this.plugin.settings.storeMolblock = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Lazy render molecules')
      .setDesc('Only render molecule images when they scroll into view. Improves performance for large datasets.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.lazyRender)
          .onChange(async (value) => {
            this.plugin.settings.lazyRender = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Search delay (ms)')
      .setDesc('Debounce delay for search input. Increase for large datasets.')
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.searchDelay))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.searchDelay = num;
              await this.plugin.saveSettings();
            }
          }),
      );
  }
}
