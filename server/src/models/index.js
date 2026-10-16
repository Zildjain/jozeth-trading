import mongoose from 'mongoose';

const { Schema } = mongoose;
const opts = { timestamps: { createdAt: 'createdOn', updatedAt: 'modifiedOn' }, strict: 'throw', strictQuery: 'throw', minimize: false, versionKey: false };
const requiredText = { type: String, required: true, trim: true, maxlength: 200 };
const optionalText = { type: String, default: '', trim: true, maxlength: 2000 };
const money = { type: Number, required: true, min: 0, max: 100000000000 };
const businessId = { type: String, required: true, unique: true, trim: true, immutable: true, match: /^[A-Z]{2,5}(?:-[A-Z0-9]+){1,4}$/ };

const userSchema = new Schema({
  id: businessId,
  name: { ...requiredText, maxlength: 120 },
  username: { ...requiredText, lowercase: true, maxlength: 40, match: /^[a-z0-9._-]{3,40}$/ },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  contact: { type: String, default: '', trim: true, maxlength: 30 },
  role: { type: String, enum: ['Administrator', 'Manager/Owner', 'Staff'], required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  passwordHash: { type: String, required: true, select: false },
  sessionVersion: { type: Number, default: 0, min: 0 },
  createdAt: { type: String, default: '' },
  lastLogin: { type: String, default: 'Never' },
}, { ...opts, collection: 'users' });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

const productSchema = new Schema({
  id: businessId,
  name: { ...requiredText, maxlength: 160 }, category: { ...requiredText, maxlength: 80 },
  supplier: { ...requiredText, maxlength: 160 }, description: { ...optionalText, maxlength: 1200 },
  purchasePrice: money, sellingPrice: money,
  quantity: { type: Number, required: true, min: 0, max: 100000000, validate: Number.isInteger },
  reorderLevel: { type: Number, required: true, min: 0, max: 100000000, validate: Number.isInteger },
  unit: { ...requiredText, maxlength: 40 }, status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }, updatedAt: { type: String, default: '' },
}, { ...opts, collection: 'products' });
productSchema.index({ name: 1 });

const customerSchema = new Schema({
  id: businessId, name: { ...requiredText, maxlength: 160 }, contact: { type: String, default: '', trim: true, maxlength: 30 },
  email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 }, address: { ...optionalText, maxlength: 500 },
  notes: { ...optionalText, maxlength: 1200 }, status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }, createdAt: { type: String, default: '' },
}, { ...opts, collection: 'customers' });

const supplierSchema = new Schema({
  id: businessId, name: { ...requiredText, maxlength: 160 }, contactPerson: { type: String, default: '', trim: true, maxlength: 120 },
  contact: { type: String, default: '', trim: true, maxlength: 30 }, email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
  address: { ...optionalText, maxlength: 500 }, notes: { ...optionalText, maxlength: 1200 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }, createdAt: { type: String, default: '' },
}, { ...opts, collection: 'suppliers' });

const lineItemSchema = new Schema({
  productId: { type: String, required: true, trim: true, maxlength: 40 },
  productName: { ...requiredText, maxlength: 160 },
  quantity: { type: Number, required: true, min: 1, max: 1000000, validate: Number.isInteger },
  unitPrice: money,
}, { _id: false, strict: 'throw' });

