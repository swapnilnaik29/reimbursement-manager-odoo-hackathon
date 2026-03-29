import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';

import Layout   from './components/ui/Layout';
import Login    from './pages/Login';
import Signup   from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Expenses  from './pages/Expenses';
import Approvals from './pages/Approvals';
import Team      from './pages/Team';
import Settings  from './pages/Settings';

/* ─── Route Guards ─────────────────────────────────────────────────── */
function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Role guard — Admin always passes
  if (roles && user?.role !== 'Admin' && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--bg-body)', color: 'var(--text-muted)',
    }}>
      <div style={{ width: 40, height: 40 }}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" stroke="#E5E7EB" strokeWidth="4" />
          <path d="M20 2a18 18 0 0 1 18 18" stroke="#2563EB" strokeWidth="4" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite"/>
          </path>
        </svg>
      </div>
      <p style={{ fontWeight: 500 }}>Initialising session…</p>
    </div>
  );
}

/* ─── Root App ─────────────────────────────────────────────────────── */
export default function App() {
  const { fetchMe, isCheckingAuth } = useAuthStore();

  useEffect(() => { fetchMe(); }, [fetchMe]);

  if (isCheckingAuth) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login"  element={<Login  />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/"       element={<Navigate to="/dashboard" replace />} />

        {/* Any authenticated role */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/expenses"  element={<ProtectedRoute><Expenses  /></ProtectedRoute>} />

        {/* Manager + Admin */}
        <Route path="/approvals" element={
          <ProtectedRoute roles={['Manager']}>
            <Approvals />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/team" element={
          <ProtectedRoute roles={['Admin']}>
            <Team />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute roles={['Admin']}>
            <Settings />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
