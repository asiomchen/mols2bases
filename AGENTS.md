# AGENTS.md

This file provides guidance for AI agents working on the mols2bases codebase.

## Project Overview

Obsidian plugin that adds molecule visualization to Obsidian Bases (requires Obsidian ≥1.10.0). Uses RDKit.js for rendering molecular structures. Features: molecule grid view (with text + SMARTS search and lazy rendering), SDF import, and CSV import.

## Build Commands

```bash
npm run dev     # Development build with inline sourcemaps
npm run build   # Production build (minified, no sourcemaps)
```

Both commands output `main.js` to the project root and copy `RDKit_minimal.js` + `RDKit_minimal.wasm` from `node_modules/@rdkit/rdkit/dist/`.

**No test framework is configured yet.**

## TypeScript Configuration

The project uses strict TypeScript with these settings (from `tsconfig.json`):
- `strictNullChecks: true`
- `noImplicitAny: true`
- `moduleResolution: node`
- Target: ES2020

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

### File Organization

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

### Obsidian-Specific Patterns

- **Views**: Extend `BasesView`, implement lifecycle: constructor → `onload()` → `onDataUpdated()` → `onunload()`
- **Settings**: Load in `onload()` via `this.loadSettings()`, save via `this.saveSettings()`
- **Commands**: Register with `this.addCommand({ id, name, callback })`
- **Bases API**: `registerBasesView(id, { name, icon, factory, options })`

## Useful Commands

```bash
# Build for development
npm run dev

# Build for production
npm run build

# Install in Obsidian vault
# Copy main.js, manifest.json, styles.css, RDKit_minimal.js, RDKit_minimal.wasm
# to .obsidian/plugins/mols2bases/ in your vault
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry, registers views and commands |
| `src/molecule-view.ts` | Molecule grid view with SVG cards, search (text + SMARTS), lazy rendering |
| `src/rdkit-loader.ts` | Lazy RDKit WASM loader, RDKit type declarations |
| `src/sdf-parser.ts` | Pure SDF parsing (split on `$$$$`) |
| `src/types.ts` | Interfaces and config constants |
| `src/settings-tab.ts` | Settings UI (removeHs, useCoords, storeMolblock, lazyRender, smartsMatchAll, searchDelay) |

## Keeping docs in sync

When updating AGENTS.md, also update CLAUDE.md with the same information, and vice versa. Both files should stay consistent.

## Known Caveats

- RDKit types are declared locally since `@rdkit/rdkit` is only used at runtime for WASM
- Bases API not in public Obsidian typings; use `any` for controller parameter
- Remember to delete RDKit molecule objects to prevent memory leaks
