import { Router } from 'express';
import { Activity, BusinessRecord, Customer, InventoryMovement, Procurement, Product, RolePermission, Supplier, Transaction, User, UserSettings } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { initialData } from '../../../src/data/seedData.js';
import { plain, safeList } from '../utils/serializers.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const [products, customers, suppliers, transactions, movements, procurements, records, activity, permissionDocs, currentSettings] = await Promise.all([
    safeList(Product, { id: 1 }), safeList(Customer, { id: 1 }), safeList(Supplier, { id: 1 }),
    safeList(Transaction, { date: -1, id: -1 }), safeList(InventoryMovement, { date: -1, id: -1 }),
    safeList(Procurement, { date: -1, id: -1 }), safeList(BusinessRecord, { date: -1, id: -1 }, '-fileData'),
    safeList(Activity, { createdOn: -1 }), RolePermission.find({}).lean(), UserSettings.findOne({ ownerUserId: req.user.id }).lean(),
  ]);
  const userDocs = req.user.role === 'Administrator'
    ? (await User.find({}).sort({ id: 1 }).lean()).map((u) => { delete u._id; delete u.__v; delete u.passwordHash; delete u.sessionVersion; delete u.createdOn; delete u.modifiedOn; return u; })
    : [plain(req.user)];
  const permissions = { ...initialData.permissions };
  for (const item of permissionDocs) permissions[item.role] = item.pages instanceof Map ? Object.fromEntries(item.pages) : { ...(item.pages || {}) };
  const defaultSettings = { ...initialData.settings, profile: { name: req.user.name, username: req.user.username, email: req.user.email, contact: req.user.contact || '' }, notifications: { ...initialData.settings.notifications } };
  let settings = defaultSettings;
  if (currentSettings) {
    const stored = { ...currentSettings };
    delete stored._id; delete stored.__v; delete stored.ownerUserId; delete stored.createdOn; delete stored.modifiedOn;
    settings = { ...defaultSettings, ...stored, profile: defaultSettings.profile, notifications: { ...defaultSettings.notifications, ...(stored.notifications || {}) } };
  }
  res.json({ users: userDocs, products, customers, suppliers, transactions, movements, procurements, records, permissions, settings, activity: activity.slice(0, 40) });
});

export default router;
