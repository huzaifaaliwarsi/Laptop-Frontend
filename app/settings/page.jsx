'use client';

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';

export default function SettingsPage() {
  const { companyBranding, refreshBranding } = useAuth();
  const { toast } = useToast();

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

  const loadAll = () => {
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
        setOpeningCash(bRes.data.opening_cash_balance || 0);
        setOpeningOnline(bRes.data.opening_online_balance || 0);
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
        openingCashBalance: parseFloat(openingCash || 0),
        openingOnlineBalance: parseFloat(openingOnline || 0)
      });
      if (res.success) {
        toast('Opening cash & online balances updated!');
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
                </div>
              </form>
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
    </>
  );
}
