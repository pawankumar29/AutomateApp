import fs from 'fs';
import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { resumes, userProfiles, userSkills } from '../../db/schema.js';
import { resumeParserService, ParsedResumeData } from './parser.service.js';

export class ResumeService {
  async processAndSaveResume(
    userId: string,
    file: { path: string; originalname: string; size: number; mimetype: string }
  ) {
    // 1. Extract raw text
    const parsedText = await resumeParserService.extractText(file.path, file.mimetype);

    // 2. Extract structured skills, experience, contact info
    const parsedData: ParsedResumeData = await resumeParserService.parseResume(parsedText);

    // 3. Check if user already has a primary resume
    const existing = await db.select().from(resumes).where(eq(resumes.userId, userId));
    const isPrimary = existing.length === 0;

    // 4. Save resume record
    const [savedResume] = await db.insert(resumes).values({
      userId,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      parsedText,
      parsedData,
      isPrimary,
    }).returning();

    // 5. Update user profile if totalExperienceYears or name was found
    if (parsedData.experienceYears && parsedData.experienceYears > 0) {
      await db.update(userProfiles)
        .set({
          totalExperienceYears: parsedData.experienceYears,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));
    }

    // 6. Save extracted skills to user_skills table if none exist
    const currentSkills = await db.select().from(userSkills).where(eq(userSkills.userId, userId));
    if (currentSkills.length === 0 && parsedData.skills.length > 0) {
      for (const skill of parsedData.skills) {
        await db.insert(userSkills).values({
          userId,
          skillName: skill,
          proficiencyLevel: 'intermediate',
          yearsExperience: parsedData.experienceYears || 2,
        });
      }
    }

    return savedResume;
  }

  async getUserResumes(userId: string) {
    return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(resumes.createdAt);
  }

  async getPrimaryResume(userId: string) {
    const [primary] = await db.select().from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.isPrimary, true)))
      .limit(1);
    
    if (primary) return primary;

    // Fallback to first available resume
    const [first] = await db.select().from(resumes)
      .where(eq(resumes.userId, userId))
      .limit(1);
    return first || null;
  }

  async setPrimary(userId: string, resumeId: string) {
    // Unset current primary
    await db.update(resumes).set({ isPrimary: false }).where(eq(resumes.userId, userId));
    // Set new primary
    const [updated] = await db.update(resumes)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .returning();
    return updated;
  }

  async updateParsedData(userId: string, resumeId: string, parsedData: any) {
    const [updated] = await db.update(resumes)
      .set({ parsedData, updatedAt: new Date() })
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .returning();
    return updated;
  }

  async deleteResume(userId: string, resumeId: string) {
    const [resume] = await db.select().from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
      .limit(1);

    if (resume) {
      if (fs.existsSync(resume.filePath)) {
        try { fs.unlinkSync(resume.filePath); } catch (e) {}
      }
      await db.delete(resumes).where(eq(resumes.id, resumeId));
    }
    return { success: true };
  }
}

export const resumeService = new ResumeService();
