// packages/frontend/src/components/layout/Guards.jsx
// Route guards used in App.jsx to protect pages from unauthenticated
// or unauthorised access.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES }   from '../../utils/constants';
import { Spinner } from '../ui/index.jsx';

// ── ProtectedRoute ─────────────────────────────────────────────────
// Redirects to /login if the user is not authenticated.
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bc-bg)' }}><Spinner /></div>;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── RequireAdmin ───────────────────────────────────────────────────
// Redirects to / if the user is not an admin or head_admin.
export function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user || ![ROLES.ADMIN, ROLES.HEAD_ADMIN].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// ── MustChangePwd ──────────────────────────────────────────────────
// Forces the user to /settings if mustChangePassword is true.
export function MustChangePwd({ children }) {
  const { mustChangePwd } = useAuth();
  const location = useLocation();
  if (mustChangePwd && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />;
  }
  return children;
}
