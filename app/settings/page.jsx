'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import ManageRepairCategoriesModal from '../../components/common/ManageRepairCategoriesModal';
import ManageRepairPartsModal from '../../components/modules/repairs/ManageRepairPartsModal';
import ResetDatabaseModal from '../../components/modules/settings/ResetDatabaseModal';

export default function SettingsPage() {
  const { companyBranding, refreshBranding, role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

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
  const [openingCash, setOpeningCash] = useState(0);
  const [openingOnline, setOpeningOnline] = useState(0);
  const [liveCash, setLiveCash] = useState(0);
  const [liveOnline, setLiveOnline] = useState(0);

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

  const loadDrawerBalances = () => {
    api.get('/accounts/drawer-balance')
      .then(res => {
        if (res.success && res.data) {
          setLiveCash(res.data.cash || 0);
          setLiveOnline(res.data.online || 0);
        }
      })
      .catch(console.error);
  };

  const loadAll = () => {
    loadRepairCategories();
    loadDrawerBalances();
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
    const handleBalanceUpdated = () => loadDrawerBalances();
    window.addEventListener('app:balance-updated', handleBalanceUpdated);

    // Also poll every 30 seconds as a fallback (e.g., another tab/device made a transaction)
    const pollInterval = setInterval(() => loadDrawerBalances(), 30000);

    return () => {
      window.removeEventListener('app:balance-updated', handleBalanceUpdated);
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Logo image must be under 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setBrandingForm(prev => ({ ...prev, logoData: event.target?.result || null }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const res = await api.put('/settings/company', brandingForm);
      if (res.success) {
        toast('Company branding & invoice customization updated!');
        refreshBranding();
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
        toast('Opening cash & online balances updated in Database!');
        loadDrawerBalances();
      }
    } catch (err) {
      toast(err.message || 'Error saving balances', 'error');
    } finally {
      setSavingBalances(false);
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
              <h3>Company Branding & Invoice Customization</h3>
              <p>Logo, shop details and invoice header/footer settings</p>
            </div>
          </div>
          <div className="panel-body">
            <form onSubmit={handleSaveBranding}>
              <div className="form-grid">
                <div className="field span-12">
                  <label>Company Logo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div className="invoice-logo" style={{ width: 56, height: 56 }}>
                      {brandingForm.logoData ? (
                        <img src={brandingForm.logoData} alt="Logo" />
                      ) : (
                        <span style={{ fontWeight: 900, color: 'var(--navy)' }}>LOGO</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id="logoFileInput"
                        style={{ display: 'none' }}
                        onChange={handleLogoUpload}
                      />
                      <label htmlFor="logoFileInput" className="btn small">
                        Upload Logo Image
                      </label>
                      {brandingForm.logoData && (
                        <button
                          type="button"
                          className="btn small danger"
                          style={{ marginLeft: 8 }}
                          onClick={() => setBrandingForm(prev => ({ ...prev, logoData: null }))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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
                  <label>Tagline / Subtitle</label>
                  <input
                    className="input"
                    value={brandingForm.tagline}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, tagline: e.target.value }))}
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
                    value={brandingForm.email}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="field span-6">
                  <label>NTN / Tax Number</label>
                  <input
                    className="input"
                    value={brandingForm.taxNumber}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, taxNumber: e.target.value }))}
                  />
                </div>

                <div className="field span-6">
                  <label>Invoice Subtitle Line</label>
                  <input
                    className="input"
                    value={brandingForm.invoiceSubtitle}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, invoiceSubtitle: e.target.value }))}
                  />
                </div>

                <div className="field span-12">
                  <label>Physical Address</label>
                  <input
                    className="input"
                    value={brandingForm.address}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>

                <div className="field span-12">
                  <label>Invoice Footer Note</label>
                  <input
                    className="input"
                    value={brandingForm.invoiceFooter}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, invoiceFooter: e.target.value }))}
                  />
                </div>

                <div className="span-12" style={{ textAlign: 'right', marginTop: 6 }}>
                  <button type="submit" className="btn primary" disabled={savingBranding}>
                    {savingBranding ? 'Saving...' : 'Save Branding Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Opening Balances */}
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Opening Balances */}
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel-head">
              <h3>Opening Financial Balances</h3>
              <p>Configure drawer cash and online balance starting limits</p>
            </div>
            <div className="panel-body">
              <form onSubmit={handleSaveBalances}>
                <div className="form-grid">
                  <div className="field span-6">
                    <label>Opening Cash in Drawer PKR</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                    />
                  </div>

                  <div className="field span-6">
                    <label>Opening Bank / Online Balance PKR</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={openingOnline}
                      onChange={(e) => setOpeningOnline(e.target.value)}
                    />
                  </div>

                  <div className="span-12" style={{ textAlign: 'right' }}>
                    <button type="submit" className="btn soft" disabled={savingBalances}>
                      {savingBalances ? 'Updating...' : 'Update Opening Balances'}
                    </button>
                  </div>

                  {/* Live Dynamic Available Balances Summary Callout */}
                  <div className="span-12" style={{
                    marginTop: 10,
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 10
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>💳 Available Balances</span>
                      <button
                        type="button"
                        className="btn small soft"
                        style={{ fontSize: 10, padding: '2px 8px' }}
                        onClick={loadDrawerBalances}
                      >
                        Refresh Balances
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Live Cash in Drawer</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: liveCash < 0 ? '#dc2626' : '#16a34a', marginTop: 3 }} className="font-mono">
                          PKR {liveCash.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Live Bank / Online Balance</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: liveOnline < 0 ? '#dc2626' : '#2563eb', marginTop: 3 }} className="font-mono">
                          PKR {liveOnline.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Repair Categories Master Configuration */}
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3>Repair Job Categories</h3>
                <p>Manage device intake categories stored in PostgreSQL database</p>
              </div>
              <button
                type="button"
                className="btn small soft"
                onClick={() => setIsRepairCatModalOpen(true)}
              >
                <Icon name="settings" /> Full Category Manager
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
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Workshop Repair Spare Parts Inventory</h4>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  Manage spare parts catalog (Screens, Batteries, Keyboards, ICs, Ports, RAM & SSD) separate from retail products.
                </p>
              </div>
              <button
                type="button"
                className="btn primary"
                onClick={() => setIsPartsModalOpen(true)}
              >
                <Icon name="package" /> Open Spare Parts Manager
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Bot Configuration */}
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <div>
            <h3>WhatsApp Business & Automation Settings</h3>
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
          marginTop: 28,
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
              <Trash2 size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#991b1b' }}>
                Danger Zone: Factory Database Reset
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
