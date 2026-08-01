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
  const shouldReconnectRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => undefined);
  const callbacksRef = useRef({ onMessage, onError, onOpen, onClose });

  useEffect(() => {
    callbacksRef.current = { onMessage, onError, onOpen, onClose };
  }, [onMessage, onError, onOpen, onClose]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
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
    shouldReconnectRef.current = true;
    if (wsRef.current && [WebSocket.OPEN, WebSocket.CONNECTING].includes(wsRef.current.readyState)) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (wsRef.current !== ws) return;
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onOpen?.();
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return;
        try {
          const data = JSON.parse(event.data);
          callbacksRef.current.onMessage?.(data);
        } catch {
          callbacksRef.current.onMessage?.(event.data);
        }
      };

      ws.onerror = (error) => {
        if (wsRef.current !== ws) return;
        callbacksRef.current.onError?.(error);
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        setIsConnected(false);
        callbacksRef.current.onClose?.();

        // 只有非主动关闭才进入自动重连，避免 disconnect() 关掉后又被 onclose 拉起。
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectRef.current();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [url, reconnectInterval, maxReconnectAttempts]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    shouldReconnectRef.current = true;
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
