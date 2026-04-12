// packages/frontend/src/components/layout/AppLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar        from './Sidebar';
import MobileNav      from './MobileNav';
import TopBar         from './TopBar';
import NotificationToast from '../ui/NotificationToast';
import { useWs }      from '../../context/WsContext';
import api            from '../../api/api';

const PAGE_TITLES = {
  '/':           'Dashboard',
  '/automation': 'Automation',
  '/manual':     'Manual Control',
  '/admin':      'Admin Panel',
  '/settings':   'Settings',
};

// PageTransition — re-mounts children with fade-slide on route change
function PageTransition({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => { setKey(location.pathname); setVisible(true); }, 80);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div
      key={key}
      className="page-transition"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity .08s', flex: 1, display: 'contents' }}
    >
      {children}
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { notifications, dismissNotification } = useWs();
  const [pendingRequests, setPendingRequests] = useState(0);

  const title = PAGE_TITLES[location.pathname] || 'BioCube';

  useEffect(() => {
    api.get('/admin/requests').then(r => setPendingRequests(r.data.length)).catch(() => {});
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar pendingRequests={pendingRequests} />
      <div className="main-area">
        <TopBar title={title} />
        <div className="main-scroll">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </div>
        <MobileNav />
      </div>
      <NotificationToast notifications={notifications} dismiss={dismissNotification} />
    </div>
  );
}
