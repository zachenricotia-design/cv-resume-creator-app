import { cleanupTempDirectories } from './fileCleanup.js';
import pool from '../db/pool.js';

const DELETE_INACTIVE_CVS_SQL = `
  DELETE FROM cvs
  WHERE user_id IS NULL
    AND updated_at < NOW() - INTERVAL '3 days'
`;

const runCleanupCycle = async () => {
  try {
    await pool.query(DELETE_INACTIVE_CVS_SQL);
    await cleanupTempDirectories();
    console.log('Cleanup worker ran successfully');
  } catch (error) {
    console.error('Cleanup worker failed:', error);
  }
};

export const startCleanupWorker = () => {
  if (process.env.CLEANUP_WORKER_ENABLED === 'false') {
    return;
  }

  runCleanupCycle();

  const intervalMs = 1000 * 60 * 60 * 24;
  setInterval(() => {
    runCleanupCycle();
  }, intervalMs);

  console.log('Cleanup worker started');
};
