export interface ParsedMolecule {
  molblock: string;
  properties: Record<string, string>;
}

export const VIEW_TYPE_MOLECULES = 'molecules';

export const CONFIG_KEYS = {
  MOLECULE_PROPERTY: 'moleculeProperty',
  LABEL_PROPERTY: 'labelProperty',
  CARD_WIDTH: 'cardWidth',
  CARD_HEIGHT: 'cardHeight',
} as const;
