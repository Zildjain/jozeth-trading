export const currency = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value || 0));

export const shortCurrency = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
}).format(Number(value || 0));

export const todayISO = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export function nextId(prefix, items, key = 'id', digits = 3) {
  const max = (items || []).reduce((currentMax, item) => {
    const matches = String(item[key] || '').match(/(\d+)$/);
    return matches ? Math.max(currentMax, Number(matches[1])) : currentMax;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(digits, '0')}`;
}

export function formatDate(value) {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const format = typeof document !== 'undefined' ? (document.documentElement.dataset.dateFormat || 'MMM DD, YYYY') : 'MMM DD, YYYY';
  if (format === 'YYYY-MM-DD') return raw;
  if (format === 'DD/MM/YYYY') return date.toLocaleDateString('en-GB');
  if (format === 'MM/DD/YYYY') return date.toLocaleDateString('en-US');
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function downloadCsv(filename, rows) {
  const csvValue = (value) => {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = rows.map((row) => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function addActivity(data, title, description, tone = 'orange') {
  const activity = {
    id: `ACT-${Date.now()}`,
    title,
    description,
    date: todayISO(),
    tone,
  };
  return { ...data, activity: [activity, ...(data.activity || [])].slice(0, 25) };
}

export function getStockStatus(product) {
  if (Number(product.quantity) <= 0) return 'Out of Stock';
  if (Number(product.quantity) <= Number(product.reorderLevel)) return 'Low Stock';
  return 'In Stock';
}

export function safeString(value) {
  return String(value ?? '').trim();
}
