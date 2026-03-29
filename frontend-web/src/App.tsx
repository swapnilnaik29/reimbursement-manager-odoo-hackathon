import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/Employeedashboard';
import ManagerDashboard from './pages/Managerdashboard';
import AdminDashboard from './pages/Admindashboard';

const RoleBasedRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role === 'admin')    return <Navigate to="/admin" />;
  if (user?.role === 'manager')  return <Navigate to="/manager" />;
  if (user?.role === 'employee') return <Navigate to="/employee" />;

  return <Navigate to="/login" />;
};

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: string[];
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user!.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"        element={<RoleBasedRedirect />} />
      <Route path="/login"   element={<Login />} />
      <Route path="/signup"  element={<Signup />} />

      <Route path="/employee" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeDashboard />
        </ProtectedRoute>
      } />

      <Route path="/manager" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <ManagerDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}