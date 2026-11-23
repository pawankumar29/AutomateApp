import { eq, and, desc, sql, gte, lte, ilike, inArray } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { applications, jobs, companies, resumes, dailyApplicationStatistics } from '../../db/schema.js';
import { companyGuardService } from './company-guard.service.js';

export interface ApplicationFilterParams {
  userId: string;
  platform?: string;
  status?: string;
  company?: string;
  search?: string;
  dateFilter?: 'today' | 'yesterday' | '7days' | '30days' | 'custom';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'postedAt' | 'appliedAt' | 'matchScore';
  sortOrder?: 'asc' | 'desc';
}

export class ApplicationsService {
  async getApplications(params: ApplicationFilterParams) {
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    let conditions = [eq(applications.userId, params.userId)];

    if (params.platform) {
      conditions.push(eq(applications.platform, params.platform));
    }
    if (params.status) {
      conditions.push(eq(applications.status, params.status));
    }
    if (params.search) {
      conditions.push(
        sql`(${jobs.title} ILIKE ${`%${params.search}%`} OR ${companies.name} ILIKE ${`%${params.search}%`})`
      );
    }

    // Date filtering
    const now = new Date();
    if (params.dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      conditions.push(gte(applications.createdAt, todayStart));
    } else if (params.dateFilter === 'yesterday') {
      const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      conditions.push(gte(applications.createdAt, yStart));
      conditions.push(lte(applications.createdAt, yEnd));
    } else if (params.dateFilter === '7days') {
      const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      conditions.push(gte(applications.createdAt, d7));
    } else if (params.dateFilter === '30days') {
      const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      conditions.push(gte(applications.createdAt, d30));
    } else if (params.startDate && params.endDate) {
      conditions.push(gte(applications.createdAt, new Date(params.startDate)));
      conditions.push(lte(applications.createdAt, new Date(params.endDate)));
    }

    const whereClause = and(...conditions);

    // Count total records
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(companies, eq(applications.companyId, companies.id))
      .where(whereClause);

    // Fetch paginated items
    const rows = await db
      .select({
        id: applications.id,
        platform: applications.platform,
        status: applications.status,
        matchScore: applications.matchScore,
        experienceMatch: applications.experienceMatch,
        appliedAt: applications.appliedAt,
        createdAt: applications.createdAt,
        submissionEvidence: applications.submissionEvidence,
        errorReason: applications.errorReason,
        notes: applications.notes,
        // Job details
        jobId: jobs.id,
        jobTitle: jobs.title,
        jobLocation: jobs.location,
        jobDescription: jobs.description,
        jobPostedAt: jobs.postedAt,
        postingDateRaw: jobs.postingDateRaw,
        jobUrl: jobs.jobUrl,
        applicationUrl: jobs.applicationUrl,
        // Company details
        companyId: companies.id,
        companyName: companies.name,
        // Resume details
        resumeId: resumes.id,
        resumeName: resumes.fileName,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(companies, eq(applications.companyId, companies.id))
      .leftJoin(resumes, eq(applications.resumeId, resumes.id))
      .where(whereClause)
      .orderBy(
        params.sortBy === 'matchScore'
          ? desc(applications.matchScore)
          : params.sortBy === 'appliedAt'
          ? desc(applications.appliedAt)
          : desc(jobs.postedAt)
      )
      .limit(limit)
      .offset(offset);

    return {
      items: rows,
      total: Number(total),
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(Number(total) / limit),
    };
  }

  /**
   * Updates application status and increments daily stats.
   */
  async updateApplicationStatus(
    appId: string,
    status: 'DISCOVERED' | 'MATCHED' | 'QUEUED' | 'IN_PROGRESS' | 'SUBMITTED' | 'FAILED' | 'NEEDS_ATTENTION' | 'SKIPPED' | 'EXPIRED',
    metadata?: { evidence?: string; errorReason?: string; notes?: string }
  ) {
    const [app] = await db.select().from(applications).where(eq(applications.id, appId)).limit(1);
    if (!app) return null;

    const appliedAt = status === 'SUBMITTED' ? new Date() : app.appliedAt;

    const [updated] = await db.update(applications)
      .set({
        status,
        appliedAt,
        submissionEvidence: metadata?.evidence || app.submissionEvidence,
        errorReason: metadata?.errorReason || app.errorReason,
        notes: metadata?.notes || app.notes,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, appId))
      .returning();

    // Update daily statistics
    if (status === 'SUBMITTED' || status === 'FAILED') {
      await this.recordDailyStat(app.userId, app.platform, status === 'SUBMITTED');
    }

    return updated;
  }

  private async recordDailyStat(userId: string, platform: string, isSuccess: boolean) {
    const today = new Date().toISOString().split('T')[0];

    const [existing] = await db.select().from(dailyApplicationStatistics)
      .where(and(eq(dailyApplicationStatistics.userId, userId), eq(dailyApplicationStatistics.statDate, today)))
      .limit(1);

    const indeedInc = platform === 'indeed' ? 1 : 0;
    const naukriInc = platform === 'naukri' ? 1 : 0;
    const linkedinInc = platform === 'linkedin' ? 1 : 0;

    if (!existing) {
      await db.insert(dailyApplicationStatistics).values({
        userId,
        statDate: today,
        indeedCount: indeedInc,
        naukriCount: naukriInc,
        linkedinCount: linkedinInc,
        totalCount: 1,
        successfulCount: isSuccess ? 1 : 0,
        failedCount: isSuccess ? 0 : 1,
      });
    } else {
      await db.update(dailyApplicationStatistics)
        .set({
          indeedCount: existing.indeedCount + indeedInc,
          naukriCount: existing.naukriCount + naukriInc,
          linkedinCount: existing.linkedinCount + linkedinInc,
          totalCount: existing.totalCount + 1,
          successfulCount: existing.successfulCount + (isSuccess ? 1 : 0),
          failedCount: existing.failedCount + (isSuccess ? 0 : 1),
        })
        .where(eq(dailyApplicationStatistics.id, existing.id));
    }
  }
}

export const applicationsService = new ApplicationsService();
