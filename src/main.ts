import { Plugin } from 'obsidian';
import { MoleculeView } from './molecule-view';
import { importSdf } from './sdf-import';
import { importCsv } from './csv-import';
import { cleanupRDKit } from './rdkit-loader';
import { VIEW_TYPE_MOLECULES, DEFAULT_SETTINGS } from './types';
import type { Mols2BasesSettings } from './types';
import { Mols2BasesSettingTab } from './settings-tab';

export default class Mols2BasesPlugin extends Plugin {
  settings: Mols2BasesSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerBasesView(VIEW_TYPE_MOLECULES, {
      name: 'Molecules',
      icon: 'lucide-flask-conical',
      factory: (controller: any, containerEl: HTMLElement) =>
        new MoleculeView(controller, containerEl, this),
      options: MoleculeView.getViewOptions,
    });

    this.addCommand({
      id: 'import-sdf',
      name: 'Import SDF file',
      callback: () => importSdf(this),
    });

    this.addCommand({
      id: 'import-csv',
      name: 'Import CSV file',
      callback: () => importCsv(this),
    });

    this.addSettingTab(new Mols2BasesSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    cleanupRDKit();
  }
}
