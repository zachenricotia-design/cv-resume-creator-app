import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { cleanupTempDirectories } from './fileCleanup.js';

describe('cleanupTempDirectories', () => {
  it('removes stale temp directories older than the configured age', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cv-cleanup-'));
    const staleDir = path.join(tempRoot, 'stale-run');
    const freshDir = path.join(tempRoot, 'fresh-run');

    await fs.mkdir(staleDir, { recursive: true });
    await fs.mkdir(freshDir, { recursive: true });

    const oldTime = Date.now() - (1000 * 60 * 60 * 12);
    await fs.utimes(staleDir, new Date(oldTime), new Date(oldTime));

    const removed = await cleanupTempDirectories(tempRoot, 1000 * 60 * 60 * 6);

    expect(removed).toContain(staleDir);
    await expect(fs.access(staleDir)).rejects.toBeTruthy();
    await expect(fs.access(freshDir)).resolves.toBeUndefined();

    await fs.rm(tempRoot, { recursive: true, force: true });
  });
});
