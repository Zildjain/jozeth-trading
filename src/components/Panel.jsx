import React from 'react';

export default function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || subtitle || action) && (
        <div className="panel__header">
          <div>
            {title && <h2 className="panel__title">{title}</h2>}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {action && <div className="panel__action">{action}</div>}
        </div>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}
