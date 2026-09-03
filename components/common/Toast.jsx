'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { ToastContainer, toast as rtToast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ToastContext = createContext(null);

// In-memory debounce cache to prevent duplicate toasts for identical messages within 2.5 seconds
const recentToasts = new Map();

export const showToast = (message, type = 'success', options = {}) => {
  if (!message) return;

  const strMsg = String(message).trim();
  const now = Date.now();
  const lastTime = recentToasts.get(strMsg);

  // If the same toast message was triggered within the last 2500ms, suppress duplicate
  if (lastTime && now - lastTime < 2500) {
    return;
  }
  recentToasts.set(strMsg, now);

  // Periodic cleanup of old keys
  if (recentToasts.size > 50) {
    for (const [k, t] of recentToasts.entries()) {
      if (now - t > 5000) recentToasts.delete(k);
    }
  }

  const config = {
    toastId: options.toastId || strMsg,
    position: 'top-right',
    autoClose: 3200,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: 'colored',
    transition: Slide,
    ...options
  };

  const cleanType = String(type || 'success').toLowerCase();

  switch (cleanType) {
    case 'error':
    case 'danger':
    case 'failed':
      return rtToast.error(message, config);
    case 'warning':
    case 'warn':
      return rtToast.warning(message, config);
    case 'info':
      return rtToast.info(message, config);
    case 'success':
    default:
      return rtToast.success(message, config);
  }
};

export function ToastProvider({ children }) {
  const addToast = useCallback((message, type = 'success', options = {}) => {
    return showToast(message, type, options);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3200}
        limit={3}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover
        theme="colored"
        transition={Slide}
        style={{ zIndex: 999999 }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast: showToast };
  }
  return context;
}

export default showToast;
