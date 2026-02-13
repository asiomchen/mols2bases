import type { App } from 'obsidian';

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      resolve(file);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function buildYaml(props: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (value.includes('\n')) {
      lines.push(`${key}: |`);
      for (const line of value.split('\n')) {
        lines.push(`  ${line}`);
      }
    } else {
      const needsQuote = /[:{}[\],&*?|>!%#@`"']/.test(value) || value.trim() !== value;
      lines.push(`${key}: ${needsQuote ? JSON.stringify(value) : value}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

export function buildBaseFile(baseName: string): string {
  return `filters:
  and:
    - file.hasLink("${baseName}")
views:
  - type: "molecules"
    name: "Molecules"
    moleculeProperty: note.smiles
  - type: "table"
    name: "Table"
`;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').substring(0, 200);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uniquePath(app: App, path: string): Promise<string> {
  if (!(await app.vault.adapter.exists(path))) return path;

  const ext = path.substring(path.lastIndexOf('.'));
  const base = path.substring(0, path.lastIndexOf('.'));
  let i = 1;
  while (await app.vault.adapter.exists(`${base}_${i}${ext}`)) {
    i++;
  }
  return `${base}_${i}${ext}`;
}
