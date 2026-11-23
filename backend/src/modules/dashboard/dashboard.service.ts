import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { applications, dailyApplicationStatistics } from '../../db/schema.js';

export class DashboardService {
  async getDashboardSummary(userId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Overall & Status counts
    const statusCounts = await db
      .select({
        status: applications.status,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .groupBy(applications.status);

    const countsMap: Record<string, number> = {};
    let totalApplications = 0;
    for (const row of statusCounts) {
      countsMap[row.status] = Number(row.count);
      totalApplications += Number(row.count);
    }

    // 2. Platform counts
    const platformCounts = await db
      .select({
        platform: applications.platform,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .groupBy(applications.platform);

    const platformMap: Record<string, number> = { linkedin: 0, naukri: 0, indeed: 0 };
    for (const row of platformCounts) {
      platformMap[row.platform] = Number(row.count);
    }

    // 3. Time-based counts (Today, Yesterday, Week, Month)
    const [{ todayCount }] = await db
      .select({ todayCount: sql<number>`count(*)` })
      .from(applications)
      .where(and(eq(applications.userId, userId), gte(applications.createdAt, todayStart)));

    const [{ yesterdayCount }] = await db
      .select({ yesterdayCount: sql<number>`count(*)` })
      .from(applications)
      .where(
        and(
          eq(applications.userId, userId),
          gte(applications.createdAt, yesterdayStart),
          lte(applications.createdAt, todayStart)
        )
      );

    const [{ weekCount }] = await db
      .select({ weekCount: sql<number>`count(*)` })
      .from(applications)
      .where(and(eq(applications.userId, userId), gte(applications.createdAt, weekStart)));

    const [{ monthCount }] = await db
      .select({ monthCount: sql<number>`count(*)` })
      .from(applications)
      .where(and(eq(applications.userId, userId), gte(applications.createdAt, monthStart)));

    // 4. Daily table statistics (from real dailyApplicationStatistics or grouped applications)
    const dailyStats = await db
      .select({
        date: dailyApplicationStatistics.statDate,
        indeed: dailyApplicationStatistics.indeedCount,
        naukri: dailyApplicationStatistics.naukriCount,
        linkedin: dailyApplicationStatistics.linkedinCount,
        total: dailyApplicationStatistics.totalCount,
        success: dailyApplicationStatistics.successfulCount,
        failed: dailyApplicationStatistics.failedCount,
      })
      .from(dailyApplicationStatistics)
      .where(eq(dailyApplicationStatistics.userId, userId))
      .orderBy(desc(dailyApplicationStatistics.statDate))
      .limit(30);

    return {
      overview: {
        total: totalApplications,
        today: Number(todayCount),
        yesterday: Number(yesterdayCount),
        thisWeek: Number(weekCount),
        thisMonth: Number(monthCount),
        successful: countsMap['SUBMITTED'] || 0,
        failed: countsMap['FAILED'] || 0,
        pending: (countsMap['QUEUED'] || 0) + (countsMap['IN_PROGRESS'] || 0),
        needsAttention: countsMap['NEEDS_ATTENTION'] || 0,
        discovered: countsMap['DISCOVERED'] || 0,
        matched: countsMap['MATCHED'] || 0,
        skipped: countsMap['SKIPPED'] || 0,
      },
      platforms: {
        linkedin: platformMap['linkedin'] || 0,
        naukri: platformMap['naukri'] || 0,
        indeed: platformMap['indeed'] || 0,
      },
      dailyStats,
    };
  }

  async getAnalyticsTrends(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const dailyTrends = await db
      .select({
        date: dailyApplicationStatistics.statDate,
        indeed: dailyApplicationStatistics.indeedCount,
        naukri: dailyApplicationStatistics.naukriCount,
        linkedin: dailyApplicationStatistics.linkedinCount,
        total: dailyApplicationStatistics.totalCount,
        success: dailyApplicationStatistics.successfulCount,
        failed: dailyApplicationStatistics.failedCount,
      })
      .from(dailyApplicationStatistics)
      .where(eq(dailyApplicationStatistics.userId, userId))
      .orderBy(dailyApplicationStatistics.statDate)
      .limit(30);

    return {
      dailyTrends,
    };
  }
}

export const dashboardService = new DashboardService();
