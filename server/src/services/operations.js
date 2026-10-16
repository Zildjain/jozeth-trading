import mongoose from 'mongoose';
import { Product, Customer, Supplier, Transaction, InventoryMovement, Procurement } from '../models/index.js';
import { HttpError } from '../middleware/errors.js';
import { makeId, todayISO, resolveBusinessId } from '../utils/ids.js';
import { audit } from './audit.js';

function dateOrToday(value) { return value || todayISO(); }

async function inTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally {
    await session.endSession();
  }
}

function aggregateLines(lines) {
  const map = new Map();
  for (const line of lines) {
    const prev = map.get(line.productId);
    map.set(line.productId, { productId: line.productId, quantity: (prev?.quantity || 0) + line.quantity });
  }
  return [...map.values()];
}

async function decrementAndRecord({ session, transactionId, actor, date, items, remarks = '' }) {
  const aggregated = aggregateLines(items);
  const productDocs = [];
  // Sequential writes in a MongoDB transaction are intentional; parallel writes in one transaction are unsupported.
  for (const line of aggregated) {
    const product = await Product.findOne({ id: line.productId, status: 'Active' }).session(session);
    if (!product) throw new HttpError(404, `Product ${line.productId} was not found or is inactive.`);
    if (product.quantity < line.quantity) throw new HttpError(409, `Insufficient stock for ${product.name}. Available: ${product.quantity}; requested: ${line.quantity}.`);
    const previousStock = product.quantity;
    product.quantity -= line.quantity;
    product.updatedAt = date;
    await product.save({ session });
    const movement = new InventoryMovement({
      id: makeId('MOV'), date, productId: product.id, productName: product.name,
      type: 'Stock Out', quantity: line.quantity, previousStock, updatedStock: product.quantity,
      user: actor.name, reference: transactionId, remarks: remarks || `Stock deducted for sale ${transactionId}.`,
      sourceType: 'Sale', sourceId: transactionId,
    });
    await movement.save({ session });
    productDocs.push(product);
  }
  return productDocs;
}

export async function createTransaction(input, user) {
  const id = resolveBusinessId(input.id, 'TXN');
  return inTransaction(async (session) => {
    if (await Transaction.findOne({ id }).session(session)) {
      throw new HttpError(409, `Transaction ${id} already exists. Refresh the page and try again.`);
    }
    const customer = await Customer.findOne({ name: input.customer, status: 'Active' }).session(session);
    if (!customer) throw new HttpError(422, 'Select an active customer that exists in the database.');
    const lines = aggregateLines(input.items);
    const prepared = [];
    for (const line of lines) {
      const product = await Product.findOne({ id: line.productId, status: 'Active' }).session(session);
      if (!product) throw new HttpError(422, `Product ${line.productId} is not active or does not exist.`);
      const unitPrice = Math.round(Number(product.sellingPrice) * 100) / 100;
      prepared.push({ productId: product.id, productName: product.name, quantity: line.quantity, unitPrice });
    }
    const amount = Math.round(prepared.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) * 100) / 100;
    if (!Number.isFinite(amount) || amount > 100000000000) throw new HttpError(422, 'Transaction total is outside the permitted range.');
    const stockApplied = input.status === 'Completed';
    if (stockApplied) await decrementAndRecord({ session, transactionId: id, actor: user, date: dateOrToday(input.date), items: prepared, remarks: input.remarks });
    const transaction = new Transaction({
      id, customer: customer.name, date: dateOrToday(input.date), type: 'Sale', items: prepared, amount,
      status: input.status, recordedBy: user.name, remarks: input.remarks || '', stockApplied,
      completedAt: stockApplied ? new Date() : null,
    });
    await transaction.save({ session });
    await audit({ title: stockApplied ? 'Sale completed' : 'Sale recorded as pending', description: `${id} · ${customer.name} · ₱${amount.toFixed(2)}`, tone: stockApplied ? 'green' : 'orange', actor: user.name }, session);
    return transaction;
  });
}

