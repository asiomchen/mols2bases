import type { ParsedMolecule } from './types';

/**
 * Parse an SDF file into individual molecules with their properties.
 * SDF format: multiple MOL blocks separated by $$$$ delimiters,
 * with property fields between M  END and $$$$.
 */
export function parseSdf(content: string): ParsedMolecule[] {
  const records = content.replace(/\r\n/g, '\n').split('$$$$');
  const molecules: ParsedMolecule[] = [];

  for (let i = 0; i < records.length; i++) {
    // Strip exactly one leading newline only for records after the first.
    // Records 1+ start with the newline that terminated the preceding $$$$ line,
    // which is not part of the molblock. The first record has no such prefix —
    // if it starts with \n that IS the blank title line and must be kept.
    let normalized = records[i];
    if (i > 0) {
      if (normalized.startsWith('\r\n')) normalized = normalized.slice(2);
      else if (normalized.startsWith('\n')) normalized = normalized.slice(1);
    }
    normalized = normalized.replace(/\s+$/, '');
    if (!normalized.trim()) continue;

    const endIdx = normalized.indexOf('M  END');
    if (endIdx === -1) continue;

    const molblock = normalized.substring(0, endIdx + 'M  END'.length);
    const propsSection = normalized.substring(endIdx + 'M  END'.length);
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
