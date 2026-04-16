import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { parseSdf } from '../src/sdf-parser';
import { buildYaml } from '../src/import-utils';

const SDF_PATH = join(__dirname, 'data', 'missing_names.sdf');
const sdfContent = readFileSync(SDF_PATH, 'utf-8');

const NO_NAME_PATH = join(__dirname, 'data', 'no_name_at_all.sdf');
const noNameContent = readFileSync(NO_NAME_PATH, 'utf-8');

describe('parseSdf – missing_names.sdf', () => {
  const mols = parseSdf(sdfContent);

  it('parses exactly 3 molecules', () => {
    expect(mols).toHaveLength(3);
  });

  it('mol 1 – title "with_name" is on the first molblock line', () => {
    const firstLine = mols[0].molblock.split('\n')[0];
    expect(firstLine).toBe('with_name');
  });

  it('mol 2 – blank title line is preserved (molblock starts with \\n)', () => {
    expect(mols[1].molblock.startsWith('\n')).toBe(true);
    const firstLine = mols[1].molblock.split('\n')[0];
    expect(firstLine).toBe('');
  });

  it('mol 3 – title "caffeine" is on the first molblock line', () => {
    const firstLine = mols[2].molblock.split('\n')[0];
    expect(firstLine).toBe('caffeine');
  });

  it('all 3 molecules have M  END in their molblock', () => {
    for (const mol of mols) {
      expect(mol.molblock).toContain('M  END');
    }
  });

  it('all 3 molecules have PUBCHEM_COMPOUND_CID = "2519"', () => {
    for (const mol of mols) {
      expect(mol.properties['PUBCHEM_COMPOUND_CID']).toBe('2519');
    }
  });
});

describe('parseSdf – no_name_at_all.sdf', () => {
  const mols = parseSdf(noNameContent);

  it('parses exactly 2 molecules', () => {
    expect(mols).toHaveLength(2);
  });

  it('mol 1 – blank title line is preserved (molblock starts with \\n)', () => {
    expect(mols[0].molblock.startsWith('\n')).toBe(true);
    const firstLine = mols[0].molblock.split('\n')[0];
    expect(firstLine).toBe('');
  });

  it('mol 2 – blank title line is preserved (molblock starts with \\n)', () => {
    expect(mols[1].molblock.startsWith('\n')).toBe(true);
    const firstLine = mols[1].molblock.split('\n')[0];
    expect(firstLine).toBe('');
  });

  it('both molecules have M  END in their molblock', () => {
    for (const mol of mols) {
      expect(mol.molblock).toContain('M  END');
    }
  });

  it('neither molecule has properties', () => {
    for (const mol of mols) {
      expect(Object.keys(mol.properties)).toHaveLength(0);
    }
  });
});

const NO_NAME_SPACES_PATH = join(__dirname, 'data', 'no_name_spaces.sdf');
const noNameSpacesContent = readFileSync(NO_NAME_SPACES_PATH, 'utf-8');

describe('parseSdf – no_name_spaces.sdf', () => {
  const mols = parseSdf(noNameSpacesContent);

  it('parses exactly 2 molecules', () => {
    expect(mols).toHaveLength(2);
  });

  it('mol 1 – title line is 3 spaces (not empty, not named)', () => {
    // Title line is "   " (3 spaces): distinct from both blank (\n) and named titles.
    // parseSdf must preserve it as-is so buildYaml can detect the whitespace-only
    // first line and choose |2- over |.
    const firstLine = mols[0].molblock.split('\n')[0];
    expect(firstLine).toBe('   ');
  });

  it('mol 1 – molblock does NOT start with \\n (whitespace title, not blank title)', () => {
    expect(mols[0].molblock.startsWith('\n')).toBe(false);
    expect(mols[0].molblock.startsWith('   ')).toBe(true);
  });

  it('mol 1 – buildYaml uses |2- to prevent YAML indent auto-detection corruption', () => {
    // Without |2-, YAML detects indent=4 from the first non-whitespace line
    // ("    -INDIGO...") and strips 4 spaces from every line, corrupting the molblock.
    const yaml = buildYaml({ _m2b_molblock: mols[0].molblock });
    expect(yaml).toMatch(/^_m2b_molblock: \|2-$/m);
  });

  it('mol 1 – molblock content is preserved correctly through buildYaml', () => {
    const yaml = buildYaml({ _m2b_molblock: mols[0].molblock });
    const lines = yaml.split('\n');
    const headerIdx = lines.findIndex((l) => l.startsWith('_m2b_molblock:'));
    // Title line: 2-space YAML indent + 3 spaces = 5 spaces
    expect(lines[headerIdx + 1]).toBe('     ');
    // Program line: 2-space YAML indent + "  -INDIGO-..." (2 leading spaces preserved)
    expect(lines[headerIdx + 2]).toBe('    -INDIGO-04142622472D');
  });

  it('mol 2 – blank title line (starts with \\n after leading-newline strip)', () => {
    expect(mols[1].molblock.startsWith('\n')).toBe(true);
  });

  it('both molecules have M  END in their molblock', () => {
    for (const mol of mols) {
      expect(mol.molblock).toContain('M  END');
    }
  });

  it('neither molecule has properties', () => {
    for (const mol of mols) {
      expect(Object.keys(mol.properties)).toHaveLength(0);
    }
  });
});

const DUP_PATH = join(__dirname, 'data', 'dup_names.sdf');
const dupContent = readFileSync(DUP_PATH, 'utf-8');

describe('parseSdf – dup_names.sdf', () => {
  const mols = parseSdf(dupContent);

  it('parses exactly 2 molecules', () => {
    expect(mols).toHaveLength(2);
  });

  it('both molecules have molblock title "compound"', () => {
    for (const mol of mols) {
      const firstLine = mol.molblock.split('\n')[0];
      expect(firstLine).toBe('compound');
    }
  });

  it('both molecules contain M  END', () => {
    for (const mol of mols) {
      expect(mol.molblock).toContain('M  END');
    }
  });
});
