'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type ConnectionState = 'connecting' | 'open' | 'closed' | 'error';

interface UsePartySocketOptions {
  host: string;
  party?: string; // e.g. "matchmaking" — omit for main party
  room: string;
  onMessage?: (msg: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

export function usePartySocket({
  host, party, room, onMessage, onOpen, onClose, enabled = true,
}: UsePartySocketOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('closed');
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef({ onMessage, onOpen, onClose });
  callbacksRef.current = { onMessage, onOpen, onClose };

  useEffect(() => {
    if (!enabled || !host || !room) return;

    // Build WebSocket URL
    // PartyKit URL: ws(s)://host/parties/{partyName}/{room} or ws(s)://host/party/{room}
    const protocol = host.startsWith('localhost') || host.startsWith('127.') ? 'ws' : 'wss';
    const partyPath = party ? `/parties/${party}/${room}` : `/party/${room}`;
    const url = `${protocol}://${host}${partyPath}`;

    setConnectionState('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('open');
      callbacksRef.current.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacksRef.current.onMessage?.(data);
      } catch {
        // Non-JSON message — ignore
      }
    };

    ws.onerror = () => {
      setConnectionState('error');
    };

    ws.onclose = () => {
      setConnectionState('closed');
      callbacksRef.current.onClose?.();
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [host, party, room, enabled]);

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionState('closed');
  }, []);

  return { send, disconnect, connectionState, isConnected: connectionState === 'open' };
}
