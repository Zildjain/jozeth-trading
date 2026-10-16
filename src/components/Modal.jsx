import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, description, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <button type="button" className="icon-button modal__close" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}
