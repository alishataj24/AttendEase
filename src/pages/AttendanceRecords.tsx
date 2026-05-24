import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Download, FileSpreadsheet } from 'lucide-react';
import { API_BASE_URL } from '../config';

export const AttendanceRecords: React.FC = () => {
  const { user, token } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRecords = () => {
    let url = `${API_BASE_URL}/api/attendance/records?page=${page}&limit=15`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (subject) url += `&subject=${encodeURIComponent(subject)}`;

    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.records) {
          setRecords(data.records);
          setTotalPages(data.pagination.pages);
        }
      });
  };

  useEffect(() => {
    fetchRecords();
  }, [page, search, subject, token]);

  // Connect WebSocket to listen for live scans in current session
  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket('ws://localhost:5001');
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', userId: user.id }));
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ATTENDANCE_MARKED') {
          // Unshift new record to top if it matches current filters
          if (!subject || subject === msg.data.subject) {
            setRecords(prev => [msg.data, ...prev].slice(0, 15));
          }
        }
      } catch (e) {}
    };
    return () => ws.close();
  }, [user, subject]);

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Attendance Records</h2>

      <div className="table-actions-header">
        <div className="filter-group">
          <div className="search-container" style={{ width: '250px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search student..." 
              className="search-input"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          
          <select 
            className="form-select" 
            style={{ width: '200px', padding: '0.5rem 1rem' }}
            value={subject}
            onChange={e => { setSubject(e.target.value); setPage(1); }}
          >
            <option value="">All Subjects</option>
            {user?.subjects.map((sub: string) => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="table-panel">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Subject</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr key={r.attendanceId || idx}>
                <td style={{ fontWeight: 500 }}>{r.studentName}</td>
                <td>{r.studentId}</td>
                <td>{r.subject}</td>
                <td>{r.date}</td>
                <td>{r.time}</td>
                <td>
                  <div className={`status-indicator ${r.status.toLowerCase()}`}>
                    <div className={`status-dot ${r.status.toLowerCase()}`}></div>
                    {r.status}
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>No attendance records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-container">
          <button 
            className="btn btn-secondary" 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '0.4rem 1rem' }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
          <button 
            className="btn btn-secondary" 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.4rem 1rem' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
