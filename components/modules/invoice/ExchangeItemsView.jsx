'use client';

import React from 'react';
import { numStr } from '../../../utils/formatters';

export default function ExchangeItemsView({
  invoice = {}
}) {
  const items = invoice.items || [];
  
  // Separate items given (sold) vs items received (trade-in)
  const shopItems = items.filter(i => i.itemType !== 'trade_in' && !i.isTradeIn);
  const tradeInItems = items.filter(i => i.itemType === 'trade_in' || i.isTradeIn);

  const shopTotal = shopItems.reduce((s, i) => s + (parseFloat(i.lineTotal) || (parseFloat(i.quantity || 1) * parseFloat(i.rate || i.unitPrice || 0))), 0);
  const tradeInTotal = tradeInItems.reduce((s, i) => s + (parseFloat(i.lineTotal) || (parseFloat(i.quantity || 1) * parseFloat(i.rate || i.unitPrice || 0))), 0);

  const diff = Math.abs(shopTotal - tradeInTotal);
  const isEven = Math.abs(shopTotal - tradeInTotal) < 0.005;
  const isCustomerPays = shopTotal > tradeInTotal;
  const isShopPays = tradeInTotal > shopTotal;

  return (
    <div className="std-table-container">
      {/* SECTION A: SHOP ITEM GIVEN */}
      <div style={{ marginBottom: 12 }}>
        <div className="std-words-title" style={{ marginBottom: 4 }}>
          SECTION A: SHOP ITEM GIVEN (OUTGOING) — Total: PKR {numStr(shopTotal)}
        </div>
        <table className="std-items-table">
          <thead>
            <tr>
              <th style={{ width: '6%', textAlign: 'center' }}>S. No.</th>
              <th style={{ width: '48%' }}>Shop Product Description</th>
              <th style={{ width: '16%' }}>Code / SKU</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Quantity</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Shop Value</th>
            </tr>
          </thead>
          <tbody>
            {shopItems.length === 0 ? (
              <tr><td colSpan="5" className="std-table-empty">No outgoing product recorded.</td></tr>
            ) : (
              shopItems.map((item, idx) => {
                const qty = parseFloat(item.quantity || 1);
                const total = item.lineTotal || (qty * (item.rate || item.unitPrice || 0));
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      <div className="std-item-name">{item.name}</div>
                      {item.description && <div className="std-item-desc">{item.description}</div>}
                    </td>
                    <td className="font-mono text-muted">{item.productCode || item.code || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{qty.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }} className="font-mono font-bold">{numStr(total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SECTION B: CUSTOMER ITEM RECEIVED */}
      <div style={{ marginBottom: 12 }}>
        <div className="std-words-title" style={{ marginBottom: 4 }}>
          SECTION B: CUSTOMER ITEM RECEIVED (TRADE-IN) — Agreed Value: PKR {numStr(tradeInTotal)}
        </div>
        <table className="std-items-table">
          <thead>
            <tr>
              <th style={{ width: '6%', textAlign: 'center' }}>S. No.</th>
              <th style={{ width: '48%' }}>Customer Device / Item Received</th>
              <th style={{ width: '16%' }}>Serial / IMEI</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Quantity</th>
              <th style={{ width: '20%', textAlign: 'right' }}>Agreed Value</th>
            </tr>
          </thead>
          <tbody>
            {tradeInItems.length === 0 ? (
              <tr><td colSpan="5" className="std-table-empty">No trade-in device recorded.</td></tr>
            ) : (
              tradeInItems.map((item, idx) => {
                const qty = parseFloat(item.quantity || 1);
                const total = item.lineTotal || (qty * (item.rate || item.unitPrice || 0));
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>
                      <div className="std-item-name">{item.name}</div>
                      {item.description && <div className="std-item-desc">{item.description}</div>}
                    </td>
                    <td className="font-mono text-muted">{item.serial || item.code || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{qty.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }} className="font-mono font-bold">{numStr(total)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* EXCHANGE SETTLEMENT BANNER */}
      <div className="std-box" style={{ padding: '8px 12px', minHeight: 'auto', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{isEven ? 'EVEN EXCHANGE' : isCustomerPays ? 'CUSTOMER PAYS SHOP DIFFERENCE' : 'SHOP PAYS CUSTOMER DIFFERENCE'}</strong>
            <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>
              {isEven && 'Both items have equal agreed valuation. No balance due.'}
              {isCustomerPays && `Shop item value exceeds trade-in valuation.`}
              {isShopPays && `Customer trade-in value exceeds shop item valuation.`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, fontStyle: 'italic', display: 'block' }}>DIFFERENCE AMOUNT:</span>
            <span className="font-mono font-bold" style={{ fontSize: 15 }}>
              PKR {numStr(diff)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
