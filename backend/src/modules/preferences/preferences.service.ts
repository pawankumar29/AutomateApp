import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { jobPreferences } from '../../db/schema.js';

export class PreferencesService {
  async getPreferences(userId: string) {
    const [prefs] = await db.select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
    if (!prefs) {
      // Create defaults
      const [created] = await db.insert(jobPreferences).values({
        userId,
        preferredTitles: ['Software Engineer', 'Full Stack Developer', 'Backend Developer'],
        preferredSkills: ['JavaScript', 'TypeScript', 'Node.js', 'Python', 'React'],
        minExperience: 1,
        maxExperience: 5,
        minMatchScore: 70,
        cycleIntervalMinutes: 5,
      }).returning();
      return created;
    }
    return prefs;
  }

  async updatePreferences(userId: string, data: Partial<typeof jobPreferences.$inferInsert>) {
    const existing = await db.select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
    if (existing.length === 0) {
      const [created] = await db.insert(jobPreferences).values({ ...data, userId }).returning();
      return created;
    }

    const [updated] = await db.update(jobPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobPreferences.userId, userId))
      .returning();
    return updated;
  }
}

export const preferencesService = new PreferencesService();
