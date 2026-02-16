import { type BasesViewConfig, Plugin, type QueryController } from 'obsidian';
import { importCsv } from './csv-import';
import { MoleculeView } from './molecule-view';
import { cleanupRDKit } from './rdkit-loader';
import { importSdf } from './sdf-import';
import { Mols2BasesSettingTab } from './settings-tab';
import type { Mols2BasesSettings } from './types';
import { DEFAULT_SETTINGS, VIEW_TYPE_MOLECULES } from './types';

export default class Mols2BasesPlugin extends Plugin {
  settings: Mols2BasesSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.registerBasesView(VIEW_TYPE_MOLECULES, {
      name: 'Molecules',
      icon: 'lucide-flask-conical',
      factory: (controller: QueryController, containerEl: HTMLElement) =>
        new MoleculeView(controller, containerEl, this),
      options: (config: BasesViewConfig) => MoleculeView.getViewOptions(config),
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
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<Mols2BasesSettings>,
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    cleanupRDKit();
  }
}
