'use client';

import React, { useState, useEffect } from 'react';
import Modal from '../../common/Modal';
import api from '../../../services/api';

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
}

export default function ProductHistoryModal({
  isOpen,
  onClose,
  product
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      api.get(`/products/${product.id}/history`)
        .then(res => {
          if (res.success) setHistory(res.data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Movement History"
      subtitle={`${product.code} — ${product.brand} ${product.model || product.productName} (Current Stock: ${product.currentStock})`}
      wide={true}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type / Source</th>
              <th>Reference</th>
              <th>Reason / Details</th>
              <th style={{ textAlign: 'right' }}>Qty Change</th>
              <th style={{ textAlign: 'right' }}>Balance After</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                  Loading movement logs...
                </td>
              </tr>
            ) : history.length > 0 ? (
              history.map((log) => (
                <tr key={log.id}>
                  <td>{fmtDate(log.date)}</td>
                  <td>
                    <span className={`badge ${log.change_amount > 0 ? 'success' : 'danger'}`}>
                      {log.ref_type || (log.change_amount > 0 ? 'Stock IN' : 'Stock OUT')}
                    </span>
                  </td>
                  <td><strong>{log.ref_id || '—'}</strong></td>
                  <td>{log.reason || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: log.change_amount > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {log.balance_after !== null ? log.balance_after : '—'}
                  </td>
                  <td>{log.created_by_name || 'System'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>
                  No historical stock movements logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
