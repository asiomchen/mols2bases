import { Notice, normalizePath } from 'obsidian';
import { parseSdf } from './sdf-parser';
import { getRDKit, RDKitModule } from './rdkit-loader';
import { pickFile, readFileAsText, buildYaml, buildBaseFile, sanitizeFilename, uniquePath } from './import-utils';
import type Mols2BasesPlugin from './main';

export async function importSdf(plugin: Mols2BasesPlugin): Promise<void> {
  const file = await pickFile('.sdf,.sd');
  if (!file) return;

  const notice = new Notice('Reading SDF file...', 0);

  try {
    const content = await readFileAsText(file);
    const molecules = parseSdf(content);

    if (molecules.length === 0) {
      notice.hide();
      new Notice('No molecules found in the SDF file.');
      return;
    }

    notice.setMessage(`Importing ${molecules.length} molecules...`);

    let rdkit: RDKitModule;
    try {
      rdkit = await getRDKit(plugin);
    } catch (e) {
      notice.hide();
      new Notice(`Failed to load RDKit: ${e}`);
      return;
    }

    // Create folder based on filename
    const baseName = file.name.replace(/\.(sdf|sd)$/i, '');
    const folderPath = normalizePath(baseName);

    if (!await plugin.app.vault.adapter.exists(folderPath)) {
      await plugin.app.vault.createFolder(folderPath);
    }

    // Create notes for each molecule
    for (let i = 0; i < molecules.length; i++) {
      const mol = molecules[i];
      const name = mol.properties['Name'] || mol.properties['name'] ||
                   mol.properties['COMMON_NAME'] || mol.properties['ID'] ||
                   mol.properties['id'] || `molecule_${i + 1}`;

      // Convert MOL block to SMILES via RDKit
      let smiles = '';
      let rdkitMol = null;
      try {
        rdkitMol = rdkit.get_mol(mol.molblock);
        if (rdkitMol && rdkitMol.is_valid()) {
          smiles = rdkitMol.get_smiles();
        }
      } catch {
        // skip SMILES conversion on error
      } finally {
        if (rdkitMol) rdkitMol.delete();
      }

      // Build frontmatter
      const frontmatter: Record<string, string> = {};
      if (smiles) frontmatter['smiles'] = smiles;
      if (plugin.settings.storeMolblock) {
        frontmatter['molblock'] = mol.molblock;
      }
      frontmatter['_mols2bases'] = `[[${baseName}.base]]`;

      // Add all SDF properties
      for (const [key, value] of Object.entries(mol.properties)) {
        const safeKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (safeKey && !frontmatter[safeKey]) {
          frontmatter[safeKey] = value;
        }
      }

      const yaml = buildYaml(frontmatter);
      const notePath = normalizePath(`${folderPath}/${sanitizeFilename(name)}.md`);

      // Avoid overwriting existing notes
      const finalPath = await uniquePath(plugin.app, notePath);
      await plugin.app.vault.create(finalPath, `---\n${yaml}---\n`);
    }

    // Create .base file
    const baseContent = buildBaseFile(`${folderPath}.base`);
    const basePath = normalizePath(`${folderPath}.base`);
    const baseFile = await plugin.app.vault.create(basePath, baseContent);

    notice.hide();
    new Notice(`Imported ${molecules.length} molecules.`);

    // Open the .base file
    await plugin.app.workspace.getLeaf(false).openFile(baseFile);
  } catch (e) {
    notice.hide();
    new Notice(`Import failed: ${e}`);
  }
}
