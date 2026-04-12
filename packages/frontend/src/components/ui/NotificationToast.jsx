// packages/frontend/src/components/ui/NotificationToast.jsx
// Floating toast stack shown in the bottom-right corner.
// Auto-dismisses after 8 seconds.

import { useEffect } from 'react';

const LEVEL_STYLE = {
  ok:    { bg: 'var(--bc-dim)',              border: 'var(--bc-accent3)', color: 'var(--bc-accent)' },
  info:  { bg: 'rgba(77,184,255,.12)',        border: 'rgba(77,184,255,.3)', color: 'var(--bc-info)' },
  warn:  { bg: 'rgba(255,179,64,.12)',        border: 'rgba(255,179,64,.3)', color: 'var(--bc-warn)' },
  error: { bg: 'rgba(255,77,106,.12)',        border: 'rgba(255,77,106,.3)', color: 'var(--bc-danger)' },
};

function Toast({ notif, dismiss }) {
  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => dismiss(notif.id), 8000);
    return () => clearTimeout(t);
  }, [notif.id, dismiss]);

  const s = LEVEL_STYLE[notif.level] || LEVEL_STYLE.info;

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 8, padding: '10px 14px',
      fontFamily: 'var(--bc-font-mono)', fontSize: 11,
      maxWidth: 340, display: 'flex', alignItems: 'flex-start', gap: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,.4)',
      animation: 'slideIn .2s ease',
    }}>
      <span style={{ flex: 1, lineHeight: 1.5 }}>{notif.message}</span>
      <button
        onClick={() => dismiss(notif.id)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: .6, fontSize: 14, padding: 0, flexShrink: 0 }}
      >✕</button>
    </div>
  );
}

export default function NotificationToast({ notifications, dismiss }) {
  if (!notifications.length) return null;

  return (
    <>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
      <div style={{
        position: 'fixed', bottom: 80, right: 20,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, maxWidth: 340,
      }}>
        {notifications.map(n => (
          <Toast key={n.id} notif={n} dismiss={dismiss} />
        ))}
      </div>
    </>
  );
}
