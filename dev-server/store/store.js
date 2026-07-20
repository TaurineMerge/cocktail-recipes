import fs from 'node:fs/promises';

export function createJsonStore(filePath) {
  async function readAll() {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.writeFile(filePath, '[]', 'utf-8');
        return [];
      }
      throw error;
    }
  }

  async function writeAll(items) {
    await fs.writeFile(filePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  return { readAll, writeAll };
}
