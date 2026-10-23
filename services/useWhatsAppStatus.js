'use client';
import { useSyncExternalStore } from 'react';
import { subscribeWhatsAppStatus, getWhatsAppStatus, getServerWhatsAppStatus } from './whatsapp-status';

const inactiveSubscription = () => () => {};
export default function useWhatsAppStatus(enabled = true) {
  return useSyncExternalStore(enabled ? subscribeWhatsAppStatus : inactiveSubscription, getWhatsAppStatus, getServerWhatsAppStatus);
}
