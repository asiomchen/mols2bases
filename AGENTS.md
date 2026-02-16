# AGENTS.md

This file provides guidance for AI agents working on the mols2bases codebase.

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

```bash
npm run dev       # Development build with inline sourcemaps (watch mode)
npm run build     # Production build (minified, no sourcemaps)
npm run lint      # Lint with ESLint (includes eslint-plugin-obsidianmd)
npm run lint:fix  # Auto-fix ESLint issues
npm run format    # Format with Prettier
npm run format:check # Check formatting without writing
npm run typecheck # Type-check without emitting (tsc --noEmit)
```

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

## Code Style Guidelines

### Imports

```typescript
// External libraries first (obsidian)
import { Plugin, Notice, normalizePath } from 'obsidian';

// Internal type imports
import type { Mols2BasesSettings } from './types';

// Internal imports
import { MoleculeView } from './molecule-view';
import { importSdf } from './sdf-import';
import { VIEW_TYPE_MOLECULES, DEFAULT_SETTINGS } from './types';
```

### Naming Conventions

- **Interfaces**: PascalCase (e.g., `ParsedMolecule`, `Mols2BasesSettings`)
- **Types**: PascalCase (e.g., `RDKitModule`, `RDKitMol`)
- **Functions/Variables**: camelCase (e.g., `importSdf`, `rdkitInstance`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_SETTINGS`, `VIEW_TYPE_MOLECULES`)
- **Config Keys**: SCREAMING_SNAKE_CASE in `as const` object (see `CONFIG_KEYS` in types.ts)

### Types

- Always define explicit return types for public functions
- Use `interface` for public APIs, types for unions/intersections
- Declare RDKit types locally in `rdkit-loader.ts` (not imported from npm)
- Avoid `any` unless necessary (e.g., Obsidian internal APIs like `controller`)

```typescript
// Good
export interface ParsedMolecule {
  molblock: string;
  properties: Record<string, string>;
}

export async function getRDKit(plugin: Plugin): Promise<RDKitModule> {
  // ...
}
```

### Error Handling

- Use try/catch with meaningful error messages
- Show user-facing errors via `new Notice()`
- Clean up resources in `finally` blocks

```typescript
try {
  rdkitMol = rdkit.get_mol(mol.molblock);
  if (rdkitMol && rdkitMol.is_valid()) {
    smiles = rdkitMol.get_smiles();
  }
} catch {
  // skip on error
} finally {
  if (rdkitMol) rdkitMol.delete();
}
```

### Memory Management

- **Critical**: Always call `mol.delete()` on RDKit molecules after use to prevent WASM memory leaks
- Use singletons for expensive resources (e.g., RDKit instance in `rdkit-loader.ts`)
- SVG cache keys include settings: `molStr||rh=${removeHs}||uc=${useCoords}` (plain) or `...||smarts=${query}` (highlighted)
- When search is active, the IntersectionObserver is disconnected to prevent race conditions (observer overwriting highlighted SVGs)

### Async/Await

- Use `async/await` for all asynchronous operations
- Return `Promise<void>` for async functions that don't need to return data

### Obsidian-Specific Patterns

- **Views**: Extend `BasesView`, implement lifecycle: constructor → `onload()` → `onDataUpdated()` → `onunload()`
- **Settings**: Load in `onload()` via `this.loadSettings()`, save via `this.saveSettings()`
- **Commands**: Register with `this.addCommand({ id, name, callback })`
- **Bases API**: `registerBasesView(id, { name, icon, factory, options })`

## Key Files Reference

| File                   | Purpose                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.ts`          | Plugin entry, registers views and commands                                                                                         |
| `src/molecule-view.ts` | Molecule grid view with SVG cards, search (text + SMARTS), lazy rendering                                                          |
| `src/rdkit-loader.ts`  | Lazy RDKit WASM loader with CDN auto-download, RDKit type declarations                                                             |
| `src/sdf-parser.ts`    | Pure SDF parsing (split on `$$$$`)                                                                                                 |
| `src/types.ts`         | Interfaces and config constants                                                                                                    |
| `src/settings-tab.ts`  | Settings UI (removeHs, useCoords, storeMolblock, lazyRender, smartsMatchAll, searchDelay, bondLineWidth, transparentBg, comicMode) |

## Keeping docs in sync

When updating AGENTS.md, also update CLAUDE.md with the same information, and vice versa. Both files should stay consistent.

## Known Caveats

- RDKit types are declared locally since `@rdkit/rdkit` is only used at runtime for WASM
- Bases API not in public Obsidian typings; use `any` for controller parameter
- Remember to delete RDKit molecule objects to prevent memory leaks
