import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../contexts/AuthContext';
import { Camera, StopCircle, CheckCircle, XCircle } from 'lucide-react';
import { addToast } from '../components/Toast';

export const StudentScanner: React.FC = () => {
  const { token } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'error', msg: string } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setFeedback(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
      streamRef.current = stream;
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Camera access denied or unavailable. Click "Mock Scan" to simulate.' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        
        if (code && code.data) {
          handleScanResult(code.data);
          return; // Stop ticking after finding
        }
      }
    }
    if (isScanning) {
      requestAnimationFrame(tick);
    }
  };

  const handleScanResult = async (dataStr: string) => {
    stopCamera();
    try {
      const payload = JSON.parse(dataStr);
      if (!payload.sessionId || !payload.token) throw new Error("Invalid QR code format");

      const res = await fetch('http://localhost:5001/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sessionId: payload.sessionId, token: payload.token })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setFeedback({ type: 'error', msg: data.message });
      } else {
        setFeedback({ type: 'success', msg: `Attendance marked for ${data.attendance.subject}` });
        addToast(`Successfully marked presence!`);
      }
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Invalid QR code.' });
    }
  };

  // Mock function for demo purposes if camera fails
  const mockScan = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/sessions/latest-active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to find active session');
      const data = await res.json();
      if (!data.session) throw new Error('No active sessions right now. Ask faculty to start a session.');
      
      const sessionData = JSON.stringify({
        sessionId: data.session._id,
        token: "mock-token-" + Date.now()
      });
      handleScanResult(sessionData);
    } catch (e: any) {
      setFeedback({ type: 'error', msg: e.message || 'Mock scan failed.' });
    }
  };

  return (
    <div className="scanner-layout">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>QR Scanner</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Position the QR code inside the frame to mark your attendance automatically.</p>
      </div>

      <div className="scanner-video-container">
        <video ref={videoRef} className="scanner-video" />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {isScanning ? (
          <div className="scanner-overlay">
            <div className="scanner-target-box">
              <div className="scanner-laser-line"></div>
            </div>
          </div>
        ) : (
          <div className="scanner-overlay" style={{ background: 'rgba(0,0,0,0.5)', flexDirection: 'column', color: 'white' }}>
            <Camera size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <span>Camera Inactive</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className={`scanner-feedback ${feedback.type}`}>
          {feedback.type === 'success' && <CheckCircle size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />}
          {feedback.type === 'error' && <XCircle size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />}
          {feedback.msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        {!isScanning ? (
          <button className="btn btn-primary" onClick={startCamera}>
            <Camera size={18} /> Start Scanner
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopCamera}>
            <StopCircle size={18} /> Stop Scanner
          </button>
        )}
        
        <button className="btn btn-secondary" onClick={mockScan}>Mock Scan</button>
      </div>
    </div>
  );
};
