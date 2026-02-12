import { getRDKit, RDKitModule } from './rdkit-loader';
import { CONFIG_KEYS, VIEW_TYPE_MOLECULES } from './types';
import type Mols2BasesPlugin from './main';

// Obsidian Bases types (not yet in the public typings)
interface BasesViewOption {
  type: 'property' | 'slider' | 'text' | 'group';
  key: string;
  displayName: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: any;
}

interface BasesEntry {
  file: import('obsidian').TFile;
  getValue(propertyId: string): any;
}

interface BasesData {
  data: BasesEntry[];
}

interface BasesConfig {
  get(key: string): any;
  getAsPropertyId(key: string): string | undefined;
}

interface QueryController {
  on(event: string, callback: (...args: any[]) => void): void;
}

// We declare BasesView as a class we extend at runtime
declare class BasesView {
  controller: QueryController;
  data: BasesData;
  config: BasesConfig;
  constructor(controller: QueryController);
  onload(): void;
  onunload(): void;
  onDataUpdated(): void;
  get type(): string;
}

// Get the BasesView base class from obsidian module
const { BasesView: BasesViewClass } = require('obsidian') as { BasesView: typeof BasesView };

export class MoleculeView extends BasesViewClass {
  private containerEl: HTMLElement;
  private plugin: Mols2BasesPlugin;
  private gridEl: HTMLElement | null = null;
  private svgCache = new Map<string, string>();

  constructor(controller: QueryController, containerEl: HTMLElement, plugin: Mols2BasesPlugin) {
    super(controller);
    this.containerEl = containerEl;
    this.plugin = plugin;
  }

  get type(): string {
    return VIEW_TYPE_MOLECULES;
  }

  static getViewOptions(): BasesViewOption[] {
    return [
      {
        type: 'property',
        key: CONFIG_KEYS.MOLECULE_PROPERTY,
        displayName: 'Molecule property',
      },
      {
        type: 'property',
        key: CONFIG_KEYS.LABEL_PROPERTY,
        displayName: 'Label property',
      },
      {
        type: 'slider',
        key: CONFIG_KEYS.CARD_WIDTH,
        displayName: 'Card width',
        min: 100,
        max: 400,
        step: 10,
        defaultValue: 200,
      },
      {
        type: 'slider',
        key: CONFIG_KEYS.CARD_HEIGHT,
        displayName: 'Card height',
        min: 120,
        max: 500,
        step: 10,
        defaultValue: 240,
      },
    ];
  }

  onload(): void {
    this.gridEl = this.containerEl.createDiv({ cls: 'mol-grid' });
  }

  onunload(): void {
    this.svgCache.clear();
    if (this.gridEl) {
      this.gridEl.remove();
      this.gridEl = null;
    }
  }

  async onDataUpdated(): Promise<void> {
    if (!this.gridEl) return;
    this.gridEl.empty();

    const molPropId = this.config.getAsPropertyId(CONFIG_KEYS.MOLECULE_PROPERTY);
    const labelPropId = this.config.getAsPropertyId(CONFIG_KEYS.LABEL_PROPERTY);
    const cardWidth = this.config.get(CONFIG_KEYS.CARD_WIDTH) ?? 200;
    const cardHeight = this.config.get(CONFIG_KEYS.CARD_HEIGHT) ?? 240;

    if (!molPropId) {
      this.gridEl.createDiv({
        cls: 'mol-card-error',
        text: 'Select a molecule property in view options',
      });
      return;
    }

    let rdkit: RDKitModule;
    try {
      rdkit = await getRDKit(this.plugin);
    } catch (e) {
      this.gridEl.createDiv({
        cls: 'mol-card-error',
        text: `Failed to load RDKit: ${e}`,
      });
      return;
    }

    const entries = this.data.data;
    for (const entry of entries) {
      const molValue = entry.getValue(molPropId);
      const molStr = typeof molValue === 'string' ? molValue : String(molValue ?? '');
      const labelValue = labelPropId ? entry.getValue(labelPropId) : null;
      const label = labelValue != null ? String(labelValue) : entry.file.basename;

      const card = this.gridEl.createDiv({ cls: 'mol-card' });
      card.style.setProperty('--card-width', `${cardWidth}px`);
      card.style.setProperty('--card-height', `${cardHeight}px`);

      // Click to open note
      card.addEventListener('click', () => {
        this.plugin.app.workspace.getLeaf(false).openFile(entry.file);
      });

      // Hover preview
      card.addEventListener('mouseover', (evt) => {
        this.plugin.app.workspace.trigger('hover-link', {
          event: evt,
          source: VIEW_TYPE_MOLECULES,
          hoverParent: card,
          targetEl: card,
          linktext: entry.file.path,
        });
      });

      const svgContainer = card.createDiv({ cls: 'mol-card-svg' });

      if (!molStr.trim()) {
        svgContainer.createDiv({ cls: 'mol-card-error', text: 'No molecule data' });
      } else {
        const svg = this.renderMolecule(rdkit, molStr);
        if (svg) {
          svgContainer.innerHTML = svg;
        } else {
          svgContainer.createDiv({ cls: 'mol-card-error', text: 'Invalid molecule' });
        }
      }

      card.createDiv({ cls: 'mol-card-label', text: label });
    }
  }

  private renderMolecule(rdkit: RDKitModule, molStr: string): string | null {
    // Build cache key incorporating settings
    const { explicitHydrogens, coordinateMode } = this.plugin.settings;
    const cacheKey = `${molStr}||eh=${explicitHydrogens}||cm=${coordinateMode}`;

    const cached = this.svgCache.get(cacheKey);
    if (cached) return cached;

    let mol = null;
    let renderMol = null;
    try {
      mol = rdkit.get_mol(molStr);
      if (!mol || !mol.is_valid()) return null;

      if (coordinateMode === '2d-only') {
        mol.set_new_coords();
      }

      if (explicitHydrogens) {
        const molblockWithHs = mol.add_hs();
        renderMol = rdkit.get_mol(molblockWithHs);
        if (!renderMol || !renderMol.is_valid()) return null;
      }

      const svg = (renderMol ?? mol).get_svg();
      this.svgCache.set(cacheKey, svg);
      return svg;
    } catch {
      return null;
    } finally {
      if (renderMol) renderMol.delete();
      if (mol) mol.delete();
    }
  }
}
