import React, { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Users, Package, Truck, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../components/Button.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Modal from '../components/Modal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency, formatDate, getStockStatus, nextId, todayISO, addActivity } from '../utils/helpers.js';

const configs = {
  Products: {
    key: 'products', prefix: 'PRD', singular: 'Product', icon: Package,
    description: 'Maintain your product catalogue, suppliers, pricing and stock thresholds.',
    fields: [
      { name: 'name', label: 'Product name', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Grocery', 'Grains', 'Condiments', 'Baking', 'Household', 'Canned Goods', 'Packaging', 'Other'], required: true },
      { name: 'supplier', label: 'Supplier', type: 'selectData', source: 'suppliers', optionLabel: 'name', required: true },
      { name: 'unit', label: 'Unit', type: 'select', options: ['pieces', 'bags', 'bottles', 'packs', 'cans', 'rolls', 'boxes', 'kg', 'liters'], required: true },
      { name: 'purchasePrice', label: 'Purchase price (₱)', type: 'number', min: '0', required: true },
      { name: 'sellingPrice', label: 'Selling price (₱)', type: 'number', min: '0', required: true },
      { name: 'quantity', label: 'Available quantity (managed in Inventory)', type: 'number', min: '0', step: '1', readOnly: true, required: true, help: 'Use Inventory → Stock In or receive a procurement order to change stock.' },
      { name: 'reorderLevel', label: 'Reorder level', type: 'number', min: '0', step: '1', required: true },
      { name: 'description', label: 'Description', type: 'textarea', full: true },
      { name: 'status', label: 'Record status', type: 'select', options: ['Active', 'Inactive'], required: true },
    ],
  },
  Customers: {
    key: 'customers', prefix: 'CUS', singular: 'Customer', icon: Users,
    description: 'Maintain customer contact details and review their transaction history.',
    fields: [
      { name: 'name', label: 'Customer name', required: true },
      { name: 'contact', label: 'Contact number', required: true },
      { name: 'email', label: 'Email address', type: 'email' },
      { name: 'address', label: 'Address', type: 'textarea', full: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
    ],
  },
  Suppliers: {
    key: 'suppliers', prefix: 'SUP', singular: 'Supplier', icon: Truck,
    description: 'Maintain supplier contacts and follow related procurement requests.',
    fields: [
      { name: 'name', label: 'Supplier name', required: true },
      { name: 'contactPerson', label: 'Contact person', required: true },
      { name: 'contact', label: 'Contact number', required: true },
      { name: 'email', label: 'Email address', type: 'email' },
      { name: 'address', label: 'Address', type: 'textarea', full: true },
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
    ],
  },
};

const emptyFor = (config) => Object.fromEntries(config.fields.map((field) => [field.name, field.name === 'status' ? 'Active' : field.type === 'number' ? '0' : '']));

function FormField({ field, value, onChange, data }) {
  const common = { id: `field-${field.name}`, name: field.name, value: value ?? '', required: field.required, onChange: (event) => onChange(field.name, event.target.value), min: field.min, step: field.step || (field.type === 'number' ? '0.01' : undefined), readOnly: Boolean(field.readOnly) };
  let control;
  if (field.type === 'select') {
    control = <select {...common}><option value="">Choose {field.label.toLowerCase()}</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  } else if (field.type === 'selectData') {
    control = <select {...common}><option value="">Choose supplier</option>{(data[field.source] || []).filter((item) => item.status === 'Active').map((item) => <option key={item.id} value={item[field.optionLabel]}>{item[field.optionLabel]}</option>)}</select>;
  } else if (field.type === 'textarea') {
    control = <textarea {...common} rows={3} />;
  } else {
    control = <input {...common} type={field.type || 'text'} />;
  }
  return <div className={`form-field ${field.full ? 'form-field--full' : ''}`}><label htmlFor={common.id}>{field.label}{field.required && <span className="required-mark"> *</span>}</label>{control}{field.help && <small className="field-help">{field.help}</small>}</div>;
}

export default function MasterDataPage({ title, data, setData, user, searchValue, notify }) {
  const config = configs[title];
  const Icon = config.icon;
  const records = data[config.key] || [];
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyFor(config));
  const [formError, setFormError] = useState('');

  const categories = [...new Set(records.map((item) => item.category).filter(Boolean))].sort();
  const filtered = useMemo(() => {
    const needle = `${searchValue || ''} ${query}`.trim().toLowerCase();
    return records.filter((item) => {
      const haystack = Object.values(item).filter((value) => typeof value !== 'object').join(' ').toLowerCase();
      const matchesSearch = !needle || haystack.includes(needle);
      const matchesStatus = statusFilter === 'All statuses' || (title === 'Products' ? (['Active', 'Inactive'].includes(statusFilter) ? item.status === statusFilter : getStockStatus(item) === statusFilter) : item.status === statusFilter);
      const matchesCategory = categoryFilter === 'All categories' || item.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [records, query, searchValue, statusFilter, categoryFilter, title]);

  function openCreate() {
    setEditing(null); setForm(emptyFor(config)); setFormError(''); setModal('form');
  }
  function openEdit(record) {
    setEditing(record); setForm({ ...emptyFor(config), ...record, purchasePrice: String(record.purchasePrice ?? 0), sellingPrice: String(record.sellingPrice ?? 0), quantity: String(record.quantity ?? 0), reorderLevel: String(record.reorderLevel ?? 0) }); setFormError(''); setModal('form');
  }
  function updateField(name, value) { setForm((current) => ({ ...current, [name]: value })); }

  function submit(event) {
    event.preventDefault();
    const required = config.fields.filter((field) => field.required);
    const missing = required.find((field) => !String(form[field.name] ?? '').trim());
    if (missing) { setFormError(`${missing.label} is required.`); return; }
    if (title === 'Products' && Number(form.sellingPrice) < 0) { setFormError('Selling price cannot be negative.'); return; }
    const clean = { ...form, updatedAt: todayISO() };
    if (title === 'Products') {
      ['purchasePrice', 'sellingPrice', 'quantity', 'reorderLevel'].forEach((key) => { clean[key] = Number(clean[key] || 0); });
      clean.quantity = Math.max(0, clean.quantity);
    } else if (!editing) clean.createdAt = todayISO();
    setData((current) => {
      const list = current[config.key] || [];
      const next = editing ? list.map((item) => item.id === editing.id ? { ...item, ...clean, id: editing.id } : item) : [...list, { ...clean, id: nextId(config.prefix, list) }];
      return addActivity({ ...current, [config.key]: next }, `${editing ? 'Updated' : 'Added'} ${config.singular.toLowerCase()}`, `${clean.name || clean.customerName || clean.id} ${editing ? 'was updated' : 'was added'}.`, 'orange');
    });
    notify(title === 'Products' && !editing ? 'Product created with zero stock. Use Inventory → Stock In to add the opening quantity.' : `${config.singular} ${editing ? 'updated' : 'created'} successfully.`);
    setModal('');
  }

  function toggleStatus(record) {
    if (title === 'Products') {
      setData((current) => ({ ...current, products: current.products.map((item) => item.id === record.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active', updatedAt: todayISO() } : item) }));
    } else {
      setData((current) => ({ ...current, [config.key]: current[config.key].map((item) => item.id === record.id ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' } : item) }));
    }
    notify(`${config.singular} status updated.`);
  }

  function renderDetailRows(record) {
    if (title === 'Products') {
      return <><Detail label="Product ID" value={record.id} /><Detail label="Category" value={record.category} /><Detail label="Supplier" value={record.supplier} /><Detail label="Description" value={record.description || '—'} /><Detail label="Purchase price" value={currency(record.purchasePrice)} /><Detail label="Selling price" value={currency(record.sellingPrice)} /><Detail label="Quantity" value={`${record.quantity} ${record.unit}`} /><Detail label="Reorder level" value={`${record.reorderLevel} ${record.unit}`} /><Detail label="Stock status" value={<StatusBadge status={getStockStatus(record)} />} /><Detail label="Last updated" value={record.updatedAt || '—'} /></>;
    }
    if (title === 'Customers') {
      const history = data.transactions.filter((tx) => tx.customer === record.name);
      return <><Detail label="Customer ID" value={record.id} /><Detail label="Contact" value={record.contact} /><Detail label="Email" value={record.email || '—'} /><Detail label="Address" value={record.address || '—'} /><Detail label="Notes" value={record.notes || '—'} /><Detail label="Status" value={<StatusBadge status={record.status} />} /><div className="detail-section"><strong>Transaction history</strong>{history.length ? history.map((tx) => <div className="history-line" key={tx.id}><span>{tx.id} · {formatDate(tx.date)}</span><b>{currency(tx.amount)}</b><StatusBadge status={tx.status} /></div>) : <p className="empty-copy">No transactions recorded for this customer yet.</p>}</div></>;
    }
    const history = data.procurements.filter((po) => po.supplier === record.name);
    return <><Detail label="Supplier ID" value={record.id} /><Detail label="Contact person" value={record.contactPerson} /><Detail label="Contact" value={record.contact} /><Detail label="Email" value={record.email || '—'} /><Detail label="Address" value={record.address || '—'} /><Detail label="Notes" value={record.notes || '—'} /><Detail label="Status" value={<StatusBadge status={record.status} />} /><div className="detail-section"><strong>Procurement history</strong>{history.length ? history.map((po) => <div className="history-line" key={po.id}><span>{po.id} · {po.productName} × {po.quantity}</span><StatusBadge status={po.status} /></div>) : <p className="empty-copy">No procurement recorded for this supplier yet.</p>}</div></>;
  }

  const stats = title === 'Products'
    ? [{ label: 'Total products', value: records.length }, { label: 'Low stock', value: records.filter((item) => getStockStatus(item) === 'Low Stock').length }, { label: 'Out of stock', value: records.filter((item) => getStockStatus(item) === 'Out of Stock').length }]
    : [{ label: `Total ${title.toLowerCase()}`, value: records.length }, { label: 'Active', value: records.filter((item) => item.status === 'Active').length }, { label: 'Inactive', value: records.filter((item) => item.status !== 'Active').length }];

  return <>
    <PageHeading eyebrow="MASTER DATA" title={title} description={config.description} actions={<Button onClick={openCreate}><Plus size={15} /> Add {config.singular}</Button>} />
    <section className="mini-stat-grid">{stats.map((item) => <div className="mini-stat" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</section>
    <section className="panel data-panel">
      <div className="data-toolbar"><div className="data-toolbar__title"><Icon size={17} /><div><strong>{title} directory</strong><small>Search, review and update stored {title.toLowerCase()}.</small></div></div><div className="data-toolbar__filters"><label className="local-search"><Search size={14} /><input placeholder={`Search ${title.toLowerCase()}...`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {title === 'Products' && <select aria-label="Filter stock status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option><option>Active</option><option>Inactive</option></select>}
      {title !== 'Products' && <select aria-label="Filter active status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Active</option><option>Inactive</option></select>}
      {title === 'Products' && <select aria-label="Filter category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>}
      </div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr>{title === 'Products' ? <><th>Product ID</th><th>Product</th><th>Category</th><th>Supplier</th><th>Unit price</th><th>Quantity</th><th>Stock status</th><th>Actions</th></> : title === 'Customers' ? <><th>Customer ID</th><th>Customer</th><th>Contact</th><th>Email</th><th>Transactions</th><th>Status</th><th>Actions</th></> : <><th>Supplier ID</th><th>Supplier</th><th>Contact person</th><th>Contact</th><th>Open procurement</th><th>Status</th><th>Actions</th></>}</tr></thead>
      <tbody>{filtered.map((record) => <tr key={record.id}>
        {title === 'Products' ? <><td><span className="id-text">{record.id}</span></td><td><strong className="table-primary">{record.name}</strong><small className="table-secondary">Updated {formatDate(record.updatedAt)}</small></td><td>{record.category}</td><td>{record.supplier || '—'}</td><td className="table-amount">{currency(record.sellingPrice)}</td><td>{record.quantity} {record.unit}</td><td><StatusBadge status={getStockStatus(record)} /><small className="table-secondary">{record.status || 'Active'} product</small></td></> : title === 'Customers' ? <><td><span className="id-text">{record.id}</span></td><td><strong className="table-primary">{record.name}</strong><small className="table-secondary">Added {formatDate(record.createdAt)}</small></td><td>{record.contact}</td><td>{record.email || '—'}</td><td>{data.transactions.filter((tx) => tx.customer === record.name).length}</td><td><StatusBadge status={record.status} /></td></> : <><td><span className="id-text">{record.id}</span></td><td><strong className="table-primary">{record.name}</strong><small className="table-secondary">Added {formatDate(record.createdAt)}</small></td><td>{record.contactPerson}</td><td>{record.contact}</td><td>{data.procurements.filter((po) => po.supplier === record.name && !['Received', 'Cancelled'].includes(po.status)).length}</td><td><StatusBadge status={record.status} /></td></>}
        <td><div className="row-actions"><button type="button" className="row-action" onClick={() => { setViewing(record); setModal('view'); }} title="View details" aria-label={`View ${record.name}`}><Eye size={15} /></button><button type="button" className="row-action" onClick={() => openEdit(record)} title="Edit" aria-label={`Edit ${record.name}`}><Pencil size={15} /></button><button type="button" className="row-action row-action--muted" onClick={() => toggleStatus(record)} title={record.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label="Toggle status">{record.status === 'Active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}</button></div></td>
      </tr>)}
      {!filtered.length && <tr><td colSpan="8" className="empty-state">No matching records. Try changing your search or add a new record.</td></tr>}</tbody></table></div>
      <div className="table-footer"><span>Showing {filtered.length} of {records.length} records</span><span>Demo data is saved in this browser</span></div>
    </section>
    <Modal open={modal === 'form'} title={`${editing ? 'Edit' : 'Add'} ${config.singular}`} description={`${editing ? 'Update the saved information below.' : 'Enter the information to create a new record.'} Fields marked * are required.`} onClose={() => setModal('')} wide>
      <form className="form-grid" onSubmit={submit}>
        {config.fields.map((field) => <FormField key={field.name} field={field} value={form[field.name]} onChange={updateField} data={data} />)}
        {formError && <div className="form-error form-field--full">{formError}</div>}
        <div className="form-actions form-field--full"><Button variant="secondary" onClick={() => setModal('')}>Cancel</Button><Button type="submit"><Plus size={14} /> {editing ? 'Save changes' : `Create ${config.singular.toLowerCase()}`}</Button></div>
      </form>
    </Modal>
    <Modal open={modal === 'view' && Boolean(viewing)} title={viewing?.name || config.singular} description={`${config.singular} information and related activity.`} onClose={() => setModal('')} wide>
      {viewing && <div className="detail-grid">{renderDetailRows(viewing)}</div>}
      <div className="form-actions"><Button variant="secondary" onClick={() => setModal('')}>Close</Button>{viewing && <Button onClick={() => openEdit(viewing)}><Pencil size={14} /> Edit record</Button>}</div>
    </Modal>
  </>;
}

function Detail({ label, value }) {
  return <div className="detail-field"><span>{label}</span><strong>{value || '—'}</strong></div>;
}
