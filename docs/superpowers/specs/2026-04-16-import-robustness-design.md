# Import Robustness Design

**Date:** 2026-04-16
**Branch:** dup-names

## Context

The CSV importer made two assumptions that are being removed:

1. **Name column** — guessed by taking the first non-SMILES column. Unreliable.
2. **SMILES column** — auto-detected case-insensitively using a configurable `csvSmilesField` setting. Unnecessary: users select molecule and name columns in the Bases view, the same way they already configure any other property.

The fix is to strip both heuristics from `importCsv`. All CSV columns become frontmatter properties as-is; no column gets special treatment at import time. The `.base` file is created without a pre-set molecule property. The `csvSmilesField` setting and its UI entry are removed.

A secondary goal is to fill test coverage gaps: `parseCsv`, `uniquePath`, and SDF duplicate-name parsing all lack tests.

## Changes

### 1. `src/csv-import.ts` — remove all column heuristics

- Remove `smilesHeader` detection (was: case-insensitive match against `csvSmilesField`)
- Remove `nameHeader` detection (was: first non-smiles header)
- Note filename: always `row_${i + 1}`
- Frontmatter: all columns written as-is, no column skipped or promoted
- `.base` file: created without a molecule property (`buildBaseFile(path)` with no second arg)
- Remove the "No SMILES column found" warning notice

### 2. `src/types.ts` — remove `csvSmilesField`

Remove `csvSmilesField: string` from `Mols2BasesSettings` and its default value `'smiles'`.

### 3. `src/settings-tab.ts` — remove SMILES field setting

Remove the text input for `csvSmilesField` from the settings UI.

### 4. `tests/data/dup_names.sdf` — move fixture into place

Move untracked `dup_names.sdf` from the project root to `tests/data/`.

### 5. `tests/sdf-parser.test.ts` — duplicate-name parsing tests

New `describe` block using `dup_names.sdf`:

- Parses exactly 2 molecules
- Both molecules have molblock title `compound`
- Both contain `M  END`

### 6. `tests/import-utils.test.ts` — `uniquePath` deduplication tests

New `describe` block with a minimal in-memory mock:

```ts
const mockApp = (existing: string[]) => ({
  vault: { adapter: { exists: async (p: string) => existing.includes(p) } },
});
```

Tests:
- Path not taken → returned as-is
- First collision → appends `_1`
- Multiple collisions → increments until a free slot is found (`_1` taken → returns `_2`)

### 7. `tests/csv-parser.test.ts` — `parseCsv` unit tests

New file. Inline string fixtures only (`parseCsv` is a pure function).

Tests:
- Basic parse: headers and values returned correctly
- RFC 4180 quoting: `"hello, world"` treated as one field
- Escaped quotes: `""` inside a quoted field → `"`
- Empty trailing field: `a,b,` → third field is `""`
- Blank lines skipped

## Files Modified

| File | Change |
|------|--------|
| `src/csv-import.ts` | Remove `smilesHeader` + `nameHeader` heuristics; all columns → frontmatter as-is |
| `src/types.ts` | Remove `csvSmilesField` from interface and defaults |
| `src/settings-tab.ts` | Remove `csvSmilesField` settings UI entry |
| `tests/data/dup_names.sdf` | Move from project root |
| `tests/sdf-parser.test.ts` | Add dup-name describe block |
| `tests/import-utils.test.ts` | Add `uniquePath` describe block |
| `tests/csv-parser.test.ts` | New file: `parseCsv` unit tests |

## Verification

1. `npm test` — all tests pass
2. `npm run typecheck` — no type errors
3. `npm run lint` — no lint errors
4. `npm run build` — production build succeeds
5. Manual: import a CSV → notes named `row_1`, `row_2`, … with all columns as frontmatter; `.base` file opens with no molecule property pre-selected
