import React, { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, BellRing, Boxes, CircleDollarSign, ClipboardList, Package, ShoppingCart, Truck, UsersRound } from 'lucide-react';
import Button from '../components/Button.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Panel from '../components/Panel.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { currency, formatDate, getStockStatus, shortCurrency, todayISO, downloadCsv } from '../utils/helpers.js';

export default function Dashboard({ searchValue, notify, onNavigate, user, data, allowedPages = [] }) {
  const products = data.products || [];
  const customers = data.customers || [];
  const suppliers = data.suppliers || [];
  const transactions = data.transactions || [];
  const procurements = data.procurements || [];
  const lowStock = products.filter((item) => ['Low Stock', 'Out of Stock'].includes(getStockStatus(item)));
  const available = products.filter((item) => getStockStatus(item) === 'In Stock').length;
  const lowCount = products.filter((item) => getStockStatus(item) === 'Low Stock').length;
  const outCount = products.filter((item) => getStockStatus(item) === 'Out of Stock').length;
  const pendingPO = procurements.filter((item) => ['Draft', 'Pending', 'Approved', 'Ordered'].includes(item.status));
  const dailySales = transactions.filter((item) => item.date === todayISO() && item.status === 'Completed' && item.type === 'Sale').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const filteredTransactions = useMemo(() => {
    const needle = (searchValue || '').trim().toLowerCase();
    return transactions.filter((item) => `${item.id} ${item.customer} ${item.status} ${item.type} ${item.recordedBy}`.toLowerCase().includes(needle)).slice(0, 5);
  }, [transactions, searchValue]);
  const weekly = useMemo(() => {
    const days = [];
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(); date.setDate(date.getDate() - index);
      const pad = (value) => String(value).padStart(2, '0');
      const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      const value = transactions.filter((item) => item.date === iso && item.status === 'Completed' && item.type === 'Sale').reduce((sum, item) => sum + Number(item.amount || 0), 0);
      days.push({ iso, label: date.toLocaleDateString('en-PH', { weekday: 'short' }), value });
    }
    const max = Math.max(1, ...days.map((item) => item.value));
    return days.map((item) => ({ ...item, percent: item.value ? Math.max(12, item.value / max * 100) : 3 }));
  }, [transactions]);
  const weeklyTotal = weekly.reduce((sum, item) => sum + item.value, 0);
  const totalInventoryUnits = products.reduce((sum, product) => sum + Number(product.quantity || 0), 0);
  const recentActivities = data.activity || [];
  const metrics = [
    { label: 'Total Products', value: products.length, change: `${available} normal stock`, icon: Package, tone: 'orange' },
    { label: 'Total Customers', value: customers.length, change: 'Customer directory', icon: UsersRound, tone: 'green' },
    { label: 'Total Suppliers', value: suppliers.length, change: 'Supplier directory', icon: Truck, tone: 'purple' },
    { label: "Today's Sales", value: shortCurrency(dailySales), change: 'Completed sales today', icon: CircleDollarSign, tone: 'orange' },
    { label: 'Low Stock Items', value: lowStock.length, change: 'Need restock review', icon: Boxes, tone: 'red' },
    { label: 'Pending Procurement', value: pendingPO.length, change: 'Open requests', icon: ClipboardList, tone: 'yellow' },
  ];
  const chartLabel = weeklyTotal ? 'Completed sales over the last 7 days' : 'No completed sales in the last 7 days';

  return <>
    <PageHeading eyebrow="BUSINESS OVERVIEW" title="Business Operations Dashboard" description={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}. Here's the current overview of Jozeth Trading.`} actions={<><Button variant="secondary" onClick={() => exportDashboard(transactions)}><ClipboardList size={14} /> Export CSV</Button><Button onClick={() => onNavigate('Sales & Transactions')}><ShoppingCart size={14} /> New transaction</Button></>} />
    <div className="demo-note"><span className="demo-note__dot" /> Front-end demo data · Changes are saved in this browser only and are not synced to other devices.</div>
    <section className="metric-grid" aria-label="Business metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>
    <div className="dashboard-grid dashboard-grid--primary">
      <Panel title="Sales Overview" subtitle="Completed sales over the last seven days" action={allowedPages.includes('Reports') ? <button type="button" className="text-action" onClick={() => onNavigate('Reports')}>View reports <ArrowRight size={13} /></button> : null}>
        <div className="sales-summary"><div><span className="sales-summary__label">7-day recorded sales</span><strong>{currency(weeklyTotal)}</strong></div><div className="sales-summary__compare"><ArrowUpRight size={14} /> <span>From completed transactions</span></div></div>
        <div className="chart-area dashboard-bar-area" role="img" aria-label={chartLabel}><div className="chart-gridlines"><span>{shortCurrency(Math.max(1, ...weekly.map((item) => item.value)))}</span><span>{shortCurrency(Math.max(1, ...weekly.map((item) => item.value)) * .75)}</span><span>{shortCurrency(Math.max(1, ...weekly.map((item) => item.value)) * .5)}</span><span>{shortCurrency(Math.max(1, ...weekly.map((item) => item.value)) * .25)}</span><span>₱0</span></div><div className="bar-chart">{weekly.map((day) => <div className="bar-chart__column" key={day.iso} title={`${day.label}: ${currency(day.value)}`}><div className={`bar-chart__bar ${day.iso === todayISO() ? 'bar-chart__bar--highlight' : ''}`} style={{ height: `${day.percent}%` }} /></div>)}</div></div>
        <div className="chart-months">{weekly.map((day) => <span key={day.iso}>{day.label}</span>)}</div>
      </Panel>
      <Panel title="Inventory Status" subtitle="Product count by current stock level">
        <div className="inventory-total"><strong>{totalInventoryUnits.toLocaleString()}</strong><span>total units across catalogue</span></div>
        <div className="inventory-stack" aria-label="Inventory stock status distribution"><span className="inventory-stack__in" style={{ width: `${products.length ? available / products.length * 100 : 0}%` }} /><span className="inventory-stack__low" style={{ width: `${products.length ? lowCount / products.length * 100 : 0}%` }} /><span className="inventory-stack__out" style={{ width: `${products.length ? outCount / products.length * 100 : 0}%` }} /></div>
        <div className="inventory-legend"><div><i className="legend-dot legend-dot--green" /><span>Available Stock</span><strong>{available}</strong><small>{products.length ? Math.round(available / products.length * 100) : 0}%</small></div><div><i className="legend-dot legend-dot--orange" /><span>Low Stock</span><strong>{lowCount}</strong><small>{products.length ? Math.round(lowCount / products.length * 100) : 0}%</small></div><div><i className="legend-dot legend-dot--red" /><span>Out of Stock</span><strong>{outCount}</strong><small>{products.length ? Math.round(outCount / products.length * 100) : 0}%</small></div></div>
        <button type="button" className="inventory-footnote" onClick={() => onNavigate('Inventory')}><BellRing size={13} /> {lowStock.length} item(s) need stock review <ArrowRight size={13} /></button>
      </Panel>
    </div>
    <div className="dashboard-grid dashboard-grid--secondary">
      <Panel title="Recent Transactions" subtitle={searchValue ? `Filtered by “${searchValue}”` : 'Latest recorded sales and transaction activity'} className="transactions-panel" action={<button type="button" className="text-action" onClick={() => onNavigate('Sales & Transactions')}>View all <ArrowRight size={13} /></button>}>
        <div className="dashboard-table-toolbar"><span>{filteredTransactions.length} recent record(s)</span><Button size="sm" variant="secondary" onClick={() => onNavigate('Sales & Transactions')}>Manage transactions</Button></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Transaction ID</th><th>Customer</th><th>Transaction type</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead><tbody>{filteredTransactions.map((item) => <tr key={item.id}><td><button type="button" className="table-link" onClick={() => onNavigate('Sales & Transactions')}>{item.id}</button></td><td className="table-primary">{item.customer}</td><td>{item.type}</td><td className="table-amount">{currency(item.amount)}</td><td>{formatDate(item.date)}</td><td><StatusBadge status={item.status} /></td></tr>)}{!filteredTransactions.length && <tr><td colSpan="6" className="empty-state">No transaction records match this search.</td></tr>}</tbody></table></div>
        <div className="table-footer"><span>Showing up to 5 latest records</span><span>Values are calculated from saved data</span></div>
      </Panel>
      <div className="dashboard-side-stack">
        <Panel title="Low Stock Alerts" subtitle="Items at or below reorder level" action={<button type="button" className="text-action" onClick={() => onNavigate('Inventory')}>Manage <ArrowRight size={13} /></button>}>
          <div className="low-stock-list">{lowStock.slice(0, 5).map((product) => <div className="low-stock-item" key={product.id}><div className="low-stock-item__symbol"><Package size={14} /></div><div className="low-stock-item__main"><strong>{product.name}</strong><span>{product.quantity} {product.unit} left · Reorder at {product.reorderLevel}</span></div><StatusBadge status={product.quantity <= 0 ? 'Out of Stock' : 'Low Stock'} /></div>)}{!lowStock.length && <p className="empty-copy">All active products are above their reorder levels.</p>}</div>
        </Panel>
        <Panel title="Recent Activities" subtitle="Latest saved changes in this browser"><div className="activity-list">{recentActivities.slice(0, 5).map((item) => <div className="activity-item" key={item.id}><span className={`activity-item__marker activity-item__marker--${item.tone || 'orange'}`} /><div className="activity-item__content"><strong>{item.title}</strong><p>{item.description}</p><small>{formatDate(item.date)}</small></div></div>)}{!recentActivities.length && <p className="empty-copy">New actions will appear here.</p>}</div></Panel>
      </div>
    </div>
  </>;
}

function exportDashboard(transactions) {
  downloadCsv('jozeth-recent-transactions.csv', [['Transaction ID', 'Date', 'Customer', 'Type', 'Amount', 'Status', 'Recorded By'], ...transactions.map((item) => [item.id, item.date, item.customer, item.type, item.amount, item.status, item.recordedBy])]);
}
