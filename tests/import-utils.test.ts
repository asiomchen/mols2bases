import { describe, it, expect } from 'vitest';
import { buildYaml, uniquePath } from '../src/import-utils';

// Minimal molblock fragments used across tests
const HEADER_LINE = ' -OEChem-04032607062D';
const NAMED_MOLBLOCK = `with_name\n${HEADER_LINE}\n\nM  END`;
const BLANK_TITLE_MOLBLOCK = `\n${HEADER_LINE}\n\nM  END`;
const SPACE_TITLE_MOLBLOCK = ` \n${HEADER_LINE}\n\nM  END`;
const MULTI_SPACE_TITLE_MOLBLOCK = `   \n${HEADER_LINE}\n\nM  END`;

describe('buildYaml – block scalar headers', () => {
  it('named molblock uses plain | header', () => {
    const yaml = buildYaml({ _m2b_molblock: NAMED_MOLBLOCK });
    expect(yaml).toMatch(/^_m2b_molblock: \|$/m);
    expect(yaml).not.toContain('|2-');
  });

  it('blank-title molblock uses |2- header', () => {
    const yaml = buildYaml({ _m2b_molblock: BLANK_TITLE_MOLBLOCK });
    expect(yaml).toMatch(/^_m2b_molblock: \|2-$/m);
  });

  it('space-only title molblock uses |2- header', () => {
    // no_first_name.sdf: title line is a single space, not a blank line
    const yaml = buildYaml({ _m2b_molblock: SPACE_TITLE_MOLBLOCK });
    expect(yaml).toMatch(/^_m2b_molblock: \|2-$/m);
  });

  it('multi-space title molblock uses |2- header', () => {
    const yaml = buildYaml({ _m2b_molblock: MULTI_SPACE_TITLE_MOLBLOCK });
    expect(yaml).toMatch(/^_m2b_molblock: \|2-$/m);
  });

  it('multi-space title molblock preserves title line and header line', () => {
    const yaml = buildYaml({ _m2b_molblock: MULTI_SPACE_TITLE_MOLBLOCK });
    const lines = yaml.split('\n');
    const headerIdx = lines.findIndex((l) => l.startsWith('_m2b_molblock:'));
    // Line after header: 2-space YAML indent + 3 spaces of title = 5 spaces
    expect(lines[headerIdx + 1]).toBe('     ');
    // Line after that: 2-space YAML indent + the OEChem header line
    expect(lines[headerIdx + 2]).toBe(`  ${HEADER_LINE}`);
  });

  it('|2- block scalar preserves the leading blank line', () => {
    const yaml = buildYaml({ _m2b_molblock: BLANK_TITLE_MOLBLOCK });
    // After the header line the very next line must be empty (the blank title)
    const lines = yaml.split('\n');
    const headerIdx = lines.findIndex((l) => l.startsWith('_m2b_molblock:'));
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(lines[headerIdx + 1]).toBe('  '); // 2-space indent + blank title
  });

  it('single-line value without special chars is emitted bare', () => {
    const yaml = buildYaml({ smiles: 'CCO' });
    expect(yaml.trim()).toBe('smiles: CCO');
  });

  it('single-line value with special chars is JSON-quoted', () => {
    // [ is in the quote-trigger regex
    const yaml = buildYaml({ smiles: '[NH4+]' });
    expect(yaml.trim()).toBe('smiles: "[NH4+]"');
  });
});

describe('buildYaml – frontmatter round-trip for missing_names.sdf molecules', () => {
  it('mol 1 (named) produces valid block scalar without |2-', () => {
    const yaml = buildYaml({
      _m2b_molblock: NAMED_MOLBLOCK,
      _m2b_smiles: 'CCO',
      pubchem_compound_cid: '2519',
    });
    expect(yaml).toContain('_m2b_molblock: |');
    expect(yaml).not.toContain('|2-');
    expect(yaml).toContain('pubchem_compound_cid: 2519');
  });

  it('mol 2 (blank title) produces |2- block scalar', () => {
    const yaml = buildYaml({
      _m2b_molblock: BLANK_TITLE_MOLBLOCK,
      _m2b_smiles: 'CCO',
      pubchem_compound_cid: '2519',
    });
    expect(yaml).toContain('_m2b_molblock: |2-');
    expect(yaml).toContain('pubchem_compound_cid: 2519');
  });

  it('mol 1 of no_name_at_all (blank title, first record) produces |2-', () => {
    const indigoMolblock = `\n  -INDIGO-04142622472D\n\n  6  6  0  0\nM  END`;
    const yaml = buildYaml({ _m2b_molblock: indigoMolblock, _m2b_smiles: 'c1ccccc1' });
    expect(yaml).toContain('_m2b_molblock: |2-');
  });

  it('mol 3 (caffeine title) produces valid block scalar without |2-', () => {
    const caffeineMolblock = `caffeine\n${HEADER_LINE}\n\nM  END`;
    const yaml = buildYaml({
      _m2b_molblock: caffeineMolblock,
      _m2b_smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C',
      pubchem_compound_cid: '2519',
    });
    expect(yaml).toContain('_m2b_molblock: |');
    expect(yaml).not.toContain('|2-');
  });
});

describe('uniquePath – deduplication', () => {
  const mockApp = (existing: string[]) =>
    ({ vault: { adapter: { exists: async (p: string) => existing.includes(p) } } }) as never;

  it('returns the path unchanged when it does not exist', async () => {
    const result = await uniquePath(mockApp([]), 'folder/mol.md');
    expect(result).toBe('folder/mol.md');
  });

  it('appends _1 when the base path is taken', async () => {
    const result = await uniquePath(mockApp(['folder/mol.md']), 'folder/mol.md');
    expect(result).toBe('folder/mol_1.md');
  });

  it('increments past _1 when both base and _1 are taken', async () => {
    const result = await uniquePath(
      mockApp(['folder/mol.md', 'folder/mol_1.md']),
      'folder/mol.md',
    );
    expect(result).toBe('folder/mol_2.md');
  });
});
