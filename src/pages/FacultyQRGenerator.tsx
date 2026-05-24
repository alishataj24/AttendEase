import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../contexts/AuthContext';
import { Play, Square, RefreshCw } from 'lucide-react';

export const FacultyQRGenerator: React.FC = () => {
  const { user, token } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState(user?.subjects?.[0] || 'Machine Learning');
  const [session, setSession] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  
  const timerRef = useRef<any>(null);
  const rotationTimerRef = useRef<any>(null);

  // Check for active session on load
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/session/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.session) {
        setSession(data.session);
        setSelectedSubject(data.session.subject);
      }
    });

    return () => {
      clearInterval(timerRef.current);
      clearInterval(rotationTimerRef.current);
    };
  }, [token]);

  useEffect(() => {
    if (session) {
      const qrPayload = JSON.stringify({
        sessionId: session.sessionId,
        token: session.token,
        subject: session.subject
      });
      
      QRCode.toDataURL(qrPayload, {
        width: 300,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).then(url => setQrDataUrl(url));

      // Reset countdown timer visually
      setTimeLeft(10);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 10));
      }, 1000);

      // Rotate token logic
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/session/${session.sessionId}/rotate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.session) {
            setSession(data.session);
          }
        } catch (e) {
          console.error("Failed to rotate token");
        }
      }, 10000); // exactly 10s
    } else {
      setQrDataUrl('');
      clearInterval(timerRef.current);
      clearInterval(rotationTimerRef.current);
    }
  }, [session?.token, session?.sessionId]); // Only re-run when token changes

  const startSession = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subject: selectedSubject })
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const endSession = async () => {
    if (!session) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/session/${session.sessionId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSession(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="qr-setup-layout">
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1.5rem' }}>Session Setup</h2>
        
        <div className="form-group">
          <label className="form-label">Select Subject</label>
          <select 
            className="form-select" 
            value={selectedSubject} 
            onChange={e => setSelectedSubject(e.target.value)}
            disabled={!!session}
          >
            {user?.subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!session ? (
            <button className="btn btn-primary" onClick={startSession} style={{ width: '100%', justifyContent: 'center' }}>
              <Play size={18} /> Start Attendance Session
            </button>
          ) : (
            <button className="btn btn-danger" onClick={endSession} style={{ width: '100%', justifyContent: 'center' }}>
              <Square size={18} /> End Session
            </button>
          )}
        </div>
        
        {session && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>Status:</strong> Active<br/>
              <strong>Subject:</strong> {session.subject}<br/>
              <strong>Session ID:</strong> {session.sessionId}
            </p>
          </div>
        )}
      </div>

      <div className="glass-panel qr-display-panel">
        <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Dynamic QR Code</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Students must scan this code using their portal. Do not close this window.
        </p>

        {session && qrDataUrl ? (
          <>
            <div className="countdown-radial">
              <svg viewBox="0 0 60 60" width="60" height="60">
                <circle className="countdown-timer-circle" cx="30" cy="30" r="28" />
                <circle 
                  className="countdown-timer-fill" 
                  cx="30" cy="30" r="28" 
                  style={{ strokeDashoffset: 176 - (176 * (timeLeft / 10)) }}
                />
              </svg>
              <div className="countdown-timer-text">{timeLeft}</div>
            </div>
            
            <div className="qr-code-wrapper">
              <img src={qrDataUrl} alt="Session QR Code" style={{ width: '250px', height: '250px', borderRadius: '12px' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
              <RefreshCw size={14} className={timeLeft === 10 ? 'spin-anim' : ''} /> 
              Token encrypts & refreshes every 10 seconds
            </div>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Start a session to generate QR code
          </div>
        )}
      </div>
      <style>{`
        .spin-anim { animation: spin 1s linear; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
