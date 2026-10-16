import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Activity, BusinessRecord, Customer, Product, Procurement, RolePermission, Supplier, Transaction, User, UserSettings, InventoryMovement } from '../models/index.js';
import { requireAuth, allowRoles, requireModuleAccess } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { HttpError } from '../middleware/errors.js';
import {
  productCreateSchema, productUpdateSchema, customerCreateSchema, customerUpdateSchema,
  supplierCreateSchema, supplierUpdateSchema, recordCreateSchema, recordUpdateSchema,
  userCreateSchema, userUpdateSchema, adminResetPasswordSchema, permissionsSchema, settingsSchema,
} from '../validation.js';
import { plain, safeList } from '../utils/serializers.js';
import { todayISO, resolveBusinessId } from '../utils/ids.js';
import { audit } from '../services/audit.js';

const router = Router();
router.use(requireAuth);
const idParamSchema = (prefix) => ({ safeParse: (value) => {
  if (typeof value?.id !== 'string' || !/^[A-Z]{2,5}(?:-[A-Z0-9]+){1,4}$/.test(value.id) || (prefix && !value.id.startsWith(`${prefix}-`))) return { success: false, error: { issues: [{ path: ['id'], message: 'Invalid record ID.' }] } };
  return { success: true, data: { id: value.id } };
} });
const roles = ['Administrator', 'Manager/Owner', 'Staff'];
const moduleNames = ['Dashboard', 'Products', 'Customers', 'Suppliers', 'Sales & Transactions', 'Inventory', 'Procurement', 'Records Management', 'Reports', 'User Management', 'Role & Permissions', 'Settings'];
const bcryptRounds = () => Math.min(14, Math.max(10, Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10)));

// Master data is readable for operational lookups, but only administrators can change it.
router.get('/products', async (req, res) => res.json(await safeList(Product, { id: 1 })));
router.post('/products', requireModuleAccess('Products'), validateBody(productCreateSchema), async (req, res) => {
  const value = req.validatedBody;
  const id = resolveBusinessId(value.id, 'PRD');
  const supplier = await Supplier.findOne({ name: value.supplier, status: 'Active' }).select('id name');
  if (!supplier) throw new HttpError(422, 'Select an active supplier that exists in the database.');
  const product = new Product({ id, name: value.name, category: value.category, supplier: supplier.name, description: value.description, purchasePrice: value.purchasePrice, sellingPrice: value.sellingPrice, quantity: 0, reorderLevel: value.reorderLevel, unit: value.unit, status: value.status, updatedAt: todayISO() });
  await product.save();
  await audit({ title: 'Product created', description: `${product.id} · ${product.name}.`, tone: 'blue', actor: req.user.name });
  res.status(201).json(plain(product));
});
router.patch('/products/:id', requireModuleAccess('Products'), validateParams(idParamSchema('PRD')), validateBody(productUpdateSchema), async (req, res) => {
  const product = await Product.findOne({ id: req.validatedParams.id });
  if (!product) throw new HttpError(404, 'Product was not found.');
  if (req.validatedBody.supplier !== undefined) {
    const supplier = await Supplier.findOne({ name: req.validatedBody.supplier, status: 'Active' }).select('id name');
    if (!supplier) throw new HttpError(422, 'Select an active supplier that exists in the database.');
    req.validatedBody.supplier = supplier.name;
  }
  Object.assign(product, req.validatedBody);
  product.updatedAt = todayISO(); // Quantity can only change through stock movement endpoints.
  await product.save();
  await audit({ title: 'Product updated', description: `${product.id} · ${product.name}.`, tone: 'blue', actor: req.user.name });
  res.json(plain(product));
});

router.get('/customers', async (req, res) => res.json(await safeList(Customer, { id: 1 })));
router.post('/customers', requireModuleAccess('Customers'), validateBody(customerCreateSchema), async (req, res) => {
  const v = req.validatedBody;
  const customer = new Customer({ ...v, id: resolveBusinessId(v.id, 'CUS'), createdAt: v.createdAt || todayISO() });
  await customer.save();
  await audit({ title: 'Customer created', description: `${customer.id} · ${customer.name}.`, tone: 'blue', actor: req.user.name });
  res.status(201).json(plain(customer));
});
router.patch('/customers/:id', requireModuleAccess('Customers'), validateParams(idParamSchema('CUS')), validateBody(customerUpdateSchema), async (req, res) => {
  const doc = await Customer.findOne({ id: req.validatedParams.id });
  if (!doc) throw new HttpError(404, 'Customer was not found.');
  Object.assign(doc, req.validatedBody); await doc.save();
  await audit({ title: 'Customer updated', description: `${doc.id} · ${doc.name}.`, tone: 'blue', actor: req.user.name });
  res.json(plain(doc));
});

