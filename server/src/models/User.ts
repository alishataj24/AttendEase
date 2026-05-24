import mongoose, { Schema } from 'mongoose';
import { db, isUsingMongoDB } from '../config/db';
import bcrypt from 'bcryptjs';

export interface IUser {
  id: string; // Student ID (e.g. STU001) or Gmail email for faculty
  name: string;
  email: string;
  password?: string; // Hashed password for student
  role: 'student' | 'faculty';
  department?: string;
  semester?: string;
  subjects: string[];
  faceDescriptor?: number[];
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  role: { type: String, enum: ['student', 'faculty'], required: true },
  department: { type: String },
  semester: { type: String },
  subjects: [{ type: String }],
  faceDescriptor: [{ type: Number }]
});

export const MongoUser = mongoose.model<IUser>('User', UserSchema);

// Pre-seeded users for testing out-of-the-box
// Students now authenticate via Google OAuth (email is their identifier)
export const SEED_USERS: IUser[] = [
  {
    id: 'student.alice@gmail.com',
    name: 'Alice Johnson',
    email: 'student.alice@gmail.com',
    role: 'student',
    department: 'Computer Science',
    semester: '6th Semester',
    subjects: ['Machine Learning', 'Artificial Intelligence', 'Internship', 'Project', 'ECD', 'Mobile Application']
  },
  {
    id: 'student.bob@gmail.com',
    name: 'Bob Smith',
    email: 'student.bob@gmail.com',
    role: 'student',
    department: 'Information Technology',
    semester: '4th Semester',
    subjects: ['Machine Learning', 'Artificial Intelligence', 'Internship', 'Project', 'ECD', 'Mobile Application']
  },
  {
    id: 'prof.miller@gmail.com',
    name: 'Dr. Sarah Miller',
    email: 'prof.miller@gmail.com',
    role: 'faculty',
    department: 'Computer Science',
    subjects: ['Machine Learning', 'Artificial Intelligence', 'Project']
  },
  {
    id: 'prof.davis@gmail.com',
    name: 'Prof. Robert Davis',
    email: 'prof.davis@gmail.com',
    role: 'faculty',
    department: 'Information Technology',
    subjects: ['Internship', 'ECD', 'Mobile Application']
  }
];

export const UserService = {
  async seedUsers() {
    const salt = await bcrypt.genSalt(10);
    const seeded = [];
    for (const user of SEED_USERS) {
      const u = { ...user };
      if (u.password && !u.password.startsWith('$2a$')) {
        u.password = await bcrypt.hash(u.password, salt);
      }
      seeded.push(u);
    }

    if (isUsingMongoDB) {
      const count = await MongoUser.countDocuments();
      if (count === 0) {
        await MongoUser.insertMany(seeded);
        console.log('MongoDB: Seeded initial users.');
      }
    } else {
      const users = await db.getTable<IUser>('users');
      if (users.length === 0) {
        await db.writeTable('users', seeded);
        console.log('JSON DB: Seeded initial users.');
      }
    }
  },

  async findById(id: string): Promise<IUser | null> {
    if (isUsingMongoDB) {
      return MongoUser.findOne({ id }).lean();
    }
    const users = await db.getTable<IUser>('users');
    return users.find(u => u.id === id) || null;
  },

  async findByEmail(email: string): Promise<IUser | null> {
    if (isUsingMongoDB) {
      return MongoUser.findOne({ email }).lean();
    }
    const users = await db.getTable<IUser>('users');
    return users.find(u => u.email === email) || null;
  },

  async createUser(userData: IUser): Promise<IUser> {
    if (userData.password && !userData.password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    if (isUsingMongoDB) {
      const user = new MongoUser(userData);
      await user.save();
      return user.toObject();
    } else {
      const users = await db.getTable<IUser>('users');
      users.push(userData);
      await db.writeTable('users', users);
      return userData;
    }
  },

  async updateUser(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    if (isUsingMongoDB) {
      return MongoUser.findOneAndUpdate({ id }, updateData, { new: true }).lean();
    } else {
      const users = await db.getTable<IUser>('users');
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updateData };
        await db.writeTable('users', users);
        return users[idx];
      }
      return null;
    }
  }
};
