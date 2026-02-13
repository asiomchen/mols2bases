import type { ParsedMolecule } from './types';

/**
 * Parse an SDF file into individual molecules with their properties.
 * SDF format: multiple MOL blocks separated by $$$$ delimiters,
 * with property fields between M  END and $$$$.
 */
export function parseSdf(content: string): ParsedMolecule[] {
  const records = content.split('$$$$');
  const molecules: ParsedMolecule[] = [];

  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed) continue;

    const endIdx = trimmed.indexOf('M  END');
    if (endIdx === -1) continue;

    const molblock = trimmed.substring(0, endIdx + 'M  END'.length);
    const propsSection = trimmed.substring(endIdx + 'M  END'.length);
    const properties = parseProperties(propsSection);

    molecules.push({ molblock, properties });
  }

  return molecules;
}

function parseProperties(section: string): Record<string, string> {
  const props: Record<string, string> = {};
  const lines = section.split('\n');

  let currentKey: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^>\s+<([^>]+)>/);
    if (headerMatch) {
      // Save previous property
      if (currentKey !== null) {
        props[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = headerMatch[1];
      currentValue = [];
    } else if (currentKey !== null) {
      if (line.trim() === '') {
        // Blank line ends the property value
        props[currentKey] = currentValue.join('\n').trim();
        currentKey = null;
        currentValue = [];
      } else {
        currentValue.push(line);
      }
    }
  }

  // Save last property if not yet saved
  if (currentKey !== null) {
    props[currentKey] = currentValue.join('\n').trim();
  }

  return props;
}
