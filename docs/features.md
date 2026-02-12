# Implemented Features

## Molecule Grid View

- Custom Bases view type (`molecules`) rendering molecular structures as SVG cards via RDKit.js
- Configurable molecule and label properties via view options
- Adjustable card width and height sliders
- Click-to-open note navigation
- Hover preview on cards
- SVG render cache keyed by molecule string and current settings
- Lazy viewport-based rendering via IntersectionObserver — only calls RDKit for molecules visible (or near-visible) on screen; configurable via `lazyRender` setting (default on), falls back to chunked eager rendering when off
- Chunked async rendering (batches of 20 per frame) to avoid blocking the UI with 100+ molecules (used when lazy render is off)
- CSS containment on cards for reduced layout cost
- Event delegation for click and hover handlers

## SDF Import

- Command to import SDF files via browser file picker
- Parses SDF into one note per molecule with YAML frontmatter
- Extracts MOL blocks and `> <NAME>` property headers
- Converts MOL blocks to SMILES via RDKit
- Generates a `.base` file scoped to the import folder

## CSV Import

- Command to import CSV files via browser file picker
- Auto-detects `smiles` column (case-insensitive)
- Creates one note per row with YAML frontmatter
- All CSV columns added as frontmatter properties (keys sanitized to lowercase with non-alphanumeric characters replaced by `_`)
- Generates a `.base` file scoped to the import folder
- Handles quoted fields and escaped double quotes per RFC 4180
- No RDKit dependency — SMILES are taken directly from the CSV

## Rendering Settings

- **Remove hydrogens** (`removeHs`, default off) — strips hydrogen atoms before rendering
- **Use original coordinates** (`useCoords`, default on) — uses input coordinates as-is; when off, regenerates clean 2D layouts
- **Store MOL block** (`storeMolblock`, default on) — includes full MOL block in frontmatter during SDF import

## RDKit Integration

- Singleton lazy loader for RDKit WASM
- Reads `RDKit_minimal.js` and `.wasm` from plugin directory via vault adapter
- Injects JS as blob URL script, initializes with WASM binary
- Deduplicates concurrent init calls
- Proper WASM memory management (`mol.delete()` after each render)
