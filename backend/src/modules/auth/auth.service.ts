import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { users, userProfiles, jobPreferences } from '../../db/schema.js';
import { ENV } from '../../config/env.js';

export class AuthService {
  async register(data: { email: string; password: string; fullName: string; phone?: string }) {
    const existing = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      throw { statusCode: 400, message: 'An account with this email address already exists.' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create user
    const [newUser] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      passwordHash,
      fullName: data.fullName,
      phone: data.phone || null,
    }).returning();

    // Initialize default profile
    await db.insert(userProfiles).values({
      userId: newUser.id,
    });

    // Initialize default job preferences
    await db.insert(jobPreferences).values({
      userId: newUser.id,
      preferredTitles: ['Software Engineer', 'Full Stack Developer', 'Backend Developer'],
      preferredSkills: ['JavaScript', 'TypeScript', 'Node.js', 'Python', 'React'],
      minExperience: 1,
      maxExperience: 5,
      minMatchScore: 70,
    });

    const token = this.generateToken(newUser);
    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        role: newUser.role,
      },
      token,
    };
  }

  async login(data: { email: string; password: string }) {
    const [user] = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (!user) {
      throw { statusCode: 401, message: 'Invalid email or password.' };
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Invalid email or password.' };
    }

    const token = this.generateToken(user);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      },
      token,
    };
  }

  async getMe(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    const [preferences] = await db.select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
      },
      profile: profile || null,
      preferences: preferences || null,
    };
  }

  private generateToken(user: { id: string; email: string; role: string }) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}

export const authService = new AuthService();
