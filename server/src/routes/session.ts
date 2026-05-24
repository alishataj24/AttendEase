import { Router, Response } from 'express';
import { QRSessionService, IQRSession } from '../models/QRSession';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Start a new session
router.post('/start', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Only faculty can start attendance sessions.' });
  }

  const { subject } = req.body;
  if (!subject) {
    return res.status(400).json({ message: 'Subject is required.' });
  }

  try {
    // End any existing active sessions for this faculty
    const existing = await QRSessionService.findActiveByFaculty(req.user.id);
    if (existing) {
      await QRSessionService.endSession(existing.sessionId);
    }

    const sessionId = 'SES_' + crypto.randomBytes(8).toString('hex');
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 12000).toISOString(); // 12-second window (10s + 2s buffer)

    const sessionData: IQRSession = {
      sessionId,
      facultyId: req.user.id,
      subject,
      token,
      isActive: true,
      startTime: now.toISOString(),
      expiryTime
    };

    const session = await QRSessionService.createSession(sessionData);
    return res.status(201).json({ session });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to start session', error: error.message });
  }
});

// Rotate QR code token (called by faculty UI every 10s)
router.post('/:sessionId/rotate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Only faculty can rotate session tokens.' });
  }

  const { sessionId } = req.params;
  try {
    const session = await QRSessionService.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ message: 'Session not found or inactive.' });
    }

    if (session.facultyId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this session.' });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date();
    const expiryTime = new Date(now.getTime() + 12000).toISOString(); // 12-second window

    const updated = await QRSessionService.updateToken(sessionId, token, expiryTime);
    return res.json({ session: updated });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to rotate token', error: error.message });
  }
});

// End session
router.post('/:sessionId/end', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Only faculty can end sessions.' });
  }

  const { sessionId } = req.params;
  try {
    const session = await QRSessionService.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    if (session.facultyId !== req.user.id) {
      return res.status(403).json({ message: 'You do not own this session.' });
    }

    const ended = await QRSessionService.endSession(sessionId);
    return res.json({ session: ended });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to end session', error: error.message });
  }
});

// Get the latest active session overall (accessible to students for mock scan & validation)
router.get('/latest-active', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = await QRSessionService.getAll();
    const active = sessions.find(s => s.isActive);
    return res.json({ session: active || null });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch active session', error: error.message });
  }
});

// Get current active session for Faculty
router.get('/active', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const session = await QRSessionService.findActiveByFaculty(req.user.id);
    return res.json({ session });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch active session', error: error.message });
  }
});

export default router;
