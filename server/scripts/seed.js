import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/db.js';
import { User, Product, Customer, Supplier, Transaction, InventoryMovement, Procurement, BusinessRecord, RolePermission, UserSettings, Activity } from '../src/models/index.js';
import { initialData } from '../../src/data/seedData.js';

const demoPasswords = {
  admin: process.env.SEED_ADMIN_PASSWORD || 'AdminDemo!2026',
  manager: process.env.SEED_MANAGER_PASSWORD || 'ManagerDemo!2026',
  staff: process.env.SEED_STAFF_PASSWORD || 'StaffDemo!2026',
};
const rounds = Math.min(14, Math.max(10, Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10)));
const passwordRequirements = [
  ['at least 12 characters', (value) => value.length >= 12],
  ['a lowercase letter', (value) => /[a-z]/.test(value)],
  ['an uppercase letter', (value) => /[A-Z]/.test(value)],
  ['a number', (value) => /\d/.test(value)],
  ['a symbol', (value) => /[^A-Za-z0-9]/.test(value)],
];
for (const [username, password] of Object.entries(demoPasswords)) {
  const missing = passwordRequirements.find(([, test]) => !test(password));
  if (missing) throw new Error(`Password configured for ${username} must contain ${missing[0]}. Use SEED_${username.toUpperCase()}_PASSWORD in .env.`);
}

async function seedIfEmpty(Model, records, label) {
  if (await Model.estimatedDocumentCount()) return console.log(`${label}: existing records found, leaving unchanged.`);
  if (records.length) await Model.insertMany(records, { ordered: true });
  console.log(`${label}: inserted ${records.length} starter records.`);
}

try {
  await connectDatabase();
  const users = await Promise.all(initialData.users.map(async (item) => ({
    ...item,
    username: item.username.toLowerCase(),
    email: item.email.toLowerCase(),
    passwordHash: await bcrypt.hash(demoPasswords[item.username], rounds),
  })));
  await seedIfEmpty(User, users, 'Users');
  await seedIfEmpty(Product, initialData.products, 'Products');
  await seedIfEmpty(Customer, initialData.customers, 'Customers');
  await seedIfEmpty(Supplier, initialData.suppliers, 'Suppliers');
  await seedIfEmpty(Transaction, initialData.transactions, 'Transactions');
  await seedIfEmpty(InventoryMovement, initialData.movements, 'Inventory movements');
  await seedIfEmpty(Procurement, initialData.procurements, 'Procurement');
  await seedIfEmpty(BusinessRecord, initialData.records.map((r) => ({ ...r, fileData: '' })), 'Business records');
  await seedIfEmpty(RolePermission, Object.entries(initialData.permissions).map(([role, pages]) => ({ role, pages })), 'Role permissions');
  const settings = users.map((user) => ({
    ownerUserId: user.id,
    profile: { name: user.name, username: user.username, email: user.email, contact: user.contact || '' },
    dateFormat: initialData.settings.dateFormat,
    timeFormat: initialData.settings.timeFormat,
    reportFormat: initialData.settings.reportFormat,
    confirmDelete: initialData.settings.confirmDelete,
    notifications: { ...initialData.settings.notifications },
  }));
  await seedIfEmpty(UserSettings, settings, 'User settings');
  await seedIfEmpty(Activity, initialData.activity.map((a) => ({ ...a, actor: 'System' })), 'Activity');
  console.log('\nSeed complete. Sign in with the demo accounts listed in README.md. Change demo passwords before using real business data.');
} catch (error) {
  console.error('Seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
