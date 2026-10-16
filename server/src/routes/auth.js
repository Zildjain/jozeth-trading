import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserSettings } from '../models/index.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, getCookieOptions, signSession } from '../middleware/auth.js';
import { loginSchema, changePasswordSchema, profileSchema } from '../validation.js';
import { plain } from '../utils/serializers.js';
import { audit } from '../services/audit.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();
const cookieName = () => process.env.COOKIE_NAME || 'jozeth_session';
const rounds = () => Math.min(14, Math.max(10, Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10)));

router.post('/login', validateBody(loginSchema), async (req, res) => {
  const identifier = req.validatedBody.identifier.trim().toLowerCase();
  const { password, rememberMe } = req.validatedBody;
  const user = (await User.findOne({ username: identifier }).select('+passwordHash')) || (await User.findOne({ email: identifier }).select('+passwordHash'));
  const valid = Boolean(user && user.status === 'Active' && await bcrypt.compare(password, user.passwordHash));
  if (!valid) {
    await audit({ title: 'Failed sign-in attempt', description: 'A sign-in attempt was rejected.', tone: 'red', actor: 'Unknown' }).catch(() => {});
    throw new HttpError(401, 'Username/email or password is incorrect.');
  }
  user.lastLogin = new Date().toISOString();
  await user.save();
  res.cookie(cookieName(), signSession(user, rememberMe), getCookieOptions(rememberMe));
  await audit({ title: 'User signed in', description: `${user.name} signed in.`, tone: 'blue', actor: user.name });
  res.json({ user: plain(user) });
});

router.post('/logout', requireAuth, async (req, res) => {
  res.clearCookie(cookieName(), getCookieOptions(false));
  await audit({ title: 'User signed out', description: `${req.user.name} signed out.`, tone: 'neutral', actor: req.user.name });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: plain(req.user) }));

router.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.validatedBody;
  const current = await User.findOne({ id: req.user.id }).select('+passwordHash');
  if (!current || !(await bcrypt.compare(currentPassword, current.passwordHash))) throw new HttpError(400, 'Current password is incorrect.');
  if (await bcrypt.compare(newPassword, current.passwordHash)) throw new HttpError(400, 'Choose a password you have not used before.');
  current.passwordHash = await bcrypt.hash(newPassword, rounds());
  current.sessionVersion = Number(current.sessionVersion || 0) + 1;
  await current.save();
  res.clearCookie(cookieName(), getCookieOptions(false));
  res.cookie(cookieName(), signSession(current, false), getCookieOptions(false));
  await audit({ title: 'Password changed', description: `${current.name} changed their password.`, tone: 'blue', actor: current.name });
  res.json({ ok: true, user: plain(current) });
});

router.patch('/profile', requireAuth, validateBody(profileSchema), async (req, res) => {
  const values = req.validatedBody;
  const usernameCollision = await User.findOne({ username: values.username });
  if (usernameCollision && usernameCollision.id !== req.user.id) throw new HttpError(409, 'Username is already in use.');
  const emailCollision = await User.findOne({ email: values.email });
  if (emailCollision && emailCollision.id !== req.user.id) throw new HttpError(409, 'Email is already in use.');
  const user = await User.findOne({ id: req.user.id });
  Object.assign(user, values);
  await user.save();
  const settings = await UserSettings.findOne({ ownerUserId: user.id });
  if (settings) { settings.profile = { name: user.name, username: user.username, email: user.email, contact: user.contact }; await settings.save(); }
  await audit({ title: 'Profile updated', description: `${user.name} updated account details.`, tone: 'blue', actor: user.name });
  res.json({ user: plain(user) });
});

export default router;
