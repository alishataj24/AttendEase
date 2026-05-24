import React from 'react';
import { Link } from 'react-router-dom';
import { Fingerprint, ArrowRight, ShieldCheck, BarChart3, Smartphone } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <nav className="landing-nav">
        <div className="sidebar-logo" style={{ marginBottom: 0 }}>
          <Fingerprint size={32} color="var(--primary)" />
          AttendEase
        </div>
        <ul className="nav-links">
          <li><a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</a></li>
          <li><a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a></li>
          <li><a href="#about" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }}>About</a></li>
          <li><a href="#contact" className="nav-link" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>Contact</a></li>
        </ul>
        <Link to="/auth" className="btn btn-secondary">Login</Link>
      </nav>

      <section className="landing-hero">
        <div className="hero-grid">
          <div>
            <div className="hero-tag">
              <ShieldCheck size={16} /> 100% Secure & Fast
            </div>
            <h1 className="hero-title">
              Smart Attendance<br />
              <span>Management System</span>
            </h1>
            <p className="hero-subtitle">
              Secure QR-based attendance with real-time tracking, dynamic token rotation, and comprehensive analytics for modern universities.
            </p>
            <div className="hero-buttons">
              <Link to="/auth" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.05rem' }}>
                Get Started <ArrowRight size={20} />
              </Link>
              <a href="#features" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.05rem' }}>
                Learn More
              </a>
            </div>
          </div>
          <div className="hero-illustration">
            {/* Abstract SVG Illustration */}
            <svg className="svg-illustration" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <circle cx="200" cy="200" r="160" fill="rgba(99, 102, 241, 0.1)" />
              <circle cx="200" cy="200" r="120" fill="rgba(6, 182, 212, 0.1)" />
              <rect x="120" y="80" width="160" height="240" rx="20" fill="url(#grad1)" opacity="0.9" />
              <rect x="140" y="100" width="120" height="120" rx="16" fill="white" />
              <path d="M160 120 h80 M160 140 h80 M160 160 h80 M160 180 h80 M160 200 h40" stroke="url(#grad1)" strokeWidth="6" strokeLinecap="round" />
              <circle cx="280" cy="260" r="60" fill="url(#grad2)" opacity="0.95" />
              <path d="M260 260 L275 275 L305 240" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Why choose AttendEase?</h2>
          <p className="section-subtitle">A fully integrated ecosystem designed to streamline attendance tracking for both students and faculty.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon-box"><Fingerprint size={24} /></div>
            <h3 className="feature-title">Dynamic QR Attendance</h3>
            <p className="feature-desc">QR codes refresh every 10 seconds with cryptographic tokens to prevent proxy attendance and ensure physical presence.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon-box" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}><BarChart3 size={24} /></div>
            <h3 className="feature-title">Real-Time Analytics</h3>
            <p className="feature-desc">Dashboards update instantly as students scan. Faculty can monitor session health and historical attendance trends visually.</p>
          </div>
          <div className="feature-card glass-panel">
            <div className="feature-icon-box" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}><Smartphone size={24} /></div>
            <h3 className="feature-title">Student Portal</h3>
            <p className="feature-desc">Students get a personalized dashboard tracking their subject-wise attendance percentages with color-coded warning indicators.</p>
          </div>
        </div>
      </section>
      <section id="about" className="features-section" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="section-header">
          <h2 className="section-title">About AttendEase</h2>
          <p className="section-subtitle">Bridging the gap between technology and education.</p>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
            AttendEase was built with a clear mission: to make tracking attendance seamless, foolproof, and completely digitized. No more passing around paper sheets or manually calling out names.
          </p>
          <p style={{ fontSize: '1.1rem' }}>
            Our dynamic, cryptographically secure QR system ensures that only students physically present in the classroom can mark their attendance, bringing transparency and accuracy back to the classroom environment.
          </p>
        </div>
      </section>

      <section id="contact" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Get in Touch</h2>
          <p className="section-subtitle">Have questions or want a demo? We're here to help.</p>
        </div>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Contact our Support Team</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              We are constantly working to improve the AttendEase experience for universities worldwide.
            </p>
            <a href="mailto:support@attendease.com" className="btn btn-primary">
              Email support@attendease.com
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
