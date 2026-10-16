import React from 'react';

export default function MetricCard({ label, value, change, icon: Icon, tone = 'blue' }) {
  return (
    <article className="metric-card">
      <div className={`metric-card__icon metric-card__icon--${tone}`}>
        <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
      </div>
      <div className="metric-card__content">
        <p className="metric-card__label">{label}</p>
        <p className="metric-card__value">{value}</p>
        <p className={`metric-card__change ${change?.startsWith('+') ? 'metric-card__change--green' : ''}`}>
          {change}
        </p>
      </div>
    </article>
  );
}
