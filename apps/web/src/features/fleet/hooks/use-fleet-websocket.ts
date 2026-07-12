import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../auth/store.js';

export interface FleetWsMessage {
  type: 'position_update' | 'initial_state' | 'connected';
  payload: unknown;
}

type MessageHandler = (msg: FleetWsMessage) => void;

export function useFleetWebSocket(onMessage: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const session = useAuthStore((s) => s.session);

  const connect = useCallback(() => {
    if (!session) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/fleet?org_id=${session.orgId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.debug('[fleet-ws] connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as FleetWsMessage;
        onMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      console.debug('[fleet-ws] disconnected, reconnecting in 5s');
      setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [session, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
