import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { addToast } from './Toast';
import { 
  LayoutDashboard, 
  QrCode, 
  ClipboardList, 
  CalendarDays, 
  BookOpen, 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Users, 
  BarChart3,
  Fingerprint
} from 'lucide-react';

export const Sidebar: React.FC<{ isSidebarOpen: boolean, setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>> }> = ({ isSidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();

  const studentLinks = [
    { to: '/student/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/student/scan', icon: <QrCode size={20} />, label: 'Scan QR' },
    { to: '#', icon: <ClipboardList size={20} />, label: 'Attendance' },
    { to: '#', icon: <CalendarDays size={20} />, label: 'Time Table' },
    { to: '#', icon: <BookOpen size={20} />, label: 'Subjects' },
    { to: '#', icon: <Bell size={20} />, label: 'Notifications' },
    { to: '#', icon: <User size={20} />, label: 'Profile' },
    { to: '#', icon: <Settings size={20} />, label: 'Settings' },
  ];

  const facultyLinks = [
    { to: '/faculty/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/faculty/qr-generator', icon: <QrCode size={20} />, label: 'Generate QR' },
    { to: '/faculty/records', icon: <ClipboardList size={20} />, label: 'Attendance Records' },
    { to: '#', icon: <BarChart3 size={20} />, label: 'Reports' },
    { to: '#', icon: <Users size={20} />, label: 'Students' },
    { to: '#', icon: <Bell size={20} />, label: 'Notifications' },
    { to: '#', icon: <User size={20} />, label: 'Profile' },
  ];

  const links = user?.role === 'student' ? studentLinks : facultyLinks;

  const handleLinkClick = (e: React.MouseEvent, to: string) => {
    if (to === '#') {
      e.preventDefault();
      addToast('This feature is coming soon!', 'info');
    } else {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div>
          <Link to={user?.role === 'student' ? '/student/dashboard' : '/faculty/dashboard'} className="sidebar-logo" style={{ textDecoration: 'none' }}>
            <Fingerprint size={32} color="var(--primary)" />
            AttendEase
          </Link>
          
          <nav className="sidebar-menu">
            {links.map((link, idx) => (
              <NavLink 
                key={idx} 
                to={link.to} 
                onClick={(e) => handleLinkClick(e, link.to)}
                className={({ isActive }) => `sidebar-item ${isActive && link.to !== '#' ? 'active' : ''}`}
              >
                {link.icon}
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={logout} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit' }}>
            <LogOut size={20} color="var(--danger)" />
            <span style={{ color: 'var(--danger)' }}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
