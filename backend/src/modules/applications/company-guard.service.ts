import { eq, and, inArray, ne } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { applications, companies, jobs } from '../../db/schema.js';
import { jobNormalizerService } from '../jobs/normalizer.service.js';

export class CompanyGuardService {
  /**
   * Ensures company exists in the companies table and returns its UUID.
   */
  async getOrCreateCompany(rawCompanyName?: string): Promise<{ id: string; name: string; normalizedName: string }> {
    const safeName = (rawCompanyName && typeof rawCompanyName === 'string') ? rawCompanyName.trim() : 'Unknown Company';
    const normalizedName = jobNormalizerService.normalizeCompanyName(safeName);

    const [existing] = await db.select().from(companies)
      .where(eq(companies.normalizedName, normalizedName))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [newComp] = await db.insert(companies).values({
      name: safeName,
      normalizedName,
    }).returning();

    return newComp;
  }

  /**
   * Enforces Rule B: Only ONE Application Per Company per user across ALL platforms.
   * Returns false if the user has already submitted or queued an application for this company.
   * If currentApplicationId is provided, ignores that specific application.
   */
  async canApplyToCompany(userId: string, companyId: string, currentApplicationId?: string): Promise<{ canApply: boolean; reason?: string; existingAppId?: string }> {
    const conditions = [
      eq(applications.userId, userId),
      eq(applications.companyId, companyId),
      inArray(applications.status, ['SUBMITTED', 'IN_PROGRESS', 'QUEUED']),
    ];

    if (currentApplicationId) {
      conditions.push(ne(applications.id, currentApplicationId));
    }

    const existing = await db.select({
      id: applications.id,
      status: applications.status,
      platform: applications.platform,
      appliedAt: applications.appliedAt,
    }).from(applications)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      return {
        canApply: false,
        reason: `Rule B: User already has an active or submitted application at this company via ${existing[0].platform} (Status: ${existing[0].status}).`,
        existingAppId: existing[0].id,
      };
    }

    return { canApply: true };
  }
}

export const companyGuardService = new CompanyGuardService();
