# Mols2Bases

Molecule visualization for [Obsidian Bases](https://obsidian.md/) — render SMILES/MOL structures in a grid view, search by text or SMARTS substructure, and import SDF/CSV files.

Requires Obsidian 1.10.0+.

## Features

- **Molecule Grid View** — Custom Bases view rendering molecular structures as SVG cards via RDKit.js
- **Text & SMARTS Search** — Filter molecules by name/properties or by substructure pattern with match highlighting
- **SDF Import** — Parse SDF files into one-note-per-molecule with YAML frontmatter
- **CSV Import** — Parse CSV files (with a `smiles` column) into notes with frontmatter
- **Rendering Options** — Configurable bond width, transparent background, comic mode, hydrogen removal, coordinate handling
- **Lazy Rendering** — IntersectionObserver-based deferred rendering for large datasets

See [docs/features.md](docs/features.md) for the full list.

## Installation

Copy `main.js`, `manifest.json`, `styles.css` into `.obsidian/plugins/mols2bases/` in your vault.

### RDKit WASM

The plugin depends on [RDKit.js](https://github.com/rdkit/rdkit-js) for molecule rendering. On first use, it automatically downloads `RDKit_minimal.js` and `RDKit_minimal.wasm` (~7MB total) from the [unpkg CDN](https://unpkg.com/) and caches them in the plugin directory. Subsequent loads use the cached files with no network required.

## Building from Source

```bash
npm install
npm run build   # production build
npm run dev     # development build with sourcemaps
```

## Acknowledgments

Inspired by [mols2grid](https://github.com/cbouy/mols2grid) by Cédric Bouysset — an interactive molecule viewer for Jupyter notebooks. The grid-based molecule browsing concept, feature ideas like SMARTS filtering with match highlighting, and several planned features in this plugin were directly influenced by mols2grid.

Molecule rendering is powered by [RDKit.js](https://github.com/rdkit/rdkit-js).
