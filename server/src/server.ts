import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { UserService } from './models/User';
import { seedAttendanceLogs } from './routes/attendance';
import { setupWebSockets } from './config/websocket';

// Routers
import authRouter from './routes/auth';
import sessionRouter from './routes/session';
import attendanceRouter from './routes/attendance';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS setup - allow frontend origin
app.use(cors({
  origin: '*', // For demo compatibility, allow all origins
  credentials: true
}));

app.use(express.json());

// Routes mapping
app.use('/api/auth', authRouter);
app.use('/api/session', sessionRouter);
app.use('/api/attendance', attendanceRouter);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Serve com.chrome.devtools.json to satisfy Chrome DevTools internal requests and avoid 404/CSP warnings
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'self' *;");
  res.json({ status: "ok", app: "AttendEase" });
});

// Root route - serve a beautiful premium status page
app.get('/', (req, res) => {
  res.setHeader("Content-Security-Policy", "default-src 'self' http://localhost:5173 http://localhost:5001; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:5173 ws://localhost:5001 http://localhost:5001;");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AttendEase Server API</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg: #0b0f19;
          --panel: rgba(17, 25, 40, 0.75);
          --border: rgba(255, 255, 255, 0.08);
          --text: #f3f4f6;
          --text-muted: #9ca3af;
          --primary: #6366f1;
          --primary-hover: #4f46e5;
          --success: #10b981;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        /* Gradient Orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          z-index: 0;
          opacity: 0.4;
        }
        .orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
          top: -10%;
          left: -10%;
        }
        .orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #a855f7 0%, transparent 70%);
          bottom: -15%;
          right: -10%;
        }
        .container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          padding: 2rem;
        }
        .card {
          background: var(--panel);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .logo-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 16px;
          margin-bottom: 1.5rem;
          color: var(--primary);
        }
        .logo-box svg {
          width: 32px;
          height: 32px;
        }
        h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .status-container {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 0.375rem 1rem;
          border-radius: 9999px;
          margin-bottom: 2rem;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background-color: var(--success);
          border-radius: 50%;
          position: relative;
        }
        .status-dot::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--success);
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        .status-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--success);
        }
        p.desc {
          color: var(--text-muted);
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2.5rem;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          background: var(--primary);
          color: #fff;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
        }
        .btn:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
        }
        .btn:active {
          transform: translateY(0);
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="container">
        <div class="card">
          <div class="logo-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12c0-1.66-4-3-9-3s-9 1.34-9 3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              <path d="M21 5c0-1.66-4-3-9-3S3 3.34 3 5"/>
            </svg>
          </div>
          <h1>AttendEase Backend</h1>
          <div class="status-container">
            <div class="status-dot"></div>
            <span class="status-text">Server Online</span>
          </div>
          <p class="desc">The secure attendance backend API server is running successfully. To manage attendance, please open the student or faculty web portal dashboard.</p>
          <a href="http://localhost:5173" class="btn">
            Open Frontend Portal
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
});

const server = http.createServer(app);

// Initialize WebSockets
setupWebSockets(server);

// Boot server and connect DB
async function boot() {
  await connectDB();
  
  // Seed Database (MongoDB or Local File)
  await UserService.seedUsers();
  await seedAttendanceLogs();

  server.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(` AttendEase backend running on http://localhost:${PORT}`);
    console.log(`=============================================`);
  });
}

boot().catch(err => {
  console.error('Server boot failed:', err);
});
