# Import Robustness Design

**Date:** 2026-04-16
**Branch:** dup-names

## Context

The CSV and SDF import commands had two fragility points:

1. **CSV note naming** — the importer guessed a "name column" by taking the first non-SMILES column. This was unreliable and inconsistent with the SDF approach. The fix is to remove the heuristic entirely: note filenames are always `row_N`, and users pick name and molecule columns in the Bases view.

2. **Test coverage gaps** — duplicate molblock titles in SDF files and the `uniquePath` deduplication helper had no tests. `parseCsv` also had no tests.

## Changes

### 1. `src/csv-import.ts` — remove name-column heuristic

Remove `nameHeader` detection and use `row_${i + 1}` unconditionally as the note filename.

```diff
- const nameHeader = headers.find((h) => h !== smilesHeader);
  ...
- const name = (nameHeader && row[nameHeader]?.trim()) || `row_${i + 1}`;
+ const name = `row_${i + 1}`;
```

All CSV columns become frontmatter properties. The user selects name and molecule columns in the Bases view, consistent with how SMILES column selection already works.

### 2. `tests/data/dup_names.sdf` — move fixture into place

Move the untracked `dup_names.sdf` from the project root to `tests/data/` alongside the other SDF fixtures.

### 3. `tests/sdf-parser.test.ts` — duplicate-name parsing tests

New `describe` block using `dup_names.sdf`:

- Parses exactly 2 molecules
- Both molecules have molblock title `compound`
- Both contain `M  END`

### 4. `tests/import-utils.test.ts` — `uniquePath` deduplication tests

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

### 5. `tests/csv-parser.test.ts` — `parseCsv` unit tests

New file. Inline string fixtures only (no fixture file needed — `parseCsv` is a pure function).

Tests:
- Basic parse: headers and values returned correctly
- RFC 4180 quoting: `"hello, world"` treated as one field
- Escaped quotes: `""` inside a quoted field → `"`
- Empty trailing field: `a,b,` → third field is `""`
- Blank lines skipped
- SMILES column auto-detection (case-insensitive): `SMILES`, `smiles`, `Smiles` all matched by `headers.find`

## Files Modified

| File | Change |
|------|--------|
| `src/csv-import.ts` | Remove `nameHeader` detection, use `row_N` unconditionally |
| `tests/data/dup_names.sdf` | Move from project root |
| `tests/sdf-parser.test.ts` | Add dup-name describe block |
| `tests/import-utils.test.ts` | Add `uniquePath` describe block |
| `tests/csv-parser.test.ts` | New file: `parseCsv` unit tests |

## Verification

1. `npm test` — all tests pass
2. `npm run typecheck` — no type errors
3. `npm run build` — production build succeeds
4. Manual: import a CSV → notes named `row_1`, `row_2`, … with all columns as frontmatter
