// packages/frontend/src/App.jsx
// Root component: sets up the React Router tree with all pages.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WsProvider }    from './context/WsContext';
import AppLayout   from './components/layout/AppLayout';
import { ProtectedRoute, RequireAdmin, MustChangePwd } from './components/layout/Guards';
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import AutomationPage  from './pages/AutomationPage';
import ManualPage      from './pages/ManualPage';
import AdminPage       from './pages/AdminPage';
import SettingsPage    from './pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WsProvider>
          <BrowserRouter>
            <Routes>

              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes — require auth + mustChangePwd guard */}
              <Route element={
                <ProtectedRoute>
                  <MustChangePwd>
                    <AppLayout />
                  </MustChangePwd>
                </ProtectedRoute>
              }>
                <Route index        element={<DashboardPage />} />
                <Route path="automation" element={<AutomationPage />} />
                <Route path="manual"     element={<ManualPage />} />
                <Route path="admin"      element={
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                } />
                <Route path="settings"   element={<SettingsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </BrowserRouter>
        </WsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
