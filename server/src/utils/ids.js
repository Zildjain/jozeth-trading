import crypto from 'node:crypto';
import { HttpError } from '../middleware/errors.js';

export function makeId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function validateBusinessId(value, prefix) {
  const id = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!id || id.length > 42 || !/^[A-Z]{2,5}(?:-[A-Z0-9]+){1,4}$/.test(id) || (prefix && !id.startsWith(`${prefix}-`))) {
    return makeId(prefix || 'REC');
  }
  return id;
}

export function resolveBusinessId(value, prefix) {
  if (!value) return makeId(prefix);
  const id = String(value).trim().toUpperCase();
  if (id.length > 42 || !/^[A-Z]{2,5}(?:-[A-Z0-9]+){1,4}$/.test(id) || !id.startsWith(`${prefix}-`)) {
    throw new HttpError(400, `Invalid ${prefix} record ID.`);
  }
  return id;
}
