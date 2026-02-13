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


## Demo
After plugin is installed you can use new commands to load SDF or CSV

![Import commands](docs/assets/import-commands.png)

Compounds would be loaded as individual notes with YAML frontmatter and linked into single Base with the name of the file. The Base view would render molecule cards with name and properties from frontmatter. You can search by text or SMARTS pattern, and matched substructures will be highlighted in the SVGs.

**Molecule grid view**

![Molecule grid view](docs/assets/molecule-grid.png)

**SMARTS substructure search with match highlighting**

![SMARTS search with match highlighting](docs/assets/smarts-search.png)


Some of the options can be configured in the view settings:

![View settings](docs/assets/view-settings.png)

E.g by default plugin uses `smiles` frontmatter field for rendering (which is auto-added to the sdf imports), but you can change it to any other field that contains SMILES or MOL blocks (espesically useful for the CSV import when you molecular column is not named `smiles`). You can also adjust bond line width, toggle transparent background, or enable comic mode for fun hand-drawn style renderings.


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
