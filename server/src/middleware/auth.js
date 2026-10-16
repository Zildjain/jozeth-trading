import jwt from 'jsonwebtoken';
import { User, RolePermission } from '../models/index.js';
import { DEFAULT_PERMISSIONS } from '../../../src/data/seedData.js';

const roles = ['Administrator', 'Manager/Owner', 'Staff'];
export function getCookieOptions(remember = false) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(remember ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
  };
}

export function signSession(user, remember = false) {
  return jwt.sign({ sub: user.id, role: user.role, sv: Number(user.sessionVersion || 0) }, process.env.JWT_SECRET, { expiresIn: remember ? '7d' : '8h', issuer: 'jozeth-trading-api', audience: 'jozeth-trading-web' });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || 'jozeth_session'];
    if (!token) return res.status(401).json({ error: 'Authentication required. Please sign in again.' });
    let claims;
    try {
      claims = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'jozeth-trading-api', audience: 'jozeth-trading-web' });
    } catch {
      res.clearCookie(process.env.COOKIE_NAME || 'jozeth_session', getCookieOptions(false));
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    const user = await User.findOne({ id: claims.sub, status: 'Active' });
    if (!user || !roles.includes(user.role) || Number(claims.sv ?? 0) !== Number(user.sessionVersion || 0)) {
      res.clearCookie(process.env.COOKIE_NAME || 'jozeth_session', getCookieOptions(false));
      return res.status(401).json({ error: 'This account is inactive or no longer available.' });
    }
    req.user = user;
    next();
  } catch (error) { next(error); }
}

export function allowRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ error: 'Your role is not allowed to perform this action.' });
    next();
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export function requestOriginGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const expectedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  const origin = req.get('origin');
  const devOrigins = process.env.NODE_ENV !== 'production' ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : [];
  if (origin && origin !== expectedOrigin && !devOrigins.includes(origin)) return res.status(403).json({ error: 'Request origin is not allowed.' });
  if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site requests are not allowed.' });
  if (req.get('x-jozeth-request') !== '1') return res.status(403).json({ error: 'Missing request verification header.' });
  next();
}

export function requireModuleAccess(moduleName) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
      const doc = await RolePermission.findOne({ role: req.user.role }).lean();
      const pages = doc?.pages instanceof Map ? Object.fromEntries(doc.pages) : (doc?.pages || DEFAULT_PERMISSIONS[req.user.role] || {});
      if (pages[moduleName] !== true) return res.status(403).json({ error: `Your role does not have permission to access ${moduleName}.` });
      next();
    } catch (error) { next(error); }
  };
}
