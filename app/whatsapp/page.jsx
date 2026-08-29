'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Icon from '../../components/common/Icon';
import WhatsappSimulatorModal from '../../components/modules/whatsapp/WhatsappSimulatorModal';
import WhatsappSettingsModal from '../../components/modules/whatsapp/WhatsappSettingsModal';
import { ChatListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';

function fmtTime(v) {
  return v ? new Date(v).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—';
}

export default function WhatsappPage() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [agentText, setAgentText] = useState('');
  const [clientTestText, setClientTestText] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const loadConversations = () => {
    api.get('/whatsapp/conversations')
      .then(res => {
        if (res.success) {
          const list = res.data || [];
          setConversations(list);
          if (!activeConvId && list.length > 0) {
            setActiveConvId(list[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const activeConv = conversations.find(c => c.id === activeConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleSendAgent = async (e) => {
    e.preventDefault();
    if (!activeConvId || !agentText.trim()) return;

    try {
      const res = await api.post('/whatsapp/messages/send', {
        conversationId: activeConvId,
        text: agentText.trim(),
        tag: 'agent'
      });
      if (res.success) {
        setAgentText('');
        loadConversations();
      }
    } catch (err) {
      toast(err.message || 'Error sending message', 'error');
    }
  };

  const handleSendClientTest = async (e) => {
    e.preventDefault();
    if (!activeConvId || !clientTestText.trim()) return;

    try {
      const res = await api.post('/whatsapp/messages/customer-input', {
        conversationId: activeConvId,
        text: clientTestText.trim()
      });
      if (res.success) {
        setClientTestText('');
        loadConversations();
      }
    } catch (err) {
      toast(err.message || 'Error sending test message', 'error');
    }
  };

  const handleToggleHandoff = async () => {
    if (!activeConvId) return;
    try {
      const res = await api.patch(`/whatsapp/conversations/${activeConvId}/handoff`);
      if (res.success) {
        toast(res.message);
        loadConversations();
      }
    } catch (err) {
      toast(err.message || 'Error toggling handoff', 'error');
    }
  };

  const [waStatus, setWaStatus] = useState({ connected: false, phone: null, qr: null });

  const loadWaStatus = () => {
    api.get('/whatsapp/status')
      .then(res => {
        if (res.success && res.data) {
          setWaStatus(res.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadWaStatus();
    const interval = setInterval(loadWaStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <div className="toolbar" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={`status-dot ${waStatus.connected ? 'connected' : 'disconnected'}`}></span>
              <div>
                <strong>{waStatus.connected ? `WhatsApp Multi-Device Connected (+${waStatus.phone || ''})` : 'WhatsApp Device Not Connected'}</strong>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {waStatus.connected ? 'Ready to send live notifications & auto-replies' : 'Click "Connect WhatsApp (QR)" to link your phone'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn ${waStatus.connected ? 'soft' : 'primary'}`}
                onClick={() => setIsSettingsOpen(true)}
              >
                <Icon name="scan" /> {waStatus.connected ? 'WhatsApp Status' : '📱 Connect WhatsApp (QR)'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Icon name="settings" /> Settings & Bot
              </button>
              <button
                type="button"
                className="btn soft"
                onClick={() => setIsSimOpen(true)}
              >
                <Icon name="message" /> Simulator
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="crm-layout" style={{ marginTop: 14 }}>
        {/* Left Inbox List */}
        <div className="crm-inbox">
          <div className="crm-inbox-head">
            <h3 style={{ margin: 0, fontSize: 13 }}>Conversations ({conversations.length})</h3>
          </div>
          <div className="crm-list">
            {loading ? (
              <ChatListSkeleton count={6} />
            ) : conversations.length > 0 ? (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`crm-conv ${conv.id === activeConvId ? 'active' : ''}`}
                  onClick={() => setActiveConvId(conv.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{conv.name}</strong>
                    <span className={`badge ${conv.status === 'Human Handoff' ? 'warning' : 'success'}`} style={{ fontSize: 8.5 }}>
                      {conv.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{conv.contact}</div>
                  <p>{conv.lastMessage || 'No messages'}</p>
                </div>
              ))
            ) : (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                No active conversations. Click &ldquo;+ Simulate Customer&rdquo; above to start.
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Stream & Simulator */}
        <div className="crm-chat">
          {activeConv ? (
            <>
              <div className="crm-chat-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14 }}>{activeConv.name}</h3>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{activeConv.contact} · {activeConv.leadType || 'General'}</div>
                </div>
                <button
                  type="button"
                  className={`btn small ${activeConv.status === 'Human Handoff' ? 'primary' : 'soft'}`}
                  onClick={handleToggleHandoff}
                >
                  {activeConv.status === 'Human Handoff' ? 'Switch to Bot Mode' : 'Take Over (Human Handoff)'}
                </button>
              </div>

              {/* Message History */}
              <div className="crm-messages">
                {activeConv.messages && activeConv.messages.length > 0 ? (
                  activeConv.messages.map(msg => (
                    <div key={msg.id} className={`msg ${msg.direction}`}>
                      <div style={{ whiteSpace: 'pre-line' }}>{msg.text}</div>
                      <small>
                        {fmtTime(msg.at)}
                        {msg.tag && <span className="msg-tag"> {msg.tag}</span>}
                      </small>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No messages yet</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Agent Reply Box */}
              <form className="crm-compose" onSubmit={handleSendAgent}>
                <input
                  className="input"
                  value={agentText}
                  onChange={(e) => setAgentText(e.target.value)}
                  placeholder="Type message as human staff..."
                />
                <button type="submit" className="btn primary" disabled={!agentText.trim()}>
                  <Icon name="send" /> Send
                </button>
              </form>

              {/* Customer Test Typing Simulator Bar */}
              <div className="wa-client-test">
                <div>
                  <strong>Customer Typing Simulator:</strong>
                  <span>Test bot response by typing incoming message as the customer</span>
                </div>
                <form className="wa-client-test-row" onSubmit={handleSendClientTest}>
                  <input
                    className="input"
                    value={clientTestText}
                    onChange={(e) => setClientTestText(e.target.value)}
                    placeholder="Type as customer (e.g. 1, 2, 3, RPR-00001, APPROVE, DECLINE)..."
                  />
                  <button type="submit" className="btn soft" disabled={!clientTestText.trim()}>
                    Simulate Customer
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>
              Select a conversation on the left or simulate a new customer to test.
            </div>
          )}
        </div>
      </div>

      <WhatsappSimulatorModal
        isOpen={isSimOpen}
        onClose={() => setIsSimOpen(false)}
        onSuccess={(convId) => {
          loadConversations();
          setActiveConvId(convId);
        }}
      />

      <WhatsappSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
