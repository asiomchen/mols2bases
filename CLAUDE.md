# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

- **Target**: Obsidian Community Plugin (TypeScript → bundled JavaScript).
- **Entry point**: `src/main.ts` compiled to `main.js` and loaded by Obsidian.
- **Required release artifacts**: `main.js`, `manifest.json`, and optional `styles.css`.

Obsidian plugin that adds molecule visualization to Obsidian Bases (requires Obsidian ≥1.10.0). Uses RDKit.js for rendering molecular structures. Features: molecule grid view (with text + SMARTS search and lazy rendering), SDF import, and CSV import.

## Environment & Tooling

- **Node.js**: use current LTS (Node 18+ recommended).
- **Package manager**: npm (required - `package.json` defines npm scripts and dependencies).
- **Bundler**: esbuild (required - `esbuild.config.mjs` and build scripts depend on it).
- **Types**: `obsidian` type definitions.

## Install

```bash
npm install
```

## Build Commands

- `npm run build` — Production build (minified, no sourcemaps)
- `npm run dev` — Development build (with inline sourcemaps)
- `npm run lint` — Lint with ESLint (includes `eslint-plugin-obsidianmd`)
- `npm run lint:fix` — Auto-fix ESLint issues
- `npm run format` — Format with Prettier
- `npm run format:check` — Check formatting without writing
- `npm run typecheck` — Type-check without emitting (`tsc --noEmit`)

Both build commands output `main.js` to the project root. RDKit WASM files (`RDKit_minimal.js` + `RDKit_minimal.wasm`) are downloaded automatically from unpkg CDN on first use and cached in the plugin directory.

**No test framework is configured yet.**

## TypeScript Configuration

The project uses strict TypeScript with these settings (from `tsconfig.json`):

- `strict: true`
- `moduleResolution: node`
- Target: ES2020

## Linting & Formatting

