import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, CalendarCheck, CalendarX, TrendingUp, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const StudentDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/attendance/student/dashboard`, {
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
      <div className="welcome-banner">
        <h1 className="welcome-title">Welcome back, {user?.name}</h1>
        <p className="welcome-subtitle">{user?.id} &nbsp;|&nbsp; {user?.department} &nbsp;|&nbsp; {user?.semester}</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Overall Attendance</span>
            <span className="metric-value">{data.metrics.overallPercentage}%</span>
          </div>
          <div className="metric-icon-wrapper"><TrendingUp size={24} /></div>
        </div>
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Classes Attended</span>
            <span className="metric-value">{data.metrics.classesAttended}</span>
          </div>
          <div className="metric-icon-wrapper"><CalendarCheck size={24} /></div>
        </div>
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Absent Classes</span>
            <span className="metric-value">{data.metrics.absentClasses}</span>
          </div>
          <div className="metric-icon-wrapper"><CalendarX size={24} /></div>
        </div>
        <div className="metric-card glass-panel hover-lift">
          <div className="metric-info">
            <span className="metric-label">Today's Classes</span>
            <span className="metric-value">{data.metrics.todayClassesCount}</span>
          </div>
          <div className="metric-icon-wrapper"><BookOpen size={24} /></div>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Subject Attendance</h2>
      <div className="subject-grid">
        {data.subjectCards.map((subject: any, idx: number) => (
          <div key={idx} className="subject-card glass-panel hover-lift">
            <div className="subject-header">
              <h3 className="subject-title">{subject.subject}</h3>
              <span className={`subject-badge ${subject.statusColor}`}>{subject.percentage}%</span>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill ${subject.statusColor}`} 
                style={{ width: `${subject.percentage}%` }}
              ></div>
            </div>
            
            <div className="subject-footer">
              <span>{subject.attended} / {subject.total} Classes</span>
              {subject.statusColor === 'red' && (
                <span className="subject-warning"><AlertTriangle size={14} /> Shortage</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
