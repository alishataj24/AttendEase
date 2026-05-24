import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, BookOpen, Clock, Activity } from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/attendance/faculty/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(resData => {
      setData(resData);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);

  if (loading || !data) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

  return (
    <>
      <div className="welcome-banner" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
        <h1 className="welcome-title">Faculty Portal</h1>
        <p className="welcome-subtitle">{user?.name} &nbsp;|&nbsp; {user?.email}</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Total Students</span>
            <span className="metric-value">{data.metrics.totalStudents}</span>
          </div>
          <div className="metric-icon-wrapper"><Users size={24} /></div>
        </div>
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Classes Conducted</span>
            <span className="metric-value">{data.metrics.classesConducted}</span>
          </div>
          <div className="metric-icon-wrapper"><BookOpen size={24} /></div>
        </div>
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Active Sessions</span>
            <span className="metric-value">{data.metrics.activeSession}</span>
          </div>
          <div className="metric-icon-wrapper"><Activity size={24} /></div>
        </div>
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Overall Attendance %</span>
            <span className="metric-value">{data.metrics.overallPercentage}%</span>
          </div>
          <div className="metric-icon-wrapper"><Clock size={24} /></div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-panel glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Weekly Attendance Trends</h3>
          </div>
          <div className="bar-chart-container">
            {data.charts.dailyAttendance.map((dayData: any, idx: number) => {
              // Normalize height against max
              const maxVal = Math.max(...data.charts.dailyAttendance.map((d: any) => d.attendance), 1);
              const heightPercent = Math.max((dayData.attendance / maxVal) * 100, 5);
              return (
                <div className="chart-bar-wrapper" key={idx}>
                  <div className="chart-bar" style={{ height: `${heightPercent}%` }}>
                    <div className="chart-tooltip">{dayData.attendance} Present</div>
                  </div>
                  <span className="chart-label">{dayData.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="chart-panel glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Subject Breakdown</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {data.charts.subjectBreakdown.map((sub: any, idx: number) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: 600 }}>{sub.subject}</span>
                  <span>{sub.percentage}%</span>
                </div>
                <div className="progress-bar-container" style={{ height: '6px', marginBottom: 0 }}>
                  <div className="progress-bar-fill" style={{ width: `${sub.percentage}%`, background: 'var(--accent)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
