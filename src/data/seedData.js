const now = new Date();
const isoDate = (offset = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const DEFAULT_PERMISSIONS = {
  Administrator: {
    Dashboard: true, Products: true, Customers: true, Suppliers: true,
    'Sales & Transactions': true, Inventory: true, Procurement: true,
    'Records Management': true, Reports: true, 'User Management': true,
    'Role & Permissions': true, Settings: true,
  },
  'Manager/Owner': {
    Dashboard: true, Products: false, Customers: false, Suppliers: false,
    'Sales & Transactions': true, Inventory: true, Procurement: true,
    'Records Management': true, Reports: true, 'User Management': false,
    'Role & Permissions': false, Settings: true,
  },
  Staff: {
    Dashboard: true, Products: false, Customers: false, Suppliers: false,
    'Sales & Transactions': true, Inventory: true, Procurement: true,
    'Records Management': true, Reports: false, 'User Management': false,
    'Role & Permissions': false, Settings: true,
  },
};

export const initialData = {
  users: [
    { id: 'USR-001', name: 'Kyle Rivera', username: 'admin', email: 'admin@jozeth.local', contact: '09171230001', role: 'Administrator', status: 'Active', createdAt: isoDate(-100), lastLogin: 'Today' },
    { id: 'USR-002', name: 'Juan Dela Cruz', username: 'manager', email: 'manager@jozeth.local', contact: '09171230002', role: 'Manager/Owner', status: 'Active', createdAt: isoDate(-80), lastLogin: 'Yesterday' },
    { id: 'USR-003', name: 'Maria Santos', username: 'staff', email: 'staff@jozeth.local', contact: '09171230003', role: 'Staff', status: 'Active', createdAt: isoDate(-60), lastLogin: 'Oct 11, 2026' },
  ],
  products: [
    { id: 'PRD-1001', name: 'Premium Rice (25kg)', category: 'Grains', supplier: 'Farmers Grains Trading', description: 'Premium local rice, 25kg sack.', purchasePrice: 1180, sellingPrice: 1350, quantity: 18, reorderLevel: 10, unit: 'bags', status: 'Active', updatedAt: isoDate(-1) },
    { id: 'PRD-1002', name: 'Cooking Oil (1L)', category: 'Grocery', supplier: 'Pacific Goods Trading', description: 'Refined cooking oil, 1 liter bottle.', purchasePrice: 78, sellingPrice: 95, quantity: 5, reorderLevel: 15, unit: 'bottles', status: 'Active', updatedAt: isoDate(-1) },
    { id: 'PRD-1003', name: 'Brown Sugar (1kg)', category: 'Grocery', supplier: 'Farmers Grains Trading', description: 'Brown sugar, 1kg pack.', purchasePrice: 55, sellingPrice: 68, quantity: 8, reorderLevel: 20, unit: 'packs', status: 'Active', updatedAt: isoDate(-2) },
    { id: 'PRD-1004', name: 'Soy Sauce (500ml)', category: 'Condiments', supplier: 'Pacific Goods Trading', description: 'Soy sauce, 500ml bottle.', purchasePrice: 28, sellingPrice: 38, quantity: 4, reorderLevel: 12, unit: 'bottles', status: 'Active', updatedAt: isoDate(-1) },
    { id: 'PRD-1005', name: 'Wheat Flour (1kg)', category: 'Baking', supplier: 'Northstar Food Supply', description: 'All-purpose wheat flour, 1kg pack.', purchasePrice: 42, sellingPrice: 55, quantity: 28, reorderLevel: 10, unit: 'packs', status: 'Active', updatedAt: isoDate(-3) },
    { id: 'PRD-1006', name: 'Laundry Detergent (1kg)', category: 'Household', supplier: 'Pacific Goods Trading', description: 'Powder detergent, 1kg pack.', purchasePrice: 83, sellingPrice: 105, quantity: 40, reorderLevel: 12, unit: 'packs', status: 'Active', updatedAt: isoDate(-1) },
    { id: 'PRD-1007', name: 'Canned Sardines', category: 'Canned Goods', supplier: 'Metro Wholesale Depot', description: 'Tomato sauce sardines, standard can.', purchasePrice: 20, sellingPrice: 28, quantity: 0, reorderLevel: 10, unit: 'cans', status: 'Active', updatedAt: isoDate(-4) },
    { id: 'PRD-1008', name: 'Instant Noodles', category: 'Grocery', supplier: 'Metro Wholesale Depot', description: 'Instant noodles, assorted flavors.', purchasePrice: 9, sellingPrice: 13, quantity: 62, reorderLevel: 20, unit: 'packs', status: 'Active', updatedAt: isoDate(-2) },
    { id: 'PRD-1009', name: 'Packing Tape 48mm', category: 'Packaging', supplier: 'Caloocan Packaging Center', description: 'Clear packaging tape, 48mm roll.', purchasePrice: 24, sellingPrice: 35, quantity: 7, reorderLevel: 25, unit: 'rolls', status: 'Active', updatedAt: isoDate(-1) },
  ],
  customers: [
    { id: 'CUS-001', name: 'Maria Santos', contact: '09171230011', email: 'maria.santos@example.com', address: 'Caloocan City, Metro Manila', notes: 'Regular retail customer.', status: 'Active', createdAt: isoDate(-50) },
    { id: 'CUS-002', name: 'Carlos Reyes', contact: '09171230012', email: 'carlos.reyes@example.com', address: 'Malabon City, Metro Manila', notes: '', status: 'Active', createdAt: isoDate(-42) },
    { id: 'CUS-003', name: 'Liza Mendoza', contact: '09171230013', email: 'liza.mendoza@example.com', address: 'Quezon City, Metro Manila', notes: 'Prefers weekday delivery.', status: 'Active', createdAt: isoDate(-38) },
    { id: 'CUS-004', name: 'Ramon Cruz', contact: '09171230014', email: 'ramon.cruz@example.com', address: 'Valenzuela City, Metro Manila', notes: '', status: 'Active', createdAt: isoDate(-32) },
    { id: 'CUS-005', name: 'Angela Villanueva', contact: '09171230015', email: 'angela.v@example.com', address: 'Manila, Metro Manila', notes: '', status: 'Active', createdAt: isoDate(-25) },
    { id: 'CUS-006', name: 'Northgate Mini Mart', contact: '09171230016', email: 'orders@northgate.example', address: 'Caloocan City, Metro Manila', notes: 'Wholesale customer.', status: 'Active', createdAt: isoDate(-20) },
  ],
  suppliers: [
    { id: 'SUP-001', name: 'Farmers Grains Trading', contactPerson: 'Roberto Flores', contact: '09171230101', email: 'sales@farmersgrains.example', address: 'Bocaue, Bulacan', notes: 'Rice and grains.', status: 'Active', createdAt: isoDate(-120) },
    { id: 'SUP-002', name: 'Pacific Goods Trading', contactPerson: 'Elaine Lim', contact: '09171230102', email: 'orders@pacificgoods.example', address: 'Caloocan City, Metro Manila', notes: 'Grocery and household goods.', status: 'Active', createdAt: isoDate(-110) },
    { id: 'SUP-003', name: 'Northstar Food Supply', contactPerson: 'Joel Navarro', contact: '09171230103', email: 'northstar@example.com', address: 'Quezon City, Metro Manila', notes: 'Dry goods and baking supplies.', status: 'Active', createdAt: isoDate(-90) },
    { id: 'SUP-004', name: 'Metro Wholesale Depot', contactPerson: 'Grace Bautista', contact: '09171230104', email: 'metrodepot@example.com', address: 'Manila, Metro Manila', notes: 'Canned and packaged goods.', status: 'Active', createdAt: isoDate(-75) },
    { id: 'SUP-005', name: 'Caloocan Packaging Center', contactPerson: 'Dennis Ramos', contact: '09171230105', email: 'cpc@example.com', address: 'Caloocan City, Metro Manila', notes: 'Packaging materials.', status: 'Active', createdAt: isoDate(-60) },
  ],
  transactions: [
    { id: 'TXN-3041', customer: 'Maria Santos', date: isoDate(0), type: 'Sale', items: [{ productId: 'PRD-1008', productName: 'Instant Noodles', quantity: 10, unitPrice: 13 }], amount: 130, status: 'Completed', recordedBy: 'Maria Santos', remarks: 'Counter sale.', stockApplied: true },
    { id: 'TXN-3040', customer: 'Carlos Reyes', date: isoDate(0), type: 'Sale', items: [{ productId: 'PRD-1006', productName: 'Laundry Detergent (1kg)', quantity: 8, unitPrice: 105 }], amount: 840, status: 'Completed', recordedBy: 'Kyle Rivera', remarks: '', stockApplied: true },
    { id: 'TXN-3039', customer: 'Liza Mendoza', date: isoDate(-1), type: 'Purchase Order', items: [{ productId: 'PRD-1002', productName: 'Cooking Oil (1L)', quantity: 20, unitPrice: 95 }], amount: 1900, status: 'Pending', recordedBy: 'Juan Dela Cruz', remarks: 'Awaiting confirmation.', stockApplied: false },
    { id: 'TXN-3038', customer: 'Ramon Cruz', date: isoDate(-1), type: 'Sale', items: [{ productId: 'PRD-1005', productName: 'Wheat Flour (1kg)', quantity: 20, unitPrice: 55 }], amount: 1100, status: 'Cancelled', recordedBy: 'Maria Santos', remarks: '', stockApplied: false },
    { id: 'TXN-3037', customer: 'Angela Villanueva', date: isoDate(-2), type: 'Sale', items: [{ productId: 'PRD-1001', productName: 'Premium Rice (25kg)', quantity: 2, unitPrice: 1350 }], amount: 2700, status: 'Completed', recordedBy: 'Kyle Rivera', remarks: 'Bulk order.', stockApplied: true },
  ],
  movements: [
    { id: 'MOV-2005', date: isoDate(-1), productId: 'PRD-1002', productName: 'Cooking Oil (1L)', type: 'Stock Out', quantity: 2, previousStock: 7, updatedStock: 5, user: 'Maria Santos', reference: 'POS-3040', remarks: 'Counter sale.' },
    { id: 'MOV-2004', date: isoDate(-1), productId: 'PRD-1008', productName: 'Instant Noodles', type: 'Stock Out', quantity: 10, previousStock: 72, updatedStock: 62, user: 'Maria Santos', reference: 'TXN-3041', remarks: 'Sale recorded.' },
    { id: 'MOV-2003', date: isoDate(-2), productId: 'PRD-1009', productName: 'Packing Tape 48mm', type: 'Stock In', quantity: 5, previousStock: 2, updatedStock: 7, user: 'Kyle Rivera', reference: 'PO-2026-014', remarks: 'Supplier delivery.' },
    { id: 'MOV-2002', date: isoDate(-3), productId: 'PRD-1001', productName: 'Premium Rice (25kg)', type: 'Stock Out', quantity: 2, previousStock: 20, updatedStock: 18, user: 'Maria Santos', reference: 'TXN-3037', remarks: 'Sale recorded.' },
  ],
  procurements: [
    { id: 'PO-2026-018', supplier: 'Farmers Grains Trading', productId: 'PRD-1001', productName: 'Premium Rice (25kg)', quantity: 20, unitCost: 1180, date: isoDate(-1), expectedDate: isoDate(5), priority: 'High', status: 'Pending', remarks: 'Restock request.', stockApplied: false, createdBy: 'Juan Dela Cruz' },
    { id: 'PO-2026-017', supplier: 'Pacific Goods Trading', productId: 'PRD-1002', productName: 'Cooking Oil (1L)', quantity: 30, unitCost: 78, date: isoDate(-3), expectedDate: isoDate(2), priority: 'Normal', status: 'Ordered', remarks: '', stockApplied: false, createdBy: 'Kyle Rivera' },
    { id: 'PO-2026-016', supplier: 'Caloocan Packaging Center', productId: 'PRD-1009', productName: 'Packing Tape 48mm', quantity: 10, unitCost: 24, date: isoDate(-5), expectedDate: isoDate(-1), priority: 'Normal', status: 'Received', remarks: 'Received in full.', stockApplied: true, createdBy: 'Kyle Rivera' },
    { id: 'PO-2026-015', supplier: 'Metro Wholesale Depot', productId: 'PRD-1007', productName: 'Canned Sardines', quantity: 50, unitCost: 20, date: isoDate(-8), expectedDate: isoDate(-2), priority: 'High', status: 'Cancelled', remarks: 'Supplier unable to fulfill.', stockApplied: false, createdBy: 'Juan Dela Cruz' },
  ],
  records: [
    { id: 'REC-001', name: 'October Sales Summary', category: 'Sales Records', relatedTransaction: 'TXN-3041', date: isoDate(-1), uploadedBy: 'Kyle Rivera', status: 'Active', description: 'Summary of daily counter transactions.', remarks: '', fileName: '', fileData: '' },
    { id: 'REC-002', name: 'Rice Supplier Delivery Receipt', category: 'Supplier Records', relatedTransaction: 'PO-2026-016', date: isoDate(-2), uploadedBy: 'Juan Dela Cruz', status: 'Active', description: 'Delivery note for received packaging goods.', remarks: '', fileName: '', fileData: '' },
    { id: 'REC-003', name: 'Inventory Count — October', category: 'Inventory Records', relatedTransaction: '', date: isoDate(-4), uploadedBy: 'Maria Santos', status: 'Active', description: 'Physical stock count notes.', remarks: 'Review low stock.', fileName: '', fileData: '' },
    { id: 'REC-004', name: 'Supplier Contact List', category: 'Business Documents', relatedTransaction: '', date: isoDate(-10), uploadedBy: 'Kyle Rivera', status: 'Archived', description: 'Older supplier contact document.', remarks: '', fileName: '', fileData: '' },
  ],
  permissions: DEFAULT_PERMISSIONS,
  settings: {
    profile: { name: 'Kyle Rivera', username: 'admin', email: 'admin@jozeth.local', contact: '09171230001' },
    dateFormat: 'MMM DD, YYYY', timeFormat: '12-hour', reportFormat: 'CSV', confirmDelete: true,
    notifications: { transactions: true, lowStock: true, procurement: true, system: true },
  },
  activity: [
    { id: 'ACT-005', title: 'Sale completed', description: 'TXN-3041 was recorded.', date: isoDate(-1), tone: 'green' },
    { id: 'ACT-004', title: 'Stock level updated', description: 'Packing Tape quantity was adjusted.', date: isoDate(-1), tone: 'blue' },
    { id: 'ACT-003', title: 'Procurement request added', description: 'PO-2026-018 is awaiting review.', date: isoDate(-1), tone: 'orange' },
    { id: 'ACT-002', title: 'Supplier information updated', description: 'Pacific Goods Trading contact details reviewed.', date: isoDate(-2), tone: 'purple' },
  ],
};

export function createInitialData() {
  // Keep fresh nested objects for each browser session; don't mutate the seed constants.
  return JSON.parse(JSON.stringify(initialData));
}
