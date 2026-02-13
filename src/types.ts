export interface ParsedMolecule {
  molblock: string;
  properties: Record<string, string>;
}

export const VIEW_TYPE_MOLECULES = 'molecules';

export interface Mols2BasesSettings {
  removeHs: boolean;
  useCoords: boolean;
  storeMolblock: boolean;
  lazyRender: boolean;
  searchDelay: number;
  smartsMatchAll: boolean;
  alignOnSmarts: boolean;
  bondLineWidth: number;
  transparentBg: boolean;
  comicMode: boolean;
}

export const DEFAULT_SETTINGS: Mols2BasesSettings = {
  removeHs: false,
  useCoords: true,
  storeMolblock: true,
  lazyRender: true,
  searchDelay: 300,
  smartsMatchAll: false,
  alignOnSmarts: true,
  bondLineWidth: 1.0,
  transparentBg: false,
  comicMode: false,
};

export const CONFIG_KEYS = {
  MOLECULE_PROPERTY: 'moleculeProperty',
  LABEL_PROPERTY: 'labelProperty',
  CARD_WIDTH: 'cardWidth',
  CARD_HEIGHT: 'cardHeight',
  TOOLTIP_ENABLED: 'tooltipEnabled',
  TOOLTIP_MOLECULE_SIZE: 'tooltipMoleculeSize',
  TOOLTIP_PROPERTIES: 'tooltipProperties',
} as const;