export async function completeTransaction(id, user) {
  return inTransaction(async (session) => {
    const transaction = await Transaction.findOne({ id }).session(session);
    if (!transaction) throw new HttpError(404, 'Transaction was not found.');
    if (transaction.status === 'Completed' && transaction.stockApplied) return transaction;
    if (transaction.status !== 'Pending') throw new HttpError(409, 'Only pending transactions can be completed.');
    if (transaction.type !== 'Sale') {
      transaction.status = 'Completed'; transaction.stockApplied = false; transaction.completedAt = new Date();
      await transaction.save({ session });
    } else {
      await decrementAndRecord({ session, transactionId: transaction.id, actor: user, date: todayISO(), items: transaction.items, remarks: `Stock deducted when pending sale ${transaction.id} was completed.` });
      transaction.status = 'Completed'; transaction.stockApplied = true; transaction.completedAt = new Date();
      await transaction.save({ session });
    }
    await audit({ title: 'Transaction completed', description: `${transaction.id} completed by ${user.name}.`, tone: 'green', actor: user.name }, session);
    return transaction;
  });
}

export async function cancelTransaction(id, user) {
  return inTransaction(async (session) => {
    const transaction = await Transaction.findOne({ id }).session(session);
    if (!transaction) throw new HttpError(404, 'Transaction was not found.');
    if (transaction.status === 'Cancelled') return transaction;
    if (transaction.status !== 'Pending' || transaction.stockApplied) throw new HttpError(409, 'Only a pending transaction without stock impact can be cancelled.');
    transaction.status = 'Cancelled'; transaction.cancelledAt = new Date();
    await transaction.save({ session });
    await audit({ title: 'Transaction cancelled', description: `${transaction.id} cancelled by ${user.name}.`, tone: 'red', actor: user.name }, session);
    return transaction;
  });
}

export async function createMovement(input, user) {
  const id = resolveBusinessId(input.id, 'MOV');
  // Suppliers are meaningful only for receipt movements. Never persist client-supplied supplier text on Stock Out.
  if (input.type !== 'Stock In') input = { ...input, supplier: '' };
  if (input.type === 'Stock In' && input.supplier) {
    const supplier = await Supplier.findOne({ name: input.supplier, status: 'Active' }).select('id name');
    if (!supplier) throw new HttpError(422, 'Select an active supplier or leave the supplier field blank.');
    input = { ...input, supplier: supplier.name };
  }
  if (await InventoryMovement.exists({ id })) throw new HttpError(409, `Movement ${id} already exists.`);
  return inTransaction(async (session) => {
    if (input.type === 'Stock Out' && input.reference) {
      const linkedSale = await Transaction.findOne({ id: input.reference, type: 'Sale' }).session(session);
      const existingManualMovement = await InventoryMovement.findOne({ reference: input.reference, type: 'Stock Out', sourceType: 'Manual' }).session(session);
      if (linkedSale || existingManualMovement) throw new HttpError(409, `Reference ${input.reference} belongs to a sale or an earlier stock-out. Let the original transaction control its stock changes.`);
    }
    const product = await Product.findOne({ id: input.productId, status: 'Active' }).session(session);
    if (!product) throw new HttpError(404, 'Product was not found or is inactive.');
    if (input.type === 'Stock Out' && product.quantity < input.quantity) throw new HttpError(409, `Cannot issue ${input.quantity} ${product.unit}; only ${product.quantity} are available.`);
    const previousStock = product.quantity;
    product.quantity = input.type === 'Stock In' ? product.quantity + input.quantity : product.quantity - input.quantity;
    if (product.quantity > 100000000) throw new HttpError(422, 'The stock quantity would exceed the supported maximum.');
    product.updatedAt = input.date;
    await product.save({ session });
    const movement = new InventoryMovement({
      id, date: input.date, productId: product.id, productName: product.name, type: input.type,
      quantity: input.quantity, previousStock, updatedStock: product.quantity, user: user.name,
      reference: input.reference || id, remarks: input.remarks || (input.supplier ? `Supplier: ${input.supplier}` : ''), supplier: input.supplier || '',
      sourceType: 'Manual', sourceId: id,
    });
    await movement.save({ session });
    await audit({ title: input.type === 'Stock In' ? 'Stock received' : 'Stock issued', description: `${product.name}: ${previousStock} → ${product.quantity} ${product.unit}.`, tone: input.type === 'Stock In' ? 'green' : 'orange', actor: user.name }, session);
    return movement;
  });
}

