import { Notice, normalizePath } from 'obsidian';
import {
  buildBaseFile,
  buildYaml,
  pickFile,
  readFileAsText,
  sanitizeFilename,
  sleep,
  uniquePath,
} from './import-utils';
import type Mols2BasesPlugin from './main';
import { INTERNAL_KEYS } from './types';

const BATCH_SIZE = 50;

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
    const { rows } = parseCsv(content);

    if (rows.length === 0) {
      notice.hide();
      new Notice('No data rows found in the CSV file.');
      return;
    }

    notice.setMessage(`Importing ${rows.length} rows...`);

    // Create folder based on filename
    const baseName = file.name.replace(/\.csv$/i, '');
    const folderPath = normalizePath(baseName);

    if (!(await plugin.app.vault.adapter.exists(folderPath))) {
      await plugin.app.vault.createFolder(folderPath);
    }

    // Create .base file early so the view populates as notes arrive
    const baseContent = buildBaseFile(`${folderPath}.base`);
    const basePath = normalizePath(`${folderPath}.base`);
    const baseFile = await plugin.app.vault.create(basePath, baseContent);
    await plugin.app.workspace.getLeaf(false).openFile(baseFile);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = `row_${i + 1}`;

      const frontmatter: Record<string, string> = {};
      frontmatter[INTERNAL_KEYS.LINK] = `[[${baseName}.base]]`;

      for (const [key, value] of Object.entries(row)) {
        if (!frontmatter[key]) {
          frontmatter[key] = value;
        }
      }

      const yaml = buildYaml(frontmatter);
      const notePath = normalizePath(`${folderPath}/${sanitizeFilename(name)}.md`);
      const finalPath = await uniquePath(plugin.app, notePath);
      await plugin.app.vault.create(finalPath, `---\n${yaml}---\n`);

      if ((i + 1) % BATCH_SIZE === 0) {
        notice.setMessage(`Importing rows... (${i + 1} / ${rows.length})`);
        await sleep(0);
      }
    }

    notice.hide();
    new Notice(`Imported ${rows.length} rows from CSV.`);
  } catch (e) {
    notice.hide();
    new Notice(`CSV import failed: ${String(e)}`);
  }
}
