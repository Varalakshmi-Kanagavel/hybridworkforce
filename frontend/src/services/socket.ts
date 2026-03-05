import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Socket instance (singleton)
let socket: Socket | null = null;

/**
 * Initialize and connect socket with JWT authentication
 */
export const connectSocket = (): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No authentication token found');
    throw new Error('Authentication required to connect socket');
  }

  // Initialize socket with auth token
  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: {
      token,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connect the socket
  socket.connect();

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = (): boolean => {
  return socket?.connected || false;
};

/**
 * Emit a socket event
 */
export const emitSocketEvent = (event: string, data?: any): void => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.error('Socket not connected. Cannot emit event:', event);
  }
};

/**
 * Listen to a socket event
 */
export const onSocketEvent = (event: string, callback: (...args: any[]) => void): void => {
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Remove a socket event listener
 */
export const offSocketEvent = (event: string, callback?: (...args: any[]) => void): void => {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
};
