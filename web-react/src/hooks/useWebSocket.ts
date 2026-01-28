/**
 * WebSocket Hook
 * Manages WebSocket connection for real-time updates
 */

import { useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import type { WebSocketEvent, WebSocketStatus } from '../types';

// WebSocket state store
interface WebSocketState {
  status: WebSocketStatus;
  clientId: string | null;
  lastEvent: WebSocketEvent | null;
  subscriptions: Set<string>;
  setStatus: (status: WebSocketStatus) => void;
  setClientId: (id: string | null) => void;
  setLastEvent: (event: WebSocketEvent | null) => void;
  addSubscription: (channel: string) => void;
  removeSubscription: (channel: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  status: 'disconnected',
  clientId: null,
  lastEvent: null,
  subscriptions: new Set(),
  setStatus: (status) => set({ status }),
  setClientId: (clientId) => set({ clientId }),
  setLastEvent: (lastEvent) => set({ lastEvent }),
  addSubscription: (channel) =>
    set((state) => {
      const newSubs = new Set(state.subscriptions);
      newSubs.add(channel);
      return { subscriptions: newSubs };
    }),
  removeSubscription: (channel) =>
    set((state) => {
      const newSubs = new Set(state.subscriptions);
      newSubs.delete(channel);
      return { subscriptions: newSubs };
    }),
}));

// Event handler type
type EventHandler = (event: WebSocketEvent) => void;

// WebSocket configuration
interface WebSocketConfig {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: `ws://${window.location.host}/ws`,
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
};

/**
 * WebSocket hook for real-time updates
 */
export function useWebSocket(config: WebSocketConfig = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const configRef = useRef({ ...DEFAULT_CONFIG, ...config });

  const {
    status,
    clientId,
    lastEvent,
    subscriptions,
    setStatus,
    setClientId,
    setLastEvent,
    addSubscription,
    removeSubscription,
  } = useWebSocketStore();

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      wsRef.current = new WebSocket(configRef.current.url);

      wsRef.current.onopen = () => {
        setStatus('connected');
        reconnectCountRef.current = 0;
        console.log('[WebSocket] Connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          setLastEvent(data);

          // Handle connection confirmation
          if (data.type === 'connection' && (data as any).clientId) {
            setClientId((data as any).clientId);
          }

          // Call registered handlers
          const handlers = handlersRef.current.get(data.type) ?? new Set();
          const wildcardHandlers = handlersRef.current.get('*') ?? new Set();

          handlers.forEach((handler) => handler(data));
          wildcardHandlers.forEach((handler) => handler(data));
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      wsRef.current.onclose = () => {
        setStatus('disconnected');
        setClientId(null);
        console.log('[WebSocket] Disconnected');

        // Auto reconnect if enabled
        if (
          configRef.current.autoReconnect &&
          reconnectCountRef.current < configRef.current.maxReconnectAttempts
        ) {
          reconnectCountRef.current++;
          console.log(
            `[WebSocket] Reconnecting (${reconnectCountRef.current}/${configRef.current.maxReconnectAttempts})...`
          );
          setTimeout(connect, configRef.current.reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        setStatus('error');
        console.error('[WebSocket] Error:', error);
      };
    } catch (error) {
      setStatus('error');
      console.error('[WebSocket] Connection failed:', error);
    }
  }, [setStatus, setClientId, setLastEvent]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    reconnectCountRef.current = configRef.current.maxReconnectAttempts; // Prevent auto-reconnect
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  // Send a message
  const send = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }, []);

  // Subscribe to a channel
  const subscribe = useCallback(
    (channel: string) => {
      send({ action: 'subscribe', channel });
      addSubscription(channel);
    },
    [send, addSubscription]
  );

  // Unsubscribe from a channel
  const unsubscribe = useCallback(
    (channel: string) => {
      send({ action: 'unsubscribe', channel });
      removeSubscription(channel);
    },
    [send, removeSubscription]
  );

  // Register an event handler
  const on = useCallback((eventType: string, handler: EventHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    // Return cleanup function
    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  // Send a ping
  const ping = useCallback(() => {
    send({ action: 'ping' });
  }, [send]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    clientId,
    lastEvent,
    subscriptions: Array.from(subscriptions),
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    on,
    ping,
    isConnected: status === 'connected',
  };
}

/**
 * Hook to subscribe to specific WebSocket events
 */
export function useWebSocketEvent(
  eventType: string,
  handler: EventHandler,
  deps: unknown[] = []
) {
  const { on } = useWebSocket();

  useEffect(() => {
    const cleanup = on(eventType, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, on, ...deps]);
}
