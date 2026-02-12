# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `npm run build` — Production build (minified, no sourcemaps)
- `npm run dev` — Development build (with inline sourcemaps)

Both output `main.js` to the project root and copy `RDKit_minimal.js` + `RDKit_minimal.wasm` from `node_modules/@rdkit/rdkit/dist/`.

No test framework is configured yet.

## Architecture

Obsidian plugin that adds molecule visualization to Obsidian Bases (requires Obsidian ≥1.10.0). Two features:

1. **Molecule Grid View** — A custom Bases view type (`molecules`) rendering molecular structures as SVG cards via RDKit.js
2. **SDF Import** — A command that parses SDF files into one-note-per-molecule with frontmatter properties, plus a `.base` file

### Source Files

- **`src/main.ts`** — Plugin entry. Registers the `molecules` Bases view via `registerBasesView()` and the `import-sdf` command.
- **`src/molecule-view.ts`** — `MoleculeView` extends `BasesView`. Reads molecule data from entry properties, renders SVG grid. Has an SVG cache keyed by molecule string. Must call `mol.delete()` after each RDKit render to prevent WASM memory leaks.
- **`src/rdkit-loader.ts`** — Singleton lazy loader for RDKit WASM. Reads `RDKit_minimal.js` + `.wasm` from the plugin directory via Obsidian's vault adapter, injects JS as a blob URL `<script>`, then calls `initRDKitModule({ wasmBinary })`. Deduplicates concurrent init calls.
- **`src/sdf-parser.ts`** — Pure function `parseSdf()`. No dependencies. Splits on `$$$$`, extracts MOL blocks (up to `M  END`), parses `> <NAME>` property headers.
- **`src/sdf-import.ts`** — Import command implementation. Uses browser `<input type="file">` for file picking, `FileReader` for reading. Creates notes with YAML frontmatter (SMILES converted from MOL block via RDKit, plus all SDF properties). Generates a `.base` file scoped to the import folder.
- **`src/types.ts`** — Shared interfaces (`ParsedMolecule`) and config key constants.

### Key Patterns

- **Bases API** (not yet in public obsidian typings): `registerBasesView(id, { name, icon, factory, options })`. The view accesses data via `this.data.data` (array of `BasesEntry`), config via `this.config.get(key)` / `this.config.getAsPropertyId(key)`. Lifecycle: constructor → `onload()` → `onDataUpdated()` (repeats) → `onunload()`.
- **RDKit types** are declared locally in `rdkit-loader.ts` since `@rdkit/rdkit` is only used at runtime for its WASM files, not imported as a TypeScript module.
- **esbuild** bundles everything into CJS, externalizing `obsidian`, `electron`, and CodeMirror packages. A custom plugin copies WASM files post-build.

## Install in Obsidian

Copy `main.js`, `manifest.json`, `styles.css`, `RDKit_minimal.js`, `RDKit_minimal.wasm` into `.obsidian/plugins/mols2bases/` in a vault.