router.get('/suppliers', async (req, res) => res.json(await safeList(Supplier, { id: 1 })));
router.post('/suppliers', requireModuleAccess('Suppliers'), validateBody(supplierCreateSchema), async (req, res) => {
  const v = req.validatedBody;
  const doc = new Supplier({ ...v, id: resolveBusinessId(v.id, 'SUP'), createdAt: v.createdAt || todayISO() });
  await doc.save();
  await audit({ title: 'Supplier created', description: `${doc.id} · ${doc.name}.`, tone: 'blue', actor: req.user.name });
  res.status(201).json(plain(doc));
});
router.patch('/suppliers/:id', requireModuleAccess('Suppliers'), validateParams(idParamSchema('SUP')), validateBody(supplierUpdateSchema), async (req, res) => {
  const doc = await Supplier.findOne({ id: req.validatedParams.id });
  if (!doc) throw new HttpError(404, 'Supplier was not found.');
  Object.assign(doc, req.validatedBody); await doc.save();
  await audit({ title: 'Supplier updated', description: `${doc.id} · ${doc.name}.`, tone: 'blue', actor: req.user.name });
  res.json(plain(doc));
});

router.get('/transactions', requireModuleAccess('Sales & Transactions'), async (req, res) => res.json(await safeList(Transaction, { date: -1, id: -1 })));
router.get('/inventory/movements', requireModuleAccess('Inventory'), async (req, res) => res.json(await safeList(InventoryMovement, { date: -1, id: -1 })));
router.get('/procurements', requireModuleAccess('Procurement'), async (req, res) => res.json(await safeList(Procurement, { date: -1, id: -1 })));

router.get('/records', requireModuleAccess('Records Management'), async (req, res) => res.json(await safeList(BusinessRecord, { date: -1, id: -1 }, '-fileData')));
router.get('/records/:id/file', requireModuleAccess('Records Management'), validateParams(idParamSchema('REC')), async (req, res) => {
  const record = await BusinessRecord.findOne({ id: req.validatedParams.id }).select('id fileName fileData').lean();
  if (!record) throw new HttpError(404, 'Business record was not found.');
  if (!record.fileData || !record.fileName) throw new HttpError(404, 'This record has no attachment.');
  res.json({ fileName: record.fileName, fileData: record.fileData });
});
router.post('/records', requireModuleAccess('Records Management'), validateBody(recordCreateSchema), async (req, res) => {
  const v = req.validatedBody;
  const doc = new BusinessRecord({ ...v, id: resolveBusinessId(v.id, 'REC'), uploadedBy: req.user.name, date: v.date || todayISO() });
  await doc.save();
  await audit({ title: 'Business record created', description: `${doc.id} · ${doc.name}.`, tone: 'blue', actor: req.user.name });
  res.status(201).json(plain(doc));
});
router.patch('/records/:id', requireModuleAccess('Records Management'), validateParams(idParamSchema('REC')), validateBody(recordUpdateSchema), async (req, res) => {
  const doc = await BusinessRecord.findOne({ id: req.validatedParams.id });
  if (!doc) throw new HttpError(404, 'Business record was not found.');
  Object.assign(doc, req.validatedBody); doc.uploadedBy = doc.uploadedBy || req.user.name; await doc.save();
  await audit({ title: doc.status === 'Archived' ? 'Business record archived' : 'Business record updated', description: `${doc.id} · ${doc.name}.`, tone: doc.status === 'Archived' ? 'orange' : 'blue', actor: req.user.name });
  res.json(plain(doc));
});

