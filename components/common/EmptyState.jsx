'use client';

import React from 'react';

export default function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="empty">
      <div className="empty-icon">—</div>
      <h4>{title}</h4>
      <p>{text}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn small" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
