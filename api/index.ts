/**
 * Vercel Serverless Function — Self-contained Express API for AttendEase.
 * Uses in-memory data stores (seeded on cold-start) so no external DB is needed.
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ────────────────────────────── Types ──────────────────────────────
interface IUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty';
  department?: string;
  semester?: string;
  subjects: string[];
  faceDescriptor?: number[];
}
interface IQRSession {
  sessionId: string;
  facultyId: string;
  subject: string;
  token: string;
  isActive: boolean;
  startTime: string;
  expiryTime: string;
}
interface IAttendance {
  attendanceId: string;
  studentId: string;
  studentName: string;
  subject: string;
  date: string;
  time: string;
  status: 'Present' | 'Absent';
  sessionId: string;
}
interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; name: string; role: 'student' | 'faculty' };
}

// ────────────────────────────── In-Memory DB ──────────────────────
const SUBJECTS = ['Machine Learning', 'Artificial Intelligence', 'Internship', 'Project', 'ECD', 'Mobile Application'];
const JWT_SECRET = process.env.JWT_SECRET || 'attendease_super_secret_jwt_key_2026';

let users: IUser[] = [];
let sessions: IQRSession[] = [];
let attendance: IAttendance[] = [];
let seeded = false;

function seed() {
  if (seeded) return;
  seeded = true;

  users = [
    { id: 'student.alice@gmail.com', name: 'Alice Johnson', email: 'student.alice@gmail.com', role: 'student', department: 'Computer Science', semester: '6th Semester', subjects: SUBJECTS },
    { id: 'student.bob@gmail.com', name: 'Bob Smith', email: 'student.bob@gmail.com', role: 'student', department: 'Information Technology', semester: '4th Semester', subjects: SUBJECTS },
    { id: 'prof.miller@gmail.com', name: 'Dr. Sarah Miller', email: 'prof.miller@gmail.com', role: 'faculty', department: 'Computer Science', subjects: ['Machine Learning', 'Artificial Intelligence', 'Project'] },
    { id: 'prof.davis@gmail.com', name: 'Prof. Robert Davis', email: 'prof.davis@gmail.com', role: 'faculty', department: 'Information Technology', subjects: ['Internship', 'ECD', 'Mobile Application'] },
  ];

  // Seed attendance
  const students = ['STU001', 'STU002', 'STU003'];
  const studentNames: Record<string, string> = { STU001: 'Alice Johnson', STU002: 'Bob Smith', STU003: 'Charlie Brown' };
  const baseDate = new Date();
  for (let i = 14; i >= 1; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    SUBJECTS.forEach((subject, subIndex) => {
      if ((i + subIndex) % 2 === 0) {
        students.forEach(studentId => {
          let isPresent = true;
          const rand = Math.random();
          if (studentId === 'STU001' && subject === 'ECD' && rand > 0.6) isPresent = false;
          else if (studentId === 'STU002' && rand > 0.8) isPresent = false;
          else if (studentId === 'STU003' && rand > 0.9) isPresent = false;
          if (isPresent) {
            attendance.push({
              attendanceId: `ATT_${crypto.randomBytes(6).toString('hex')}`,
              studentId, studentName: studentNames[studentId],
              subject, date: dateStr, time: '10:15:00', status: 'Present', sessionId: `SES_SEED_${i}`
            });
          }
        });
      }
    });
  }
}

// ────────────────────────────── Middleware ─────────────────────────
function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// ────────────────────────────── Express App ───────────────────────
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Seed data on every request (no-op if already seeded)
app.use((_req, _res, next) => { seed(); next(); });

// ─── Health ───────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── AUTH ROUTES ──────────────────────────────────────────────────
app.post('/api/auth/student/signup', (req: Request, res: Response) => {
  const { studentId, name, email, department, semester } = req.body;
  if (!studentId || !name || !email) return res.status(400).json({ message: 'Student ID, Name, and Email are required.' });
  if (users.find(u => u.email === email)) return res.status(409).json({ message: 'An account with this email already exists. Please login instead.' });
  if (users.find(u => u.id === studentId)) return res.status(409).json({ message: 'This Student ID is already registered.' });

  const user: IUser = { id: studentId, name, email, role: 'student', department: department || 'Computer Science', semester: semester || '1st Semester', subjects: SUBJECTS };
  users.push(user);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.status(201).json({ token, user: { ...user, hasFaceDescriptor: false } });
});

app.post('/api/auth/student/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: 'No account found with this email. Please sign up first.' });
  if (user.role !== 'student') return res.status(403).json({ message: 'This email is registered as faculty. Use the Faculty Portal.' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { ...user, hasFaceDescriptor: !!user.faceDescriptor && user.faceDescriptor.length > 0 } });
});

app.post('/api/auth/faculty/signup', (req: Request, res: Response) => {
  const { name, email, department, subjects: subs } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and Email are required.' });
  if (users.find(u => u.email === email)) return res.status(409).json({ message: 'An account with this email already exists. Please login instead.' });

  const user: IUser = { id: email, name, email, role: 'faculty', department: department || 'Computer Science', subjects: subs && subs.length > 0 ? subs : SUBJECTS };
  users.push(user);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, subjects: user.subjects } });
});

app.post('/api/auth/faculty/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ message: 'No account found with this email. Please sign up first.' });
  if (user.role !== 'faculty') return res.status(403).json({ message: 'This email is registered as a student. Use the Student Portal.' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, subjects: user.subjects } });
});

app.post('/api/auth/student/register-face', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ message: 'Only students can register face descriptors.' });
  const { descriptor } = req.body;
  if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) return res.status(400).json({ message: 'Invalid face descriptor format.' });
  const user = users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.faceDescriptor = descriptor;
  return res.json({ message: 'Face descriptor registered successfully.' });
});

app.get('/api/auth/student/face-descriptor', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ message: 'Only students can access this.' });
  const user = users.find(u => u.id === req.user!.id);
  if (!user || !user.faceDescriptor || user.faceDescriptor.length === 0) return res.status(404).json({ message: 'Face descriptor not found.' });
  return res.json({ descriptor: user.faceDescriptor });
});

app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const user = users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, semester: user.semester, subjects: user.subjects, hasFaceDescriptor: !!user.faceDescriptor && user.faceDescriptor.length > 0 } });
});

// ─── SESSION ROUTES ───────────────────────────────────────────────
app.post('/api/session/start', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') return res.status(403).json({ message: 'Only faculty can start attendance sessions.' });
  const { subject } = req.body;
  if (!subject) return res.status(400).json({ message: 'Subject is required.' });

  const existing = sessions.find(s => s.facultyId === req.user!.id && s.isActive);
  if (existing) existing.isActive = false;

  const sessionId = 'SES_' + crypto.randomBytes(8).toString('hex');
  const token = crypto.randomBytes(16).toString('hex');
  const now = new Date();
  const session: IQRSession = { sessionId, facultyId: req.user.id, subject, token, isActive: true, startTime: now.toISOString(), expiryTime: new Date(now.getTime() + 12000).toISOString() };
  sessions.push(session);
  return res.status(201).json({ session });
});

app.post('/api/session/:sessionId/rotate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') return res.status(403).json({ message: 'Only faculty can rotate session tokens.' });
  const s = sessions.find(s => s.sessionId === req.params.sessionId);
  if (!s || !s.isActive) return res.status(404).json({ message: 'Session not found or inactive.' });
  if (s.facultyId !== req.user.id) return res.status(403).json({ message: 'You do not own this session.' });
  s.token = crypto.randomBytes(16).toString('hex');
  s.expiryTime = new Date(Date.now() + 12000).toISOString();
  return res.json({ session: s });
});

app.post('/api/session/:sessionId/end', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') return res.status(403).json({ message: 'Only faculty can end sessions.' });
  const s = sessions.find(s => s.sessionId === req.params.sessionId);
  if (!s) return res.status(404).json({ message: 'Session not found.' });
  if (s.facultyId !== req.user.id) return res.status(403).json({ message: 'You do not own this session.' });
  s.isActive = false;
  return res.json({ session: s });
});

app.get('/api/session/latest-active', authMiddleware, (_req: AuthenticatedRequest, res: Response) => {
  const active = sessions.find(s => s.isActive);
  return res.json({ session: active || null });
});

app.get('/api/session/active', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') return res.status(403).json({ message: 'Access denied.' });
  const session = sessions.find(s => s.facultyId === req.user!.id && s.isActive);
  return res.json({ session: session || null });
});

// ─── ATTENDANCE ROUTES ────────────────────────────────────────────
app.post('/api/attendance/scan', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ message: 'Only students can scan QR codes.' });
  const { sessionId, token } = req.body;
  if (!sessionId || !token) return res.status(400).json({ message: 'Session ID and token are required.' });

  const session = sessions.find(s => s.sessionId === sessionId);
  if (!session || !session.isActive) return res.status(400).json({ message: 'This attendance session is no longer active.' });
  if (session.token !== token) return res.status(400).json({ message: 'Invalid or expired QR code.' });
  if (new Date().getTime() > new Date(session.expiryTime).getTime()) return res.status(400).json({ message: 'QR code expired.' });
  if (attendance.some(a => a.studentId === req.user!.id && a.sessionId === sessionId)) return res.status(400).json({ message: 'You have already marked attendance for this session.' });

  const now = new Date();
  const record: IAttendance = { attendanceId: 'ATT_' + crypto.randomBytes(8).toString('hex'), studentId: req.user.id, studentName: req.user.name, subject: session.subject, date: now.toISOString().split('T')[0], time: now.toTimeString().split(' ')[0], status: 'Present', sessionId };
  attendance.push(record);

  const faculty = users.find(u => u.id === session.facultyId);
  return res.status(201).json({ message: 'Attendance marked successfully', attendance: { subject: session.subject, faculty: faculty?.name || 'Faculty', date: record.date, time: record.time } });
});

app.get('/api/attendance/student/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ message: 'Access denied.' });
  const records = attendance.filter(a => a.studentId === req.user!.id);
  const totalScheduled: Record<string, number> = { 'Machine Learning': 12, 'Artificial Intelligence': 10, Internship: 8, Project: 10, ECD: 12, 'Mobile Application': 11 };

  const subjectCards = SUBJECTS.map(subject => {
    const total = totalScheduled[subject] || 10;
    const attended = records.filter(r => r.subject === subject && r.status === 'Present').length;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
    return { subject, attended, total, percentage, statusColor: percentage < 65 ? 'red' : percentage <= 75 ? 'yellow' : 'green' };
  });

  const totalAttended = records.filter(r => r.status === 'Present').length;
  const totalPossible = Object.values(totalScheduled).reduce((a, b) => a + b, 0);
  const todayClasses = [
    { subject: 'Machine Learning', time: '09:00 AM - 10:30 AM', room: 'Lab 3', status: 'Completed' },
    { subject: 'Artificial Intelligence', time: '11:00 AM - 12:30 PM', room: 'Room 402', status: 'Completed' },
    { subject: 'Mobile Application', time: '02:00 PM - 03:30 PM', room: 'Room 101', status: 'Scheduled' },
  ];

  return res.json({
    metrics: { overallPercentage: Math.round((totalAttended / totalPossible) * 100), classesAttended: totalAttended, absentClasses: Math.max(0, totalPossible - totalAttended), todayClassesCount: todayClasses.length },
    subjectCards, todayClasses, recentAttendance: records.slice(-5).reverse()
  });
});

app.get('/api/attendance/faculty/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') return res.status(403).json({ message: 'Access denied.' });
  const totalStudents = 3;
  const facultySessions = sessions.filter(s => s.facultyId === req.user!.id);
  const classesConducted = facultySessions.length + 12;
  const activeSession = facultySessions.find(s => s.isActive);
  const faculty = users.find(u => u.id === req.user!.id);
  const facultySubjects = faculty ? faculty.subjects : SUBJECTS;
  const relatedRecords = attendance.filter(r => facultySubjects.includes(r.subject));
  const totalPossible = classesConducted * totalStudents;
  const totalPresent = relatedRecords.filter(r => r.status === 'Present').length;
  const overallPercentage = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 78;

  const dailyData: any[] = [];
  const baseDate = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate); d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyData.push({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], date: dateStr, attendance: attendance.filter(r => r.date === dateStr && r.status === 'Present').length });
  }

  const subjectBreakdown = facultySubjects.map((sub: string) => {
    const present = attendance.filter(r => r.subject === sub && r.status === 'Present').length;
    return { subject: sub, percentage: Math.round((present / (14 * totalStudents)) * 100) || 75 };
  });

  return res.json({ metrics: { totalStudents, classesConducted, activeSession: activeSession ? 1 : 0, overallPercentage }, charts: { dailyAttendance: dailyData, subjectBreakdown } });
});

app.get('/api/attendance/records', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { search, subject, date, sortBy, sortOrder, page = '1', limit = '10' } = req.query;
  let records = [...attendance];

  if (req.user && req.user.role === 'faculty') {
    const faculty = users.find(u => u.id === req.user!.id);
    const subs = faculty ? faculty.subjects : SUBJECTS;
    records = records.filter(r => subs.includes(r.subject));
  }
  if (search) { const q = (search as string).toLowerCase(); records = records.filter(r => r.studentName.toLowerCase().includes(q) || r.studentId.toLowerCase().includes(q)); }
  if (subject) records = records.filter(r => r.subject === subject);
  if (date) records = records.filter(r => r.date === date);

  const sField = (sortBy as string) || 'date';
  const sOrder = (sortOrder as string) || 'desc';
  records.sort((a: any, b: any) => {
    let valA = a[sField], valB = b[sField];
    if (sField === 'date') { valA = new Date(`${a.date}T${a.time}`).getTime(); valB = new Date(`${b.date}T${b.time}`).getTime(); }
    if (valA < valB) return sOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const p = parseInt(page as string, 10), l = parseInt(limit as string, 10);
  const total = records.length;
  return res.json({ records: records.slice((p - 1) * l, p * l), pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) } });
});

export default app;
