import 'dotenv/config';
import app from './app.js';
import { startCleanupWorker } from './utils/cleanupWorker.js';

const PORT = process.env.PORT || 5001;

startCleanupWorker();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
