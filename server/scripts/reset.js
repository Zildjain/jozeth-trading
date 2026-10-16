import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/db.js';

if (process.env.CONFIRM_DATABASE_RESET !== 'true') {
  console.error('Safety stop: set CONFIRM_DATABASE_RESET=true only if you understand this deletes all Jozeth Trading database data.');
  process.exit(1);
}
try {
  await connectDatabase();
  await mongoose.connection.dropDatabase();
  console.log('Database dropped. Run npm run db:seed to create the demo data again.');
} catch (error) {
  console.error('Database reset failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
