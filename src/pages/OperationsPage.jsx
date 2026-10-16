import React, { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, ClipboardList, Eye, Package, Plus, Search, ShoppingCart, Truck, XCircle } from 'lucide-react';
//import { ArrowDownToLine, ArrowUpFromLine, Check, ClipboardList, Eye, Package, Plus, ShoppingCart, Truck, XCircle } from 'lucide-react';
import Button from '../components/Button.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { addActivity, currency, formatDate, getStockStatus, nextId, todayISO } from '../utils/helpers.js';

const selectOptions = (items, key = 'name') => items.filter((item) => item.status !== 'Inactive').map((item) => ({ value: item[key], label: item[key] }));

export default function OperationsPage({ title, data, setData, user, searchValue, notify }) {
  if (title === 'Inventory') return <InventoryPage data={data} setData={setData} user={user} searchValue={searchValue} notify={notify} />;
  if (title === 'Procurement') return <ProcurementPage data={data} setData={setData} user={user} searchValue={searchValue} notify={notify} />;
  return <SalesPage data={data} setData={setData} user={user} searchValue={searchValue} notify={notify} />;
}

function SalesPage({ data, setData, user, searchValue, notify }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [type, setType] = useState('All types');
  const [modal, setModal] = useState('');
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ customer: data.customers.find((item) => item.status === 'Active')?.name || '', date: todayISO(), status: 'Completed', remarks: '', items: [{ productId: data.products[0]?.id || '', quantity: '1' }] });
  const list = data.transactions || [];
  const filtered = useMemo(() => {
    const needle = `${searchValue || ''} ${query}`.trim().toLowerCase();
    return list.filter((item) => `${item.id} ${item.customer} ${item.status} ${item.type} ${item.recordedBy}`.toLowerCase().includes(needle)
      && (status === 'All statuses' || item.status === status) && (type === 'All types' || item.type === type));
  }, [list, query, searchValue, status, type]);
  const completed = list.filter((item) => item.status === 'Completed');
  const totalSales = completed.filter((item) => item.type === 'Sale').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pendingCount = list.filter((item) => item.status === 'Pending').length;

  function startCreate() {
    setError('');
    setForm({ customer: data.customers.find((item) => item.status === 'Active')?.name || '', date: todayISO(), status: 'Completed', remarks: '', items: [{ productId: data.products.find((product) => product.status === 'Active')?.id || '', quantity: '1' }] });
    setModal('create');
  }
  function updateItem(index, key, value) {
    setForm((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  }
  const amount = form.items.reduce((sum, item) => sum + Number(data.products.find((product) => product.id === item.productId)?.sellingPrice || 0) * Number(item.quantity || 0), 0);

  function createTransaction(event) {
    event.preventDefault();
    if (!form.customer) { setError('Choose a customer before recording this transaction.'); return; }
    if (!form.items.length || form.items.some((item) => !item.productId || Number(item.quantity) <= 0 || !Number.isFinite(Number(item.quantity)))) { setError('Choose a product and enter a quantity greater than zero for each line.'); return; }
    const requested = form.items.reduce((map, item) => { map[item.productId] = (map[item.productId] || 0) + Number(item.quantity); return map; }, {});
    if (form.status === 'Completed') {
      const shortage = Object.entries(requested).find(([productId, quantity]) => Number(data.products.find((product) => product.id === productId)?.quantity || 0) < quantity);
      if (shortage) {
        const product = data.products.find((item) => item.id === shortage[0]);
        setError(`Not enough stock for ${product?.name || 'the selected product'}. Available: ${product?.quantity ?? 0}.`);
        return;
      }
    }
    const id = nextId('TXN', list, 'id', 4);
    const items = form.items.map((item) => {
      const product = data.products.find((entry) => entry.id === item.productId);
      return { productId: product.id, productName: product.name, quantity: Number(item.quantity), unitPrice: Number(product.sellingPrice) };
    });
    const transaction = { id, customer: form.customer, date: form.date, type: 'Sale', items, amount, status: form.status, recordedBy: user.name, remarks: form.remarks, stockApplied: form.status === 'Completed' };
    setData((current) => {
      if (current.transactions.some((entry) => entry.id === id)) return current;
      let products = current.products.map((product) => ({ ...product }));
      let movements = [...current.movements];
      if (form.status === 'Completed') {
        items.forEach((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          const previous = Number(product.quantity);
          product.quantity = previous - item.quantity;
          product.updatedAt = form.date;
          movements.unshift({ id: nextId('MOV', movements, 'id', 4), date: form.date, productId: product.id, productName: product.name, type: 'Stock Out', quantity: item.quantity, previousStock: previous, updatedStock: product.quantity, user: user.name, reference: id, remarks: 'Stock deducted for completed sale.' });
        });
      }
      return addActivity({ ...current, products, movements, transactions: [transaction, ...current.transactions] }, 'Transaction recorded', `${id} · ${form.customer} · ${currency(amount)}`, 'green');
    });
    notify(`Transaction ${id} recorded${form.status === 'Completed' ? ' and inventory updated' : ' as pending'}.`);
    setModal('');
  }

  function completePending(transaction) {
    if (transaction.type !== 'Sale') {
      setData((current) => {
        const latest = current.transactions.find((item) => item.id === transaction.id);
        if (!latest || latest.status !== 'Pending' || latest.stockApplied) return current;
        return addActivity({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, status: 'Completed', stockApplied: false } : item) }, 'Transaction record completed', `${transaction.id} completed without changing stock.`, 'green');
      });
      setModal(''); setViewing(null); notify(`${transaction.id} completed without changing inventory.`); return;
    }
    const needed = transaction.items.reduce((map, item) => { map[item.productId] = (map[item.productId] || 0) + Number(item.quantity); return map; }, {});
    const shortage = Object.entries(needed).find(([id, quantity]) => Number(data.products.find((item) => item.id === id)?.quantity || 0) < quantity);
    if (shortage) { notify(`Cannot complete: insufficient stock for ${data.products.find((item) => item.id === shortage[0])?.name}.`, 'error'); return; }
    setData((current) => {
      const latestTransaction = current.transactions.find((item) => item.id === transaction.id);
      if (!latestTransaction || latestTransaction.status !== 'Pending' || latestTransaction.stockApplied) return current;
      const products = current.products.map((product) => ({ ...product })); const movements = [...current.movements];
      latestTransaction.items.forEach((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) return;
        const previous = Number(product.quantity); product.quantity = previous - Number(line.quantity); product.updatedAt = todayISO();
        movements.unshift({ id: nextId('MOV', movements, 'id', 4), date: todayISO(), productId: product.id, productName: product.name, type: 'Stock Out', quantity: Number(line.quantity), previousStock: previous, updatedStock: product.quantity, user: user.name, reference: transaction.id, remarks: 'Stock deducted when pending sale was completed.' });
      });
      const transactions = current.transactions.map((item) => item.id === transaction.id ? { ...item, status: 'Completed', stockApplied: true } : item);
      return addActivity({ ...current, products, movements, transactions }, 'Pending transaction completed', `${transaction.id} completed; stock was deducted once.`, 'green');
    });
    setModal(''); setViewing(null); notify(`${transaction.id} completed. Stock was deducted once.`);
  }

  function cancelPending(transaction) {
    if (transaction.status !== 'Pending') return;
    setData((current) => addActivity({ ...current, transactions: current.transactions.map((item) => item.id === transaction.id ? { ...item, status: 'Cancelled' } : item) }, 'Transaction cancelled', `${transaction.id} was cancelled.`, 'red'));
    setModal(''); setViewing(null); notify(`${transaction.id} cancelled.`);
  }

  return <>
    <PageHeading eyebrow="OPERATIONS" title="Sales & Transactions" description="Record sales, review transaction status, and keep stock deductions consistent." actions={<><Button variant="secondary" onClick={() => exportTransactions(filtered)}><ClipboardList size={14} /> Export CSV</Button><Button onClick={startCreate}><Plus size={15} /> New transaction</Button></>} />
    <div className="mini-stat-grid"><MiniStat label="Transactions" value={list.length} /><MiniStat label="Completed sales" value={completed.length} /><MiniStat label="Recorded sales" value={currency(totalSales)} /><MiniStat label="Pending review" value={pendingCount} /></div>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-toolbar__title"><ShoppingCart size={17} /><div><strong>Transaction register</strong><small>Completed sales reduce inventory once. Pending records do not change stock.</small></div></div><div className="data-toolbar__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search transactions..." /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Completed</option><option>Pending</option><option>Cancelled</option></select><select value={type} onChange={(event) => setType(event.target.value)}><option>All types</option><option>Sale</option><option>Purchase Order</option></select></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Transaction ID</th><th>Customer</th><th>Items</th><th>Transaction type</th><th>Amount</th><th>Date</th><th>Recorded by</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className="id-text">{item.id}</span></td><td className="table-primary">{item.customer}</td><td>{item.items?.reduce((sum, line) => sum + Number(line.quantity), 0) || 0} item(s)<small className="table-secondary">{item.items?.map((line) => line.productName).join(', ')}</small></td><td>{item.type}</td><td className="table-amount">{currency(item.amount)}</td><td>{formatDate(item.date)}</td><td>{item.recordedBy}</td><td><StatusBadge status={item.status} /></td><td><div className="row-actions"><button className="row-action" type="button" title="View" onClick={() => { setViewing(item); setModal('view'); }}><Eye size={15} /></button>{item.status === 'Pending' && item.type === 'Sale' && <button className="row-action" type="button" title="Complete transaction and deduct stock" onClick={() => completePending(item)}><Check size={15} /></button>}</div></td></tr>)}{!filtered.length && <EmptyRow span={9} />}</tbody></table></div><TableFooter shown={filtered.length} total={list.length} /></section>
    <Modal open={modal === 'create'} title="New transaction" description="Select the customer and one or more products. Amounts are calculated from the product selling price." onClose={() => setModal('')} wide>
      <form className="form-grid" onSubmit={createTransaction}>
        <FormSelect label="Customer" value={form.customer} onChange={(value) => setForm((current) => ({ ...current, customer: value }))} options={selectOptions(data.customers)} required />
        <FormSelect label="Status" value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={[{ value: 'Completed', label: 'Completed (deduct stock)' }, { value: 'Pending', label: 'Pending (no stock change)' }]} required />
        <FormInput label="Transaction date" type="date" value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} required />
        <div className="form-field form-field--full"><div className="line-items-heading"><label>Products and quantities</label><Button size="sm" variant="secondary" onClick={() => setForm((current) => ({ ...current, items: [...current.items, { productId: data.products.find((item) => item.status === 'Active')?.id || '', quantity: '1' }] }))}><Plus size={13} /> Add item</Button></div>
          <div className="line-items">{form.items.map((item, index) => { const product = data.products.find((entry) => entry.id === item.productId); return <div className="line-item-row" key={index}><select aria-label={`Product ${index + 1}`} value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)} required><option value="">Choose product</option>{data.products.filter((entry) => entry.status === 'Active').map((entry) => <option value={entry.id} key={entry.id}>{entry.name} · {entry.quantity} {entry.unit} · {currency(entry.sellingPrice)}</option>)}</select><input aria-label={`Quantity ${index + 1}`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} required /><strong>{currency(Number(product?.sellingPrice || 0) * Number(item.quantity || 0))}</strong>{form.items.length > 1 && <button type="button" className="row-action row-action--danger" aria-label="Remove product" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}><XCircle size={15} /></button>}</div>; })}</div>
        </div>
        <FormTextarea label="Remarks" value={form.remarks} onChange={(value) => setForm((current) => ({ ...current, remarks: value }))} />
        <div className="total-preview form-field--full"><span>Transaction total</span><strong>{currency(amount)}</strong></div>
        {error && <div className="form-error form-field--full">{error}</div>}
        <div className="form-actions form-field--full"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button type="submit"><Check size={14} /> Save transaction</Button></div>
      </form>
    </Modal>
    <Modal open={modal === 'view' && Boolean(viewing)} title={viewing?.id || 'Transaction details'} description="Saved transaction record and line-item breakdown." onClose={() => { setModal(''); setViewing(null); }} wide>
      {viewing && <><div className="detail-grid"><Detail label="Customer" value={viewing.customer} /><Detail label="Date" value={formatDate(viewing.date)} /><Detail label="Type" value={viewing.type} /><Detail label="Recorded by" value={viewing.recordedBy} /><Detail label="Status" value={<StatusBadge status={viewing.status} />} /><Detail label="Amount" value={currency(viewing.amount)} /><Detail label="Remarks" value={viewing.remarks || '—'} /><Detail label="Inventory" value={viewing.stockApplied ? 'Stock deduction applied' : 'No stock deduction applied'} /></div><div className="table-wrap detail-table"><table className="data-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th></tr></thead><tbody>{viewing.items?.map((item, index) => <tr key={`${viewing.id}-${index}`}><td>{item.productName}</td><td>{item.quantity}</td><td>{currency(item.unitPrice)}</td><td className="table-amount">{currency(item.quantity * item.unitPrice)}</td></tr>)}</tbody></table></div><div className="form-actions">{viewing.status === 'Pending' && <><Button variant="secondary" onClick={() => cancelPending(viewing)}>Cancel transaction</Button><Button onClick={() => completePending(viewing)}><Check size={14} /> {viewing.type === 'Sale' ? 'Complete and deduct stock' : 'Complete record (no stock change)'}</Button></>}<Button variant="secondary" onClick={() => { setModal(''); setViewing(null); }}>Close</Button></div></>}
    </Modal>
  </>;
}