Uses [ESLint](https://eslint.org/) for linting and [Prettier](https://prettier.io/) for formatting:

- **ESLint** (`eslint.config.mjs`): `@eslint/js` recommended + `typescript-eslint` recommended + [`eslint-plugin-obsidianmd`](https://github.com/obsidianmd/eslint-plugin) recommended rules. `eslint-config-prettier` disables conflicting rules. `no-explicit-any` and `no-non-null-assertion` are off (Obsidian patterns). Type info is provided via `projectService` for obsidianmd rules that need it.
- **Prettier** (`.prettierrc.json`): 2-space indent, line width 100, single quotes, trailing commas, semicolons.

**Pre-commit hook**: Husky + lint-staged auto-runs `eslint --fix` and `prettier --write` on staged `.ts` files before each commit.

## File & Folder Conventions

- **Organize code into multiple files**: Split functionality across separate modules rather than putting everything in `main.ts`.
- Source lives in `src/`. Keep `main.ts` small and focused on plugin lifecycle (loading, unloading, registering commands).

```
src/
  main.ts          # Plugin entry point
  molecule-view.ts # MoleculeView extends BasesView (grid, search, lazy render)
  rdkit-loader.ts  # RDKit WASM lazy loader + types
  sdf-parser.ts    # Pure function parseSdf()
  sdf-import.ts    # SDF import command
  csv-import.ts    # CSV import command
  import-utils.ts  # Shared file import helpers
  types.ts         # Interfaces and constants
  settings-tab.ts  # Settings UI
```

## Manifest Rules (`manifest.json`)

- Must include: `id`, `name`, `version` (Semantic Versioning `x.y.z`), `minAppVersion`, `description`, `isDesktopOnly` (boolean)
- Optional: `author`, `authorUrl`, `fundingUrl`
- Never change `id` after release. Treat it as stable API.
- Keep `minAppVersion` accurate when using newer APIs.

## Testing

Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` (if any) to:

```
<Vault>/.obsidian/plugins/<plugin-id>/
```

Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Commands & Settings

- Any user-facing commands should be added via `this.addCommand(...)`.
- If the plugin has configuration, provide a settings tab and sensible defaults.
- Persist settings using `this.loadData()` / `this.saveData()`.
- Use stable command IDs; avoid renaming once released.

## Versioning & Releases

- Bump `version` in `manifest.json` (SemVer) and update `versions.json` to map plugin version → minimum app version.
- Create a GitHub release whose tag exactly matches `manifest.json`'s `version`. Do not use a leading `v`.
- Attach `manifest.json`, `main.js`, and `styles.css` (if present) to the release as individual assets.

## Security, Privacy, and Compliance

- Default to local/offline operation. Only make network requests when essential to the feature.
- No hidden telemetry. If you collect optional analytics or call third-party services, require explicit opt-in and document clearly.
- Never execute remote code, fetch and eval scripts, or auto-update plugin code outside of normal releases.
- Minimize scope: read/write only what's necessary inside the vault. Do not access files outside the vault.
- Clearly disclose any external services used, data sent, and risks.
- Respect user privacy. Do not collect vault contents, filenames, or personal information unless absolutely necessary and explicitly consented.
- Avoid deceptive patterns, ads, or spammy notifications.
- Register and clean up all DOM, app, and interval listeners using the provided `register*` helpers so the plugin unloads safely.

## UX & Copy Guidelines

- Prefer sentence case for headings, buttons, and titles.
- Use clear, action-oriented imperatives in step-by-step copy.
- Use **bold** to indicate literal UI labels. Prefer "select" for interactions.
- Use arrow notation for navigation: **Settings → Community plugins**.
- Keep in-app strings short, consistent, and free of jargon.

## Performance

- Keep startup light. Defer heavy work until needed.
- Avoid long-running tasks during `onload`; use lazy initialization.
- Batch disk access and avoid excessive vault scans.
- Debounce/throttle expensive operations in response to file system events.

## Mobile

- Where feasible, test on iOS and Android.
- Don't assume desktop-only behavior unless `isDesktopOnly` is `true`.
- Avoid large in-memory structures; be mindful of memory and storage constraints.

## Agent Do/Don't

**Do**

- Add commands with stable IDs (don't rename once released).
- Provide defaults and validation in settings.
- Write idempotent code paths so reload/unload doesn't leak listeners or intervals.
- Use `this.register*` helpers for everything that needs cleanup.

**Don't**

- Introduce network calls without an obvious user-facing reason and documentation.
- Ship features that require cloud services without clear disclosure and explicit opt-in.
- Store or transmit vault contents unless essential and consented.

## Architecture

Obsidian plugin that adds molecule visualization to Obsidian Bases. Features:

1. **Molecule Grid View** — A custom Bases view type (`molecules`) rendering molecular structures as SVG cards via RDKit.js. Supports text search (filename/frontmatter) and SMARTS substructure search with match highlighting. Lazy rendering via IntersectionObserver for large datasets.
2. **SDF Import** — A command that parses SDF files into one-note-per-molecule with frontmatter properties, plus a `.base` file
3. **CSV Import** — A command that parses CSV files (with a `smiles` column) into one-note-per-row with frontmatter properties, plus a `.base` file

### Source Files

- **`src/main.ts`** — Plugin entry. Registers the `molecules` Bases view via `registerBasesView()` and the `import-sdf` and `import-csv` commands.
- **`src/molecule-view.ts`** — `MoleculeView` extends `BasesView`. Reads molecule data from entry properties, renders SVG grid with event delegation for clicks/hovers. Has an SVG cache keyed by `molStr||settings[||smarts]`. Supports lazy rendering (IntersectionObserver) and search (text + SMARTS with substructure highlighting). Must call `mol.delete()` after each RDKit render to prevent WASM memory leaks.
- **`src/rdkit-loader.ts`** — Singleton lazy loader for RDKit WASM. On first use, downloads `RDKit_minimal.js` + `.wasm` from unpkg CDN (version-pinned) and caches them in the plugin directory. Injects JS as a blob URL `<script>`, then calls `initRDKitModule({ wasmBinary })`. Deduplicates concurrent init calls. Uses Obsidian's `requestUrl` for downloads.
- **`src/sdf-parser.ts`** — Pure function `parseSdf()`. No dependencies. Splits on `$$$$`, extracts MOL blocks (up to `M  END`), parses `> <NAME>` property headers.
- **`src/import-utils.ts`** — Shared helpers for file import: `pickFile`, `readFileAsText`, `buildYaml`, `buildBaseFile`, `sanitizeFilename`, `uniquePath`.
- **`src/sdf-import.ts`** — SDF import command. Creates notes with YAML frontmatter (SMILES converted from MOL block via RDKit, plus all SDF properties). Generates a `.base` file scoped to the import folder.
- **`src/csv-import.ts`** — CSV import command. Parses CSV with RFC 4180 quoting, auto-detects `smiles` column, creates notes with frontmatter. No RDKit dependency.
- **`src/types.ts`** — Shared interfaces (`ParsedMolecule`, `Mols2BasesSettings`) and config key constants.
- **`src/settings-tab.ts`** — `Mols2BasesSettingTab` plugin settings UI with toggles for `removeHs`, `useCoords`, `storeMolblock`, `lazyRender`, `smartsMatchAll`, `transparentBg`, `comicMode`, and text inputs for `searchDelay` and `bondLineWidth`.

### Key Patterns

- **Bases API** (not yet in public obsidian typings): `registerBasesView(id, { name, icon, factory, options })`. The view accesses data via `this.data.data` (array of `BasesEntry`), config via `this.config.get(key)` / `this.config.getAsPropertyId(key)`. Lifecycle: constructor → `onload()` → `onDataUpdated()` (repeats) → `onunload()`.
- **RDKit types** are declared locally in `rdkit-loader.ts` since `@rdkit/rdkit` is only used at runtime for its WASM files, not imported as a TypeScript module.
- **esbuild** bundles everything into CJS, externalizing `obsidian`, `electron`, and CodeMirror packages.
- **Settings** are defined in `Mols2BasesSettings` (`src/types.ts`): `removeHs` (bool, default false), `useCoords` (bool, default true), `storeMolblock` (bool, default true), `lazyRender` (bool, default true), `searchDelay` (number, default 300), `smartsMatchAll` (bool, default false), `bondLineWidth` (number, default 1.0), `transparentBg` (bool, default false), `comicMode` (bool, default false).

## Keeping docs in sync

When updating CLAUDE.md, also update AGENTS.md with the same information, and vice versa. Both files should stay consistent.

## Install in Obsidian

Copy `main.js`, `manifest.json`, `styles.css` into `.obsidian/plugins/mols2bases/` in a vault. RDKit WASM files are downloaded automatically on first use.
