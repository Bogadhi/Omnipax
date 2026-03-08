import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5001';

class SocketClient {
  private static instance: Socket | null = null;
  private static namespaces: Record<string, Socket> = {};

  public static connect(namespace: string = '/'): Socket {
    if (namespace === '/') {
      if (this.instance?.connected) return this.instance;
    } else {
      if (this.namespaces[namespace]?.connected) return this.namespaces[namespace];
    }

    const token = useAuthStore.getState().token;
    const url = namespace === '/' ? SOCKET_URL : `${SOCKET_URL}${namespace}`;

    const socket = io(url, {
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log(`Socket connected to ${namespace}:`, socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error(`Socket connection error on ${namespace}:`, err.message);
    });

    if (namespace === '/') {
      this.instance = socket;
    } else {
      this.namespaces[namespace] = socket;
    }

    return socket;
  }

  public static disconnect(namespace: string = '/') {
    if (namespace === '/') {
      if (this.instance) {
        this.instance.disconnect();
        this.instance = null;
      }
    } else if (this.namespaces[namespace]) {
      this.namespaces[namespace].disconnect();
      delete this.namespaces[namespace];
    }
  }

  public static getInstance(namespace: string = '/'): Socket | null {
    return namespace === '/' ? this.instance : this.namespaces[namespace] || null;
  }
}

export const socketService = SocketClient;
