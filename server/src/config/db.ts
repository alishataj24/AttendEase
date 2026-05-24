import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendease';
const DB_FALLBACK_DIR = path.join(__dirname, '../../db_data');

export let isUsingMongoDB = false;

// Mock file database tables
const TABLES = {
  users: 'users.json',
  attendance: 'attendance.json',
  sessions: 'sessions.json'
};

export async function connectDB() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    // Set connection timeout to 3 seconds for quick fallback
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000
    });
    isUsingMongoDB = true;
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.warn('MongoDB connection failed. Falling back to local JSON file-based database.');
    isUsingMongoDB = false;
    setupFallbackDB();
  }
}

function setupFallbackDB() {
  if (!fs.existsSync(DB_FALLBACK_DIR)) {
    fs.mkdirSync(DB_FALLBACK_DIR, { recursive: true });
  }
  Object.values(TABLES).forEach(file => {
    const filePath = path.join(DB_FALLBACK_DIR, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }
  });
  console.log(`Fallback file-based database initialized in: ${DB_FALLBACK_DIR}`);
}

// Unified query wrapper
export const db = {
  async getTable<T>(tableName: keyof typeof TABLES): Promise<T[]> {
    if (isUsingMongoDB) {
      // Direct model reads handled by models
      return [];
    }
    const filePath = path.join(DB_FALLBACK_DIR, TABLES[tableName]);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  },

  async writeTable<T>(tableName: keyof typeof TABLES, data: T[]): Promise<void> {
    if (isUsingMongoDB) return;
    const filePath = path.join(DB_FALLBACK_DIR, TABLES[tableName]);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
};
