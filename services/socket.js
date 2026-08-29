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
    const socketUrl = resolveSocketUrl();
    
    // Vercel Serverless Lambdas do not support persistent WebSockets
    // If running against Vercel backend without a separate socket server, use a clean mock socket
    const isVercelServerless = socketUrl && socketUrl.includes('.vercel.app') && !process.env.NEXT_PUBLIC_SOCKET_URL;
    
    if (isVercelServerless) {
      socket = {
        on: () => {},
        off: () => {},
        emit: () => {},
        disconnect: () => {},
        connected: false
      };
      return socket;
    }

    try {
      socket = io(socketUrl, {
        withCredentials: true,
        autoConnect: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 5000
      });

      socket.on('connect_error', () => {
        // Silently handle connection error
      });
    } catch {
      socket = {
        on: () => {},
        off: () => {},
        emit: () => {},
        disconnect: () => {},
        connected: false
      };
    }
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
