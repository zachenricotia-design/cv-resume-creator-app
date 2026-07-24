import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_TEMP_DIR = path.resolve(process.cwd(), 'tmp');
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 6;

export const cleanupTempDirectories = async (
  tempRoot = DEFAULT_TEMP_DIR,
  maxAgeMs = DEFAULT_MAX_AGE_MS
) => {
  const rootPath = path.resolve(tempRoot);
  const cleaned = [];

  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const directoryPath = path.join(rootPath, entry.name);
      const stats = await fs.stat(directoryPath);

      if (now - stats.mtimeMs > maxAgeMs) {
        await fs.rm(directoryPath, { recursive: true, force: true });
        cleaned.push(directoryPath);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  return cleaned;
};

export const cleanupTempDirectory = async (directoryPath) => {
  await fs.rm(directoryPath, { recursive: true, force: true });
};
