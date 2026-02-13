import { BasesView, BasesEntry, BasesViewConfig, QueryController } from 'obsidian';
import type { BasesAllOptions } from 'obsidian';
import { getRDKit, RDKitModule, RDKitMol } from './rdkit-loader';
import { CONFIG_KEYS, VIEW_TYPE_MOLECULES } from './types';
import type Mols2BasesPlugin from './main';

interface CardInfo {
  card: HTMLElement;
  svgContainer: HTMLElement;
  molStr: string;
  entry: BasesEntry;
}

export class MoleculeView extends BasesView {
  private containerEl: HTMLElement;
  private plugin: Mols2BasesPlugin;
  private gridEl: HTMLElement | null = null;
  private svgCache = new Map<string, string>();
  private renderGeneration = 0;
  private entryMap = new WeakMap<HTMLElement, BasesEntry>();
  private observer: IntersectionObserver | null = null;

  private searchBarEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private searchCountEl: HTMLElement | null = null;
  private textBtn: HTMLButtonElement | null = null;
  private smartsBtn: HTMLButtonElement | null = null;
  private searchMode: 'text' | 'smarts' = 'text';
  private cardInfos: CardInfo[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private rdkitRef: RDKitModule | null = null;

  private tooltipEl: HTMLElement | null = null;
  private tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(controller: QueryController, containerEl: HTMLElement, plugin: Mols2BasesPlugin) {
    super(controller);
    this.containerEl = containerEl;
    this.plugin = plugin;
  }

  type = VIEW_TYPE_MOLECULES;

  static getViewOptions(_config: BasesViewConfig): BasesAllOptions[] {
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
        default: 200,
      },
      {
        type: 'slider',
        key: CONFIG_KEYS.CARD_HEIGHT,
        displayName: 'Card height',
        min: 120,
        max: 500,
        step: 10,
        default: 240,
      },
      {
        type: 'toggle',
        key: CONFIG_KEYS.TOOLTIP_ENABLED,
        displayName: 'Enable tooltip',
        default: true,
      },
      {
        type: 'slider',
        key: CONFIG_KEYS.TOOLTIP_MOLECULE_SIZE,
        displayName: 'Tooltip molecule size',
        min: 200,
        max: 600,
        step: 50,
        default: 400,
      },
      {
        type: 'text',
        key: CONFIG_KEYS.TOOLTIP_PROPERTIES,
        displayName: 'Tooltip properties (comma-separated)',
        default: '',
      },
    ];
  }

  onload(): void {
    // Search bar
    this.searchBarEl = this.containerEl.createDiv({ cls: 'mol-search-bar' });

    this.searchInputEl = this.searchBarEl.createEl('input', {
      cls: 'mol-search-input',
      attr: { type: 'text', placeholder: 'Search molecules...' },
    });
    this.searchInputEl.addEventListener('input', () => this.onSearchInput());

    const modesEl = this.searchBarEl.createDiv({ cls: 'mol-search-modes' });

    this.textBtn = modesEl.createEl('button', {
      cls: 'mol-search-toggle is-active',
      text: 'Text',
    });
    this.smartsBtn = modesEl.createEl('button', {
      cls: 'mol-search-toggle',
      text: 'SMARTS',
    });

    const setMode = (mode: 'text' | 'smarts') => {
      this.searchMode = mode;
      this.textBtn!.toggleClass('is-active', mode === 'text');
      this.smartsBtn!.toggleClass('is-active', mode === 'smarts');
      this.searchInputEl!.placeholder = mode === 'text'
        ? 'Search molecules...'
        : 'SMARTS pattern...';
      this.applyFilter();
    };
    this.textBtn.addEventListener('click', () => setMode('text'));
    this.smartsBtn.addEventListener('click', () => setMode('smarts'));

    this.searchCountEl = this.searchBarEl.createDiv({ cls: 'mol-search-count' });

    // Grid
    this.gridEl = this.containerEl.createDiv({ cls: 'mol-grid' });

    // Create tooltip element (initially hidden)
    this.tooltipEl = this.containerEl.createDiv({ cls: 'mol-tooltip' });
    this.tooltipEl.style.display = 'none';

    // Event delegation: single click listener for all cards
    this.gridEl.addEventListener('click', (evt) => {
      const card = (evt.target as HTMLElement).closest('.mol-card') as HTMLElement;
      if (!card) return;
      const entry = this.entryMap.get(card);
      if (entry) this.plugin.app.workspace.getLeaf(false).openFile(entry.file);
    });

    // Event delegation: tooltip on hover
    this.gridEl.addEventListener('mouseover', (evt) => {
      const card = (evt.target as HTMLElement).closest('.mol-card') as HTMLElement;
      if (!card) return;
      if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = setTimeout(() => this.showTooltip(card), 300);
    });

    this.gridEl.addEventListener('mouseout', (evt) => {
      const card = (evt.target as HTMLElement).closest('.mol-card') as HTMLElement;
      if (!card) return;
      if (this.tooltipTimeout) {
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = null;
      }
      this.hideTooltip();
    });
  }

  onunload(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.svgCache.clear();
    this.cardInfos = [];
    this.rdkitRef = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    if (this.searchBarEl) {
      this.searchBarEl.remove();
      this.searchBarEl = null;
    }
    if (this.gridEl) {
      this.gridEl.remove();
      this.gridEl = null;
    }
    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
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
    this.rdkitRef = rdkit;
    this.cardInfos = [];

    const entries = this.data.data;

    // Helper: create a card element for one entry
    const createCard = (entry: BasesEntry): CardInfo => {
      const molValue = entry.getValue(molPropId);
      const molStr = molValue ? molValue.toString() : '';
      const labelValue = labelPropId ? entry.getValue(labelPropId) : null;
      const label = labelValue ? labelValue.toString() : entry.file.basename;

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

      const info: CardInfo = { card, svgContainer, molStr, entry };
      this.cardInfos.push(info);
      return info;
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
          const cacheKey = this.baseCacheKey(molStr);
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

    this.applyFilter();
  }

  private onSearchInput(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.applyFilter(), this.plugin.settings.searchDelay);
  }

  private applyFilter(): void {
    const query = this.searchInputEl?.value.trim() ?? '';
    const rdkit = this.rdkitRef;

    this.searchInputEl?.removeClass('mol-search-error');

    if (!query) {
      // Show all cards, restore original SVGs
      for (const info of this.cardInfos) {
        info.card.removeAttribute('data-hidden');
        this.restoreOriginalSvg(info);
      }
      // Re-observe any lazy containers that still need rendering
      if (this.observer) {
        for (const info of this.cardInfos) {
          if (info.svgContainer.dataset.mol) {
            this.observer.observe(info.svgContainer);
          }
        }
      }
      this.updateCount(this.cardInfos.length, this.cardInfos.length);
      return;
    }

    if (this.searchMode === 'text') {
      this.applyTextFilter(query);
    } else {
      // Disconnect observer while SMARTS filter is active to prevent race conditions
      // (observer would overwrite highlighted SVGs with plain ones)
      this.observer?.disconnect();
      this.applySmartsFilter(query, rdkit);
    }
  }

  private applyTextFilter(query: string): void {
    const lowerQuery = query.toLowerCase();
    let shown = 0;

    for (const info of this.cardInfos) {
      // Restore original SVG for text mode
      this.restoreOriginalSvg(info);

      let matches = false;

      // Check file basename
      if (info.entry.file.basename.toLowerCase().includes(lowerQuery)) {
        matches = true;
      }

      // Check frontmatter properties
      if (!matches) {
        const fm = this.plugin.app.metadataCache.getFileCache(info.entry.file)?.frontmatter;
        if (fm) {
          for (const key of Object.keys(fm)) {
            const val = fm[key];
            if (val != null && String(val).toLowerCase().includes(lowerQuery)) {
              matches = true;
              break;
            }
          }
        }
      }

      if (matches) {
        info.card.removeAttribute('data-hidden');
        shown++;
      } else {
        info.card.setAttribute('data-hidden', '');
      }
    }

    this.updateCount(shown, this.cardInfos.length);
  }

  private applySmartsFilter(query: string, rdkit: RDKitModule | null): void {
    if (!rdkit) return;

    let qmol: RDKitMol | null = null;
    try {
      qmol = rdkit.get_qmol(query);
      if (!qmol || !qmol.is_valid()) {
        // Invalid SMARTS — show error state on search input
        this.searchInputEl?.addClass('mol-search-error');
        // Keep current visibility unchanged
        return;
      }
    } catch {
      this.searchInputEl?.addClass('mol-search-error');
      return;
    }

    this.searchInputEl?.removeClass('mol-search-error');
    let shown = 0;
    const { removeHs, useCoords, smartsMatchAll, alignOnSmarts } = this.plugin.settings;

    for (const info of this.cardInfos) {
      if (!info.molStr.trim()) {
        info.card.setAttribute('data-hidden', '');
        continue;
      }

      let mol: RDKitMol | null = null;
      try {
        mol = rdkit.get_mol(info.molStr);
        if (!mol || !mol.is_valid()) {
          info.card.setAttribute('data-hidden', '');
          continue;
        }

        let atoms: number[];
        let bonds: number[];

        if (smartsMatchAll) {
          const matchesJson = mol.get_substruct_matches(qmol);
          const matches: Array<{ atoms: number[]; bonds: number[] }> = JSON.parse(matchesJson);
          if (!matches.length || !matches[0].atoms?.length) {
            info.card.setAttribute('data-hidden', '');
            this.restoreOriginalSvg(info);
            continue;
          }
          const atomSet = new Set<number>();
          const bondSet = new Set<number>();
          for (const m of matches) {
            for (const a of m.atoms) atomSet.add(a);
            for (const b of m.bonds) bondSet.add(b);
          }
          atoms = [...atomSet];
          bonds = [...bondSet];
        } else {
          const matchJson = mol.get_substruct_match(qmol);
          const match = JSON.parse(matchJson);
          if (!match.atoms || !match.atoms.length) {
            info.card.setAttribute('data-hidden', '');
            this.restoreOriginalSvg(info);
            continue;
          }
          atoms = match.atoms;
          bonds = match.bonds;
        }

        info.card.removeAttribute('data-hidden');
        shown++;

        // Render highlighted SVG
        const highlightKey = `${this.baseCacheKey(info.molStr)}||align=${alignOnSmarts}||smarts=${query}||all=${smartsMatchAll}`;
        const cachedHighlight = this.svgCache.get(highlightKey);
        delete info.svgContainer.dataset.mol;
        if (cachedHighlight) {
          info.svgContainer.innerHTML = cachedHighlight;
        } else {
          if (!useCoords) mol.set_new_coords();
          if (alignOnSmarts) mol.generate_aligned_coords(qmol, '');
          let renderMol: RDKitMol | null = null;
          try {
            if (removeHs) {
              const noHs = mol.remove_hs();
              renderMol = rdkit.get_mol(noHs);
            }
            const details = this.getDrawDetails({ atoms, bonds });
            const svg = (renderMol ?? mol).get_svg_with_highlights(details);
            this.svgCache.set(highlightKey, svg);
            info.svgContainer.innerHTML = svg;
          } finally {
            if (renderMol) renderMol.delete();
          }
        }
      } catch {
        info.card.setAttribute('data-hidden', '');
      } finally {
        if (mol) mol.delete();
      }
    }

    qmol.delete();
    this.updateCount(shown, this.cardInfos.length);
  }

  private restoreOriginalSvg(info: CardInfo): void {
    const cacheKey = this.baseCacheKey(info.molStr);
    const cached = this.svgCache.get(cacheKey);
    if (cached) {
      info.svgContainer.innerHTML = cached;
    } else if (info.molStr.trim() && !info.svgContainer.dataset.mol) {
      // Lazy container that was modified by a filter — restore dataset.mol
      // so the observer can render it when re-observed
      info.svgContainer.dataset.mol = info.molStr;
    }
  }

  private updateCount(shown: number, total: number): void {
    if (!this.searchCountEl) return;
    const query = this.searchInputEl?.value.trim() ?? '';
    if (!query) {
      this.searchCountEl.textContent = '';
    } else {
      this.searchCountEl.textContent = `${shown} of ${total}`;
    }
  }

  private baseCacheKey(molStr: string): string {
    const { removeHs, useCoords, bondLineWidth, transparentBg, comicMode } = this.plugin.settings;
    return `${molStr}||rh=${removeHs}||uc=${useCoords}||bw=${bondLineWidth}||tb=${transparentBg}||cm=${comicMode}`;
  }

  private getDrawDetails(extra?: Record<string, unknown>): string {
    const details: Record<string, unknown> = {};
    const { bondLineWidth, transparentBg, comicMode } = this.plugin.settings;
    if (bondLineWidth !== 1.0) details.bondLineWidth = bondLineWidth;
    if (transparentBg) details.clearBackground = false;
    if (comicMode) details.comicMode = true;
    if (extra) Object.assign(details, extra);
    return JSON.stringify(details);
  }

  private renderMolecule(rdkit: RDKitModule, molStr: string): string | null {
    const cacheKey = this.baseCacheKey(molStr);

    const cached = this.svgCache.get(cacheKey);
    if (cached) return cached;

    const { removeHs, useCoords } = this.plugin.settings;
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

      const svg = (renderMol ?? mol).get_svg_with_highlights(this.getDrawDetails());
      this.svgCache.set(cacheKey, svg);
      return svg;
    } catch {
      return null;
    } finally {
      if (renderMol) renderMol.delete();
      if (mol) mol.delete();
    }
  }

  private getTooltipEnabled(): boolean {
    return (this.config.get(CONFIG_KEYS.TOOLTIP_ENABLED) as boolean) ?? true;
  }

  private getTooltipMoleculeSize(): number {
    return (this.config.get(CONFIG_KEYS.TOOLTIP_MOLECULE_SIZE) as number) ?? 400;
  }

  private getTooltipProperties(): string[] {
    const propStr = (this.config.get(CONFIG_KEYS.TOOLTIP_PROPERTIES) as string) ?? '';
    if (!propStr.trim()) return [];
    return propStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
  }

  private async showTooltip(card: HTMLElement): Promise<void> {
    if (!this.tooltipEl) return;
    if (!this.getTooltipEnabled()) return;

    const entry = this.entryMap.get(card);
    if (!entry) return;

    const info = this.cardInfos.find(i => i.entry === entry);
    if (!info || !info.molStr.trim()) return;

    const molPropId = this.config.getAsPropertyId(CONFIG_KEYS.MOLECULE_PROPERTY);
    if (!molPropId) return;

    const tooltipSize = this.getTooltipMoleculeSize();
    const tooltipProps = this.getTooltipProperties();

    let rdkit = this.rdkitRef;
    if (!rdkit) {
      try {
        rdkit = await getRDKit(this.plugin);
        this.rdkitRef = rdkit;
      } catch {
        return;
      }
    }

    const cacheKey = `${this.baseCacheKey(info.molStr)}||size=${tooltipSize}`;
    let svg = this.svgCache.get(cacheKey);

    if (!svg) {
      let mol = null;
      let renderMol = null;
      try {
        mol = rdkit!.get_mol(info.molStr);
        if (!mol || !mol.is_valid()) return;

        if (!this.plugin.settings.useCoords) {
          mol.set_new_coords();
        }

        if (this.plugin.settings.removeHs) {
          const molblockNoHs = mol.remove_hs();
          renderMol = rdkit!.get_mol(molblockNoHs);
          if (!renderMol || !renderMol.is_valid()) return;
        }

        svg = (renderMol ?? mol).get_svg_with_highlights(this.getDrawDetails());
        if (svg) this.svgCache.set(cacheKey, svg);
      } catch {
        return;
      } finally {
        if (renderMol) renderMol.delete();
        if (mol) mol.delete();
      }
    }

    if (!svg) return;

    const fm = this.plugin.app.metadataCache.getFileCache(entry.file)?.frontmatter;
    let propsHtml = '';
    if (fm && Object.keys(fm).length > 0) {
      const keys = tooltipProps.length > 0 
        ? tooltipProps.filter(k => k in fm)
        : Object.keys(fm).filter(k => k !== 'position');
      
      if (keys.length > 0) {
        propsHtml = '<div class="mol-tooltip-props">';
        for (const key of keys) {
          const val = fm[key];
          if (val != null) {
            propsHtml += `<div class="mol-tooltip-prop">
              <span class="mol-tooltip-prop-key">${key}:</span>
              <span class="mol-tooltip-prop-value">${String(val)}</span>
            </div>`;
          }
        }
        propsHtml += '</div>';
      }
    }

    this.tooltipEl.innerHTML = `
      <div class="mol-tooltip-svg" style="width: ${tooltipSize}px; height: ${tooltipSize}px;">${svg}</div>
      ${propsHtml}
    `;

    const cardRect = card.getBoundingClientRect();
    const containerRect = this.containerEl.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();

    const tooltipHeight = tooltipRect.height || (tooltipSize + (propsHtml ? 150 : 0));

    const spaceAbove = cardRect.top - containerRect.top;
    const spaceBelow = containerRect.height - (cardRect.bottom - containerRect.top);

    let left = cardRect.left - containerRect.left + (cardRect.width / 2) - (tooltipSize / 2);
    let top: number;

    if (spaceAbove >= tooltipHeight + 8) {
      top = cardRect.top - containerRect.top - tooltipHeight - 8;
    } else if (spaceBelow >= tooltipHeight + 8) {
      top = cardRect.bottom - containerRect.top + 8;
    } else {
      top = cardRect.bottom - containerRect.top + 8;
    }

    if (left < 8) left = 8;
    if (left + tooltipSize > containerRect.width) left = containerRect.width - tooltipSize - 8;
    if (top < 8) top = 8;
    if (top + tooltipHeight > containerRect.height) top = containerRect.height - tooltipHeight - 8;

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.style.display = 'block';
  }

  private hideTooltip(): void {
    if (this.tooltipEl) {
      this.tooltipEl.style.display = 'none';
    }
  }
}