export async function createProcurement(input, user) {
  const id = resolveBusinessId(input.id, 'PO');
  if (await Procurement.exists({ id })) throw new HttpError(409, `Procurement ${id} already exists.`);
  const supplier = await Supplier.findOne({ name: input.supplier, status: 'Active' });
  if (!supplier) throw new HttpError(422, 'Select an active supplier that exists in the database.');
  const product = await Product.findOne({ id: input.productId, status: 'Active' });
  if (!product) throw new HttpError(422, 'Select an active product that exists in the database.');
  const po = new Procurement({
    id, supplier: supplier.name, productId: product.id, productName: product.name, quantity: input.quantity,
    unitCost: input.unitCost, date: input.date, expectedDate: input.expectedDate || '', priority: input.priority,
    status: 'Pending', remarks: input.remarks || '', stockApplied: false, createdBy: user.name,
  });
  await po.save();
  await audit({ title: 'Procurement request created', description: `${id} · ${product.name} × ${input.quantity} · ${supplier.name}.`, tone: 'orange', actor: user.name });
  return po;
}

const allowedNext = { Draft: ['Pending', 'Cancelled'], Pending: ['Approved', 'Cancelled'], Approved: ['Ordered', 'Cancelled'], Ordered: ['Received', 'Cancelled'] };
export async function updateProcurementStatus(id, nextStatus, user) {
  return inTransaction(async (session) => {
    const po = await Procurement.findOne({ id }).session(session);
    if (!po) throw new HttpError(404, 'Procurement request was not found.');
    if (po.status === nextStatus) return po;
    if (po.status === 'Received' || po.status === 'Cancelled') throw new HttpError(409, `A ${po.status.toLowerCase()} procurement request cannot be changed.`);
    if (!(allowedNext[po.status] || []).includes(nextStatus)) throw new HttpError(409, `Invalid procurement transition: ${po.status} → ${nextStatus}.`);
    if (nextStatus === 'Received') {
      if (po.stockApplied) throw new HttpError(409, 'This receipt has already been applied to inventory.');
      const product = await Product.findOne({ id: po.productId, status: 'Active' }).session(session);
      if (!product) throw new HttpError(404, 'The linked product was not found or is inactive.');
      const previousStock = product.quantity;
      product.quantity += po.quantity;
      if (product.quantity > 100000000) throw new HttpError(422, 'The receipt would exceed the supported stock maximum.');
      product.updatedAt = todayISO();
      await product.save({ session });
      const movement = new InventoryMovement({
        id: makeId('MOV'), date: todayISO(), productId: product.id, productName: product.name, type: 'Stock In',
        quantity: po.quantity, previousStock, updatedStock: product.quantity, user: user.name,
        reference: po.id, remarks: `Received from ${po.supplier}.`, supplier: po.supplier,
        sourceType: 'Procurement', sourceId: po.id,
      });
      await movement.save({ session });
      po.stockApplied = true; po.receivedAt = todayISO();
    }
    po.status = nextStatus;
    await po.save({ session });
    await audit({ title: nextStatus === 'Received' ? 'Procurement received' : `Procurement ${nextStatus.toLowerCase()}`, description: `${po.id} moved from procurement to ${nextStatus.toLowerCase()}.`, tone: nextStatus === 'Received' ? 'green' : nextStatus === 'Cancelled' ? 'red' : 'blue', actor: user.name }, session);
    return po;
  });
}
