import React from 'react';

export default function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div className="page-heading__copy">
        {eyebrow && <p className="page-heading__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-heading__actions">{actions}</div>}
    </div>
  );
}
