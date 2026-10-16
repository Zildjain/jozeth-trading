import { Router } from 'express';
import { requireAuth, allowRoles, requireModuleAccess } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { transactionCreateSchema, movementCreateSchema, procurementCreateSchema, procurementStatusSchema } from '../validation.js';
import { createMovement, createProcurement, createTransaction, completeTransaction, cancelTransaction, updateProcurementStatus } from '../services/operations.js';
import { plain } from '../utils/serializers.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();
router.use(requireAuth);
const idParamSchema = { safeParse: (value) => (typeof value?.id === 'string' && /^[A-Z]{2,5}(?:-[A-Z0-9]+){1,4}$/.test(value.id) ? { success: true, data: { id: value.id } } : { success: false, error: { issues: [{ path: ['id'], message: 'Invalid transaction ID.' }] } }) };

router.post('/transactions', requireModuleAccess('Sales & Transactions'), validateBody(transactionCreateSchema), async (req, res) => {
  const transaction = await createTransaction(req.validatedBody, req.user);
  res.status(201).json(plain(transaction));
});
router.post('/transactions/:id/complete', requireModuleAccess('Sales & Transactions'), validateParams(idParamSchema), async (req, res) => {
  const transaction = await completeTransaction(req.validatedParams.id, req.user);
  res.json(plain(transaction));
});
router.post('/transactions/:id/cancel', requireModuleAccess('Sales & Transactions'), validateParams(idParamSchema), async (req, res) => {
  const transaction = await cancelTransaction(req.validatedParams.id, req.user);
  res.json(plain(transaction));
});

router.post('/inventory/movements', requireModuleAccess('Inventory'), validateBody(movementCreateSchema), async (req, res) => {
  if (req.user.role === 'Staff' && req.validatedBody.type === 'Stock In') {
    // Staff may record operational stock movements as allowed by the proposal; authorization is server-side.
  }
  const movement = await createMovement(req.validatedBody, req.user);
  res.status(201).json(plain(movement));
});

router.post('/procurements', requireModuleAccess('Procurement'), allowRoles('Administrator', 'Manager/Owner'), validateBody(procurementCreateSchema), async (req, res) => {
  const po = await createProcurement(req.validatedBody, req.user);
  res.status(201).json(plain(po));
});
router.patch('/procurements/:id', requireModuleAccess('Procurement'), allowRoles('Administrator', 'Manager/Owner'), validateParams(idParamSchema), validateBody(procurementStatusSchema), async (req, res) => {
  const po = await updateProcurementStatus(req.validatedParams.id, req.validatedBody.status, req.user);
  res.json(plain(po));
});

export default router;
