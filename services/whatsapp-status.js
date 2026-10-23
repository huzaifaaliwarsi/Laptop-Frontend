import api from './api';
import { getSocket } from './socket';

const empty = { connected: false, connecting: false, qr: null, phone: null };
let status = empty;
const listeners = new Set();
let timer, socket, pending;
let revision = 0;
let activeBranch = null;
let lifecycle = 0;
const branch = () => typeof window === 'undefined' ? '1' : localStorage.getItem('activeBranchId') || '1';

export function publishWhatsAppStatus(next) {
  if (!next || (next.branchId && String(next.branchId) !== branch())) return;
  if (status.branchId === next.branchId && next.updatedAt && status.updatedAt > next.updatedAt) return;
  revision++;
  status = { ...status, ...next };
  listeners.forEach(listener => listener());
}

export async function refreshWhatsAppStatus() {
  const requestedBranch = branch();
  if (requestedBranch !== activeBranch) {
    activeBranch = requestedBranch;
    status = empty;
    revision++;
    listeners.forEach(listener => listener());
  }
  if (pending) return pending;
  const requestedRevision = revision;
  pending = api.get('/whatsapp/status', { noCache: true })
    .then(res => {
      // An older HTTP response must not overwrite a newer socket event.
      if (res.success && branch() === requestedBranch && revision === requestedRevision) publishWhatsAppStatus(res.data);
    })
    .catch(() => {})
    .finally(() => { pending = null; });
  return pending;
}

const onStatus = next => publishWhatsAppStatus(next);
const onConnect = () => { refreshWhatsAppStatus(); };
const poll = async (generation) => {
  await refreshWhatsAppStatus();
  if (!listeners.size || generation !== lifecycle) return;
  // Socket updates are primary; polling is a shared, non-overlapping fallback.
  timer = setTimeout(() => poll(generation), socket?.connected ? 60000 : status.connecting || status.linking || status.qr ? 3000 : 15000);
};

export function subscribeWhatsAppStatus(listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    socket = getSocket();
    socket?.on('whatsapp:status', onStatus);
    socket?.on('connect', onConnect);
    poll(++lifecycle);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      lifecycle++;
      clearTimeout(timer);
      socket?.off('whatsapp:status', onStatus);
      socket?.off('connect', onConnect);
    }
  };
}

export const getWhatsAppStatus = () => status;
export const getServerWhatsAppStatus = () => empty;
