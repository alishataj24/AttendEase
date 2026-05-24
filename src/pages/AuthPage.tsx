import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Fingerprint, User, Mail, BookOpen, GraduationCap, Building2, Hash, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { FaceVerification } from '../components/FaceVerification';

type PortalTab = 'student' | 'faculty';
type AuthMode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PortalTab>('student');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Student fields
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuId, setStuId] = useState('');
  const [stuDept, setStuDept] = useState('Computer Science');
  const [stuSemester, setStuSemester] = useState('5th Semester');

  // Faculty fields
  const [facName, setFacName] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facDept, setFacDept] = useState('Computer Science');

  // Face flow
  const [faceFlow, setFaceFlow] = useState<{ active: boolean; mode: 'register' | 'verify'; token: string } | null>(null);

  // ─── Student Sign Up ────────────────────────────────────────
  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/student/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: stuId, name: stuName, email: stuEmail,
          department: stuDept, semester: stuSemester
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');

      // Store temp data and proceed to face registration
      window.sessionStorage.setItem('temp_user', JSON.stringify(data.user));
      setFaceFlow({ active: true, mode: 'register', token: data.token });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Student Login ──────────────────────────────────────────
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: stuEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      window.sessionStorage.setItem('temp_user', JSON.stringify(data.user));

      if (data.user.hasFaceDescriptor) {
        setFaceFlow({ active: true, mode: 'verify', token: data.token });
      } else {
        // Face not registered yet, go register
        setFaceFlow({ active: true, mode: 'register', token: data.token });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Faculty Sign Up ────────────────────────────────────────
  const handleFacultySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/faculty/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: facName, email: facEmail, department: facDept })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      login(data.user, data.token);
      navigate('/faculty/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Faculty Login ──────────────────────────────────────────
  const handleFacultyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/faculty/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: facEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data.user, data.token);
      navigate('/faculty/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Face Verification Success ──────────────────────────────
  const handleFaceSuccess = () => {
    if (faceFlow) {
      const storedUser = window.sessionStorage.getItem('temp_user');
      if (storedUser) {
        login(JSON.parse(storedUser), faceFlow.token);
        window.sessionStorage.removeItem('temp_user');
        navigate('/student/dashboard');
      }
    }
  };

  const switchTab = (tab: PortalTab) => {
    setActiveTab(tab);
    setAuthMode('login');
    setError('');
    setFaceFlow(null);
    window.sessionStorage.removeItem('temp_user');
  };

  // ─── Google OAuth SVG ───────────────────────────────────────
  const GoogleIcon = () => (
    <svg className="google-icon-svg" viewBox="0 0 24 24" style={{ width: '20px', height: '20px', marginRight: '0.75rem' }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  return (
    <div className="auth-page-wrapper">
      {/* Background decoration */}
      <div className="auth-bg-gradient" />
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-centered-container">
        {/* Logo */}
        <div className="auth-logo-block">
          <Fingerprint size={36} color="var(--primary)" />
          <span className="auth-logo-text">AttendEase</span>
        </div>
        <p className="auth-tagline">Smart QR-Based Attendance with Face Verification</p>

        {/* Portal Toggle */}
        <div className="auth-tab-switcher">
          <button
            className={`auth-tab-btn ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => switchTab('student')}
          >
            <GraduationCap size={18} /> Student
          </button>
          <button
            className={`auth-tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => switchTab('faculty')}
          >
            <BookOpen size={18} /> Faculty
          </button>
        </div>

        {/* Auth Card */}
        <div className="auth-card glass-panel">
          {/* Login / Signup Toggle */}
          <div className="auth-mode-toggle">
            <button
              className={`auth-mode-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthMode('login'); setError(''); setFaceFlow(null); }}
            >
              <LogIn size={16} /> Login
            </button>
            <button
              className={`auth-mode-btn ${authMode === 'signup' ? 'active' : ''}`}
              onClick={() => { setAuthMode('signup'); setError(''); setFaceFlow(null); }}
            >
              <UserPlus size={16} /> Sign Up
            </button>
          </div>

          {/* ─── STUDENT PORTAL ──────────────────────────────── */}
          {activeTab === 'student' && (
            <>
              {faceFlow && faceFlow.active ? (
                <div className="auth-face-section">
                  <h3 className="auth-face-title">
                    {faceFlow.mode === 'register' ? '📸 Register Your Face' : '🔒 Verify Your Identity'}
                  </h3>
                  <p className="auth-face-desc">
                    {faceFlow.mode === 'register'
                      ? "Look directly at the camera. We'll securely save your facial geometry for future logins."
                      : 'Face the camera to confirm your identity.'}
                  </p>
                  <FaceVerification
                    mode={faceFlow.mode}
                    token={faceFlow.token}
                    onSuccess={handleFaceSuccess}
                    onCancel={() => { setFaceFlow(null); window.sessionStorage.removeItem('temp_user'); }}
                  />
                </div>
              ) : authMode === 'signup' ? (
                <form onSubmit={handleStudentSignup} className="auth-form">
                  <h3 className="auth-form-title">Create Student Account</h3>

                  <div className="auth-field">
                    <User size={18} className="auth-field-icon" />
                    <input type="text" placeholder="Full Name" value={stuName} onChange={e => setStuName(e.target.value)} required className="auth-input" />
                  </div>

                  <div className="auth-field">
                    <Mail size={18} className="auth-field-icon" />
                    <input type="email" placeholder="Gmail Address" value={stuEmail} onChange={e => setStuEmail(e.target.value)} required className="auth-input" />
                  </div>

                  <div className="auth-field">
                    <Hash size={18} className="auth-field-icon" />
                    <input type="text" placeholder="Student ID (e.g. STU001)" value={stuId} onChange={e => setStuId(e.target.value)} required className="auth-input" />
                  </div>

                  <div className="auth-row">
                    <div className="auth-field">
                      <Building2 size={18} className="auth-field-icon" />
                      <select value={stuDept} onChange={e => setStuDept(e.target.value)} className="auth-input auth-select">
                        <option>Computer Science</option>
                        <option>Information Technology</option>
                        <option>Electronics</option>
                        <option>Mechanical</option>
                        <option>Civil</option>
                      </select>
                    </div>
                    <div className="auth-field">
                      <GraduationCap size={18} className="auth-field-icon" />
                      <select value={stuSemester} onChange={e => setStuSemester(e.target.value)} className="auth-input auth-select">
                        <option>1st Semester</option>
                        <option>2nd Semester</option>
                        <option>3rd Semester</option>
                        <option>4th Semester</option>
                        <option>5th Semester</option>
                        <option>6th Semester</option>
                        <option>7th Semester</option>
                        <option>8th Semester</option>
                      </select>
                    </div>
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <button type="submit" className="auth-submit-btn student-gradient" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Sign Up & Register Face'}
                    <ArrowRight size={18} />
                  </button>

                  <p className="auth-switch-text">
                    Already have an account?{' '}
                    <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('login'); setError(''); }}>Login here</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleStudentLogin} className="auth-form">
                  <h3 className="auth-form-title">Student Login</h3>
                  <p className="auth-form-subtitle">Sign in with your registered Gmail to verify your face</p>

                  <div className="auth-field">
                    <Mail size={18} className="auth-field-icon" />
                    <input type="email" placeholder="Registered Gmail Address" value={stuEmail} onChange={e => setStuEmail(e.target.value)} required className="auth-input" />
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <button type="submit" className="auth-submit-btn student-gradient" disabled={loading}>
                    <GoogleIcon />
                    {loading ? 'Authenticating...' : 'Continue with Google'}
                  </button>

                  <p className="auth-switch-text">
                    Don't have an account?{' '}
                    <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('signup'); setError(''); }}>Sign up here</button>
                  </p>
                </form>
              )}
            </>
          )}

          {/* ─── FACULTY PORTAL ──────────────────────────────── */}
          {activeTab === 'faculty' && (
            <>
              {authMode === 'signup' ? (
                <form onSubmit={handleFacultySignup} className="auth-form">
                  <h3 className="auth-form-title">Create Faculty Account</h3>

                  <div className="auth-field">
                    <User size={18} className="auth-field-icon" />
                    <input type="text" placeholder="Full Name (e.g. Dr. Sarah Miller)" value={facName} onChange={e => setFacName(e.target.value)} required className="auth-input" />
                  </div>

                  <div className="auth-field">
                    <Mail size={18} className="auth-field-icon" />
                    <input type="email" placeholder="University Gmail" value={facEmail} onChange={e => setFacEmail(e.target.value)} required className="auth-input" />
                  </div>

                  <div className="auth-field">
                    <Building2 size={18} className="auth-field-icon" />
                    <select value={facDept} onChange={e => setFacDept(e.target.value)} className="auth-input auth-select">
                      <option>Computer Science</option>
                      <option>Information Technology</option>
                      <option>Electronics</option>
                      <option>Mechanical</option>
                      <option>Civil</option>
                    </select>
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <button type="submit" className="auth-submit-btn faculty-gradient" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Faculty Account'}
                    <ArrowRight size={18} />
                  </button>

                  <p className="auth-switch-text">
                    Already have an account?{' '}
                    <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('login'); setError(''); }}>Login here</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleFacultyLogin} className="auth-form">
                  <h3 className="auth-form-title">Faculty Login</h3>
                  <p className="auth-form-subtitle">Sign in with your university Google account</p>

                  <div className="auth-field">
                    <Mail size={18} className="auth-field-icon" />
                    <input type="email" placeholder="Registered University Gmail" value={facEmail} onChange={e => setFacEmail(e.target.value)} required className="auth-input" />
                  </div>

                  {error && <div className="auth-error">{error}</div>}

                  <button type="submit" className="auth-submit-btn faculty-gradient" disabled={loading}>
                    <GoogleIcon />
                    {loading ? 'Authenticating...' : 'Continue with Google'}
                  </button>

                  <p className="auth-switch-text">
                    Don't have an account?{' '}
                    <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('signup'); setError(''); }}>Sign up here</button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
