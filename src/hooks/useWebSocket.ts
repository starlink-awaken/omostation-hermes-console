import { useState, useEffect, useCallback, useRef } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (data: unknown) => void;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket({
  url,
  onMessage,
  onError,
  onOpen,
  onClose,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => undefined);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch {
          onMessage?.(event.data);
        }
      };

      ws.onerror = (error) => {
        onError?.(error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        onClose?.();

        // 自动重连
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, onMessage, onError, onOpen, onClose, reconnectInterval, maxReconnectAttempts]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connectRef.current();
  }, [disconnect]);

  useEffect(() => {
    connectRef.current = connect;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    send,
    reconnect,
    disconnect,
  };
}

// 实时数据 Hook
interface UseRealtimeDataOptions<T> {
  url: string;
  initialData: T;
  transform?: (data: unknown) => T;
}

interface UseRealtimeDataReturn<T> {
  data: T;
  isConnected: boolean;
  error: Error | null;
}

export function useRealtimeData<T>({
  url,
  initialData,
  transform,
}: UseRealtimeDataOptions<T>): UseRealtimeDataReturn<T> {
  const [data, setData] = useState<T>(initialData);
  const [error, setError] = useState<Error | null>(null);

  const { isConnected } = useWebSocket({
    url,
    onMessage: (message) => {
      try {
        const transformed = transform ? transform(message) : message;
        setData(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    },
    onError: () => {
      setError(new Error('WebSocket connection error'));
    },
  });

  return { data, isConnected, error };
}
