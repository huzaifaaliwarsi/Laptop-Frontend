'use client';

import React, { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import Modal from '../../common/Modal';
import CommonProductFields from '../../common/CommonProductFields';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { notifyBalanceUpdated } from '../../../utils/formatters';
import InsufficientBalanceConfirmModal from '../../common/InsufficientBalanceConfirmModal';

function money(v) {
  const num = parseFloat(v || 0);
  return 'PKR ' + num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export default function VendorPurchaseModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendorName, setVendorName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceId, setReferenceId] = useState('');
  const [paid, setPaid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState('save_preview');

  // Insufficient Balance Warning State
  const [balanceWarningModal, setBalanceWarningModal] = useState({
    isOpen: false,
    availableBalance: 0,
    requiredAmount: 0,
    paymentMethod: 'Cash'
  });

  const [productData, setProductData] = useState({
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

  useEffect(() => {
    if (isOpen) {
      const loadInitial = () => {
        Promise.all([
          api.get('/vendors'),
          api.get('/categories')
        ]).then(([vRes, cRes]) => {
          if (vRes.success) setVendors(vRes.data || []);
          if (cRes.success) setCategories(cRes.data.productCategories || []);
        }).catch(console.error);
      };

      loadInitial();

      const handleCategoryUpdate = () => {
        loadInitial();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('app:categories-updated', handleCategoryUpdate);
      }

      setVendorName('');
      setContact('');
      setPaid('');
      setReferenceId('');
      setDate(new Date().toISOString().split('T')[0]);
      setBalanceWarningModal({ isOpen: false, availableBalance: 0, requiredAmount: 0, paymentMethod: 'Cash' });
      setProductData({
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

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('app:categories-updated', handleCategoryUpdate);
        }
      };
    }
  }, [isOpen]);

  const handleVendorSelect = (e) => {
    const val = e.target.value;
    setVendorName(val);
    const found = vendors.find(v => v.name === val);
    if (found && found.contact) setContact(found.contact);
  };

  const handleFieldChange = (field, val) => {
    setProductData(prev => ({ ...prev, [field]: val }));
  };

  const qty = parseInt(productData.quantity || 1, 10);
  const cost = parseFloat(productData.costPrice || 0);
  const totalCost = qty * cost;
  const numPaid = paid === '' ? totalCost : parseFloat(paid || 0);
  const balance = Math.max(0, totalCost - numPaid);

  const executeVendorPurchase = async () => {
    const productObj = {
      category: productData.category || 'Laptop',
      categoryName: productData.category || 'Laptop',
      brand: productData.brand.trim(),
      model: productData.model.trim(),
      screenSize: productData.screenSize,
      processor: productData.processor,
      ram: productData.ram,
      romSsd: productData.romSsd,
      hardDrive: productData.hardDrive,
      graphicsCard: productData.graphicsCard,
      others: productData.others,
      specifications: [
        productData.screenSize && `${productData.screenSize}`,
        productData.processor && `CPU: ${productData.processor}`,
        productData.ram && `RAM: ${productData.ram}`,
        productData.romSsd && `SSD: ${productData.romSsd}`,
        productData.hardDrive && `HDD: ${productData.hardDrive}`,
        productData.graphicsCard && `GPU: ${productData.graphicsCard}`,
        productData.others
      ].filter(Boolean).join(' • '),
      condition: productData.condition || 'Used',
      quantity: qty,
      lowStockAlert: parseInt(productData.lowStockAlert || 1, 10),
      costPrice: cost,
      expectedSalePrice: parseFloat(productData.expectedSalePrice || (cost * 1.15)),
      remarks: productData.remarks
    };

    setSubmitting(true);
    try {
      const payload = {
        vendorName: vendorName.trim(),
        contact: contact.trim(),
        vendorContact: contact.trim(),
        date,
        paymentMethod,
        referenceId: referenceId.trim(),
        paid: numPaid,
        product: productObj,
        lines: [productObj]
      };

      const res = await api.post('/pos/vendor-purchase', payload);
      if (res.success) {
        toast('Vendor Purchase recorded & inventory stock updated!');
        setBalanceWarningModal(prev => ({ ...prev, isOpen: false }));
        notifyBalanceUpdated();
        onClose();
        if (onSuccess) {
          const shouldPreview = submitAction === 'save_preview';
          onSuccess(res.data.invoice, shouldPreview);
        }
      }
    } catch (err) {
      toast(err.message || 'Error recording vendor purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim() || !productData.brand.trim() || !productData.model.trim() || totalCost <= 0) {
      toast('Please fill all required vendor and product fields', 'error');
      return;
    }

    // Check Drawer Balance before payment outflow
    if (numPaid > 0 && ['Cash', 'Online'].includes(paymentMethod)) {
      let available = 0;
      let balCheckOk = false;
      try {
        const balRes = await api.get('/accounts/drawer-balance', { noCache: true });
        if (balRes.success && balRes.data) {
          available = paymentMethod === 'Cash' ? (balRes.data.cash ?? 0) : (balRes.data.online ?? 0);
          balCheckOk = true;
        }
      } catch (err) {
        available = 0;
        balCheckOk = false;
      }
      if (!balCheckOk || numPaid > available + 0.005) {
        setBalanceWarningModal({
          isOpen: true,
          availableBalance: available,
          requiredAmount: numPaid,
          paymentMethod
        });
        return;
      }
    }

    await executeVendorPurchase();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vendor Purchase / Stock Receiving"
      subtitle="Receive fresh inventory batch from supplier"
      wide={true}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="vendorPurchaseForm"
            className="btn"
            style={{ fontWeight: 700, backgroundColor: 'var(--bg)', borderColor: 'var(--border)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting}
            onClick={() => setSubmitAction('save')}
          >
            <Save size={15} /> Save Purchase
          </button>
          <button
            type="submit"
            form="vendorPurchaseForm"
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            disabled={submitting}
            onClick={() => setSubmitAction('save_preview')}
          >
            <Printer size={15} /> {submitting ? 'Processing...' : `Save & Print (${money(totalCost)})`}
          </button>
        </div>
      }
    >
      <form id="vendorPurchaseForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field span-4">
            <label>Select / Enter Vendor *</label>
            <input
              className="input"
              list="vendorsDataList"
              value={vendorName}
              onChange={handleVendorSelect}
              placeholder="Vendor / Supplier Name"
              required
            />
            <datalist id="vendorsDataList">
              {vendors.map(v => (
                <option key={v.id} value={v.name} />
              ))}
            </datalist>
          </div>
          <div className="field span-4">
            <label>Vendor Contact</label>
            <input
              className="input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="03001234567"
            />
          </div>
          <div className="field span-4">
            <label>Purchase Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <CommonProductFields
            values={productData}
            onChange={handleFieldChange}
            categories={categories}
          />

          <div className="field span-4">
            <label>Payment Method *</label>
            <select
              className="select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online / Bank Transfer</option>
            </select>
          </div>

          <div className="field span-4">
            <label>Amount Paid to Vendor</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder={totalCost > 0 ? `Full: PKR ${totalCost.toLocaleString('en-PK')}` : '0.00'}
            />
          </div>

          <div className="field span-4">
            <label>Payment Reference / Bill No.</label>
            <input
              className="input"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Supplier invoice / tracking"
            />
          </div>

          <div className="span-12 summary-box" style={{ marginTop: 8 }}>
            <div className="summary-row">
              <span>Total Batch Cost</span>
              <strong>{money(totalCost)}</strong>
            </div>
            <div className="summary-row">
              <span>Amount Paid Now</span>
              <strong>{money(numPaid)}</strong>
            </div>
            <div className="summary-row" style={{ color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
              <span>Balance (Vendor Payable)</span>
              <strong>{money(balance)}</strong>
            </div>
          </div>
        </div>
      </form>

      {/* Insufficient Drawer Balance Alert & Confirmation Modal */}
      <InsufficientBalanceConfirmModal
        isOpen={balanceWarningModal.isOpen}
        onClose={() => setBalanceWarningModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeVendorPurchase}
        paymentMethod={balanceWarningModal.paymentMethod}
        requiredAmount={balanceWarningModal.requiredAmount}
        availableBalance={balanceWarningModal.availableBalance}
        isSubmitting={submitting}
      />
    </Modal>
  );
}
