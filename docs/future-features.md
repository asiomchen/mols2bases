# Future Features

Ideas inspired by mols2grid and adapted for the Obsidian Bases context. Grouped by priority and effort.

## High Priority

### Sorting
- **Sort by property** — Dropdown or view option to sort cards by any numeric/text property (e.g., molecular weight, name). Support ascending/descending toggle.
- **Default sort field** — View option to set the initial sort property.

### Molecule alignment to query
- **Align to SMARTS query** — When SMARTS search is active, align the 2D depiction so the matched substructure is oriented consistently across all cards. RDKit supports this via `generate_aligned_coords()`.

### Multi-property display on cards
- **Subtitle / extra properties** — View option to select additional properties shown below the label (e.g., MW, LogP). mols2grid's `subset` parameter equivalent.
- **Property formatting** — Display numbers with fixed precision (e.g., 2 decimal places for floats).

### Selection & tagging
- **Checkbox selection** — Add optional checkboxes to cards. Selected molecules can be tagged (add a frontmatter property like `selected: true`) or used to create a new filtered base.
- **Bulk operations** — Apply tags or properties to all selected molecules at once.

## Medium Priority

### Tooltip improvements
- **Rich tooltip** — On hover/click, show a larger molecule rendering with all frontmatter properties listed. Configurable per view which properties appear.
- **Tooltip trigger setting** — Choose between hover, click, or off.

### Conditional styling
- **Color-coded property values** — Style card borders or backgrounds based on a numeric property range (e.g., green for drug-like LogP, red for outliers). Similar to mols2grid's `style` lambdas.
- **Property-based card coloring** — View option to select a property and a color scale.

### Pagination
- **Paginated mode** — Alternative to infinite scroll / lazy render. Show N cards per page with page navigation. Useful for very large datasets (1000+).
- **Items per page setting** — Configurable page size (default 24).

### ~~Rendering options~~ ✅ Implemented
- ~~**Bond line width** — Setting to control bond thickness in SVGs.~~
- ~~**Transparent background** — Option to render molecules with no background (works better with dark themes).~~
- ~~**Comic mode** — Fun hand-drawn style rendering (supported by RDKit's MolDrawOptions).~~

## Lower Priority

### Export
- **Export selected as CSV** — Export visible/selected molecules to a CSV file.
- **Export as standalone HTML** — Generate a self-contained HTML grid (for sharing outside Obsidian).
- **Copy SMILES to clipboard** — Right-click or button to copy a molecule's SMILES.

### Advanced search
- **Similarity search** — Filter by Tanimoto similarity to a reference molecule (requires fingerprint computation in RDKit WASM).
- **Property range filters** — Numeric sliders to filter by MW, LogP, etc. alongside text/SMARTS search.
- **Combined filters** — AND-combine text + SMARTS + property range filters.

### 3D visualization
- **3D molecule view** — On click or in tooltip, render interactive 3D view using 3Dmol.js. Would require adding 3Dmol.js as a dependency and computing/fetching 3D coordinates.

### Customization
- **Custom atom colors** — Setting to override default element color palette.
- **Custom CSS class on cards** — Allow users to add CSS classes based on property values for manual styling via CSS snippets.
- **Card layout variants** — Horizontal layout (image left, properties right) as alternative to vertical stacking.

## New Settings to Add

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `defaultSort` | string | `''` | Property to sort by on load |
| `sortDescending` | boolean | `false` | Sort direction |
| `alignToQuery` | boolean | `false` | Align depictions to SMARTS query |
| `showTooltip` | boolean | `true` | Show property tooltip on hover |
| `tooltipTrigger` | string | `'hover'` | Tooltip trigger: hover, click, off |
| ~~`bondLineWidth`~~ | ~~number~~ | ~~`1.0`~~ | ~~Bond line thickness~~ ✅ |
| ~~`transparentBg`~~ | ~~boolean~~ | ~~`false`~~ | ~~Transparent SVG background~~ ✅ |
| `pageSize` | number | `0` | Cards per page (0 = no pagination) |
| `enableSelection` | boolean | `false` | Show checkboxes on cards |
