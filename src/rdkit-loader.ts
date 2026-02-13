import { Notice, type Plugin, requestUrl } from 'obsidian';

// RDKit module type (minimal interface we need)
export interface RDKitModule {
  get_mol(input: string): RDKitMol | null;
  get_qmol(smarts: string): RDKitMol | null;
  version(): string;
}

export interface RDKitMol {
  get_svg(width?: number, height?: number): string;
  get_svg_with_highlights(details: string): string;
  get_substruct_match(query: RDKitMol): string;
  get_substruct_matches(query: RDKitMol): string;
  is_valid(): boolean;
  get_smiles(): string;
  remove_hs(): string;
  set_new_coords(useCoordGen?: boolean): boolean;
  generate_aligned_coords(template: RDKitMol, options?: string): boolean;
  delete(): void;
}

const RDKIT_VERSION = '2025.3.4-1.0.0';
const RDKIT_CDN_BASE = `https://unpkg.com/@rdkit/rdkit@${RDKIT_VERSION}/dist`;
const RDKIT_FILES = ['RDKit_minimal.js', 'RDKit_minimal.wasm'] as const;

let rdkitInstance: RDKitModule | null = null;
let rdkitPromise: Promise<RDKitModule> | null = null;

export async function getRDKit(plugin: Plugin): Promise<RDKitModule> {
  if (rdkitInstance) return rdkitInstance;
  if (rdkitPromise) return rdkitPromise;

  rdkitPromise = loadRDKit(plugin);
  try {
    rdkitInstance = await rdkitPromise;
    return rdkitInstance;
  } catch (e) {
    rdkitPromise = null;
    throw e;
  }
}

async function ensureFiles(plugin: Plugin): Promise<void> {
  const pluginDir = plugin.manifest.dir!;
  const adapter = plugin.app.vault.adapter;
  let notice: Notice | null = null;

  for (const file of RDKIT_FILES) {
    const path = `${pluginDir}/${file}`;
    if (await adapter.exists(path)) continue;

    if (!notice) {
      notice = new Notice('Downloading RDKit library...', 0);
    }

    const url = `${RDKIT_CDN_BASE}/${file}`;
    const data = await requestUrl({
      url,
      headers: { Accept: 'application/octet-stream' },
    }).arrayBuffer;
    await adapter.writeBinary(path, data);
  }

  if (notice) {
    notice.hide();
    new Notice('RDKit library ready');
  }
}

async function loadRDKit(plugin: Plugin): Promise<RDKitModule> {
  await ensureFiles(plugin);

  const pluginDir = plugin.manifest.dir!;
  const adapter = plugin.app.vault.adapter;

  // Read the JS loader and WASM binary from the plugin directory
  const jsPath = `${pluginDir}/RDKit_minimal.js`;
  const wasmPath = `${pluginDir}/RDKit_minimal.wasm`;

  const [jsContent, wasmBinary] = await Promise.all([
    adapter.read(jsPath),
    adapter.readBinary(wasmPath),
  ]);

  // Inject RDKit JS via blob URL script tag
  const blob = new Blob([jsContent], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = blobUrl;
    script.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve();
    };
    script.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load RDKit JS'));
    };
    document.head.appendChild(script);
  });

  // initRDKitModule is now available on the global scope
  const initRDKitModule = (window as any).initRDKitModule;
  if (!initRDKitModule) {
    throw new Error('initRDKitModule not found after script injection');
  }

  const module = await initRDKitModule({
    wasmBinary: new Uint8Array(wasmBinary),
  });

  return module as RDKitModule;
}

export function cleanupRDKit(): void {
  rdkitInstance = null;
  rdkitPromise = null;
}