router.get('/users', allowRoles('Administrator'), async (req, res) => {
  const users = await User.find({}).sort({ id: 1 }).lean();
  res.json(users.map((user) => { delete user._id; delete user.__v; delete user.passwordHash; delete user.sessionVersion; delete user.createdOn; delete user.modifiedOn; return user; }));
});
router.post('/users', allowRoles('Administrator'), validateBody(userCreateSchema), async (req, res) => {
  const v = req.validatedBody;
  const user = new User({ id: resolveBusinessId(v.id, 'USR'), name: v.name, username: v.username, email: v.email, contact: v.contact, role: v.role, status: v.status, createdAt: v.createdAt || todayISO(), lastLogin: 'Never', passwordHash: await bcrypt.hash(v.password, bcryptRounds()) });
  await user.save();
  await audit({ title: 'User account created', description: `${user.name} · ${user.role}.`, tone: 'blue', actor: req.user.name });
  res.status(201).json(plain(user));
});
router.patch('/users/:id', allowRoles('Administrator'), validateParams(idParamSchema('USR')), validateBody(userUpdateSchema), async (req, res) => {
  const doc = await User.findOne({ id: req.validatedParams.id });
  if (!doc) throw new HttpError(404, 'User was not found.');
  const patch = req.validatedBody;
  if (doc.id === req.user.id && ((patch.role && patch.role !== doc.role) || patch.status === 'Inactive')) throw new HttpError(409, 'You cannot change your own role or deactivate the active account.');
  if (patch.role && !roles.includes(patch.role)) throw new HttpError(400, 'Unknown role.');
  const demotesActiveAdmin = doc.role === 'Administrator' && doc.status === 'Active' && ((patch.role && patch.role !== 'Administrator') || patch.status === 'Inactive');
  if (demotesActiveAdmin) {
    const activeAdmins = await User.countDocuments({ role: 'Administrator', status: 'Active' });
    if (activeAdmins <= 1) throw new HttpError(409, 'At least one active Administrator must remain.');
  }
  Object.assign(doc, patch); await doc.save();
  await audit({ title: 'User account updated', description: `${doc.name} · ${doc.status}.`, tone: 'orange', actor: req.user.name });
  res.json(plain(doc));
});
router.post('/users/:id/reset-password', allowRoles('Administrator'), validateParams(idParamSchema('USR')), validateBody(adminResetPasswordSchema), async (req, res) => {
  const doc = await User.findOne({ id: req.validatedParams.id }).select('+passwordHash');
  if (!doc) throw new HttpError(404, 'User was not found.');
  doc.passwordHash = await bcrypt.hash(req.validatedBody.password, bcryptRounds());
  doc.sessionVersion = Number(doc.sessionVersion || 0) + 1;
  await doc.save();
  await audit({ title: 'Account password reset', description: `Administrator reset password for ${doc.name}.`, tone: 'orange', actor: req.user.name });
  res.json({ ok: true });
});

router.get('/permissions', allowRoles('Administrator'), async (req, res) => {
  const docs = await RolePermission.find({}).lean();
  res.json(Object.fromEntries(docs.map((doc) => [doc.role, doc.pages instanceof Map ? Object.fromEntries(doc.pages) : doc.pages])));
});
router.put('/permissions/:role', allowRoles('Administrator'), validateBody(permissionsSchema), async (req, res) => {
  const role = req.params.role;
  if (!roles.includes(role)) throw new HttpError(400, 'Unknown role.');
  const pages = req.validatedBody.pages;
  const unknown = Object.keys(pages).filter((page) => !moduleNames.includes(page));
  if (unknown.length) throw new HttpError(400, `Unknown module permission: ${unknown[0]}.`);
  if (role === 'Administrator' && ['Dashboard', 'User Management', 'Role & Permissions'].some((page) => pages[page] === false)) throw new HttpError(400, 'Core administrator permissions cannot be disabled.');
  const doc = await RolePermission.findOneAndUpdate({ role }, { $set: { pages } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  await audit({ title: 'Role permissions updated', description: `Permissions changed for ${role}.`, tone: 'purple', actor: req.user.name });
  res.json({ role: doc.role, pages: doc.pages instanceof Map ? Object.fromEntries(doc.pages) : doc.pages });
});

router.patch('/settings', requireModuleAccess('Settings'), validateBody(settingsSchema), async (req, res) => {
  const patch = req.validatedBody;
  if (patch.profile) throw new HttpError(400, 'Update profile through the profile endpoint.');
  let doc = await UserSettings.findOne({ ownerUserId: req.user.id });
  if (!doc) doc = new UserSettings({ ownerUserId: req.user.id, profile: { name: req.user.name, username: req.user.username, email: req.user.email, contact: req.user.contact || '' } });
  for (const key of ['dateFormat', 'timeFormat', 'reportFormat', 'confirmDelete']) if (patch[key] !== undefined) doc[key] = patch[key];
  if (patch.notifications) doc.notifications = { ...(doc.notifications?.toObject?.() || doc.notifications || {}), ...patch.notifications };
  await doc.save();
  await audit({ title: 'User preferences saved', description: `${req.user.name} updated preferences.`, tone: 'blue', actor: req.user.name });
  const result = plain(doc); delete result.ownerUserId; res.json(result);
});

export default router;
