'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, RefreshCw, Send, CheckCircle2, AlertCircle, LogOut, Smartphone, Settings, Info } from 'lucide-react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/Toast';
import api from '../../../services/api';
import { getSocket } from '../../../services/socket';

export default function WhatsappSettingsModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('connection'); // 'connection' | 'bot'

  // Connection State
  const [waStatus, setWaStatus] = useState({ connected: false, phone: null, qr: null, connecting: false });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from your Laptop Repair Management POS system.');
  const [sendingTest, setSendingTest] = useState(false);

  // Settings State
  const [businessName, setBusinessName] = useState('');
  const [number, setNumber] = useState('');
  const [botEnabled, setBotEnabled] = useState(true);
  const [autoStatusNotifications, setAutoStatusNotifications] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get('/whatsapp/status');
      if (res.success && res.data) {
        setWaStatus(res.data);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleConnectQR = async () => {
    setLoadingStatus(true);
    setWaStatus(prev => ({ ...prev, connecting: true }));
    try {
      const res = await api.post('/whatsapp/connect');
      if (res.success && res.data) {
        setWaStatus(res.data);
        if (res.data.qr) {
          toast('QR Code generated! Scan it with WhatsApp on your phone.');
        } else {
          toast('Connecting to WhatsApp multi-device server, awaiting QR...');
        }
      }
    } catch (err) {
      toast(err.message || 'Error generating QR code', 'error');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect and log out from this WhatsApp number?')) return;
    setLoadingStatus(true);
    try {
      const res = await api.post('/whatsapp/disconnect');
      if (res.success) {
        toast('WhatsApp disconnected & session logged out.');
        fetchStatus();
      }
    } catch (err) {
      toast(err.message || 'Error disconnecting', 'error');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) {
      toast('Please enter both phone number and message', 'error');
      return;
    }

    setSendingTest(true);
    try {
      const res = await api.post('/whatsapp/send-test', {
        phone: testPhone.trim(),
        message: testMessage.trim()
      });
      if (res.success) {
        toast(`✅ WhatsApp message sent to ${testPhone}!`);
      }
    } catch (err) {
      toast(err.message || 'Failed to send WhatsApp message', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();

      // Real-time socket updates for QR code & device link events
      const socket = getSocket();
      let handleStatus = null;
      let handleQr = null;

      if (socket) {
        handleStatus = (status) => {
          if (status) {
            setWaStatus(prev => ({ ...prev, ...status }));
          }
        };
        handleQr = (data) => {
          if (data?.qr) {
            setWaStatus(prev => ({ ...prev, qr: data.qr, connecting: false }));
          }
        };
        socket.on('whatsapp:status', handleStatus);
        socket.on('whatsapp:qr', handleQr);
      }

      // Safety polling interval
      const interval = setInterval(() => {
        api.get('/whatsapp/status').then(res => {
          if (res.success && res.data) {
            setWaStatus(prev => ({ ...prev, ...res.data }));
          }
        }).catch(() => {});
      }, 2500);

      api.get('/whatsapp/settings')
        .then(res => {
          if (res.success && res.data) {
            setBusinessName(res.data.business_name || '');
            setNumber(res.data.number || '');
            setBotEnabled(res.data.bot_enabled !== false);
            setAutoStatusNotifications(res.data.auto_status_notifications !== false);
            setWelcomeMessage(res.data.welcome_message || '');
            setShopLocation(res.data.shop_location || '');
          }
        })
        .catch(console.error);

      return () => {
        clearInterval(interval);
        if (socket && handleStatus) socket.off('whatsapp:status', handleStatus);
        if (socket && handleQr) socket.off('whatsapp:qr', handleQr);
      };
    }
  }, [isOpen]);

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put('/whatsapp/settings', {
        businessName: businessName.trim(),
        number: number.trim(),
        botEnabled,
        autoStatusNotifications,
        welcomeMessage: welcomeMessage.trim(),
        shopLocation: shopLocation.trim()
      });

      if (res.success) {
        toast('WhatsApp CRM settings updated successfully!');
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast(err.message || 'Error updating settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="WhatsApp Integration & Multi-Device Settings"
      subtitle="Connect real WhatsApp account using QR code for live notifications and bot automation"
      wide={true}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          {activeTab === 'bot' && (
            <button
              type="submit"
              form="waSettingsForm"
              className="btn primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </>
      }
    >
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'connection' ? 'primary' : 'soft'}`}
          onClick={() => setActiveTab('connection')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <QrCode size={16} /> WhatsApp Device Connection (QR)
          {waStatus.connected && (
            <span style={{ fontSize: 10, background: '#059669', color: '#fff', padding: '2px 6px', borderRadius: 10 }}>Connected</span>
          )}
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'bot' ? 'primary' : 'soft'}`}
          onClick={() => setActiveTab('bot')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <Settings size={16} /> CRM Bot & Auto-Reply Rules
        </button>
      </div>

      {activeTab === 'connection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Connection Status Card */}
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: waStatus.connected ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
            border: `1px solid ${waStatus.connected ? '#059669' : '#d97706'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {waStatus.connected ? (
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <CheckCircle2 size={24} />
                </div>
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Smartphone size={24} />
                </div>
              )}
              <div>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: waStatus.connected ? '#065f46' : '#92400e' }}>
                  {waStatus.connected ? 'WhatsApp Connected & Active' : 'WhatsApp Device Not Connected'}
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text)' }}>
                  {waStatus.connected
                    ? `Linked phone: +${waStatus.phone || 'Ready'} — Auto-repair notifications & real-time bot replies are active!`
                    : 'Scan the QR code below using your mobile WhatsApp to start sending live notifications to customers.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {waStatus.connected ? (
                <button
                  type="button"
                  className="btn danger small"
                  onClick={handleDisconnect}
                  disabled={loadingStatus}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <LogOut size={14} /> Disconnect / Logout
                </button>
              ) : (
                <button
                  type="button"
                  className="btn primary small"
                  onClick={handleConnectQR}
                  disabled={loadingStatus}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={14} className={loadingStatus ? 'spin' : ''} /> {waStatus.qr ? 'Refresh QR Code' : 'Generate QR Code'}
                </button>
              )}
            </div>
          </div>

          {/* QR Code Display (If Not Connected) */}
          {!waStatus.connected && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 320px) 1fr',
              gap: 20,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 20,
              alignItems: 'center'
            }}>
              <div style={{
                textAlign: 'center',
                background: '#fff',
                padding: 16,
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
              }}>
                {waStatus.qr ? (
                  <>
                    <div style={{ background: '#fff', padding: 8, borderRadius: 8, display: 'inline-block' }}>
                      <img
                        src={waStatus.qr}
                        alt="Scan WhatsApp QR Code"
                        style={{
                          width: '100%',
                          maxWidth: 240,
                          height: 'auto',
                          display: 'block',
                          margin: '0 auto',
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <span className="spin" style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} /> Live QR Ready • Scan Now
                    </div>
                    <button
                      type="button"
                      className="btn primary small"
                      onClick={handleConnectQR}
                      disabled={loadingStatus}
                      style={{ marginTop: 10, fontSize: 11, width: '100%' }}
                    >
                      <RefreshCw size={12} className={loadingStatus ? 'spin' : ''} /> Refresh New QR
                    </button>
                  </>
                ) : loadingStatus || waStatus.connecting ? (
                  <div style={{ padding: '44px 12px', color: 'var(--text)' }}>
                    <div className="loader loader-md mx-auto mb-3"></div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
                      Generating live WhatsApp QR Code...
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                      Connecting to WhatsApp multi-device server
                    </p>
                  </div>
                ) : (
                  <div style={{ padding: '40px 10px', color: 'var(--muted)' }}>
                    <QrCode size={48} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: 12 }}>Click "Generate QR Code" to link device</p>
                    <button
                      type="button"
                      className="btn primary small"
                      onClick={handleConnectQR}
                      disabled={loadingStatus}
                      style={{ marginTop: 12 }}
                    >
                      Generate QR Code
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Smartphone size={16} className="text-blue-600" />
                  <span>How to Link WhatsApp on Mobile Phone:</span>
                </h4>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text)', lineHeight: 1.8 }}>
                  <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                  <li>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings (gear)</strong> on iPhone.</li>
                  <li>Select <strong>Linked Devices</strong> (منسلک آلات).</li>
                  <li>Tap <strong>Link a Device</strong> (ایک آلہ منسلک کریں).</li>
                  <li>Point your phone's camera at the QR code on this screen.</li>
                  <li>Device will connect instantly and this screen will change to <strong>Connected</strong>!</li>
                </ol>

                <div style={{ marginTop: 14, padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 11.5, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={16} className="text-blue-600 flex-shrink-0" />
                  <span><strong>Multi-Device:</strong> Once linked, automated repair alerts & bot replies will be sent directly through this system even if your phone goes offline.</span>
                </div>
              </div>
            </div>
          )}

          {/* Test WhatsApp Message Sender */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 16
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={16} color="var(--primary)" /> 🧪 Test WhatsApp Message Sender
            </h4>

            <form onSubmit={handleSendTestMessage}>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Recipient Mobile Number *</label>
                  <input
                    className="input"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="e.g. 03001234567"
                    required
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Test Message Text</label>
                  <input
                    className="input"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter message to test..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn primary"
                  disabled={sendingTest || !waStatus.connected || !testPhone.trim()}
                  style={{ height: 38, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  {sendingTest ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Send WhatsApp
                    </>
                  )}
                </button>
              </div>
              {!waStatus.connected && (
                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>Connect WhatsApp above first before sending test messages.</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {activeTab === 'bot' && (
        <form id="waSettingsForm" onSubmit={handleSubmitSettings}>
          <div className="form-grid">
            <div className="field span-6">
              <label>Business Display Name</label>
              <input
                className="input"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Laptop Repairing Center"
              />
            </div>

            <div className="field span-6">
              <label>Default Support WhatsApp Number</label>
              <input
                className="input"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="0300 1234567"
              />
            </div>

            <div className="field span-6">
              <label>Automated Bot Active</label>
              <select
                className="select"
                value={botEnabled ? 'Yes' : 'No'}
                onChange={(e) => setBotEnabled(e.target.value === 'Yes')}
              >
                <option value="Yes">Enabled (Auto-reply to tracking IDs & greetings)</option>
                <option value="No">Disabled (Manual Chat Only)</option>
              </select>
            </div>

            <div className="field span-6">
              <label>Automatic Repair Status Notifications</label>
              <select
                className="select"
                value={autoStatusNotifications ? 'Yes' : 'No'}
                onChange={(e) => setAutoStatusNotifications(e.target.value === 'Yes')}
              >
                <option value="Yes">Send Automated Updates on Status Change</option>
                <option value="No">Do Not Send Auto Updates</option>
              </select>
            </div>

            <div className="field span-12">
              <label>Welcome Menu Message</label>
              <textarea
                className="textarea"
                style={{ minHeight: 90 }}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Default bot welcome message with menu options 1 to 6..."
              />
            </div>

            <div className="field span-12">
              <label>Shop Location Text (Sent when customer requests location)</label>
              <input
                className="input"
                value={shopLocation}
                onChange={(e) => setShopLocation(e.target.value)}
                placeholder="Shop #12, Computer Center, Main Boulevard"
              />
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
