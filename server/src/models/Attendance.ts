import mongoose, { Schema } from 'mongoose';
import { db, isUsingMongoDB } from '../config/db';

export interface IAttendance {
  attendanceId: string;
  studentId: string;
  studentName: string;
  subject: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  status: 'Present' | 'Absent';
  sessionId: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  attendanceId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  sessionId: { type: String, required: true }
});

export const MongoAttendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

export const AttendanceService = {
  async logAttendance(record: IAttendance): Promise<IAttendance> {
    if (isUsingMongoDB) {
      const attendance = new MongoAttendance(record);
      await attendance.save();
      return attendance.toObject();
    } else {
      const list = await db.getTable<IAttendance>('attendance');
      list.push(record);
      await db.writeTable('attendance', list);
      return record;
    }
  },

  async findBySession(sessionId: string): Promise<IAttendance[]> {
    if (isUsingMongoDB) {
      return MongoAttendance.find({ sessionId }).lean();
    }
    const list = await db.getTable<IAttendance>('attendance');
    return list.filter(r => r.sessionId === sessionId);
  },

  async findByStudent(studentId: string): Promise<IAttendance[]> {
    if (isUsingMongoDB) {
      return MongoAttendance.find({ studentId }).lean();
    }
    const list = await db.getTable<IAttendance>('attendance');
    return list.filter(r => r.studentId === studentId);
  },

  async checkDuplicate(studentId: string, sessionId: string): Promise<boolean> {
    if (isUsingMongoDB) {
      const doc = await MongoAttendance.findOne({ studentId, sessionId }).lean();
      return !!doc;
    }
    const list = await db.getTable<IAttendance>('attendance');
    return list.some(r => r.studentId === studentId && r.sessionId === sessionId);
  },

  async getAll(): Promise<IAttendance[]> {
    if (isUsingMongoDB) {
      return MongoAttendance.find().lean();
    }
    return db.getTable<IAttendance>('attendance');
  }
};
