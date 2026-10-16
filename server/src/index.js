import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { connectDatabase, assertTransactionSupport } from './db.js';
import authRoutes from './routes/auth.js';
import bootstrapRoutes from './routes/bootstrap.js';
import resourceRoutes from './routes/resources.js';
import operationRoutes from './routes/operations.js';
import { requestOriginGuard } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
const port = Number.parseInt(process.env.PORT || '4000', 10);
const allowedOrigins = new Set([process.env.CLIENT_ORIGIN || 'http://localhost:5173']);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://127.0.0.1:5173');
  allowedOrigins.add('http://localhost:5173');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 40 || /replace-this|development-secret/i.test(process.env.JWT_SECRET)) throw new Error('JWT_SECRET must be a real random secret of at least 40 characters. Copy .env.example to .env and replace the placeholder with a value from node:crypto.');

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", ...(process.env.NODE_ENV === 'production' ? [] : ["'unsafe-eval'"])],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", ...(process.env.NODE_ENV === 'production' ? [] : ['ws://localhost:5173', 'ws://127.0.0.1:5173'])],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
}));
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.has(origin)) return callback(null, true); return callback(new Error('Origin not allowed by CORS.')); }, credentials: true, methods: ['GET', 'POST', 'PATCH', 'PUT', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-Jozeth-Request'] }));
app.use(cookieParser());
// Rate-limit and reject cross-site mutations before parsing untrusted request bodies.
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Wait 15 minutes and try again.' } }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(requestOriginGuard);
app.use('/api', express.json({ limit: '2mb', strict: true, type: 'application/json' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'connected', environment: process.env.NODE_ENV || 'development', service: 'jozeth-trading-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api', resourceRoutes);
app.use('/api', operationRoutes);

// Production mode serves the built React app and API from the same origin.
if (process.env.NODE_ENV === 'production') {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const clientBuild = path.resolve(currentDirectory, '../../dist');
  app.use(express.static(clientBuild, { index: false, maxAge: '1h', etag: true }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientBuild, 'index.html'), (error) => { if (error) next(error); });
  });
}

app.use(notFound);
app.use(errorHandler);

await connectDatabase();
await assertTransactionSupport();
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => console.log(`Jozeth Trading API listening at http://${host}:${port}`));
