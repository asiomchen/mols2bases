import { Notice, normalizePath } from 'obsidian';
import { pickFile, readFileAsText, buildYaml, buildBaseFile, sanitizeFilename, uniquePath } from './import-utils';
import type Mols2BasesPlugin from './main';

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvRow(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    const values = parseCsvRow(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  fields.push(current);
  return fields;
}

export async function importCsv(plugin: Mols2BasesPlugin): Promise<void> {
  const file = await pickFile('.csv');
  if (!file) return;

  const notice = new Notice('Reading CSV file...', 0);

  try {
    const content = await readFileAsText(file);
    const { headers, rows } = parseCsv(content);

    if (rows.length === 0) {
      notice.hide();
      new Notice('No data rows found in the CSV file.');
      return;
    }

    // Auto-detect SMILES column (case-insensitive)
    const smilesHeader = headers.find(h => h.toLowerCase() === 'smiles');
    if (!smilesHeader) {
      notice.hide();
      new Notice("No 'smiles' column found in CSV.");
      return;
    }

    notice.setMessage(`Importing ${rows.length} molecules...`);

    // Create folder based on filename
    const baseName = file.name.replace(/\.csv$/i, '');
    const folderPath = normalizePath(baseName);

    if (!await plugin.app.vault.adapter.exists(folderPath)) {
      await plugin.app.vault.createFolder(folderPath);
    }

    // Find first non-smiles header for note naming
    const nameHeader = headers.find(h => h.toLowerCase() !== 'smiles');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (nameHeader && row[nameHeader]?.trim()) || `molecule_${i + 1}`;

      // Build frontmatter
      const frontmatter: Record<string, string> = {};
      frontmatter['smiles'] = row[smilesHeader];
      frontmatter['_mols2bases'] = `[[${baseName}.base]]`;

      for (const [key, value] of Object.entries(row)) {
        if (key === smilesHeader) continue;
        const safeKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (safeKey && !frontmatter[safeKey]) {
          frontmatter[safeKey] = value;
        }
      }

      const yaml = buildYaml(frontmatter);
      const notePath = normalizePath(`${folderPath}/${sanitizeFilename(name)}.md`);
      const finalPath = await uniquePath(plugin.app, notePath);
      await plugin.app.vault.create(finalPath, `---\n${yaml}---\n`);
    }

    // Create .base file
    const baseContent = buildBaseFile(`${folderPath}.base`);
    const basePath = normalizePath(`${folderPath}.base`);
    const baseFile = await plugin.app.vault.create(basePath, baseContent);

    notice.hide();
    new Notice(`Imported ${rows.length} molecules from CSV.`);

    await plugin.app.workspace.getLeaf(false).openFile(baseFile);
  } catch (e) {
    notice.hide();
    new Notice(`CSV import failed: ${e}`);
  }
}
