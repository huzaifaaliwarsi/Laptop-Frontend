'use client';

import React, { useState, useEffect } from 'react';
import { History, ArrowDownLeft, ArrowUpRight, Wrench, ShieldCheck, User } from 'lucide-react';
import Modal from '../../common/Modal';
import { TableRowSkeleton } from '../../common/Skeleton';
import api from '../../../services/api';

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function RepairPartHistoryModal({
  isOpen,
  onClose,
  part
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && part) {
      setLoading(true);
      api.get(`/repair-parts/${part.id}/history`)
        .then(res => {
          if (res.success) setHistory(res.data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, part]);

  if (!isOpen || !part) return null;

  const currentStock = parseInt(part.currentStock ?? part.current_stock ?? 0, 10);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Spare Part Movement Ledger"
      subtitle={`${part.code} — ${part.name} (Active Stock: ${currentStock} units)`}
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
              <th>Date & Time</th>
              <th>Movement Type</th>
              <th>Reference / Job #</th>
              <th>Reason & Purpose</th>
              <th style={{ textAlign: 'right' }}>Qty Change</th>
              <th style={{ textAlign: 'right' }}>Balance After</th>
              <th>Logged By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableRowSkeleton cols={7} rows={4} />
            ) : history.length > 0 ? (
              history.map((log) => {
                const isPositive = log.change_amount > 0 || log.direction === 'IN';
                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {fmtDate(log.date)}
                    </td>
                    <td>
                      <span className={`badge ${isPositive ? 'success' : 'danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {isPositive ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {log.ref_type || (isPositive ? 'Stock IN' : 'Stock OUT')}
                      </span>
                    </td>
                    <td>
                      {log.ref_id ? (
                        <strong style={{ color: '#1d4ed8' }}>{log.ref_id}</strong>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: '#334155', maxWidth: 280 }}>
                      {log.reason || 'Workshop Stock Movement'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: isPositive ? '#16a34a' : '#dc2626' }} className="font-mono">
                      {isPositive ? `+${Math.abs(log.change_amount || log.quantity)}` : `-${Math.abs(log.change_amount || log.quantity)}`}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {log.balance_after !== null && log.balance_after !== undefined ? (
                        <span>{log.balance_after} units</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
                        <User size={11} />
                        <span>{log.created_by_name || 'System'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                  No historical stock movements logged yet for this spare part.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
