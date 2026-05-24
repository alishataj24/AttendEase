import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { QRSessionService } from '../models/QRSession';
import { AttendanceService, IAttendance } from '../models/Attendance';
import { UserService } from '../models/User';
import { broadcastToFaculty } from '../config/websocket';
import crypto from 'crypto';

const router = Router();

const SUBJECTS = [
  'Machine Learning',
  'Artificial Intelligence',
  'Internship',
  'Project',
  'ECD',
  'Mobile Application'
];

// Seed initial mock attendance logs for data richness
export async function seedAttendanceLogs() {
  const records = await AttendanceService.getAll();
  if (records.length > 0) return;

  console.log('Seeding mock attendance records for testing...');
  const students = ['STU001', 'STU002', 'STU003'];
  const studentNames: Record<string, string> = {
    'STU001': 'Alice Johnson',
    'STU002': 'Bob Smith',
    'STU003': 'Charlie Brown'
  };

  const dummyRecords: IAttendance[] = [];
  const baseDate = new Date();
  
  // Seed attendance for the past 14 days
  for (let i = 14; i >= 1; i--) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // For each subject, conduct a class every few days
    SUBJECTS.forEach((subject, subIndex) => {
      // Conduct classes on specific days to keep it realistic
      if ((i + subIndex) % 2 === 0) {
        students.forEach(studentId => {
          // Add some randomness to attendance (e.g. Alice has 85%, Bob 75%, Charlie 90%)
          let isPresent = true;
          const rand = Math.random();
          if (studentId === 'STU001' && subject === 'ECD' && rand > 0.6) isPresent = false; // Lower attendance in ECD
          else if (studentId === 'STU001' && subject === 'Artificial Intelligence' && rand > 0.7) isPresent = false;
          else if (studentId === 'STU002' && subject === 'Artificial Intelligence' && rand > 0.6) isPresent = false;
          else if (studentId === 'STU002' && rand > 0.8) isPresent = false;
          else if (studentId === 'STU003' && rand > 0.9) isPresent = false;

          if (isPresent) {
            dummyRecords.push({
              attendanceId: `ATT_${crypto.randomBytes(6).toString('hex')}`,
              studentId,
              studentName: studentNames[studentId],
              subject,
              date: dateStr,
              time: '10:15:00',
              status: 'Present',
              sessionId: `SES_SEED_${i}`
            });
          }
        });
      }
    });
  }

  for (const record of dummyRecords) {
    await AttendanceService.logAttendance(record);
  }
  console.log(`Seeded ${dummyRecords.length} attendance records.`);
}

// Student Scan QR Route
router.post('/scan', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can scan QR codes to mark attendance.' });
  }

  const { sessionId, token } = req.body;
  if (!sessionId || !token) {
    return res.status(400).json({ message: 'Session ID and token are required.' });
  }

  try {
    const session = await QRSessionService.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(400).json({ message: 'This attendance session is no longer active.' });
    }

    // Verify token matches current token in DB
    if (session.token !== token) {
      return res.status(400).json({ message: 'Invalid or expired QR code. Please scan the refreshed QR.' });
    }

    // Check expiration time
    const now = new Date();
    const expiry = new Date(session.expiryTime);
    if (now.getTime() > expiry.getTime()) {
      return res.status(400).json({ message: 'QR code expired. Wait for the screen to refresh.' });
    }

    // Check if duplicate attendance
    const isDuplicate = await AttendanceService.checkDuplicate(req.user.id, sessionId);
    if (isDuplicate) {
      return res.status(400).json({ message: 'You have already marked attendance for this session.' });
    }

    const faculty = await UserService.findById(session.facultyId);
    const facultyName = faculty ? faculty.name : 'Faculty';

    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    const attendanceRecord: IAttendance = {
      attendanceId: 'ATT_' + crypto.randomBytes(8).toString('hex'),
      studentId: req.user.id,
      studentName: req.user.name,
      subject: session.subject,
      date: dateStr,
      time: timeStr,
      status: 'Present',
      sessionId
    };

    const savedRecord = await AttendanceService.logAttendance(attendanceRecord);

    // Broadcast to faculty via WebSocket for real-time dashboard update
    broadcastToFaculty(session.facultyId, {
      type: 'ATTENDANCE_MARKED',
      data: {
        studentId: req.user.id,
        studentName: req.user.name,
        subject: session.subject,
        date: dateStr,
        time: timeStr,
        status: 'Present',
        sessionId
      }
    });

    return res.status(201).json({
      message: 'Attendance marked successfully',
      attendance: {
        subject: session.subject,
        faculty: facultyName,
        date: dateStr,
        time: timeStr
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to process QR scan', error: error.message });
  }
});

