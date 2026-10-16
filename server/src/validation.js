import { z } from 'zod';

const shortText = (max = 160) => z.string().trim().min(1).max(max);
const optionalText = (max = 1200) => z.string().trim().max(max).optional().default('');
const id = z.string().trim().regex(/^[A-Z]{2,5}(?:-[A-Z0-9]+){1,4}$/).max(42);
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const parsed = new Date(`${value}T00:00:00.000Z`); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value; }, 'Enter a valid calendar date.');
const numericInput = z.union([
  z.number().finite(),
  z.string().trim().min(1).max(32).regex(/^-?(?:\d+|\d*\.\d+)$/),
]).transform((value) => typeof value === 'number' ? value : Number(value)).refine(Number.isFinite, 'Enter a valid number.');
const money = numericInput.refine((value) => value >= 0 && value <= 100000000000, 'Amount must be between 0 and 100000000000.');
const positiveInt = numericInput.refine((value) => Number.isSafeInteger(value) && value >= 1 && value <= 1000000, 'Quantity must be a whole number between 1 and 1000000.');
const nonNegativeInt = numericInput.refine((value) => Number.isSafeInteger(value) && value >= 0 && value <= 100000000, 'Value must be a non-negative whole number.');
const statuses = z.enum(['Active', 'Inactive']);

export const loginSchema = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128), rememberMe: z.boolean().optional().default(false) }).strict();
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12).max(128).regex(/[a-z]/, 'Must include a lowercase letter').regex(/[A-Z]/, 'Must include an uppercase letter').regex(/[0-9]/, 'Must include a number').regex(/[^A-Za-z0-9]/, 'Must include a symbol') }).strict();

export const productCreateSchema = z.object({ id: id.optional(), name: shortText(160), category: shortText(80), supplier: shortText(160), description: optionalText(1200), purchasePrice: money, sellingPrice: money, reorderLevel: nonNegativeInt, unit: shortText(40), status: statuses.optional().default('Active') }).strict();
export const productUpdateSchema = productCreateSchema.omit({ id: true }).partial().strict();
export const customerCreateSchema = z.object({ id: id.optional(), name: shortText(160), contact: optionalText(30), email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().default(''), address: optionalText(500), notes: optionalText(1200), status: statuses.optional().default('Active'), createdAt: dateString.optional() }).strict();
export const customerUpdateSchema = customerCreateSchema.omit({ id: true }).partial().strict();
export const supplierCreateSchema = z.object({ id: id.optional(), name: shortText(160), contactPerson: optionalText(120), contact: optionalText(30), email: z.union([z.string().trim().email().max(254), z.literal('')]).optional().default(''), address: optionalText(500), notes: optionalText(1200), status: statuses.optional().default('Active'), createdAt: dateString.optional() }).strict();
export const supplierUpdateSchema = supplierCreateSchema.omit({ id: true }).partial().strict();

const saleLine = z.object({ productId: shortText(42), quantity: positiveInt }).strict();
export const transactionCreateSchema = z.object({ id: id.optional(), customer: shortText(160), date: dateString, type: z.enum(['Sale']).optional().default('Sale'), items: z.array(saleLine).min(1).max(100), status: z.enum(['Completed', 'Pending']).default('Pending'), remarks: optionalText(2000) }).strict();
export const movementCreateSchema = z.object({ id: id.optional(), date: dateString, productId: shortText(42), type: z.enum(['Stock In', 'Stock Out']), quantity: positiveInt, reference: optionalText(100), remarks: optionalText(2000), supplier: optionalText(160) }).strict();
export const procurementCreateSchema = z.object({ id: id.optional(), supplier: shortText(160), productId: shortText(42), quantity: positiveInt, unitCost: money, date: dateString, expectedDate: z.union([dateString, z.literal('')]).optional().default(''), priority: z.enum(['Low', 'Normal', 'High', 'Urgent']).default('Normal'), remarks: optionalText(2000) }).strict();
export const procurementStatusSchema = z.object({ status: z.enum(['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled']) }).strict();

const recordBaseSchema = z.object({ id: id.optional(), name: shortText(180), category: shortText(80), relatedTransaction: optionalText(80), date: dateString, status: z.enum(['Active', 'Archived']).default('Active'), description: optionalText(3000), remarks: optionalText(2000), fileName: z.string().trim().max(250).optional().default(''), fileData: z.string().max(1500000).optional().default('') }).strict();
function validateAttachment(value, ctx) {
  if (!value.fileData) return;
  const match = value.fileData.match(/^data:(application\/pdf|image\/(?:png|jpeg)|text\/(?:plain|csv));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fileData'], message: 'Attachment type is not permitted. Use PDF, PNG, JPEG, TXT, or CSV.' });
  if (match && Buffer.byteLength(match[2], 'base64') > 1048576) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fileData'], message: 'Attachment must be 1 MB or smaller.' });
}
export const recordCreateSchema = recordBaseSchema.superRefine(validateAttachment);
export const recordUpdateSchema = recordBaseSchema.omit({ id: true }).partial().strict().superRefine(validateAttachment);

export const userCreateSchema = z.object({ id: id.optional(), name: shortText(120), username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/), email: z.string().trim().toLowerCase().email().max(254), contact: optionalText(30), role: z.enum(['Administrator', 'Manager/Owner', 'Staff']), status: statuses.default('Active'), password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/), createdAt: dateString.optional() }).strict();
export const userUpdateSchema = z.object({ name: shortText(120).optional(), username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/).optional(), email: z.string().trim().toLowerCase().email().max(254).optional(), contact: optionalText(30).optional(), role: z.enum(['Administrator', 'Manager/Owner', 'Staff']).optional(), status: statuses.optional() }).strict();
export const adminResetPasswordSchema = z.object({ password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/) }).strict();
export const profileSchema = z.object({ name: shortText(120), username: z.string().trim().toLowerCase().min(3).max(40).regex(/^[a-z0-9._-]+$/), email: z.string().trim().toLowerCase().email().max(254), contact: optionalText(30) }).strict();
export const settingsSchema = z.object({ dateFormat: z.enum(['MMM DD, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(), timeFormat: z.enum(['12-hour', '24-hour']).optional(), reportFormat: z.enum(['CSV', 'PDF', 'XLSX']).optional(), confirmDelete: z.boolean().optional(), notifications: z.object({ transactions: z.boolean().optional(), lowStock: z.boolean().optional(), procurement: z.boolean().optional(), system: z.boolean().optional() }).strict().optional(), profile: profileSchema.optional() }).strict();
export const permissionsSchema = z.object({ pages: z.record(z.string().max(80), z.boolean()) }).strict();
export const recordQuerySchema = z.object({ type: z.enum(['products', 'customers', 'suppliers', 'transactions', 'movements', 'procurements', 'records']).optional() }).strict();