function exportTransactions(items) {
  const rows = [['Transaction ID', 'Date', 'Customer', 'Type', 'Items', 'Amount', 'Status', 'Recorded By'], ...items.map((item) => [item.id, item.date, item.customer, item.type, item.items?.map((line) => `${line.productName} x ${line.quantity}`).join('; '), item.amount, item.status, item.recordedBy])];
  downloadCsvLocal('jozeth-transactions.csv', rows);
}

function downloadCsvLocal(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function InventoryPage({ data, setData, user, searchValue, notify }) {
  const [query, setQuery] = useState('');
  const [stockStatus, setStockStatus] = useState('All statuses');
  const [modal, setModal] = useState('');
  const [movementType, setMovementType] = useState('Stock In');
  const [form, setForm] = useState({ productId: data.products[0]?.id || '', quantity: '1', supplier: '', reference: '', date: todayISO(), remarks: '' });
  const [error, setError] = useState('');
  const [historyProduct, setHistoryProduct] = useState(null);
  const products = data.products || [];
  const allUnits = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
  const low = products.filter((item) => getStockStatus(item) === 'Low Stock').length;
  const out = products.filter((item) => getStockStatus(item) === 'Out of Stock').length;
  const filtered = products.filter((item) => `${item.id} ${item.name} ${item.category} ${item.supplier}`.toLowerCase().includes(`${searchValue || ''} ${query}`.trim().toLowerCase()) && (stockStatus === 'All statuses' || getStockStatus(item) === stockStatus));

  function openMovement(type, product) {
    setMovementType(type); setError('');
    setForm({ productId: product?.id || products.find((item) => item.status === 'Active')?.id || '', quantity: '1', supplier: type === 'Stock In' ? (product?.supplier || '') : '', reference: '', date: todayISO(), remarks: '' });
    setModal('movement');
  }
  function saveMovement(event) {
    event.preventDefault();
    const product = products.find((item) => item.id === form.productId);
    const quantity = Number(form.quantity);
    if (!product) { setError('Choose a product.'); return; }
    if (!Number.isInteger(quantity) || quantity <= 0) { setError('Quantity must be a whole number greater than zero.'); return; }
    if (movementType === 'Stock Out' && quantity > Number(product.quantity)) { setError(`Cannot remove ${quantity} ${product.unit}; only ${product.quantity} ${product.unit} are available.`); return; }
    const reference = form.reference.trim();
    if (movementType === 'Stock Out' && reference) {
      const saleAlreadyApplied = data.transactions.some((transaction) => transaction.id === reference && transaction.type === 'Sale' && transaction.status === 'Completed' && transaction.stockApplied);
      const movementAlreadyApplied = data.movements.some((movement) => movement.reference === reference && movement.type === 'Stock Out');
      if (saleAlreadyApplied || movementAlreadyApplied) { setError(`Reference ${reference} already has a stock-out transaction. Use a different reference to avoid deducting the same stock twice.`); return; }
    }
    const movementId = nextId('MOV', data.movements, 'id', 4);
    setData((current) => {
      if (current.movements.some((item) => item.id === movementId)) return current;
      const latestProduct = current.products.find((item) => item.id === product.id);
      if (!latestProduct || (movementType === 'Stock Out' && Number(latestProduct.quantity) < quantity)) return current;
      const nextProducts = current.products.map((item) => item.id === product.id ? { ...item, quantity: Number(item.quantity) + (movementType === 'Stock In' ? quantity : -quantity), updatedAt: form.date } : item);
      const updated = nextProducts.find((item) => item.id === product.id);
      const movement = { id: movementId, date: form.date, productId: product.id, productName: product.name, type: movementType, quantity, previousStock: Number(latestProduct.quantity), updatedStock: Number(updated.quantity), user: user.name, reference: form.reference || 'MANUAL', remarks: form.remarks || (form.supplier ? `Supplier: ${form.supplier}` : '') };
      return addActivity({ ...current, products: nextProducts, movements: [movement, ...current.movements] }, movementType === 'Stock In' ? 'Stock received' : 'Stock issued', `${product.name}: ${movementType === 'Stock In' ? '+' : '−'}${quantity} ${product.unit}.`, movementType === 'Stock In' ? 'green' : 'orange');
    });
    setModal(''); notify(`${movementType} saved. Inventory quantity updated.`);
  }
  const movements = (data.movements || []).filter((item) => !historyProduct || item.productId === historyProduct.id);

  return <>
    <PageHeading eyebrow="OPERATIONS" title="Inventory" description="Monitor available quantities, record stock movements, and review the inventory ledger." actions={<><Button variant="secondary" onClick={() => openMovement('Stock Out')}><ArrowUpFromLine size={14} /> Stock out</Button><Button onClick={() => openMovement('Stock In')}><ArrowDownToLine size={14} /> Stock in</Button></>} />
    <div className="mini-stat-grid"><MiniStat label="Product types" value={products.length} /><MiniStat label="Total units available" value={allUnits.toLocaleString()} /><MiniStat label="Low stock" value={low} tone="warning" /><MiniStat label="Out of stock" value={out} tone="danger" /></div>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-toolbar__title"><Package size={17} /><div><strong>Inventory register</strong><small>Stock status updates automatically using each product's reorder level.</small></div></div><div className="data-toolbar__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search inventory..." /><select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}><option>All statuses</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option></select></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Product ID</th><th>Product</th><th>Category</th><th>Current quantity</th><th>Reorder level</th><th>Last updated</th><th>Stock status</th><th>Actions</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><span className="id-text">{product.id}</span></td><td><strong className="table-primary">{product.name}</strong><small className="table-secondary">{product.supplier}</small></td><td>{product.category}</td><td className="table-amount">{product.quantity} {product.unit}</td><td>{product.reorderLevel} {product.unit}</td><td>{formatDate(product.updatedAt)}</td><td><StatusBadge status={getStockStatus(product)} /></td><td><div className="row-actions"><button type="button" className="row-action row-action--green" title="Stock in" onClick={() => openMovement('Stock In', product)}><ArrowDownToLine size={15} /></button><button type="button" className="row-action" title="Stock out" onClick={() => openMovement('Stock Out', product)}><ArrowUpFromLine size={15} /></button><button type="button" className="row-action" title="View stock history" onClick={() => setHistoryProduct(product)}><ClipboardList size={15} /></button></div></td></tr>)}{!filtered.length && <EmptyRow span={8} />}</tbody></table></div><TableFooter shown={filtered.length} total={products.length} /></section>
    <section className="panel ledger-panel"><div className="panel__header"><div><h2 className="panel__title">Inventory movement history</h2><p className="panel__subtitle">Each stock-in or stock-out operation is logged with previous and updated quantities.</p></div>{historyProduct && <Button variant="secondary" size="sm" onClick={() => setHistoryProduct(null)}>Show all products</Button>}</div><div className="table-wrap"><table className="data-table"><thead><tr><th>Reference</th><th>Date</th><th>Product</th><th>Movement</th><th>Quantity</th><th>Previous</th><th>Updated</th><th>User</th></tr></thead><tbody>{movements.slice(0, 10).map((movement) => <tr key={movement.id}><td><span className="id-text">{movement.reference}</span><small className="table-secondary">{movement.id}</small></td><td>{formatDate(movement.date)}</td><td>{movement.productName}</td><td><StatusBadge status={movement.type} /></td><td className="table-amount">{movement.type === 'Stock In' ? '+' : '−'}{movement.quantity}</td><td>{movement.previousStock}</td><td>{movement.updatedStock}</td><td>{movement.user}</td></tr>)}{!movements.length && <EmptyRow span={8} />}</tbody></table></div></section>
    <Modal open={modal === 'movement'} title={movementType} description="The movement will update the product quantity and create a history entry." onClose={() => setModal('')}>
      <form className="form-grid" onSubmit={saveMovement}>
        <FormSelect label="Product" value={form.productId} onChange={(value) => { const product = products.find((item) => item.id === value); setForm((current) => ({ ...current, productId: value, supplier: movementType === 'Stock In' ? (product?.supplier || '') : '' })); }} options={products.filter((item) => item.status === 'Active').map((item) => ({ value: item.id, label: `${item.name} · ${item.quantity} ${item.unit}` }))} required full />
        <FormInput label="Quantity" type="number" min="1" step="1" value={form.quantity} onChange={(value) => setForm((current) => ({ ...current, quantity: value }))} required />
        <FormInput label="Date" type="date" value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} required />
        {movementType === 'Stock In' && <FormSelect label="Supplier" value={form.supplier} onChange={(value) => setForm((current) => ({ ...current, supplier: value }))} options={selectOptions(data.suppliers)} />}
        <FormInput label="Reference number" value={form.reference} onChange={(value) => setForm((current) => ({ ...current, reference: value }))} placeholder="e.g. PO-2026-020" />
        <FormTextarea label="Remarks" value={form.remarks} onChange={(value) => setForm((current) => ({ ...current, remarks: value }))} />
        {error && <div className="form-error form-field--full">{error}</div>}
        <div className="form-actions form-field--full"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button type="submit">Save {movementType.toLowerCase()}</Button></div>
      </form>
    </Modal>
  </>;
}

