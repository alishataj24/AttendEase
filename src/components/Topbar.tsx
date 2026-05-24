import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addToast } from './Toast';
import { Search, Bell, Moon, Menu } from 'lucide-react';

export const Topbar: React.FC<{ setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>> }> = ({ setSidebarOpen }) => {
  const { user } = useAuth();

  const handleComingSoon = () => addToast('This feature is coming soon!', 'info');

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="action-btn mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="search-container">
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Search..." className="search-input" />
        </div>
      </div>

      <div className="topbar-actions">
        <button className="action-btn" onClick={handleComingSoon}>
          <Bell size={20} />
        </button>
        <button className="action-btn" onClick={() => document.body.classList.toggle('dark-theme')}>
          <Moon size={20} />
        </button>

        <div className="profile-widget">
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} 
            alt="Profile" 
            className="profile-avatar"
          />
          <div className="profile-info">
            <span className="profile-name">{user?.name}</span>
            <span className="profile-role">{user?.role === 'student' ? user.id : 'Faculty'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
