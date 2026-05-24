import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="skeleton" style={{ width: '200px', height: '40px' }}></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main-wrapper">
        <Topbar setSidebarOpen={setSidebarOpen} />
        <main className="content-padding">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
