import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

interface OnlineUser {
  userId: string;
  name: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  lastSeenByUser: Map<string, string>;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenByUser, setLastSeenByUser] = useState<Map<string, string>>(new Map());

  const connect = useCallback(() => {
    if (!isAuthenticated || socket?.connected) return;

    try {
      const newSocket = connectSocket();
      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to connect socket:', error);
    }
  }, [isAuthenticated, socket]);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setSocket(null);
    setIsConnected(false);
    setOnlineUsers(new Set());
    setLastSeenByUser(new Map());
  }, []);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user]);

  // Setup socket event listeners
  useEffect(() => {
    const currentSocket = getSocket();
    if (!currentSocket) return;

    const handleConnect = () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    };

    const handleUserOnline = (data: OnlineUser) => {
      console.log('User came online:', data.name);
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
      setLastSeenByUser((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handleUserOffline = (data: { userId: string }) => {
      console.log('User went offline:', data.userId);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
      setLastSeenByUser((prev) => {
        const next = new Map(prev);
        next.set(data.userId, new Date().toISOString());
        return next;
      });
    };

    // Register event listeners
    currentSocket.on('connect', handleConnect);
    currentSocket.on('disconnect', handleDisconnect);
    currentSocket.on('connect_error', handleConnectError);
    currentSocket.on('user_online', handleUserOnline);
    currentSocket.on('user_offline', handleUserOffline);

    // Cleanup listeners on unmount
    return () => {
      currentSocket.off('connect', handleConnect);
      currentSocket.off('disconnect', handleDisconnect);
      currentSocket.off('connect_error', handleConnectError);
      currentSocket.off('user_online', handleUserOnline);
      currentSocket.off('user_offline', handleUserOffline);
    };
  }, [socket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    lastSeenByUser,
    connect,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