// Student Dashboard API
router.get('/student/dashboard', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const studentId = req.user.id;
    const records = await AttendanceService.findByStudent(studentId);

    // Count classes per subject
    // For simplicity, we assume there have been a total of 15 scheduled classes per subject
    // We compute total classes and attended classes
    const totalScheduledPerSubject: Record<string, number> = {
      'Machine Learning': 12,
      'Artificial Intelligence': 10,
      'Internship': 8,
      'Project': 10,
      'ECD': 12,
      'Mobile Application': 11
    };

    const subjectCards = SUBJECTS.map(subject => {
      const total = totalScheduledPerSubject[subject] || 10;
      const attended = records.filter(r => r.subject === subject && r.status === 'Present').length;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      
      let statusColor = 'green';
      if (percentage < 65) statusColor = 'red';
      else if (percentage <= 75) statusColor = 'yellow';

      return {
        subject,
        attended,
        total,
        percentage,
        statusColor
      };
    });

    const totalAttended = records.filter(r => r.status === 'Present').length;
    const totalPossibleClasses = Object.values(totalScheduledPerSubject).reduce((a, b) => a + b, 0);
    const overallPercentage = Math.round((totalAttended / totalPossibleClasses) * 100);
    const absentClasses = Math.max(0, totalPossibleClasses - totalAttended);

    // Filter today's classes
    const todayClasses = [
      { subject: 'Machine Learning', time: '09:00 AM - 10:30 AM', room: 'Lab 3', status: 'Completed' },
      { subject: 'Artificial Intelligence', time: '11:00 AM - 12:30 PM', room: 'Room 402', status: 'Completed' },
      { subject: 'Mobile Application', time: '02:00 PM - 03:30 PM', room: 'Room 101', status: 'Scheduled' }
    ];

    return res.json({
      metrics: {
        overallPercentage,
        classesAttended: totalAttended,
        absentClasses,
        todayClassesCount: todayClasses.length
      },
      subjectCards,
      todayClasses,
      recentAttendance: records.slice(-5).reverse()
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve dashboard metrics', error: error.message });
  }
});

// Faculty Dashboard API
router.get('/faculty/dashboard', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'faculty') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const allRecords = await AttendanceService.getAll();
    const allSessions = await QRSessionService.getAll();
    
    // Total students (fixed seed data count is 3)
    const totalStudents = 3;

    // Faculty sessions
    const facultySessions = allSessions.filter(s => s.facultyId === req.user!.id);
    const classesConducted = facultySessions.length + 12; // seed offset

    const activeSession = facultySessions.find(s => s.isActive);

    // Overall attendance percentage across all student records in this faculty's subjects
    const faculty = await UserService.findById(req.user.id);
    const facultySubjects = faculty ? faculty.subjects : SUBJECTS;
    const relatedRecords = allRecords.filter(r => facultySubjects.includes(r.subject));
    
    // Calculate total scheduled classes for the related subjects (across all 3 students)
    // E.g. conduct * 3 students
    const totalStudentClassPossible = classesConducted * totalStudents;
    const totalPresentCount = relatedRecords.filter(r => r.status === 'Present').length;
    const overallPercentage = totalStudentClassPossible > 0 ? Math.round((totalPresentCount / totalStudentClassPossible) * 100) : 78;

    // Generate daily/weekly trends for charts
    // Group records by day for the last 7 days
    const dailyData: any[] = [];
    const baseDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = allRecords.filter(r => r.date === dateStr && r.status === 'Present').length;
      
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dailyData.push({
        day: dayNames[d.getDay()],
        date: dateStr,
        attendance: count
      });
    }

    // Subject breakdown
    const subjectBreakdown = facultySubjects.map((sub: string) => {
      const present = allRecords.filter(r => r.subject === sub && r.status === 'Present').length;
      // Mock class count
      const total = 14; 
      const percentage = Math.round((present / (total * totalStudents)) * 100) || 75;
      return {
        subject: sub,
        percentage
      };
    });

    return res.json({
      metrics: {
        totalStudents,
        classesConducted,
        activeSession: activeSession ? 1 : 0,
        overallPercentage
      },
      charts: {
        dailyAttendance: dailyData,
        subjectBreakdown
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve faculty dashboard', error: error.message });
  }
});

// Attendance Records List API (Search, Filter, Sort, Pagination)
router.get('/records', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, subject, date, sortBy, sortOrder, page = '1', limit = '10' } = req.query;

    let records = await AttendanceService.getAll();

    // Filter by Faculty subjects if user is faculty
    if (req.user && req.user.role === 'faculty') {
      const faculty = await UserService.findById(req.user.id);
      const facultySubjects = faculty ? faculty.subjects : SUBJECTS;
      records = records.filter(r => facultySubjects.includes(r.subject));
    }

    // Apply Search
    if (search) {
      const q = (search as string).toLowerCase();
      records = records.filter(r => 
        r.studentName.toLowerCase().includes(q) || 
        r.studentId.toLowerCase().includes(q)
      );
    }

    // Apply Subject Filter
    if (subject) {
      records = records.filter(r => r.subject === subject);
    }

    // Apply Date Filter
    if (date) {
      records = records.filter(r => r.date === date);
    }

    // Apply Sorting
    const sField = (sortBy as string) || 'date';
    const sOrder = (sortOrder as string) || 'desc';

    records.sort((a: any, b: any) => {
      let valA = a[sField];
      let valB = b[sField];
      
      // Handle date/time merging for accurate sort
      if (sField === 'date') {
        valA = new Date(`${a.date}T${a.time}`).getTime();
        valB = new Date(`${b.date}T${b.time}`).getTime();
      }

      if (valA < valB) return sOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const p = parseInt(page as string, 10);
    const l = parseInt(limit as string, 10);
    const startIndex = (p - 1) * l;
    const endIndex = p * l;

    const total = records.length;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return res.json({
      records: paginatedRecords,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve attendance records', error: error.message });
  }
});

export default router;
