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
  private renderGeneration = 0;
  private entryMap = new WeakMap<HTMLElement, BasesEntry>();
  private observer: IntersectionObserver | null = null;

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

    // Event delegation: single click listener for all cards
    this.gridEl.addEventListener('click', (evt) => {
      const card = (evt.target as HTMLElement).closest('.mol-card') as HTMLElement;
      if (!card) return;
      const entry = this.entryMap.get(card);
      if (entry) this.plugin.app.workspace.getLeaf(false).openFile(entry.file);
    });

    // Event delegation: single mouseover listener for hover previews
    this.gridEl.addEventListener('mouseover', (evt) => {
      const card = (evt.target as HTMLElement).closest('.mol-card') as HTMLElement;
      if (!card) return;
      const entry = this.entryMap.get(card);
      if (entry) {
        this.plugin.app.workspace.trigger('hover-link', {
          event: evt,
          source: VIEW_TYPE_MOLECULES,
          hoverParent: card,
          targetEl: card,
          linktext: entry.file.path,
        });
      }
    });
  }

  onunload(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.svgCache.clear();
    if (this.gridEl) {
      this.gridEl.remove();
      this.gridEl = null;
    }
  }

  async onDataUpdated(): Promise<void> {
    if (!this.gridEl) return;
    this.observer?.disconnect();
    this.gridEl.empty();

    const generation = ++this.renderGeneration;
    const lazy = this.plugin.settings.lazyRender;

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

    // Helper: create a card element for one entry
    const createCard = (entry: BasesEntry): { card: HTMLElement; svgContainer: HTMLElement; molStr: string } => {
      const molValue = entry.getValue(molPropId);
      const molStr = typeof molValue === 'string' ? molValue : String(molValue ?? '');
      const labelValue = labelPropId ? entry.getValue(labelPropId) : null;
      const label = labelValue != null ? String(labelValue) : entry.file.basename;

      const card = document.createElement('div');
      card.className = 'mol-card';
      card.style.setProperty('--card-width', `${cardWidth}px`);
      card.style.setProperty('--card-height', `${cardHeight}px`);

      this.entryMap.set(card, entry);

      const svgContainer = document.createElement('div');
      svgContainer.className = 'mol-card-svg';
      card.appendChild(svgContainer);

      const labelEl = document.createElement('div');
      labelEl.className = 'mol-card-label';
      labelEl.textContent = label;
      card.appendChild(labelEl);

      return { card, svgContainer, molStr };
    };

    // Helper: render SVG into a container (eager)
    const renderInto = (svgContainer: HTMLElement, molStr: string): void => {
      if (!molStr.trim()) {
        const err = document.createElement('div');
        err.className = 'mol-card-error';
        err.textContent = 'No molecule data';
        svgContainer.appendChild(err);
        return;
      }
      const svg = this.renderMolecule(rdkit, molStr);
      if (svg) {
        svgContainer.innerHTML = svg;
      } else {
        const err = document.createElement('div');
        err.className = 'mol-card-error';
        err.textContent = 'Invalid molecule';
        svgContainer.appendChild(err);
      }
    };

    if (lazy) {
      // Set up observer callback with captured generation and rdkit reference
      this.observer = new IntersectionObserver(
        (ioEntries) => {
          if (this.renderGeneration !== generation) return;
          for (const ioEntry of ioEntries) {
            if (!ioEntry.isIntersecting) continue;
            const el = ioEntry.target as HTMLElement;
            this.observer!.unobserve(el);
            const molStr = el.dataset.mol!;
            delete el.dataset.mol;
            const svg = this.renderMolecule(rdkit, molStr);
            if (svg) {
              el.innerHTML = svg;
            } else {
              const err = document.createElement('div');
              err.className = 'mol-card-error';
              err.textContent = 'Invalid molecule';
              el.appendChild(err);
            }
          }
        },
        { rootMargin: '200px' },
      );

      const fragment = document.createDocumentFragment();
      for (const entry of entries) {
        const { card, svgContainer, molStr } = createCard(entry);
        if (!molStr.trim()) {
          const err = document.createElement('div');
          err.className = 'mol-card-error';
          err.textContent = 'No molecule data';
          svgContainer.appendChild(err);
        } else {
          // Check cache — if hit, render immediately; otherwise defer to observer
          const { removeHs, useCoords } = this.plugin.settings;
          const cacheKey = `${molStr}||rh=${removeHs}||uc=${useCoords}`;
          const cached = this.svgCache.get(cacheKey);
          if (cached) {
            svgContainer.innerHTML = cached;
          } else {
            svgContainer.dataset.mol = molStr;
            this.observer.observe(svgContainer);
          }
        }
        fragment.appendChild(card);
      }
      this.gridEl.appendChild(fragment);
    } else {
      // Eager: chunked batch rendering with rAF yields
      const BATCH_SIZE = 20;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        if (this.renderGeneration !== generation) return;

        const batch = entries.slice(i, i + BATCH_SIZE);
        const fragment = document.createDocumentFragment();

        for (const entry of batch) {
          const { card, svgContainer, molStr } = createCard(entry);
          renderInto(svgContainer, molStr);
          fragment.appendChild(card);
        }

        this.gridEl.appendChild(fragment);

        // Yield to browser between batches
        if (i + BATCH_SIZE < entries.length) {
          await new Promise<void>(r => requestAnimationFrame(() => r()));
        }
      }
    }
  }

  private renderMolecule(rdkit: RDKitModule, molStr: string): string | null {
    // Build cache key incorporating settings
    const { removeHs, useCoords } = this.plugin.settings;
    const cacheKey = `${molStr}||rh=${removeHs}||uc=${useCoords}`;

    const cached = this.svgCache.get(cacheKey);
    if (cached) return cached;

    let mol = null;
    let renderMol = null;
    try {
      mol = rdkit.get_mol(molStr);
      if (!mol || !mol.is_valid()) return null;

      if (!useCoords) {
        mol.set_new_coords();
      }

      if (removeHs) {
        const molblockNoHs = mol.remove_hs();
        renderMol = rdkit.get_mol(molblockNoHs);
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
