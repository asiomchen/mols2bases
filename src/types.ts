export interface ParsedMolecule {
  molblock: string;
  properties: Record<string, string>;
}

export const VIEW_TYPE_MOLECULES = 'molecules';

export interface Mols2BasesSettings {
  explicitHydrogens: boolean;
  storeMolblock: boolean;
  coordinateMode: 'as-is' | '2d-only';
}

export const DEFAULT_SETTINGS: Mols2BasesSettings = {
  explicitHydrogens: false,
  storeMolblock: true,
  coordinateMode: 'as-is',
};

export const CONFIG_KEYS = {
  MOLECULE_PROPERTY: 'moleculeProperty',
  LABEL_PROPERTY: 'labelProperty',
  CARD_WIDTH: 'cardWidth',
  CARD_HEIGHT: 'cardHeight',
} as const;
