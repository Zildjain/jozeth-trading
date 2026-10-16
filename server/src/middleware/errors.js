import mongoose from 'mongoose';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'API route not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed.', details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError || error instanceof mongoose.Error.StrictModeError) {
    return res.status(400).json({ error: 'The supplied data failed database validation.' });
  }
  if (error?.code === 11000) return res.status(409).json({ error: 'A record with that ID, username, or email already exists.' });
  if (error?.type === 'entity.parse.failed' || (error instanceof SyntaxError && Object.hasOwn(error, 'body'))) {
    return res.status(400).json({ error: 'Request body is not valid JSON.' });
  }
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (/origin not allowed by CORS/i.test(error?.message || '')) return res.status(403).json({ error: 'Request origin is not allowed.' });
  if (error instanceof HttpError || Number.isInteger(error.status)) {
    const status = error.status >= 400 && error.status <= 599 ? error.status : 500;
    return res.status(status).json({ error: status === 500 ? 'Unexpected server error.' : error.message, ...(error.details ? { details: error.details } : {}) });
  }
  if (process.env.NODE_ENV !== 'production') console.error(error);
  return res.status(500).json({ error: 'Unexpected server error. Check the API log for details.' });
}