function ProcurementPage({ data, setData, user, searchValue, notify }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [modal, setModal] = useState('');
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ supplier: data.suppliers.find((item) => item.status === 'Active')?.name || '', productId: data.products.find((item) => item.status === 'Active')?.id || '', quantity: '1', unitCost: '', date: todayISO(), expectedDate: '', priority: 'Normal', remarks: '' });
  const list = data.procurements || [];
  const filtered = list.filter((item) => `${item.id} ${item.supplier} ${item.productName} ${item.status} ${item.priority}`.toLowerCase().includes(`${searchValue || ''} ${query}`.trim().toLowerCase()) && (status === 'All statuses' || item.status === status));
  const pending = list.filter((item) => ['Draft', 'Pending', 'Approved', 'Ordered'].includes(item.status)).length;
  const expectedValue = list.filter((item) => !['Cancelled'].includes(item.status)).reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0);

  function openCreate() {
    const firstProduct = data.products.find((item) => item.status === 'Active');
    setForm({ supplier: data.suppliers.find((item) => item.status === 'Active')?.name || '', productId: firstProduct?.id || '', quantity: '1', unitCost: String(firstProduct?.purchasePrice || 0), date: todayISO(), expectedDate: '', priority: 'Normal', remarks: '' });
    setError(''); setModal('create');
  }
  function changeProduct(id) { const product = data.products.find((item) => item.id === id); setForm((current) => ({ ...current, productId: id, unitCost: String(product?.purchasePrice ?? current.unitCost) })); }
  function createPO(event) {
    event.preventDefault();
    if (!form.supplier || !form.productId || Number(form.quantity) <= 0 || !Number.isInteger(Number(form.quantity)) || Number(form.unitCost) < 0) { setError('Choose a supplier and product, and use positive whole-number quantities and a valid unit cost.'); return; }
    const product = data.products.find((item) => item.id === form.productId);
    const id = nextId('PO-2026', list, 'id', 3);
    const po = { id, supplier: form.supplier, productId: product.id, productName: product.name, quantity: Number(form.quantity), unitCost: Number(form.unitCost), date: form.date, expectedDate: form.expectedDate, priority: form.priority, status: 'Pending', remarks: form.remarks, stockApplied: false, createdBy: user.name };
    setData((current) => current.procurements.some((item) => item.id === id) ? current : addActivity({ ...current, procurements: [po, ...current.procurements] }, 'Procurement request created', `${id} requested ${po.quantity} ${product.unit} of ${product.name}.`, 'orange'));
    setModal(''); notify(`Procurement request ${id} created.`);
  }

  function advance(po) {
    if (po.status === 'Received' || po.status === 'Cancelled') return;
    if (po.status === 'Ordered') { receivePO(po); return; }
    const nextStatus = ({ Draft: 'Pending', Pending: 'Approved', Approved: 'Ordered' })[po.status] || 'Pending';
    setData((current) => addActivity({ ...current, procurements: current.procurements.map((item) => item.id === po.id ? { ...item, status: nextStatus } : item) }, `Procurement ${nextStatus.toLowerCase()}`, `${po.id} status changed to ${nextStatus}.`, 'blue'));
    notify(`${po.id} moved to ${nextStatus}.`);
  }
  function receivePO(po) {
    if (po.status !== 'Ordered') { notify('Only an ordered request can be received.', 'error'); return; }
    if (po.stockApplied) { notify('This order has already been received; stock will not be added twice.', 'error'); return; }
    const product = data.products.find((item) => item.id === po.productId);
    if (!product) { notify('The linked product no longer exists.', 'error'); return; }
    setData((current) => {
      const latestPO = current.procurements.find((item) => item.id === po.id);
      const latestProduct = current.products.find((item) => item.id === po.productId);
      if (!latestPO || latestPO.status !== 'Ordered' || latestPO.stockApplied || !latestProduct) return current;
      const products = current.products.map((item) => item.id === po.productId ? { ...item, quantity: Number(item.quantity) + Number(latestPO.quantity), updatedAt: todayISO() } : item);
      const updatedProduct = products.find((item) => item.id === po.productId);
      const movement = { id: nextId('MOV', current.movements, 'id', 4), date: todayISO(), productId: latestProduct.id, productName: latestProduct.name, type: 'Stock In', quantity: Number(latestPO.quantity), previousStock: Number(latestProduct.quantity), updatedStock: Number(updatedProduct.quantity), user: user.name, reference: latestPO.id, remarks: `Received from ${latestPO.supplier}.` };
      return addActivity({ ...current, products, movements: [movement, ...current.movements], procurements: current.procurements.map((item) => item.id === po.id ? { ...item, status: 'Received', stockApplied: true, receivedAt: todayISO() } : item) }, 'Procurement received', `${po.id} received; ${po.quantity} ${product.unit} added to stock.`, 'green');
    });
    notify(`${po.id} received. Inventory increased by ${po.quantity}; receipt cannot be applied again.`);
  }
  function cancelPO(po) {
    if (['Received', 'Cancelled'].includes(po.status)) return;
    setData((current) => addActivity({ ...current, procurements: current.procurements.map((item) => item.id === po.id ? { ...item, status: 'Cancelled' } : item) }, 'Procurement cancelled', `${po.id} was cancelled.`, 'red'));
    notify(`${po.id} cancelled.`);
  }
  const nextActionLabel = (po) => ({ Draft: 'Submit', Pending: 'Approve', Approved: 'Mark ordered', Ordered: 'Receive goods' })[po.status];

  return <>
    <PageHeading eyebrow="OPERATIONS" title="Procurement" description="Create purchase requests, progress them through approval, and receive goods into inventory." actions={user.role === 'Staff' ? null : <Button onClick={openCreate}><Plus size={15} /> New procurement</Button>} />
    <div className="mini-stat-grid"><MiniStat label="Procurement records" value={list.length} /><MiniStat label="In progress" value={pending} /><MiniStat label="Received" value={list.filter((item) => item.status === 'Received').length} /><MiniStat label="Estimated order value" value={currency(expectedValue)} /></div>
    <section className="workflow-strip"><span>Request</span><i>›</i><span>Pending</span><i>›</i><span>Approved</span><i>›</i><span>Ordered</span><i>›</i><span className="workflow-strip__final">Received → Stock In</span></section>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-toolbar__title"><Truck size={17} /><div><strong>Procurement register</strong><small>Receiving goods updates inventory only once and creates a stock movement entry.</small></div></div><div className="data-toolbar__filters"><SearchBox value={query} onChange={setQuery} placeholder="Search procurement..." /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}</select></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Request ID</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Estimated value</th><th>Request date</th><th>Expected delivery</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map((po) => <tr key={po.id}><td><span className="id-text">{po.id}</span><small className="table-secondary">{po.createdBy}</small></td><td>{po.supplier}</td><td className="table-primary">{po.productName}</td><td>{po.quantity}</td><td className="table-amount">{currency(Number(po.quantity) * Number(po.unitCost))}</td><td>{formatDate(po.date)}</td><td>{formatDate(po.expectedDate)}</td><td><StatusBadge status={po.priority} /></td><td><StatusBadge status={po.status} /></td><td><div className="row-actions"><button className="row-action" title="View details" type="button" onClick={() => { setViewing(po); setModal('view'); }}><Eye size={15} /></button>{user.role !== 'Staff' && nextActionLabel(po) && <button className="row-action row-action--green" title={nextActionLabel(po)} type="button" onClick={() => advance(po)}>{po.status === 'Ordered' ? <ArrowDownToLine size={15} /> : <Check size={15} />}</button>}{user.role !== 'Staff' && !['Received', 'Cancelled'].includes(po.status) && <button className="row-action row-action--danger" title="Cancel request" type="button" onClick={() => cancelPO(po)}><XCircle size={15} /></button>}</div></td></tr>)}{!filtered.length && <EmptyRow span={10} />}</tbody></table></div><TableFooter shown={filtered.length} total={list.length} /></section>
    <Modal open={modal === 'create'} title="New procurement request" description="Select a supplier and product. This request does not change inventory until it is received." onClose={() => setModal('')} wide>
      <form className="form-grid" onSubmit={createPO}>
        <FormSelect label="Supplier" value={form.supplier} onChange={(value) => setForm((current) => ({ ...current, supplier: value }))} options={selectOptions(data.suppliers)} required />
        <FormSelect label="Product" value={form.productId} onChange={changeProduct} options={data.products.filter((item) => item.status === 'Active').map((item) => ({ value: item.id, label: item.name }))} required />
        <FormInput label="Quantity" type="number" min="1" step="1" value={form.quantity} onChange={(value) => setForm((current) => ({ ...current, quantity: value }))} required />
        <FormInput label="Estimated unit cost (₱)" type="number" min="0" step="0.01" value={form.unitCost} onChange={(value) => setForm((current) => ({ ...current, unitCost: value }))} required />
        <FormInput label="Request date" type="date" value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} required />
        <FormInput label="Expected delivery" type="date" value={form.expectedDate} onChange={(value) => setForm((current) => ({ ...current, expectedDate: value }))} />
        <FormSelect label="Priority" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={[{ value: 'Low', label: 'Low' }, { value: 'Normal', label: 'Normal' }, { value: 'High', label: 'High' }]} />
        <div className="form-field"><label>Estimated total</label><div className="readonly-value">{currency(Number(form.quantity || 0) * Number(form.unitCost || 0))}</div></div>
        <FormTextarea label="Remarks" value={form.remarks} onChange={(value) => setForm((current) => ({ ...current, remarks: value }))} />
        {error && <div className="form-error form-field--full">{error}</div>}
        <div className="form-actions form-field--full"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button type="submit"><Plus size={14} /> Create request</Button></div>
      </form>
    </Modal>
    <Modal open={modal === 'view' && Boolean(viewing)} title={viewing?.id || 'Procurement details'} description="Request information and receiving state." onClose={() => { setModal(''); setViewing(null); }} wide>
      {viewing && <><div className="detail-grid"><Detail label="Supplier" value={viewing.supplier} /><Detail label="Product" value={viewing.productName} /><Detail label="Quantity" value={viewing.quantity} /><Detail label="Unit cost" value={currency(viewing.unitCost)} /><Detail label="Estimated total" value={currency(viewing.unitCost * viewing.quantity)} /><Detail label="Status" value={<StatusBadge status={viewing.status} />} /><Detail label="Request date" value={formatDate(viewing.date)} /><Detail label="Expected delivery" value={formatDate(viewing.expectedDate)} /><Detail label="Priority" value={<StatusBadge status={viewing.priority} />} /><Detail label="Stock applied" value={viewing.stockApplied ? 'Yes, already received' : 'No'} /><Detail label="Remarks" value={viewing.remarks || '—'} /></div><div className="form-actions"><Button variant="secondary" onClick={() => { setModal(''); setViewing(null); }}>Close</Button>{user.role !== 'Staff' && nextActionLabel(viewing) && <Button onClick={() => { advance(viewing); setViewing(null); setModal(''); }}>{nextActionLabel(viewing)}</Button>}</div></>}
    </Modal>
  </>;
}