const transactionSchema = new Schema({
  id: businessId,
  customer: { ...requiredText, maxlength: 160 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  type: { type: String, enum: ['Sale', 'Purchase Order'], default: 'Sale' },
  items: { type: [lineItemSchema], required: true, validate: [(v) => v.length > 0 && v.length <= 100, 'Transaction requires 1–100 line items'] },
  amount: money,
  status: { type: String, enum: ['Completed', 'Pending', 'Cancelled'], default: 'Pending' },
  recordedBy: { ...requiredText, maxlength: 120 }, remarks: { ...optionalText, maxlength: 2000 },
  stockApplied: { type: Boolean, default: false }, completedAt: { type: Date, default: null }, cancelledAt: { type: Date, default: null },
}, { ...opts, collection: 'transactions' });
transactionSchema.index({ date: -1, status: 1 });

const movementSchema = new Schema({
  id: businessId,
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  productId: { type: String, required: true, trim: true, maxlength: 40 },
  productName: { ...requiredText, maxlength: 160 },
  type: { type: String, enum: ['Stock In', 'Stock Out'], required: true },
  quantity: { type: Number, required: true, min: 1, max: 1000000, validate: Number.isInteger },
  previousStock: { type: Number, required: true, min: 0 }, updatedStock: { type: Number, required: true, min: 0 },
  user: { ...requiredText, maxlength: 120 }, reference: { type: String, default: '', trim: true, maxlength: 100 },
  remarks: { ...optionalText, maxlength: 2000 }, supplier: { type: String, default: '', trim: true, maxlength: 160 },
  sourceType: { type: String, enum: ['Manual', 'Sale', 'Procurement'], default: 'Manual' }, sourceId: { type: String, default: '' },
}, { ...opts, collection: 'inventory_movements' });
movementSchema.index({ productId: 1, date: -1 });
movementSchema.index({ sourceType: 1, sourceId: 1, productId: 1, type: 1 }, { unique: true, partialFilterExpression: { sourceId: { $type: 'string', $gt: '' } } });

const procurementSchema = new Schema({
  id: businessId, supplier: { ...requiredText, maxlength: 160 }, productId: { type: String, required: true, trim: true, maxlength: 40 },
  productName: { ...requiredText, maxlength: 160 }, quantity: { type: Number, required: true, min: 1, max: 1000000, validate: Number.isInteger },
  unitCost: money, date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, expectedDate: { type: String, default: '', match: /^(?:\d{4}-\d{2}-\d{2})?$/ },
  priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
  status: { type: String, enum: ['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled'], default: 'Pending' },
  remarks: { ...optionalText, maxlength: 2000 }, stockApplied: { type: Boolean, default: false }, receivedAt: { type: String, default: '' }, createdBy: { ...requiredText, maxlength: 120 },
}, { ...opts, collection: 'procurements' });

const recordSchema = new Schema({
  id: businessId, name: { ...requiredText, maxlength: 180 }, category: { ...requiredText, maxlength: 80 },
  relatedTransaction: { type: String, default: '', trim: true, maxlength: 80 }, date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  uploadedBy: { ...requiredText, maxlength: 120 }, status: { type: String, enum: ['Active', 'Archived'], default: 'Active' },
  description: { ...optionalText, maxlength: 3000 }, remarks: { ...optionalText, maxlength: 2000 }, fileName: { type: String, default: '', trim: true, maxlength: 250 },
  fileData: { type: String, default: '', maxlength: 1500000 },
}, { ...opts, collection: 'business_records' });

const activitySchema = new Schema({
  id: businessId, title: { ...requiredText, maxlength: 160 }, description: { ...optionalText, maxlength: 800 },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, tone: { type: String, enum: ['green', 'blue', 'orange', 'purple', 'red', 'neutral'], default: 'blue' },
  actor: { type: String, default: '', maxlength: 120 },
}, { ...opts, collection: 'activities' });

const permissionSchema = new Schema({ role: { type: String, enum: ['Administrator', 'Manager/Owner', 'Staff'], unique: true, required: true }, pages: { type: Map, of: Boolean, default: {} } }, { ...opts, collection: 'role_permissions' });
const settingsSchema = new Schema({
  ownerUserId: { type: String, required: true, unique: true },
  profile: { name: { type: String, default: '' }, username: { type: String, default: '' }, email: { type: String, default: '' }, contact: { type: String, default: '' } },
  dateFormat: { type: String, enum: ['MMM DD, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], default: 'MMM DD, YYYY' },
  timeFormat: { type: String, enum: ['12-hour', '24-hour'], default: '12-hour' }, reportFormat: { type: String, enum: ['CSV', 'PDF', 'XLSX'], default: 'CSV' }, confirmDelete: { type: Boolean, default: true },
  notifications: { transactions: { type: Boolean, default: true }, lowStock: { type: Boolean, default: true }, procurement: { type: Boolean, default: true }, system: { type: Boolean, default: true } },
}, { ...opts, collection: 'user_settings' });

export const User = mongoose.model('User', userSchema);
export const Product = mongoose.model('Product', productSchema);
export const Customer = mongoose.model('Customer', customerSchema);
export const Supplier = mongoose.model('Supplier', supplierSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const InventoryMovement = mongoose.model('InventoryMovement', movementSchema);
export const Procurement = mongoose.model('Procurement', procurementSchema);
export const BusinessRecord = mongoose.model('BusinessRecord', recordSchema);
export const Activity = mongoose.model('Activity', activitySchema);
export const RolePermission = mongoose.model('RolePermission', permissionSchema);
export const UserSettings = mongoose.model('UserSettings', settingsSchema);
