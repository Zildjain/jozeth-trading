import React from 'react';

const variantFor = (status = '') => {
  const value = String(status).toLowerCase();
  if (['completed', 'active', 'received', 'in stock', 'approved', 'success'].includes(value)) return 'success';
  if (['pending', 'low stock', 'draft', 'ordered', 'medium', 'high'].includes(value)) return 'warning';
  if (['cancelled', 'inactive', 'out of stock', 'archived', 'rejected'].includes(value)) return 'danger';
  if (['sale', 'stock in', 'info'].includes(value)) return 'info';
  return 'neutral';
};

export default function StatusBadge({ status, tone }) {
  const variant = tone || variantFor(status);
  return <span className={`status-badge status-badge--${variant}`}>{status || '—'}</span>;
}
