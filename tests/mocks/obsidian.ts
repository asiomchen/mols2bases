// Mock obsidian module for testing
export const Notice = class {
  constructor(message?: string, duration?: number) {
    // No-op
  }
  hide() {
    // No-op
  }
  setMessage(message: string) {
    // No-op
    return this;
  }
};

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}
