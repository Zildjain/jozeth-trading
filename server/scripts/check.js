import assert from 'node:assert/strict';
import { loginSchema, transactionCreateSchema, movementCreateSchema, procurementCreateSchema, productCreateSchema, productUpdateSchema, recordCreateSchema } from '../src/validation.js';

assert.equal(loginSchema.safeParse({ identifier: 'admin', password: 'good', rememberMe: false }).success, true);
assert.equal(loginSchema.safeParse({ identifier: { $ne: null }, password: 'x' }).success, false, 'login must reject Mongo operator objects');
assert.equal(transactionCreateSchema.safeParse({ customer: 'A Customer', date: '2026-10-13', items: [{ productId: 'PRD-1001', quantity: 1 }], status: 'Completed' }).success, true);
assert.equal(transactionCreateSchema.safeParse({ customer: 'A Customer', date: '2026-10-13', items: [{ productId: 'PRD-1001', quantity: { $gt: 0 } }], status: 'Completed' }).success, false, 'quantity must reject objects/operators');
assert.equal(transactionCreateSchema.safeParse({ customer: 'A Customer', date: '2026-10-13', items: [{ productId: 'PRD-1001', quantity: 1 }], status: 'Completed', '$where': 'return true' }).success, false, 'unknown fields must be rejected');
assert.equal(movementCreateSchema.safeParse({ productId: 'PRD-1001', date: '2026-10-13', type: 'Stock Out', quantity: 0 }).success, false);
assert.equal(procurementCreateSchema.safeParse({ supplier: 'Supplier', productId: 'PRD-1001', quantity: 5, unitCost: 10, date: '2026-10-13', priority: 'High', '$inc': { quantity: 100 } }).success, false);
assert.equal(productCreateSchema.safeParse({ id: 'PRD-9000', name: 'Test', category: 'Test', supplier: 'Test Supplier', purchasePrice: 1, sellingPrice: 2, quantity: 999, reorderLevel: 1, unit: 'unit' }).success, false, 'stock quantity may not be supplied when creating a product');
assert.equal(productUpdateSchema.safeParse({ quantity: 999, name: 'Injected stock edit' }).success, false, 'quantity may not be changed through product edit');
assert.equal(movementCreateSchema.safeParse({ productId: 'PRD-1001', date: '2026-10-13', type: 'Stock In', quantity: true }).success, false, 'quantity must be a scalar integer, not a boolean');
assert.equal(recordCreateSchema.safeParse({ id: 'REC-9000', name: 'Test', category: 'Other', date: '2026-10-13', uploadedBy: 'Spoofed User' }).success, false, 'uploadedBy must come from the authenticated session');
console.log('Validation checks passed: schemas reject operator objects, unknown fields, invalid quantities, and stock edits outside inventory workflows.');
