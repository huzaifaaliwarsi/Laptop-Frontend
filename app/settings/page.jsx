'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import { 
  Trash2, 
  Loader2, 
  RefreshCw, 
  Wallet, 
  Landmark, 
  PlusCircle, 
  MinusCircle, 
  History, 
  ArrowDownLeft, 
  ArrowUpRight,
  Building2,
  Sliders,
  Wrench,
  Smartphone,
  Info,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  UploadCloud,
  Image,
  FileText,
  Check,
  Eye,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { notifyBalanceUpdated } from '../../utils/formatters';
import ManageRepairCategoriesModal from '../../components/common/ManageRepairCategoriesModal';
import ManageRepairPartsModal from '../../components/modules/repairs/ManageRepairPartsModal';
import ResetDatabaseModal from '../../components/modules/settings/ResetDatabaseModal';

export default function SettingsPage() {
  const { companyBranding, refreshBranding, updateBranding, role, effectiveRole, activeBranch } = useAuth();
  const { toast } = useToast();
  const currentRole = effectiveRole || role;
  const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState({
    companyName: '',
    tagline: '',
    invoiceSubtitle: '',
    phone: '',
    email: '',
    taxNumber: '',
    address: '',
    invoiceFooter: '',
    logoData: null
  });

  // Balances Form State
  const [openingCash, setOpeningCash] = useState('');
  const [openingOnline, setOpeningOnline] = useState('');
  const [liveCash, setLiveCash] = useState(0);
  const [liveOnline, setLiveOnline] = useState(0);
  const [refreshingBalances, setRefreshingBalances] = useState(false);

  // Drawer Cash-In / Cash-Out Action State
  const [drawerAction, setDrawerAction] = useState('Deposit'); // 'Deposit' or 'Withdrawal'
  const [drawerMethod, setDrawerMethod] = useState('Cash'); // 'Cash' or 'Online'
  const [drawerAmount, setDrawerAmount] = useState('');
  const [drawerNotes, setDrawerNotes] = useState('');
  const [savingDrawerAction, setSavingDrawerAction] = useState(false);
  const [drawerTransactions, setDrawerTransactions] = useState([]);
  const [showStartingCapital, setShowStartingCapital] = useState(false);

  // Repair Categories State
  const [repairCategories, setRepairCategories] = useState([]);
  const [isRepairCatModalOpen, setIsRepairCatModalOpen] = useState(false);
  const [newRepairCatName, setNewRepairCatName] = useState('');
  const [newRepairCatDesc, setNewRepairCatDesc] = useState('');
  const [savingRepairCat, setSavingRepairCat] = useState(false);

  // Spare Parts State
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);

  // Factory Reset State (Admin Only)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // WhatsApp settings
  const [waSettings, setWaSettings] = useState({
    businessName: '',
    number: '',
    botEnabled: true,
    autoStatusNotifications: true,
    welcomeMessage: '',
    shopLocation: ''
  });

  const [savingBranding, setSavingBranding] = useState(false);
  const [savingBalances, setSavingBalances] = useState(false);
  const [savingWa, setSavingWa] = useState(false);

  const loadRepairCategories = () => {
    api.get('/categories/repair')
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setRepairCategories(res.data);
        }
      })
      .catch(console.error);
  };

  const loadDrawerBalances = (isManual = false) => {
    if (isManual) setRefreshingBalances(true);
    return api.get('/accounts/drawer-balance', { noCache: true })
      .then(res => {
        if (res.success && res.data) {
          setLiveCash(res.data.cash || 0);
          setLiveOnline(res.data.online || 0);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isManual) {
          setTimeout(() => setRefreshingBalances(false), 200);
        }
      });
  };

  const loadDrawerTransactions = () => {
    api.get('/accounts/drawer-transactions')
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setDrawerTransactions(res.data);
        }
      })
      .catch(console.error);
  };

  const loadAll = () => {
    loadRepairCategories();
    loadDrawerBalances();
    loadDrawerTransactions();
    Promise.all([
      api.get('/settings/company'),
      api.get('/settings/opening-balances'),
      api.get('/whatsapp/settings')
    ]).then(([cRes, bRes, waRes]) => {
      if (cRes.success && cRes.data) {
        setBrandingForm({
          companyName: cRes.data.company_name || '',
          tagline: cRes.data.tagline || '',
          invoiceSubtitle: cRes.data.invoice_subtitle || '',
          phone: cRes.data.phone || '',
          email: cRes.data.email || '',
          taxNumber: cRes.data.tax_number || '',
          address: cRes.data.address || '',
          invoiceFooter: cRes.data.invoice_footer || '',
          logoData: cRes.data.logo_data || null
        });
      }
      if (bRes.success && bRes.data) {
        const cashVal = bRes.data.openingCash !== undefined ? bRes.data.openingCash : (bRes.data.opening_cash_balance || 0);
        const onlineVal = bRes.data.openingOnline !== undefined ? bRes.data.openingOnline : (bRes.data.opening_online_balance || 0);
        setOpeningCash(cashVal);
        setOpeningOnline(onlineVal);
      }
      if (waRes.success && waRes.data) {
        setWaSettings({
          businessName: waRes.data.business_name || '',
          number: waRes.data.number || '',
          botEnabled: waRes.data.bot_enabled !== false,
          autoStatusNotifications: waRes.data.auto_status_notifications !== false,
          welcomeMessage: waRes.data.welcome_message || '',
          shopLocation: waRes.data.shop_location || ''
        });
      }
    }).catch(console.error);
  };

  useEffect(() => {
    loadAll();

    // Auto-refresh balance whenever any transaction fires the global event
    const handleBalanceUpdated = () => {
      loadDrawerBalances();
      loadDrawerTransactions();
    };
    window.addEventListener('app:balance-updated', handleBalanceUpdated);

    // Also poll every 30 seconds as a fallback (e.g., another tab/device made a transaction)
    const pollInterval = setInterval(() => {
      loadDrawerBalances();
    }, 30000);

    return () => {
      window.removeEventListener('app:balance-updated', handleBalanceUpdated);
      clearInterval(pollInterval);
    };
  }, []);

  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('File size exceeds 5MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const MAX_DIM = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png', 0.95);
        setBrandingForm(prev => ({ ...prev, logoData: dataUrl }));
        toast('Logo loaded & optimized for system-wide display!', 'success');
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const res = await api.put('/settings/company', brandingForm);
      if (res.success) {
        toast('Company branding & logo updated system-wide!');
        // Optimistically update global companyBranding so logo shows immediately in sidebar/invoices
        // without waiting for a DB round-trip re-fetch
        updateBranding(prev => ({
          ...prev,
          company_name: brandingForm.companyName,
          tagline: brandingForm.tagline,
          invoice_subtitle: brandingForm.invoiceSubtitle,
          phone: brandingForm.phone,
          email: brandingForm.email,
          tax_number: brandingForm.taxNumber,
          address: brandingForm.address,
          invoice_footer: brandingForm.invoiceFooter,
          logo_data: brandingForm.logoData
        }));
        // Also do a background re-fetch to sync with server response
        setTimeout(() => refreshBranding(), 1500);
      }
    } catch (err) {
      toast(err.message || 'Error saving branding', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSaveBalances = async (e) => {
    e.preventDefault();
    setSavingBalances(true);
    try {
      const res = await api.put('/settings/opening-balances', {
        openingCash: parseFloat(openingCash || 0),
        openingOnline: parseFloat(openingOnline || 0),
        openingCashBalance: parseFloat(openingCash || 0),
        openingOnlineBalance: parseFloat(openingOnline || 0)
      });
      if (res.success) {
        toast('Baseline starting capital updated in Database!');
        setOpeningCash('');
        setOpeningOnline('');
        loadDrawerBalances(true);
        notifyBalanceUpdated();
      }
    } catch (err) {
      toast(err.message || 'Error saving balances', 'error');
    } finally {
      setSavingBalances(false);
    }
  };

  const handleDrawerActionSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(drawerAmount || 0);
    if (isNaN(amt) || amt <= 0) {
      toast('Please enter a valid amount greater than 0', 'error');
      return;
    }

    setSavingDrawerAction(true);
    try {
      const res = await api.post('/accounts/drawer-transaction', {
        type: drawerAction,
        method: drawerMethod,
        amount: amt,
        notes: drawerNotes.trim()
      });

      if (res.success) {
        toast(`${drawerMethod === 'Cash' ? 'Cash in Drawer' : 'Bank / Online Account'} ${drawerAction === 'Deposit' ? 'deposited' : 'withdrawn'} successfully!`);
        setDrawerAmount('');
        setDrawerNotes('');
        loadDrawerBalances(true);
        loadDrawerTransactions();
        notifyBalanceUpdated();
      }
    } catch (err) {
      toast(err.message || 'Error processing drawer transaction', 'error');
    } finally {
      setSavingDrawerAction(false);
    }
  };

  const handleSaveWa = async (e) => {
    e.preventDefault();
    setSavingWa(true);
    try {
      const res = await api.put('/whatsapp/settings', waSettings);
      if (res.success) {
        toast('WhatsApp CRM settings updated!');
      }
    } catch (err) {
      toast(err.message || 'Error saving WhatsApp settings', 'error');
    } finally {
      setSavingWa(false);
    }
  };

  return (
    <>
      <div className="grid cols-2">
        {/* Company Branding */}
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} className="text-blue-600" />
                <span>Company Branding & Invoice Customization</span>
              </h3>
              <p>Logo, shop details and invoice header/footer settings</p>
            </div>
          </div>
          <div className="panel-body">
            <form onSubmit={handleSaveBranding}>
              <div className="form-grid">
                <div className="field span-6">
                  <label>Company / Shop Name *</label>
                  <input
                    className="input"
                    value={brandingForm.companyName}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, companyName: e.target.value }))}
                    required
                  />
                </div>

                <div className="field span-6">
                  <label>Tagline / Business Sub-title</label>
                  <input
                    className="input"
                    value={brandingForm.tagline}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, tagline: e.target.value }))}
                    placeholder="e.g. POS, Inventory Management, Sales & Purchases"
                  />
                </div>

                <div className="field span-6">
                  <label>Invoice Subtitle</label>
                  <input
                    className="input"
                    value={brandingForm.invoiceSubtitle}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, invoiceSubtitle: e.target.value }))}
                    placeholder="e.g. Retail • Inventory • Repair"
                  />
                </div>

                <div className="field span-6">
                  <label>Phone Number</label>
                  <input
                    className="input"
                    value={brandingForm.phone}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="field span-6">
                  <label>Email Address</label>
                  <input
                    className="input"
                    type="email"
                    value={brandingForm.email}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="field span-6">
                  <label>Tax / NTN Number</label>
                  <input
                    className="input"
                    value={brandingForm.taxNumber}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, taxNumber: e.target.value }))}
                  />
                </div>

                <div className="field span-12">
                  <label>Shop Physical Address</label>
                  <input
                    className="input"
                    value={brandingForm.address}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="field span-12">
                  <label>Invoice Footer Note / Terms</label>
                  <input
                    className="input"
                    value={brandingForm.invoiceFooter}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, invoiceFooter: e.target.value }))}
                  />
                </div>

                {/* Brand Logo Studio */}
                <div className="field span-12" style={{ marginTop: 6 }}>
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Image size={15} className="text-blue-600" />
                      <span>Brand & Store Logo</span>
                    </span>
                    <span className="text-2xs text-slate-400 font-normal">Appears in Sidebar, Topbar, Invoices & Receipts</span>
                  </label>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                    onDragLeave={() => setIsDraggingLogo(false)}
                    onDrop={handleLogoDrop}
                    style={{
                      border: `2px dashed ${isDraggingLogo ? '#2563eb' : brandingForm.logoData ? '#cbd5e1' : '#94a3b8'}`,
                      background: isDraggingLogo ? '#eff6ff' : '#f8fafc',
                      borderRadius: 12,
                      padding: '16px 20px',
                      transition: 'all 0.2s ease',
                      marginTop: 6
                    }}
                  >
                    {!brandingForm.logoData ? (
                      /* Empty State: Upload Prompt */
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, padding: '10px 0' }}>
                        <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                          <UploadCloud size={24} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                            Click to upload or drag & drop logo image
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                            PNG, JPG, SVG, or WebP (Transparent PNG recommended • Max 5MB)
                          </p>
                        </div>
                        <label
                          htmlFor="brandLogoInput"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            background: '#2563eb',
                            color: '#ffffff',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginTop: 4,
                            boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                          }}
                        >
                          <UploadCloud size={14} /> Browse Image
                        </label>
                        <input
                          id="brandLogoInput"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          style={{ display: 'none' }}
                        />
                      </div>
                    ) : (
                      /* Active Logo Present */
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {/* Checkered background container for alpha transparent logo */}
                            <div style={{
                              width: 64,
                              height: 64,
                              borderRadius: 10,
                              border: '1.5px solid #cbd5e1',
                              background: 'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 12px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 4,
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
                            }}>
                              <img
                                src={brandingForm.logoData}
                                alt="Brand Logo"
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                              />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Active Brand Logo</span>
                                <span style={{ fontSize: 10, fontWeight: 700, background: '#dcfce7', color: '#15803d', padding: '1px 7px', borderRadius: 6 }}>Ready</span>
                              </div>
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                                Optimized for HD display on Sidebar and Customer Invoices
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label
                              htmlFor="brandLogoInput"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                background: '#ffffff',
                                border: '1.5px solid #cbd5e1',
                                color: '#334155',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <UploadCloud size={13} /> Replace Image
                            </label>
                            <input
                              id="brandLogoInput"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              style={{ display: 'none' }}
                            />

                            <button
                              type="button"
                              onClick={() => setBrandingForm(prev => ({ ...prev, logoData: null }))}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                background: '#fef2f2',
                                border: '1.5px solid #fecaca',
                                color: '#dc2626',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          </div>
                        </div>

                        {/* Real-time Mockup Previews */}
                        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {/* 1. Sidebar Nav Preview Mockup */}
                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Eye size={12} className="text-blue-600" /> Sidebar Preview
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                              <div style={{ width: 34, height: 34, borderRadius: 6, background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }}>
                                <img src={brandingForm.logoData} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {brandingForm.companyName || 'Your Store'}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  POS, Inventory & Repair...
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Printed Invoice Preview Mockup */}
                          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <FileText size={12} className="text-emerald-600" /> Printed Invoice Header
                            </div>
                            <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                              <img src={brandingForm.logoData} alt="Logo" style={{ maxHeight: 28, maxWidth: 60, objectFit: 'contain' }} />
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>
                                  {(brandingForm.companyName || 'YOUR STORE').toUpperCase()}
                                </div>
                                <div style={{ fontSize: 9, color: '#64748b' }}>
                                  {brandingForm.address || 'Store Address, Karachi'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="span-12" style={{ textAlign: 'right', marginTop: 12 }}>
                  <button type="submit" className="btn primary" disabled={savingBranding}>
                    {savingBranding ? 'Saving...' : 'Save Branding & Logo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Cash Drawer & Financial Treasury Management */}
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={18} className="text-emerald-600" />
                  <span>Cash Drawer & Financial Treasury</span>
                </h3>
                <p>Live cash drawer management, top-ups, withdrawals & baseline capital</p>
              </div>
              <button
                type="button"
                className="btn small soft"
                style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => loadDrawerBalances(true)}
                disabled={refreshingBalances}
              >
                <RefreshCw size={12} className={refreshingBalances ? 'animate-spin' : ''} />
                {refreshingBalances ? 'Refreshing...' : 'Refresh Balances'}
              </button>
            </div>
            <div className="panel-body">
              {/* 1. Live Available Balances Display */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #86efac',
                  borderRadius: 6,
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <div style={{ background: '#16a34a', color: '#fff', borderRadius: 5, padding: 5, display: 'flex' }}>
                    <Wallet size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Live Cash in Drawer</div>
                    {refreshingBalances ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1, color: '#166534', fontSize: 11, fontWeight: 600 }}>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 800, color: liveCash < 0 ? '#dc2626' : '#15803d', marginTop: 1 }} className="font-mono">
                        PKR {liveCash.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '1px solid #93c5fd',
                  borderRadius: 6,
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <div style={{ background: '#2563eb', color: '#fff', borderRadius: 5, padding: 5, display: 'flex' }}>
                    <Landmark size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Live Bank / Online</div>
                    {refreshingBalances ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1, color: '#1e40af', fontSize: 11, fontWeight: 600 }}>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 800, color: liveOnline < 0 ? '#dc2626' : '#1d4ed8', marginTop: 1 }} className="font-mono">
                        PKR {liveOnline.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Direct Deposit / Cash-In & Withdrawal Form */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {drawerAction === 'Deposit' ? (
                      <>
                        <ArrowDownLeft size={15} className="text-emerald-600" />
                        <span>Deposit / Add Funds</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={15} className="text-rose-600" />
                        <span>Withdraw Funds</span>
                      </>
                    )}
                  </span>
                  <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: 6, padding: 2, gap: 2 }}>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        background: drawerAction === 'Deposit' ? '#16a34a' : 'transparent',
                        color: drawerAction === 'Deposit' ? '#fff' : '#475569',
                        padding: '3px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onClick={() => setDrawerAction('Deposit')}
                    >
                      <PlusCircle size={12} /> Deposit
                    </button>
                    <button
                      type="button"
                      style={{
                        border: 'none',
                        background: drawerAction === 'Withdrawal' ? '#dc2626' : 'transparent',
                        color: drawerAction === 'Withdrawal' ? '#fff' : '#475569',
                        padding: '3px 10px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      onClick={() => setDrawerAction('Withdrawal')}
                    >
                      <MinusCircle size={12} /> Withdraw
                    </button>
                  </div>
                </div>

                <form onSubmit={handleDrawerActionSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                        Target Account <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className="input"
                        value={drawerMethod}
                        onChange={(e) => setDrawerMethod(e.target.value)}
                        style={{ height: 32, fontSize: 12, padding: '2px 8px' }}
                      >
                        <option value="Cash">Cash in Drawer</option>
                        <option value="Online">Bank / Online Account</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                        Amount (PKR) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={drawerAmount}
                        onChange={(e) => setDrawerAmount(e.target.value)}
                        style={{ height: 32, fontSize: 12, fontWeight: 700, padding: '2px 8px' }}
                        required
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 3 }}>
                        Reason / Note <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>(Optional)</span>
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder={drawerAction === 'Deposit' ? 'e.g. Owner Cash Top-up, Daily Float' : 'e.g. Owner Drawing, Bank Deposit'}
                        value={drawerNotes}
                        onChange={(e) => setDrawerNotes(e.target.value)}
                        style={{ height: 32, fontSize: 12, padding: '2px 8px' }}
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2', textAlign: 'right', marginTop: 2 }}>
                      <button
                        type="submit"
                        className={`btn small ${drawerAction === 'Deposit' ? 'success' : 'danger'}`}
                        disabled={savingDrawerAction}
                        style={{ padding: '4px 12px', fontSize: 11, fontWeight: 700 }}
                      >
                        {savingDrawerAction ? 'Processing...' : drawerAction === 'Deposit' ? `+ Add PKR ${drawerAmount ? parseFloat(drawerAmount).toLocaleString('en-PK') : '0'} to ${drawerMethod}` : `- Withdraw PKR ${drawerAmount ? parseFloat(drawerAmount).toLocaleString('en-PK') : '0'} from ${drawerMethod}`}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* 3. Collapsible Baseline Starting Capital */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 14,
                background: '#fafafa'
              }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setShowStartingCapital(!showStartingCapital)}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <SlidersHorizontal size={14} className="text-slate-500" />
                    <span>Day 1 Starting Baseline Capital Setup</span>
                  </span>
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span>{showStartingCapital ? 'Hide' : 'Edit Baseline'}</span>
                    {showStartingCapital ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </span>
                </div>

                {showStartingCapital && (
                  <form onSubmit={handleSaveBalances} style={{ marginTop: 12, borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Info size={13} className="text-blue-500 flex-shrink-0" />
                      <span>Baseline capital represents Day 1 store opening funds. (For daily additions or top-ups, use the "+ Deposit / Add" form above).</span>
                    </div>
                    <div className="form-grid">
                      <div className="field span-6">
                        <label style={{ fontSize: 11 }}>Baseline Starting Cash PKR</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={openingCash}
                          onChange={(e) => setOpeningCash(e.target.value)}
                        />
                      </div>
                      <div className="field span-6">
                        <label style={{ fontSize: 11 }}>Baseline Starting Online PKR</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={openingOnline}
                          onChange={(e) => setOpeningOnline(e.target.value)}
                        />
                      </div>
                      <div className="span-12" style={{ textAlign: 'right' }}>
                        <button type="submit" className="btn soft" disabled={savingBalances} style={{ fontSize: 11 }}>
                          {savingBalances ? 'Saving...' : 'Save Baseline Capital'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* 4. Recent Drawer Transactions Audit Trail */}
              {drawerTransactions && drawerTransactions.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <History size={12} />
                    <span>Recent Drawer Top-ups & Withdrawals</span>
                  </div>
                  <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 11 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {drawerTransactions.slice(0, 8).map((tx, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '6px 8px', color: '#64748b' }}>
                              {new Date(tx.date || tx.createdAt).toLocaleDateString('en-PK', { month: 'short', day: '2-digit' })}
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: tx.direction === 'Received' ? '#dcfce7' : '#fee2e2',
                                color: tx.direction === 'Received' ? '#166534' : '#991b1b'
                              }}>
                                {tx.direction === 'Received' ? '+ Cash In' : '- Cash Out'} ({tx.paymentMethod})
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: '#334155' }}>
                              {tx.notes || 'Drawer Adjustment'}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: tx.direction === 'Received' ? '#16a34a' : '#dc2626' }} className="font-mono">
                              PKR {tx.amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Repair Categories Master Configuration */}
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wrench size={18} className="text-blue-600" />
                  <span>Repair Job Categories</span>
                </h3>
                <p>Manage device intake categories stored in PostgreSQL database</p>
              </div>
              <button
                type="button"
                className="btn small soft"
                onClick={() => setIsRepairCatModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Layers size={13} /> Full Category Manager
              </button>
            </div>
            <div className="panel-body">
              {/* Quick Add Repair Category */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newRepairCatName.trim()) return;
                  setSavingRepairCat(true);
                  try {
                    const res = await api.post('/categories/repair', {
                      name: newRepairCatName.trim(),
                      description: newRepairCatDesc.trim() || null,
                      isActive: true
                    });
                    if (res.success) {
                      toast(`Repair category "${res.data.name}" added successfully!`);
                      setNewRepairCatName('');
                      setNewRepairCatDesc('');
                      loadRepairCategories();
                    }
                  } catch (err) {
                    toast(err.message || 'Error adding repair category', 'error');
                  } finally {
                    setSavingRepairCat(false);
                  }
                }}
                style={{ marginBottom: 14 }}
              >
                <div className="form-grid">
                  <div className="field span-5">
                    <label>Category Name *</label>
                    <input
                      className="input"
                      value={newRepairCatName}
                      onChange={(e) => setNewRepairCatName(e.target.value)}
                      placeholder="e.g. Drone, Gaming Console"
                      required
                    />
                  </div>
                  <div className="field span-5">
                    <label>Description</label>
                    <input
                      className="input"
                      value={newRepairCatDesc}
                      onChange={(e) => setNewRepairCatDesc(e.target.value)}
                      placeholder="e.g. Handheld & home gaming systems"
                    />
                  </div>
                  <div className="field span-2" style={{ alignSelf: 'end' }}>
                    <button type="submit" className="btn primary" disabled={savingRepairCat || !newRepairCatName.trim()} style={{ width: '100%' }}>
                      {savingRepairCat ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Badges list of active repair categories */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {repairCategories.map(cat => (
                  <span
                    key={cat.id}
                    className="badge"
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      background: cat.isActive !== false ? 'var(--blue-50, #eff6ff)' : '#f3f4f6',
                      color: cat.isActive !== false ? 'var(--primary, #2563eb)' : '#6b7280',
                      border: '1px solid var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <strong>{cat.name}</strong>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>({cat.repairCount || 0} jobs)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Repair Spare Parts Inventory Settings Panel */}
        <div className="span-12" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={17} className="text-blue-600" />
                  <span>Workshop Repair Spare Parts Inventory</span>
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  Manage spare parts catalog (Screens, Batteries, Keyboards, ICs, Ports, RAM & SSD) separate from retail products.
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                onClick={() => setIsPartsModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Package size={14} /> Open Spare Parts Manager
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Bot Configuration */}
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={18} className="text-emerald-600" />
              <span>WhatsApp Business & Automation Settings</span>
            </h3>
            <p>Automated chat bot menus and repair tracking triggers</p>
          </div>
        </div>
        <div className="panel-body">
          <form onSubmit={handleSaveWa}>
            <div className="form-grid">
              <div className="field span-4">
                <label>Business Account Name</label>
                <input
                  className="input"
                  value={waSettings.businessName}
                  onChange={(e) => setWaSettings(prev => ({ ...prev, businessName: e.target.value }))}
                />
              </div>

              <div className="field span-4">
                <label>WhatsApp Number</label>
                <input
                  className="input"
                  value={waSettings.number}
                  onChange={(e) => setWaSettings(prev => ({ ...prev, number: e.target.value }))}
                />
              </div>

              <div className="field span-4">
                <label>Automated Bot Responses</label>
                <select
                  className="select"
                  value={waSettings.botEnabled ? 'Yes' : 'No'}
                  onChange={(e) => setWaSettings(prev => ({ ...prev, botEnabled: e.target.value === 'Yes' }))}
                >
                  <option value="Yes">Enabled (Automated Bot Active)</option>
                  <option value="No">Disabled (Manual Chat Only)</option>
                </select>
              </div>

              <div className="field span-12">
                <label>Default Welcome Menu Text</label>
                <textarea
                  className="textarea"
                  value={waSettings.welcomeMessage}
                  onChange={(e) => setWaSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                />
              </div>

              <div className="field span-12">
                <label>Shop Location Description</label>
                <input
                  className="input"
                  value={waSettings.shopLocation}
                  onChange={(e) => setWaSettings(prev => ({ ...prev, shopLocation: e.target.value }))}
                />
              </div>

              <div className="span-12" style={{ textAlign: 'right' }}>
                <button type="submit" className="btn primary" disabled={savingWa}>
                  {savingWa ? 'Saving...' : 'Save WhatsApp Configuration'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Admin Danger Zone: Factory Data Reset (Admin Only) */}
      {isAdmin && (
        <div style={{
          marginTop: 24,
          marginBottom: 60,
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
          border: '1px solid #fecaca',
          borderRadius: 14,
          padding: '24px 28px',
          boxShadow: '0 4px 16px rgba(220, 38, 38, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 680 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Danger Zone: Factory Database Reset</span>
              </h4>
              <p style={{ margin: 0, fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.5 }}>
                Permanently erase all transactional records, customer/vendor ledgers, repair jobs, and invoices to start fresh. Preserves admin logins and company settings.
              </p>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="btn danger"
              onClick={() => setIsResetModalOpen(true)}
              style={{
                padding: '10px 22px',
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} /> Reset Database Data
            </button>
          </div>
        </div>
      )}

      {/* Repair Categories Modal */}
      <ManageRepairCategoriesModal
        isOpen={isRepairCatModalOpen}
        onClose={() => {
          setIsRepairCatModalOpen(false);
          loadRepairCategories();
        }}
        onCategoriesUpdated={() => loadRepairCategories()}
      />

      {/* Repair Spare Parts Modal */}
      <ManageRepairPartsModal
        isOpen={isPartsModalOpen}
        onClose={() => setIsPartsModalOpen(false)}
      />

      {/* Reset Database Modal (Admin Only) */}
      {isAdmin && (
        <ResetDatabaseModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
        />
      )}
    </>
  );
}
