import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserService } from '../models/User';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'attendease_super_secret_jwt_key_2026';

// ─── STUDENT SIGNUP ───────────────────────────────────────────────
router.post('/student/signup', async (req, res) => {
  const { studentId, name, email, department, semester } = req.body;

  if (!studentId || !name || !email) {
    return res.status(400).json({ message: 'Student ID, Name, and Email are required.' });
  }

  try {
    // Check if email or studentId already exists
    const existingByEmail = await UserService.findByEmail(email);
    if (existingByEmail) {
      return res.status(409).json({ message: 'An account with this email already exists. Please login instead.' });
    }
    const existingById = await UserService.findById(studentId);
    if (existingById) {
      return res.status(409).json({ message: 'This Student ID is already registered.' });
    }

    const user = await UserService.createUser({
      id: studentId,
      name,
      email,
      role: 'student',
      department: department || 'Computer Science',
      semester: semester || '1st Semester',
      subjects: ['Machine Learning', 'Artificial Intelligence', 'Internship', 'Project', 'ECD', 'Mobile Application']
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        subjects: user.subjects,
        hasFaceDescriptor: false
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── STUDENT LOGIN (Google OAuth simulation) ──────────────────────
router.post('/student/login', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const user = await UserService.findByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email. Please sign up first.' });
    }

    if (user.role !== 'student') {
      return res.status(403).json({ message: 'This email is registered as faculty. Use the Faculty Portal.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        subjects: user.subjects,
        hasFaceDescriptor: !!user.faceDescriptor && user.faceDescriptor.length > 0
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── FACULTY SIGNUP ───────────────────────────────────────────────
router.post('/faculty/signup', async (req, res) => {
  const { name, email, department, subjects } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and Email are required.' });
  }

  try {
    const existing = await UserService.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists. Please login instead.' });
    }

    const defaultSubjects = subjects && subjects.length > 0
      ? subjects
      : ['Machine Learning', 'Artificial Intelligence', 'Internship', 'Project', 'ECD', 'Mobile Application'];

    const user = await UserService.createUser({
      id: email,
      name,
      email,
      role: 'faculty',
      department: department || 'Computer Science',
      subjects: defaultSubjects
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        subjects: user.subjects
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── FACULTY LOGIN (Google OAuth simulation) ──────────────────────
router.post('/faculty/login', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const user = await UserService.findByEmail(email);

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email. Please sign up first.' });
    }

    if (user.role !== 'faculty') {
      return res.status(403).json({ message: 'This email is registered as a student. Use the Student Portal.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        subjects: user.subjects
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── REGISTER FACE DESCRIPTOR ─────────────────────────────────────
router.post('/student/register-face', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can register face descriptors.' });
  }

  const { descriptor } = req.body;
  if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({ message: 'Invalid face descriptor format.' });
  }

  try {
    const updated = await UserService.updateUser(req.user.id, { faceDescriptor: descriptor });
    if (!updated) return res.status(404).json({ message: 'User not found.' });
    return res.json({ message: 'Face descriptor registered successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── FETCH FACE DESCRIPTOR ───────────────────────────────────────
router.get('/student/face-descriptor', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can access this.' });
  }

  try {
    const user = await UserService.findById(req.user.id);
    if (!user || !user.faceDescriptor || user.faceDescriptor.length === 0) {
      return res.status(404).json({ message: 'Face descriptor not found.' });
    }
    return res.json({ descriptor: user.faceDescriptor });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── PROFILE LOOKUP ──────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await UserService.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        subjects: user.subjects,
        hasFaceDescriptor: !!user.faceDescriptor && user.faceDescriptor.length > 0
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
