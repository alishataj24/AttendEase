import mongoose, { Schema } from 'mongoose';
import { db, isUsingMongoDB } from '../config/db';

export interface IQRSession {
  sessionId: string;
  facultyId: string;
  subject: string;
  token: string;
  isActive: boolean;
  startTime: string; // ISO String
  expiryTime: string; // ISO String
}

const QRSessionSchema = new Schema<IQRSession>({
  sessionId: { type: String, required: true, unique: true },
  facultyId: { type: String, required: true },
  subject: { type: String, required: true },
  token: { type: String, required: true },
  isActive: { type: Boolean, required: true },
  startTime: { type: String, required: true },
  expiryTime: { type: String, required: true }
});

export const MongoQRSession = mongoose.model<IQRSession>('QRSession', QRSessionSchema);

export const QRSessionService = {
  async createSession(session: IQRSession): Promise<IQRSession> {
    if (isUsingMongoDB) {
      const doc = new MongoQRSession(session);
      await doc.save();
      return doc.toObject();
    } else {
      const list = await db.getTable<IQRSession>('sessions');
      list.push(session);
      await db.writeTable('sessions', list);
      return session;
    }
  },

  async findById(sessionId: string): Promise<IQRSession | null> {
    if (isUsingMongoDB) {
      return MongoQRSession.findOne({ sessionId }).lean();
    }
    const list = await db.getTable<IQRSession>('sessions');
    return list.find(s => s.sessionId === sessionId) || null;
  },

  async findActiveByFaculty(facultyId: string): Promise<IQRSession | null> {
    if (isUsingMongoDB) {
      return MongoQRSession.findOne({ facultyId, isActive: true }).lean();
    }
    const list = await db.getTable<IQRSession>('sessions');
    return list.find(s => s.facultyId === facultyId && s.isActive) || null;
  },

  async updateToken(sessionId: string, token: string, expiryTime: string): Promise<IQRSession | null> {
    if (isUsingMongoDB) {
      return MongoQRSession.findOneAndUpdate(
        { sessionId },
        { token, expiryTime },
        { new: true }
      ).lean();
    } else {
      const list = await db.getTable<IQRSession>('sessions');
      const idx = list.findIndex(s => s.sessionId === sessionId);
      if (idx !== -1) {
        list[idx].token = token;
        list[idx].expiryTime = expiryTime;
        await db.writeTable('sessions', list);
        return list[idx];
      }
      return null;
    }
  },

  async endSession(sessionId: string): Promise<IQRSession | null> {
    if (isUsingMongoDB) {
      return MongoQRSession.findOneAndUpdate(
        { sessionId },
        { isActive: false },
        { new: true }
      ).lean();
    } else {
      const list = await db.getTable<IQRSession>('sessions');
      const idx = list.findIndex(s => s.sessionId === sessionId);
      if (idx !== -1) {
        list[idx].isActive = false;
        await db.writeTable('sessions', list);
        return list[idx];
      }
      return null;
    }
  },

  async getAll(): Promise<IQRSession[]> {
    if (isUsingMongoDB) {
      return MongoQRSession.find().lean();
    }
    return db.getTable<IQRSession>('sessions');
  }
};
