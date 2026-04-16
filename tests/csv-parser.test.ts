import { describe, it, expect } from 'vitest';
import { parseCsv } from '../src/csv-import';

describe('parseCsv – basic parsing', () => {
  it('returns headers and row values', () => {
    const { headers, rows } = parseCsv('name,smiles\naspirin,CC(=O)Oc1ccccc1C(=O)O');
    expect(headers).toEqual(['name', 'smiles']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ name: 'aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' });
  });

  it('skips blank lines between data rows', () => {
    const { rows } = parseCsv('name,smiles\n\naspirin,CCO\n\n');
    expect(rows).toHaveLength(1);
  });

  it('returns empty headers and rows for empty input', () => {
    const { headers, rows } = parseCsv('');
    expect(headers).toEqual([]);
    expect(rows).toHaveLength(0);
  });
});

describe('parseCsv – RFC 4180 quoting', () => {
  it('treats a quoted field containing a comma as one field', () => {
    const { rows } = parseCsv('name,note\naspirin,"painkiller, fever reducer"');
    expect(rows[0]['note']).toBe('painkiller, fever reducer');
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const { rows } = parseCsv('name,note\ntest,"say ""hello"""');
    expect(rows[0]['note']).toBe('say "hello"');
  });

  it('empty trailing field is empty string', () => {
    const { rows } = parseCsv('a,b,c\n1,2,');
    expect(rows[0]['c']).toBe('');
  });
});
