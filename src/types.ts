export interface ParsedMolecule {
  molblock: string;
  properties: Record<string, string>;
}

export const VIEW_TYPE_MOLECULES = 'molecules';

export interface Mols2BasesSettings {
  removeHs: boolean;
  useCoords: boolean;
  storeMolblock: boolean;
}

export const DEFAULT_SETTINGS: Mols2BasesSettings = {
  removeHs: false,
  useCoords: true,
  storeMolblock: true,
};

export const CONFIG_KEYS = {
  MOLECULE_PROPERTY: 'moleculeProperty',
  LABEL_PROPERTY: 'labelProperty',
  CARD_WIDTH: 'cardWidth',
  CARD_HEIGHT: 'cardHeight',
} as const;