function MiniStat({ label, value, tone }) { return <div className={`mini-stat ${tone ? `mini-stat--${tone}` : ''}`}><span>{label}</span><strong>{value}</strong></div>; }
function SearchBox({ value, onChange, placeholder }) { return <label className="local-search"><Search size={14} /><input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function TableFooter({ shown, total }) { return <div className="table-footer"><span>Showing {shown} of {total} records</span><span>Database-backed · changes are validated on save</span></div>; }
function EmptyRow({ span }) { return <tr><td colSpan={span} className="empty-state">No matching records were found.</td></tr>; }
function Detail({ label, value }) { return <div className="detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>; }
function FormInput({ label, value, onChange, type = 'text', min, step, required, placeholder }) { return <div className="form-field"><label>{label}{required && <span className="required-mark"> *</span>}</label><input type={type} value={value ?? ''} min={min} step={step} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>; }
function FormSelect({ label, value, onChange, options, required, full }) { return <div className={`form-field ${full ? 'form-field--full' : ''}`}><label>{label}{required && <span className="required-mark"> *</span>}</label><select value={value ?? ''} required={required} onChange={(event) => onChange(event.target.value)}><option value="">Choose {label.toLowerCase()}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>; }
function FormTextarea({ label, value, onChange }) { return <div className="form-field form-field--full"><label>{label}</label><textarea rows={2} value={value ?? ''} onChange={(event) => onChange(event.target.value)} /></div>; }
