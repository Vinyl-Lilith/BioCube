// packages/frontend/src/context/WsContext.jsx
// Connects to the backend WebSocket server once the user is authenticated.
// Distributes live sensor data, actuator state updates, and notifications
// to any component that subscribes.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WsContext = createContext(null);

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';

export function WsProvider({ children }) {
  const { user, getAccess } = useAuth();

  // ── Shared reactive state ─────────────────────────────────────────
  const [sensors,        setSensors]        = useState(null);
  const [actuatorState,  setActuatorState]  = useState({});
  const [notifications,  setNotifications]  = useState([]);
  const [connected,      setConnected]      = useState(false);
  const [piOnline,       setPiOnline]       = useState(false); // Raspberry Pi connection status

  const wsRef      = useRef(null);  // The WebSocket instance
  const retryTimer = useRef(null);  // Reconnect timer handle

  // ── connect ───────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!user) return; // Don't connect if not logged in
    const token = getAccess();
    if (!token) return;

    // Close any existing connection before opening a new one
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(retryTimer.current);
      console.log('[WS] Connected');
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.type) {
        case 'LIVE_SENSORS':
          setSensors(msg.data);
          break;

        case 'ACTUATOR_STATE':
          setActuatorState(prev => ({ ...prev, ...msg.data }));
          break;

        case 'NOTIFICATION':
          setNotifications(prev => [
            { id: Date.now(), message: msg.message, level: msg.level },
            ...prev,
          ].slice(0, 10));
          break;

        case 'PI_STATUS':
          setPiOnline(msg.online);
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.warn('[WS] Disconnected — retrying in 5s');
      // Auto-reconnect
      retryTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      ws.close(); // Let onclose handle reconnect
    };
  }, [user, getAccess]);

  // ── Connect when user logs in; disconnect on logout ───────────────
  useEffect(() => {
    if (user) {
      connect();
    } else {
      wsRef.current?.close();
      setConnected(false);
      clearTimeout(retryTimer.current);
    }
    return () => {
      wsRef.current?.close();
      clearTimeout(retryTimer.current);
    };
  }, [user, connect]);

  // ── dismissNotification ───────────────────────────────────────────
  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = {
    sensors, actuatorState, notifications, connected, piOnline,
    dismissNotification,
  };

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export const useWs = () => {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWs must be inside WsProvider');
  return ctx;
};
