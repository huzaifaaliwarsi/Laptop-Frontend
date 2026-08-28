import { io } from 'socket.io-client';

let socket = null;

const resolveSocketUrl = () => {
  let url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
  if (url) {
    url = url.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
};

export const getSocket = () => {
  if (typeof window === 'undefined') return null;

  if (!socket) {
    socket = io(resolveSocketUrl(), {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
  }

  return socket;
};

export const subscribeToEvent = (eventName, callback) => {
  const s = getSocket();
  if (!s) return () => {};

  s.on(eventName, callback);
  return () => {
    s.off(eventName, callback);
  };
};

export default getSocket;
