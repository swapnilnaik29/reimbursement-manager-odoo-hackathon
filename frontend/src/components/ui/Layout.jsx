import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { LayoutDashboard, Receipt, CheckSquare, Users, Settings, LogOut, Briefcase } from 'lucide-react';
import './Layout.css';


export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/expenses', label: 'My Expenses', icon: <Receipt size={20} /> },
  ];

  if (user?.role === 'Manager' || user?.role === 'Admin') {
    navItems.push({ path: '/approvals', label: 'Approvals Queue', icon: <CheckSquare size={20} /> });
  }

  if (user?.role === 'Admin') {
    navItems.push({ path: '/team', label: 'Company Team', icon: <Users size={20} /> });
    navItems.push({ path: '/settings', label: 'Settings', icon: <Settings size={20} /> });
  }

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Briefcase size={28} color="var(--primary)" />
          <span>ReimburseApp</span>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.full_name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <h2>Welcome back, {user?.full_name.split(' ')[0]}</h2>
        </header>
        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}
