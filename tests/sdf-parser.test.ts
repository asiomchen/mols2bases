import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { parseSdf } from '../src/sdf-parser';

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
