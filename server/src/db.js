import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Copy .env.example to .env and configure the database URI.');
  mongoose.set('sanitizeFilter', true);
  mongoose.set('strictQuery', 'throw');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: 10,
    minPoolSize: 1,
  });
  console.log(`MongoDB connected to database: ${mongoose.connection.name}`);
}

export async function assertTransactionSupport() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && !hello.msg?.includes('isdbgrid')) {
    throw new Error('MongoDB transactions require a replica set or sharded cluster. Configure the local rs0 replica set or use MongoDB Atlas.');
  }
}
