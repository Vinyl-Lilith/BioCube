// packages/frontend/src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWs }   from '../../context/WsContext';
import { ROLES }   from '../../utils/constants';

const NAV = [
  { to: '/',           icon: '🌿', label: 'Dashboard',  page: 'home' },
  { to: '/automation', icon: '⚙️', label: 'Automation', page: 'automation' },
  { to: '/manual',     icon: '🎛', label: 'Manual',     page: 'manual' },
  { to: '/admin',      icon: '🛡', label: 'Admin',      page: 'admin',  adminOnly: true },
  { to: '/settings',   icon: '⚙', label: 'Settings',   page: 'settings' },
];

export default function Sidebar({ pendingRequests = 0 }) {
  const { user, logout } = useAuth();
  const { connected, piOnline } = useWs();
  const navigate         = useNavigate();

  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.HEAD_ADMIN;

  const visibleNav = NAV.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--bc-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--bc-accent3), var(--bc-accent))',
            borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 14px var(--bc-glow)',
          }}>🌿</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--bc-accent)', lineHeight: 1 }}>BioCube</div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', letterSpacing: 2 }}>GREENHOUSE OS</div>
          </div>
        </div>
      </div>

      {/* ── Connection status ─────────────────────────────────── */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--bc-border)' }}>
        {[
          { dot: connected ? 'green' : 'warn', label: `Server: ${connected ? 'Live' : 'Reconnecting...'}` },
          { dot: piOnline ? 'green' : 'off',   label: `Pi: ${piOnline ? 'Online' : 'Offline'}` },
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--bc-font-mono)', fontSize: 'clamp(8px,1.1vw,10px)', color: 'var(--bc-text2)', marginBottom: 3 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: s.dot === 'green' ? 'var(--bc-accent)' : s.dot === 'warn' ? 'var(--bc-warn)' : 'var(--bc-danger)',
              boxShadow: s.dot === 'green' ? '0 0 6px var(--bc-accent)' : 'none',
            }} />
            {s.label}
          </div>
        ))}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav style={{ padding: '14px 0', flex: 1 }}>
        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, letterSpacing: 2, color: 'var(--bc-text3)', padding: '0 20px 8px', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 20px',
              fontSize: 13, fontWeight: 600,
              color: isActive ? 'var(--bc-accent)' : 'var(--bc-text2)',
              background: isActive ? 'var(--bc-dim)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--bc-accent)' : '3px solid transparent',
              textDecoration: 'none',
              transition: 'all .15s',
              position: 'relative',
            })}
          >
            <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
            {item.adminOnly && pendingRequests > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--bc-danger)',
                color: 'white', fontFamily: 'var(--bc-font-mono)', fontSize: 9,
                padding: '1px 6px', borderRadius: 10,
              }}>
                {pendingRequests}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User chip + logout ────────────────────────────────── */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--bc-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--bc-accent3), var(--bc-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 12, color: 'var(--bc-bg)',
            flexShrink: 0,
          }}>
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-accent)', letterSpacing: 1 }}>
              {user?.role?.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', border: 'none', color: 'var(--bc-text3)', cursor: 'pointer', fontSize: 16, padding: 2 }}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
