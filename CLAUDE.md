# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run build` — Production build (minified, no sourcemaps)
- `npm run dev` — Development build (with inline sourcemaps)

Both output `main.js` to the project root and copy `RDKit_minimal.js` + `RDKit_minimal.wasm` from `node_modules/@rdkit/rdkit/dist/`.

No test framework is configured yet.

## Architecture

Obsidian plugin that adds molecule visualization to Obsidian Bases (requires Obsidian ≥1.10.0). Features:

1. **Molecule Grid View** — A custom Bases view type (`molecules`) rendering molecular structures as SVG cards via RDKit.js. Supports text search (filename/frontmatter) and SMARTS substructure search with match highlighting. Lazy rendering via IntersectionObserver for large datasets.
2. **SDF Import** — A command that parses SDF files into one-note-per-molecule with frontmatter properties, plus a `.base` file
3. **CSV Import** — A command that parses CSV files (with a `smiles` column) into one-note-per-row with frontmatter properties, plus a `.base` file

### Source Files

- **`src/main.ts`** — Plugin entry. Registers the `molecules` Bases view via `registerBasesView()` and the `import-sdf` and `import-csv` commands.
- **`src/molecule-view.ts`** — `MoleculeView` extends `BasesView`. Reads molecule data from entry properties, renders SVG grid with event delegation for clicks/hovers. Has an SVG cache keyed by `molStr||settings[||smarts]`. Supports lazy rendering (IntersectionObserver) and search (text + SMARTS with substructure highlighting). Must call `mol.delete()` after each RDKit render to prevent WASM memory leaks.
- **`src/rdkit-loader.ts`** — Singleton lazy loader for RDKit WASM. Reads `RDKit_minimal.js` + `.wasm` from the plugin directory via Obsidian's vault adapter, injects JS as a blob URL `<script>`, then calls `initRDKitModule({ wasmBinary })`. Deduplicates concurrent init calls.
- **`src/sdf-parser.ts`** — Pure function `parseSdf()`. No dependencies. Splits on `$$$$`, extracts MOL blocks (up to `M  END`), parses `> <NAME>` property headers.
- **`src/import-utils.ts`** — Shared helpers for file import: `pickFile`, `readFileAsText`, `buildYaml`, `buildBaseFile`, `sanitizeFilename`, `uniquePath`.
- **`src/sdf-import.ts`** — SDF import command. Creates notes with YAML frontmatter (SMILES converted from MOL block via RDKit, plus all SDF properties). Generates a `.base` file scoped to the import folder.
- **`src/csv-import.ts`** — CSV import command. Parses CSV with RFC 4180 quoting, auto-detects `smiles` column, creates notes with frontmatter. No RDKit dependency.
- **`src/types.ts`** — Shared interfaces (`ParsedMolecule`, `Mols2BasesSettings`) and config key constants.
- **`src/settings-tab.ts`** — `Mols2BasesSettingTab` plugin settings UI with toggles for `removeHs`, `useCoords`, `storeMolblock`, `lazyRender`, and a text input for `searchDelay`.

### Key Patterns

- **Bases API** (not yet in public obsidian typings): `registerBasesView(id, { name, icon, factory, options })`. The view accesses data via `this.data.data` (array of `BasesEntry`), config via `this.config.get(key)` / `this.config.getAsPropertyId(key)`. Lifecycle: constructor → `onload()` → `onDataUpdated()` (repeats) → `onunload()`.
- **RDKit types** are declared locally in `rdkit-loader.ts` since `@rdkit/rdkit` is only used at runtime for its WASM files, not imported as a TypeScript module.
- **esbuild** bundles everything into CJS, externalizing `obsidian`, `electron`, and CodeMirror packages. A custom plugin copies WASM files post-build.
- **Settings** are defined in `Mols2BasesSettings` (`src/types.ts`): `removeHs` (bool, default false — strip Hs before render), `useCoords` (bool, default true — use input coords; false regenerates 2D), `storeMolblock` (bool, default true — include MOL block in frontmatter on SDF import), `lazyRender` (bool, default true — defer rendering to IntersectionObserver), `searchDelay` (number, default 300 — debounce delay in ms for search input).

## Docs

- `docs/features.md` — List of implemented features, kept up to date as new functionality is added.

## Keeping docs in sync

When updating CLAUDE.md, also update AGENTS.md with the same information, and vice versa. Both files should stay consistent.

## Install in Obsidian

Copy `main.js`, `manifest.json`, `styles.css`, `RDKit_minimal.js`, `RDKit_minimal.wasm` into `.obsidian/plugins/mols2bases/` in a vault.
