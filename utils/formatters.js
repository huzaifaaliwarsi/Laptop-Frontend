/**
 * Unified Financial & Date Formatter Utilities
 */

export function money(v) {
  const num = parseFloat(v || 0);
  if (isNaN(num)) return 'PKR 0.00';
  return 'PKR ' + num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function numStr(v) {
  const num = parseFloat(v || 0);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function fmtDateDMY(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function getTransactionConfig(type = '', invoice = {}) {
  const t = String(type || invoice.type || invoice.typeKey || '').toLowerCase();
  
  if (invoice.isPaymentReceipt || t.includes('payment receipt') || t === 'payment') {
    const isVendor = invoice.partyType === 'Vendor' || invoice.direction === 'Paid' || String(invoice.accountType || '').includes('Vendor');
    return {
      category: 'payment_receipt',
      title: isVendor ? 'VENDOR PAYMENT RECEIPT' : 'CUSTOMER PAYMENT RECEIPT',
      subtitle: isVendor ? 'PAYMENT TO VENDOR' : 'PAYMENT RECEIVED FROM CUSTOMER',
      partyLabel: isVendor ? 'Vendor' : 'Customer',
      moneyDirection: isVendor ? 'PAID TO VENDOR' : 'RECEIVED FROM CUSTOMER',
      theme: isVendor ? 'warning' : 'primary'
    };
  }

  if (t.includes('buyback') || t.includes('customer purchase')) {
    return {
      category: 'buyback',
      title: 'CUSTOMER BUYBACK RECEIPT',
      subtitle: 'USED DEVICE PURCHASE FROM CUSTOMER',
      partyLabel: 'Customer / Seller',
      moneyDirection: 'PAID TO CUSTOMER',
      theme: 'purple'
    };
  }

  if (t.includes('exchange')) {
    return {
      category: 'exchange',
      title: 'PRODUCT EXCHANGE INVOICE',
      subtitle: 'TRADE-IN & UPGRADE SETTLEMENT',
      partyLabel: 'Customer',
      theme: 'cyan'
    };
  }

  if (t.includes('vendor return') || t.includes('vendor-return')) {
    return {
      category: 'vendor_return',
      title: 'VENDOR RETURN NOTE',
      subtitle: 'PURCHASE RETURN & DEBIT NOTE',
      partyLabel: 'Vendor',
      moneyDirection: 'RETURN VALUE SETTLEMENT',
      theme: 'orange'
    };
  }

  if (t.includes('sales return') || t.includes('sale return') || invoice.isVoided) {
    return {
      category: 'sales_return',
      title: 'SALES RETURN / REFUND RECEIPT',
      subtitle: 'CUSTOMER CREDIT NOTE & REFUND',
      partyLabel: 'Customer',
      moneyDirection: 'REFUND TO CUSTOMER',
      theme: 'danger'
    };
  }

  if (t.includes('vendor purchase') || t.includes('vendor') || t.includes('purchase')) {
    return {
      category: 'vendor_purchase',
      title: 'VENDOR PURCHASE INVOICE',
      subtitle: 'STOCK RECEIVING & PAYABLE BILL',
      partyLabel: 'Vendor',
      theme: 'blue'
    };
  }

  if (t.includes('diagnosis')) {
    return {
      category: 'diagnosis',
      title: 'DIAGNOSIS & INSPECTION INVOICE',
      subtitle: 'TECHNICAL DIAGNOSIS REPORT & BILLING',
      partyLabel: 'Customer',
      theme: 'amber'
    };
  }

  if (t.includes('repair')) {
    return {
      category: 'repair',
      title: 'REPAIR SERVICE INVOICE',
      subtitle: 'WORKSHOP SERVICE & PARTS BILLING',
      partyLabel: 'Customer',
      theme: 'indigo'
    };
  }

  if (t.includes('custom')) {
    return {
      category: 'custom_sale',
      title: 'SALES INVOICE (CUSTOM)',
      subtitle: 'RETAIL SALE & SPECIAL ORDER',
      partyLabel: 'Customer',
      theme: 'primary'
    };
  }

  // Default normal POS retail sale
  const hasTax = parseFloat(invoice.taxAmount || 0) > 0 || !!invoice.fbrInvoiceNo;
  return {
    category: 'sale',
    title: hasTax ? 'SALES TAX INVOICE' : 'RETAIL SALES INVOICE',
    subtitle: 'RETAIL CASH / CREDIT SALE',
    partyLabel: 'Customer',
    theme: 'primary'
  };
}

/**
 * Fire a global event so any balance display widget auto-refreshes
 * Call this after every successful financial transaction (purchase, expense, sale, etc.)
 */
export function notifyBalanceUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:balance-updated'));
  }
}
