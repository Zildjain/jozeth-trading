import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react';
import Button from '../components/Button.jsx';
import PageHeading from '../components/PageHeading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency, downloadCsv, formatDate, todayISO } from '../utils/helpers.js';

const dateStart = () => `${todayISO().slice(0, 7)}-01`;
const requiredReports = ['Sales Report', 'Inventory Report', 'Procurement Report', 'Transaction Summary', 'Business Records Report'];
const optionalReports = ['Customer Report', 'Supplier Report'];

export default function ReportsPage({ data, searchValue, notify }) {
  const [reportType, setReportType] = useState('Sales Report');
  const [from, setFrom] = useState(dateStart());
  const [to, setTo] = useState(todayISO());
  const [customer, setCustomer] = useState('All customers');
  const [category, setCategory] = useState('All categories');
  const [status, setStatus] = useState('All statuses');
  const [recordedBy, setRecordedBy] = useState('All users');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [outputFormat, setOutputFormat] = useState(data.settings?.reportFormat === 'PDF' ? 'PDF' : 'CSV');
  const [generatedAt, setGeneratedAt] = useState('');

  const generated = Boolean(generatedAt);
  const model = useMemo(() => buildReportModel({ data, reportType, from, to, customer, category, status, recordedBy, searchValue }), [data, reportType, from, to, customer, category, status, recordedBy, searchValue]);

  function generate() {
    if (from && to && from > to) { notify('The start date must be earlier than or equal to the end date.', 'error'); return; }
    setGeneratedAt(new Date().toLocaleString('en-PH'));
    notify(`${reportType} preview generated from the latest database-backed data loaded by the application.`);
  }
  function exportReport() {
    const runDate = generatedAt || new Date().toLocaleString('en-PH');
    const rows = includeDetails ? [model.columns.map((column) => column.label)] : [];
    if (includeDetails) model.rows.forEach((row) => rows.push(model.columns.map((column) => row[column.key] ?? '')));
    if (includeSummary) {
      rows.unshift(['Report', reportType], ['Date range', `${from || 'Any'} to ${to || 'Any'}`], ['Run date/time', runDate], []);
      if (model.summary) rows.push([], ['Summary statistics'], ...Object.entries(model.summary).map(([key, value]) => [key, value]));
    }
    downloadCsv(`jozeth-${reportType.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${todayISO()}.csv`, rows);
    notify('Report exported as CSV. Spreadsheet applications can open this file.');
  }
  function printReport() {
    if (!generated) setGeneratedAt(new Date().toLocaleString('en-PH'));
    window.setTimeout(() => window.print(), 80);
  }
  function resetFilters() {
    setFrom(dateStart()); setTo(todayISO()); setCustomer('All customers'); setCategory('All categories'); setStatus('All statuses'); setRecordedBy('All users'); setIncludeSummary(true); setIncludeDetails(true); setIncludeCharts(false); setOutputFormat('CSV'); setGeneratedAt('');
  }

  return <div className="reports-page">
    <PageHeading eyebrow="REPORTING" title="Business Reports" description="Build a filtered view from saved sales, inventory, procurement and records data. No figures are hardcoded into the preview." actions={<><Button variant="secondary" onClick={resetFilters}><RefreshCw size={14} /> Reset filters</Button><Button onClick={generate}><BarChart3 size={15} /> Generate report</Button></>} />
    <div className="report-layout">
      <section className="panel report-controls"><div className="panel__header"><div><h2 className="panel__title">Report configuration</h2><p className="panel__subtitle">Choose the data source and filters.</p></div><FileSpreadsheet size={18} className="report-controls__icon" /></div>
        <div className="report-controls__body">
          <div className="form-field"><label>Report type</label><select value={reportType} onChange={(event) => { setReportType(event.target.value); setStatus('All statuses'); setCategory('All categories'); setGeneratedAt(''); }}><optgroup label="Required reports">{requiredReports.map((item) => <option key={item}>{item}</option>)}</optgroup><optgroup label="Optional reports">{optionalReports.map((item) => <option key={item}>{item}</option>)}</optgroup></select></div>
          <div className="form-field"><label>Date from</label><input type="date" value={from} max={to || undefined} onChange={(event) => { setFrom(event.target.value); setGeneratedAt(''); }} /></div>
          <div className="form-field"><label>Date to</label><input type="date" value={to} min={from || undefined} onChange={(event) => { setTo(event.target.value); setGeneratedAt(''); }} /></div>
          <div className="form-field"><label>Customer</label><select value={customer} onChange={(event) => { setCustomer(event.target.value); setGeneratedAt(''); }}><option>All customers</option>{data.customers.map((item) => <option key={item.id}>{item.name}</option>)}</select></div>
          <div className="form-field"><label>Product category</label><select value={category} onChange={(event) => { setCategory(event.target.value); setGeneratedAt(''); }}><option>All categories</option>{[...new Set((reportType === 'Business Records Report' ? data.records : data.products).map((item) => item.category).filter(Boolean))].sort().map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="form-field"><label>Status</label><select value={status} onChange={(event) => { setStatus(event.target.value); setGeneratedAt(''); }}><option>All statuses</option>{(reportType === 'Inventory Report' ? ['In Stock', 'Low Stock', 'Out of Stock'] : reportType === 'Business Records Report' ? ['Active', 'Archived'] : reportType === 'Procurement Report' ? ['Draft', 'Pending', 'Approved', 'Ordered', 'Received', 'Cancelled'] : ['Completed', 'Pending', 'Cancelled', 'Active', 'Inactive']).map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="form-field"><label>Recorded by</label><select value={recordedBy} onChange={(event) => { setRecordedBy(event.target.value); setGeneratedAt(''); }}><option>All users</option>{data.users.map((item) => <option key={item.id}>{item.name}</option>)}</select></div>
          <div className="report-toggle-list"><CheckboxLine checked={includeSummary} onChange={setIncludeSummary} label="Include summary statistics" /><CheckboxLine checked={includeDetails} onChange={setIncludeDetails} label="Include detailed breakdown" /><CheckboxLine checked={includeCharts} onChange={setIncludeCharts} label="Include charts where appropriate" /></div>
          <div className="form-field"><label>Export format</label><select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}><option value="CSV">CSV spreadsheet</option><option value="PDF">Print / Save as PDF</option></select><small className="field-help">This no-backend version exports CSV files and uses the browser print dialog for PDF.</small></div>
          <div className="report-control-actions"><Button block onClick={generate}><BarChart3 size={14} /> Preview report</Button><Button block variant="secondary" onClick={() => outputFormat === 'PDF' ? printReport() : exportReport()}>{outputFormat === 'PDF' ? <Printer size={14} /> : <Download size={14} />}{outputFormat === 'PDF' ? 'Print / Save PDF' : 'Export CSV'}</Button></div>
        </div>
      </section>
      <section className="panel report-preview report-print-area"><div className="report-preview__top"><div><span className="report-eyebrow">JOZETH TRADING · BUSINESS OPERATIONS</span><h2>{reportType}</h2><p>Period: {from ? formatDate(from) : 'All dates'} — {to ? formatDate(to) : 'Current'} </p></div><div className="report-preview__mark"><BarChart3 size={20} /></div></div>
        {!generated ? <div className="report-empty"><div><BarChart3 size={24} /></div><strong>Report preview is ready to generate</strong><p>Set your date range and filters, then select Generate report. The output will use the current data in your browser.</p><Button onClick={generate}>Generate preview</Button></div> : <>
          <div className="report-run-meta"><span><b>Run date:</b> {generatedAt}</span><span><b>Records found:</b> {model.rows.length}</span><span><b>Filters:</b> {status}, {category}</span></div>
          {includeSummary && model.summary && <div className="report-summary-grid">{Object.entries(model.summary).map(([label, value]) => <div className="report-summary-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
          {includeCharts && model.chart && <div className="report-chart-block"><div className="report-section-heading"><h3>Summary visualization</h3><span>Derived from filtered report records</span></div><div className="report-bars">{model.chart.map((item) => <div className="report-bar-item" key={item.label}><div className="report-bar-value">{item.value}</div><div className="report-bar-track"><span style={{ height: `${Math.max(3, item.percent)}%` }} /></div><small>{item.label}</small></div>)}</div></div>}
          {includeDetails && <div className="report-table-block"><div className="report-section-heading"><h3>Detailed breakdown</h3><span>{model.rows.length} row(s)</span></div><div className="table-wrap"><table className="data-table"><thead><tr>{model.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{model.rows.map((row, index) => <tr key={row.id || `${reportType}-${index}`}>{model.columns.map((column) => <td key={column.key}>{column.render ? column.render(row[column.key], row) : row[column.key] ?? '—'}</td>)}</tr>)}{!model.rows.length && <tr><td colSpan={model.columns.length} className="empty-state">No records match the selected date range and filters.</td></tr>}</tbody></table></div></div>}
          <div className="report-preview__footer"><span>End of report</span><span>JOZETH TRADING · Front-end demo data</span></div>
        </>}
      </section>
    </div>
    <div className="report-catalog"><section className="panel"><div className="panel__header"><div><h2 className="panel__title">Required reports</h2><p className="panel__subtitle">Core business reporting options</p></div></div><div className="report-catalog__list">{requiredReports.map((item) => <button key={item} className={reportType === item ? 'report-catalog__item is-active' : 'report-catalog__item'} type="button" onClick={() => { setReportType(item); setGeneratedAt(''); }}><FileSpreadsheet size={15} /><span>{item}</span><small>Preview</small></button>)}</div></section><section className="panel"><div className="panel__header"><div><h2 className="panel__title">Optional reports</h2><p className="panel__subtitle">Supporting directories</p></div></div><div className="report-catalog__list">{optionalReports.map((item) => <button key={item} className={reportType === item ? 'report-catalog__item is-active' : 'report-catalog__item'} type="button" onClick={() => { setReportType(item); setGeneratedAt(''); }}><FileSpreadsheet size={15} /><span>{item}</span><small>Preview</small></button>)}</div></section></div>
  </div>;
}

function buildReportModel({ data, reportType, from, to, customer, category, status, recordedBy, searchValue }) {
  const inRange = (date) => (!from || !date || date >= from) && (!to || !date || date <= to);
  const filterStatus = (value) => status === 'All statuses' || value === status;
  const filterCustomer = (value) => customer === 'All customers' || value === customer;
  const needle = String(searchValue || '').trim().toLowerCase();
  let rows = [];
  let columns = [];
  let sales = [];
  if (reportType === 'Sales Report' || reportType === 'Transaction Summary') {
    sales = data.transactions.filter((item) => inRange(item.date) && filterCustomer(item.customer) && filterStatus(item.status) && (recordedBy === 'All users' || item.recordedBy === recordedBy) && `${item.id} ${item.customer} ${item.status} ${item.recordedBy}`.toLowerCase().includes(needle));
    rows = (reportType === 'Sales Report' ? sales.filter((item) => item.type === 'Sale') : sales).map((item) => ({ id: item.id, date: formatDate(item.date), customer: item.customer, type: item.type, items: item.items?.map((line) => `${line.productName} × ${line.quantity}`).join(', ') || '—', amount: currency(item.amount), status: item.status, recordedBy: item.recordedBy }));
    columns = [{ key: 'id', label: 'Transaction ID' }, { key: 'date', label: 'Date' }, { key: 'customer', label: 'Customer' }, { key: 'type', label: 'Type' }, { key: 'items', label: 'Items' }, { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }, { key: 'recordedBy', label: 'Recorded by' }];
  } else if (reportType === 'Inventory Report') {
    rows = data.products.filter((item) => (category === 'All categories' || item.category === category) && `${item.id} ${item.name} ${item.category} ${item.supplier}`.toLowerCase().includes(needle)).map((product) => {
      const movementRows = data.movements.filter((movement) => movement.productId === product.id && inRange(movement.date));
      return { id: product.id, product: product.name, category: product.category, supplier: product.supplier, quantity: `${product.quantity} ${product.unit}`, reorderLevel: `${product.reorderLevel} ${product.unit}`, stockIn: movementRows.filter((movement) => movement.type === 'Stock In').reduce((sum, movement) => sum + Number(movement.quantity), 0), stockOut: movementRows.filter((movement) => movement.type === 'Stock Out').reduce((sum, movement) => sum + Number(movement.quantity), 0), status: product.quantity <= 0 ? 'Out of Stock' : product.quantity <= product.reorderLevel ? 'Low Stock' : 'In Stock' };
    }).filter((item) => status === 'All statuses' || item.status === status);
    columns = [{ key: 'id', label: 'Product ID' }, { key: 'product', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'supplier', label: 'Supplier' }, { key: 'quantity', label: 'Current quantity' }, { key: 'reorderLevel', label: 'Reorder level' }, { key: 'stockIn', label: 'Stock in (period)' }, { key: 'stockOut', label: 'Stock out (period)' }, { key: 'status', label: 'Stock status', render: (value) => <StatusBadge status={value} /> }];
  } else if (reportType === 'Procurement Report') {
    rows = data.procurements.filter((item) => inRange(item.date) && filterStatus(item.status) && `${item.id} ${item.supplier} ${item.productName} ${item.status}`.toLowerCase().includes(needle)).map((item) => ({ id: item.id, date: formatDate(item.date), supplier: item.supplier, product: item.productName, quantity: item.quantity, unitCost: currency(item.unitCost), total: currency(item.unitCost * item.quantity), expectedDate: formatDate(item.expectedDate), status: item.status, createdBy: item.createdBy }));
    columns = [{ key: 'id', label: 'Procurement ID' }, { key: 'date', label: 'Request date' }, { key: 'supplier', label: 'Supplier' }, { key: 'product', label: 'Product' }, { key: 'quantity', label: 'Quantity' }, { key: 'unitCost', label: 'Unit cost' }, { key: 'total', label: 'Estimated total' }, { key: 'expectedDate', label: 'Expected delivery' }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> }, { key: 'createdBy', label: 'Created by' }];
  } else if (reportType === 'Business Records Report') {
    rows = data.records.filter((item) => inRange(item.date) && filterStatus(item.status) && (category === 'All categories' || item.category === category) && `${item.id} ${item.name} ${item.category} ${item.relatedTransaction}`.toLowerCase().includes(needle)).map((item) => ({ id: item.id, name: item.name, category: item.category, relatedTransaction: item.relatedTransaction || '—', date: formatDate(item.date), uploadedBy: item.uploadedBy, attachment: item.fileName || '—', status: item.status }));
    columns = [{ key: 'id', label: 'Record ID' }, { key: 'name', label: 'Record name' }, { key: 'category', label: 'Category' }, { key: 'relatedTransaction', label: 'Related transaction' }, { key: 'date', label: 'Date' }, { key: 'uploadedBy', label: 'Uploaded by' }, { key: 'attachment', label: 'Attachment' }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> }];
  } else if (reportType === 'Customer Report') {
    rows = data.customers.filter((item) => inRange(item.createdAt) && (status === 'All statuses' || item.status === status) && `${item.id} ${item.name} ${item.contact} ${item.email}`.toLowerCase().includes(needle)).map((item) => ({ id: item.id, name: item.name, contact: item.contact, email: item.email, address: item.address, createdAt: formatDate(item.createdAt), transactions: data.transactions.filter((tx) => tx.customer === item.name).length, status: item.status }));
    columns = [{ key: 'id', label: 'Customer ID' }, { key: 'name', label: 'Customer' }, { key: 'contact', label: 'Contact' }, { key: 'email', label: 'Email' }, { key: 'address', label: 'Address' }, { key: 'createdAt', label: 'Date added' }, { key: 'transactions', label: 'Transactions' }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> }];
  } else {
    rows = data.suppliers.filter((item) => inRange(item.createdAt) && (status === 'All statuses' || item.status === status) && `${item.id} ${item.name} ${item.contactPerson} ${item.contact}`.toLowerCase().includes(needle)).map((item) => ({ id: item.id, name: item.name, contactPerson: item.contactPerson, contact: item.contact, email: item.email, createdAt: formatDate(item.createdAt), procurement: data.procurements.filter((po) => po.supplier === item.name).length, status: item.status }));
    columns = [{ key: 'id', label: 'Supplier ID' }, { key: 'name', label: 'Supplier' }, { key: 'contactPerson', label: 'Contact person' }, { key: 'contact', label: 'Contact' }, { key: 'email', label: 'Email' }, { key: 'createdAt', label: 'Date added' }, { key: 'procurement', label: 'Procurement records' }, { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> }];
  }
  const reportTransactions = sales.length ? (reportType === 'Sales Report' ? sales.filter((item) => item.type === 'Sale') : sales) : data.transactions.filter((item) => inRange(item.date));
  const completed = reportTransactions.filter((item) => item.status === 'Completed');
  const salesTotal = completed.filter((item) => item.type === 'Sale').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const completionRate = reportTransactions.length ? `${(completed.length / reportTransactions.length * 100).toFixed(1)}%` : '0.0%';
  let summary = {
    'Total sales': currency(salesTotal),
    'Total transactions': reportTransactions.length,
    'Average transaction': currency(reportTransactions.length ? reportTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0) / reportTransactions.length : 0),
    'Completion rate': completionRate,
  };
  let bars = [
    { label: 'Completed', value: reportTransactions.filter((item) => item.status === 'Completed').length },
    { label: 'Pending', value: reportTransactions.filter((item) => item.status === 'Pending').length },
    { label: 'Cancelled', value: reportTransactions.filter((item) => item.status === 'Cancelled').length },
  ];
  if (reportType === 'Inventory Report') {
    const quantities = rows.map((item) => Number.parseFloat(String(item.quantity)) || 0);
    summary = { 'Product types': rows.length, 'Units available': quantities.reduce((sum, value) => sum + value, 0).toLocaleString(), 'Low-stock items': rows.filter((item) => item.status === 'Low Stock').length, 'Out-of-stock': rows.filter((item) => item.status === 'Out of Stock').length };
    bars = [{ label: 'In Stock', value: rows.filter((item) => item.status === 'In Stock').length }, { label: 'Low Stock', value: rows.filter((item) => item.status === 'Low Stock').length }, { label: 'Out of Stock', value: rows.filter((item) => item.status === 'Out of Stock').length }];
  } else if (reportType === 'Procurement Report') {
    const selected = data.procurements.filter((item) => rows.some((row) => row.id === item.id));
    summary = { 'Request count': selected.length, 'Open requests': selected.filter((item) => ['Draft', 'Pending', 'Approved', 'Ordered'].includes(item.status)).length, 'Received orders': selected.filter((item) => item.status === 'Received').length, 'Estimated value': currency(selected.filter((item) => item.status !== 'Cancelled').reduce((sum, item) => sum + Number(item.unitCost) * Number(item.quantity), 0)) };
    bars = [{ label: 'Open', value: selected.filter((item) => ['Draft', 'Pending', 'Approved', 'Ordered'].includes(item.status)).length }, { label: 'Received', value: selected.filter((item) => item.status === 'Received').length }, { label: 'Cancelled', value: selected.filter((item) => item.status === 'Cancelled').length }];
  } else if (reportType === 'Business Records Report') {
    summary = { 'Records found': rows.length, 'Active records': rows.filter((item) => item.status === 'Active').length, 'Archived records': rows.filter((item) => item.status === 'Archived').length, 'With attachment': rows.filter((item) => item.attachment !== '—').length };
    bars = [{ label: 'Active', value: rows.filter((item) => item.status === 'Active').length }, { label: 'Archived', value: rows.filter((item) => item.status === 'Archived').length }, { label: 'With file', value: rows.filter((item) => item.attachment !== '—').length }];
  } else if (reportType === 'Customer Report') {
    summary = { 'Customers found': rows.length, 'Active customers': rows.filter((item) => item.status === 'Active').length, 'Inactive customers': rows.filter((item) => item.status === 'Inactive').length, 'Transactions linked': rows.reduce((sum, item) => sum + Number(item.transactions || 0), 0) };
    bars = [{ label: 'Active', value: rows.filter((item) => item.status === 'Active').length }, { label: 'Inactive', value: rows.filter((item) => item.status === 'Inactive').length }, { label: 'With sales', value: rows.filter((item) => Number(item.transactions) > 0).length }];
  } else if (reportType === 'Supplier Report') {
    summary = { 'Suppliers found': rows.length, 'Active suppliers': rows.filter((item) => item.status === 'Active').length, 'Inactive suppliers': rows.filter((item) => item.status === 'Inactive').length, 'Procurement records': rows.reduce((sum, item) => sum + Number(item.procurement || 0), 0) };
    bars = [{ label: 'Active', value: rows.filter((item) => item.status === 'Active').length }, { label: 'Inactive', value: rows.filter((item) => item.status === 'Inactive').length }, { label: 'With orders', value: rows.filter((item) => Number(item.procurement) > 0).length }];
  }
  const max = Math.max(1, ...bars.map((item) => item.value));
  return { rows, columns, summary, chart: bars.map((item) => ({ ...item, percent: item.value / max * 100 })) };
}

function CheckboxLine({ checked, onChange, label }) { return <label className="checkbox-line"><input type="checkbox" checked={checked} onChange={(event) => { onChange(event.target.checked); }} /><span>{label}</span></label>; }
