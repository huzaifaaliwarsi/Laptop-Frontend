'use client';

import React, { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import Modal from '../../common/Modal';
import CommonProductFields from '../../common/CommonProductFields';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function ExchangeModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Out Product (Shop -> Customer)
  const [outProductId, setOutProductId] = useState('');
  const [outSaleValue, setOutSaleValue] = useState('');

  // In Product (Customer -> Shop)
  const [inProductData, setInProductData] = useState({
    category: 'Laptop',
    brand: '',
    model: '',
    screenSize: '',
    processor: '',
    ram: '',
    romSsd: '',
    hardDrive: '',
    graphicsCard: '',
    others: '',
    condition: 'Used',
    quantity: 1,
    lowStockAlert: 1,
    costPrice: '', // Buyback evaluation value
    expectedSalePrice: '',
    remarks: ''
  });

  const [settlementMethod, setSettlementMethod] = useState('Cash');
  const [settlementPaid, setSettlementPaid] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState('save_preview');

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('/categories'),
        api.get('/products?inStockOnly=true')
      ]).then(([cRes, pRes]) => {
        if (cRes.success) setCategories(cRes.data.productCategories || []);
        if (pRes.success) setProductsList(pRes.data || []);
      }).catch(console.error);

      setCustomerName('');
      setContact('');
      setDate(new Date().toISOString().split('T')[0]);
      setOutProductId('');
      setOutSaleValue('');
      setSettlementMethod('Cash');
      setSettlementPaid('');
      setReferenceId('');
      setInProductData({
        category: 'Laptop',
        brand: '',
        model: '',
        screenSize: '',
        processor: '',
        ram: '',
        romSsd: '',
        hardDrive: '',
        graphicsCard: '',
        others: '',
        condition: 'Used',
        quantity: 1,
        lowStockAlert: 1,
        costPrice: '',
        expectedSalePrice: '',
        remarks: ''
      });
    }
  }, [isOpen]);

  const handleOutProductSelect = (e) => {
    const id = e.target.value;
    setOutProductId(id);
    const p = productsList.find(x => x.id === id);
    if (p) {
      setOutSaleValue(p.expectedSalePrice || p.costPrice || '');
    }
  };

  const handleInFieldChange = (field, val) => {
    setInProductData(prev => ({ ...prev, [field]: val }));
  };

  const outVal = parseFloat(outSaleValue || 0);
  const inVal = parseFloat(inProductData.costPrice || 0);
  const diff = outVal - inVal;

  let exchangeCase = 'Even Exchange';
  let diffAmount = 0;
  if (diff > 0.005) {
    exchangeCase = 'Customer Pays Shop';
    diffAmount = diff;
  } else if (diff < -0.005) {
    exchangeCase = 'Shop Pays Customer';
    diffAmount = Math.abs(diff);
  }

  const numPaid = settlementPaid === '' ? diffAmount : parseFloat(settlementPaid || 0);
  const balance = Math.max(0, diffAmount - numPaid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !outProductId || !inProductData.brand.trim() || !inProductData.model.trim()) {
      toast('Please select the outgoing product and enter the customer return product details', 'error');
      return;
    }

    const outProd = productsList.find(p => p.id === outProductId);
    if (!outProd || outProd.currentStock < 1) {
      toast('Selected outgoing product is out of stock', 'error');
      return;
    }

    const inProductObj = {
      category: inProductData.category || 'Laptop',
      categoryName: inProductData.category || 'Laptop',
      brand: inProductData.brand.trim(),
      model: inProductData.model.trim(),
      screenSize: inProductData.screenSize,
      processor: inProductData.processor,
      ram: inProductData.ram,
      romSsd: inProductData.romSsd,
      hardDrive: inProductData.hardDrive,
      graphicsCard: inProductData.graphicsCard,
      others: inProductData.others,
      specifications: [
        inProductData.screenSize && `${inProductData.screenSize}`,
        inProductData.processor && `CPU: ${inProductData.processor}`,
        inProductData.ram && `RAM: ${inProductData.ram}`,
        inProductData.romSsd && `SSD: ${inProductData.romSsd}`,
        inProductData.hardDrive && `HDD: ${inProductData.hardDrive}`,
        inProductData.graphicsCard && `GPU: ${inProductData.graphicsCard}`,
        inProductData.others
      ].filter(Boolean).join(' • '),
      condition: inProductData.condition || 'Used',
      quantity: 1,
      lowStockAlert: 1,
      costPrice: inVal,
      expectedSalePrice: parseFloat(inProductData.expectedSalePrice || (inVal * 1.15)),
      remarks: inProductData.remarks
    };

    setSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        contact: contact.trim(),
        date,
        shopProductId: outProductId,
        outProductId,
        shopValue: outVal,
        outSaleValue: outVal,
        customerValue: inVal,
        inValue: inVal,
        exchangeCase,
        receivedProduct: inProductObj,
        inProduct: inProductObj,
        paymentMethod: settlementMethod,
        referenceId: referenceId.trim(),
        paid: numPaid
      };

      const res = await api.post('/pos/exchange', payload);
      if (res.success) {
        toast('Exchange invoice processed and inventory stock synchronized!');
        onClose();
        if (onSuccess) {
          const shouldPreview = submitAction === 'save_preview';
          onSuccess(res.data.invoice, shouldPreview);
        }
      }
    } catch (err) {
      toast(err.message || 'Error processing exchange', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Exchange Invoice"
      subtitle="1-to-1 Device Trade-In & Difference Settlement"
      wide={true}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="exchangeForm"
            className="btn"
            style={{ fontWeight: 700, backgroundColor: 'var(--bg)', borderColor: 'var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting || !outProductId}
            onClick={() => setSubmitAction('save')}
          >
            <Save size={15} /> Save Exchange
          </button>
          <button
            type="submit"
            form="exchangeForm"
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting || !outProductId}
            onClick={() => setSubmitAction('save_preview')}
          >
            <Printer size={15} /> {submitting ? 'Processing...' : 'Save & Print Exchange'}
          </button>
        </div>
      }
    >
      <form id="exchangeForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-4">
            <label>Customer Name *</label>
            <input
              className="input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              required
            />
          </div>
          <div className="field span-4">
            <label>Contact Number</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="03001234567"
            />
          </div>
          <div className="field span-4">
            <label>Exchange Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Out Product (Giving to Customer) */}
          <div className="span-12 line-card" style={{ borderColor: '#bfdbfe', background: '#f8fbff' }}>
            <div className="line-card-head">
              <strong style={{ color: 'var(--blue-700)' }}>1. Outgoing Product (Shop Giving to Customer)</strong>
            </div>
            <div className="form-grid">
              <div className="field span-8">
                <label>Select In-Stock Product *</label>
                <select
                  className="select"
                  value={outProductId}
                  onChange={handleOutProductSelect}
                  required
                >
                  <option value="">Select product to give customer</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.brand} {p.model || p.productName} ({p.condition}) [Stock: {p.currentStock}] — PKR {p.expectedSalePrice}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field span-4">
                <label>Agreed Sale Value PKR *</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={outSaleValue}
                  onChange={(e) => setOutSaleValue(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* In Product (Receiving from Customer) */}
          <div className="span-12 line-card" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
            <div className="line-card-head">
              <strong style={{ color: 'var(--success)' }}>2. Incoming Product (Customer Returning to Shop)</strong>
            </div>
            <div className="form-grid">
              <CommonProductFields
                values={inProductData}
                onChange={handleInFieldChange}
                categories={categories}
              />
            </div>
          </div>

          {/* Difference & Settlement */}
          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>Outgoing Product Value (Shop &rarr; Customer)</span>
              <strong>{money(outVal)}</strong>
            </div>
            <div className="summary-row">
              <span>Incoming Trade-in Value (Customer &rarr; Shop)</span>
              <strong>{money(inVal)}</strong>
            </div>
            <div className="summary-row total" style={{ fontSize: 14 }}>
              <span>Exchange Result: <strong>{exchangeCase}</strong></span>
              <strong>{money(diffAmount)}</strong>
            </div>
            {exchangeCase !== 'Even Exchange' && (
              <>
                <div className="summary-row">
                  <span>Settlement Paid Now</span>
                  <strong>{money(numPaid)}</strong>
                </div>
                <div className="summary-row" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  <span>Outstanding ({exchangeCase === 'Customer Pays Shop' ? 'Customer Receivable' : 'Customer Payable'})</span>
                  <strong>{money(balance)}</strong>
                </div>
              </>
            )}
          </div>

          {exchangeCase !== 'Even Exchange' && (
            <>
              <div className="field span-4">
                <label>Payment Method *</label>
                <select
                  className="select"
                  value={settlementMethod}
                  onChange={(e) => setSettlementMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Online">Online / Bank Transfer</option>
                </select>
              </div>

              <div className="field span-4">
                <label>Amount Paid Now</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settlementPaid}
                  onChange={(e) => setSettlementPaid(e.target.value)}
                  placeholder={`Full: ${diffAmount}`}
                />
              </div>

              <div className="field span-4">
                <label>Reference</label>
                <input
                  className="input"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Slip / Note"
                />
              </div>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
