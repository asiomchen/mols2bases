import { Plugin } from 'obsidian';
import { MoleculeView } from './molecule-view';
import { importSdf } from './sdf-import';
import { cleanupRDKit } from './rdkit-loader';
import { VIEW_TYPE_MOLECULES } from './types';

export default class Mols2BasesPlugin extends Plugin {
  async onload(): Promise<void> {
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
  }

  onunload(): void {
    cleanupRDKit();
  }
}
