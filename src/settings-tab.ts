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
      .setName('Show explicit hydrogens')
      .setDesc('Render molecules with all hydrogen atoms visible.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.explicitHydrogens)
          .onChange(async (value) => {
            this.plugin.settings.explicitHydrogens = value;
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
      .setName('Coordinate mode')
      .setDesc('How to handle molecule coordinates for rendering.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('as-is', 'As-is')
          .addOption('2d-only', '2D only')
          .setValue(this.plugin.settings.coordinateMode)
          .onChange(async (value) => {
            this.plugin.settings.coordinateMode = value as 'as-is' | '2d-only';
            await this.plugin.saveSettings();
          }),
      );
  }
}
