// packages/frontend/src/components/layout/TopBar.jsx
import { useWs } from '../../context/WsContext';

export default function TopBar({ title }) {
  const { connected, piOnline } = useWs();
  return (
    <div className="top-bar">
      <span style={{ fontSize: 'clamp(12px,2vw,15px)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title}
      </span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
        <span className={`badge ${piOnline ? 'badge-green' : 'badge-red'}`}>
          {piOnline ? '🟢 Pi Online' : '🔴 Pi Offline'}
        </span>
        <span className={`badge ${connected ? 'badge-green' : 'badge-amber'}`}>
          {connected ? '● LIVE' : '○ RECONNECTING'}
        </span>
      </div>
    </div>
  );
}
