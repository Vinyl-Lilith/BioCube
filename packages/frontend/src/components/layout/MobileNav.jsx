// packages/frontend/src/components/layout/MobileNav.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES }   from '../../utils/constants';

const NAV = [
  { to: '/',           icon: '🌿', label: 'Home' },
  { to: '/automation', icon: '⚙️', label: 'Auto' },
  { to: '/manual',     icon: '🎛',  label: 'Manual' },
  { to: '/admin',      icon: '🛡',  label: 'Admin', adminOnly: true },
  { to: '/settings',   icon: '⚙',  label: 'Settings' },
];

export default function MobileNav() {
  const { user } = useAuth();
  const isAdmin  = user?.role === ROLES.ADMIN || user?.role === ROLES.HEAD_ADMIN;
  const items    = NAV.filter(i => !i.adminOnly || isAdmin);

  return (
    <div className="mobile-nav">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '6px 12px', borderRadius: 8,
            color: isActive ? 'var(--bc-accent)' : 'var(--bc-text3)',
            textDecoration: 'none',
            fontFamily: 'var(--bc-font-mono)', fontSize: 8,
            letterSpacing: .5, textTransform: 'uppercase',
          })}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
