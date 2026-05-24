import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from './components/Toast';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { FacultyQRGenerator } from './pages/FacultyQRGenerator';
import { StudentScanner } from './pages/StudentScanner';
import { AttendanceRecords } from './pages/AttendanceRecords';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: 'student' | 'faculty' }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  if (!user || user.role !== allowedRole) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

export const AppRoutes = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected Dashboard Layout */}
        <Route element={<Layout />}>
          {/* Student Routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/student/scan" element={
            <ProtectedRoute allowedRole="student"><StudentScanner /></ProtectedRoute>
          } />

          {/* Faculty Routes */}
          <Route path="/faculty/dashboard" element={
            <ProtectedRoute allowedRole="faculty"><FacultyDashboard /></ProtectedRoute>
          } />
          <Route path="/faculty/qr-generator" element={
            <ProtectedRoute allowedRole="faculty"><FacultyQRGenerator /></ProtectedRoute>
          } />
          <Route path="/faculty/records" element={
            <ProtectedRoute allowedRole="faculty"><AttendanceRecords /></ProtectedRoute>
          } />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
