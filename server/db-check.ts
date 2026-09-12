import 'dotenv/config';
import { connectDatabase, verifyConnection } from './database/index.js';

try {
  await connectDatabase();
  await verifyConnection();
  console.log('[DB] MySQL connection OK');
  process.exit(0);
} catch (error) {
  console.error('[DB] MySQL connection FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
}
