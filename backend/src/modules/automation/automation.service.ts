import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { automationSessions, automationLogs, jobPreferences, platformConnections } from '../../db/schema.js';
import { queueProducer } from '../../queue/queue.producer.js';

// In-memory registry of active interval timers for each user's continuous monitoring
const activeUserTimers = new Map<string, NodeJS.Timeout>();
const userCycleRunning = new Map<string, boolean>();

export class AutomationService {
  async getStatus(userId: string) {
    const [session] = await db.select().from(automationSessions)
      .where(eq(automationSessions.userId, userId))
      .orderBy(desc(automationSessions.startedAt))
      .limit(1);

    const isRunning = Boolean(activeUserTimers.has(userId));

    return {
      status: isRunning ? 'RUNNING' : (session?.status || 'STOPPED'),
      lastRunAt: session?.lastRunAt || null,
      nextRunAt: session?.nextRunAt || null,
      cycleIntervalMinutes: session?.cycleIntervalMinutes || 5,
      jobsDiscovered: session?.jobsDiscovered || 0,
      jobsMatched: session?.jobsMatched || 0,
      jobsApplied: session?.jobsApplied || 0,
      jobsSkippedExperience: session?.jobsSkippedExperience || 0,
      jobsSkippedScore: session?.jobsSkippedScore || 0,
      jobsFailed: session?.jobsFailed || 0,
    };
  }

  async startMonitoring(userId: string, cycleMinutes: number = 5) {
    // 1. Stop existing timer if any
    this.stopMonitoringTimer(userId);

    const nextRun = new Date(Date.now() + cycleMinutes * 60 * 1000);

    // 2. Create or update session in DB
    const [session] = await db.insert(automationSessions).values({
      userId,
      status: 'RUNNING',
      cycleIntervalMinutes: cycleMinutes,
      startedAt: new Date(),
      lastRunAt: new Date(),
      nextRunAt: nextRun,
    }).returning();

    await db.insert(automationLogs).values({
      userId,
      level: 'INFO',
      message: `Continuous 5-minute automated monitoring cycle started.`,
    });

    // 3. Trigger initial cycle immediately
    await this.executeUserCycle(userId);

    // 4. Set interval timer for subsequent runs every 5 minutes
    const intervalMs = cycleMinutes * 60 * 1000;
    const timer = setInterval(async () => {
      await this.executeUserCycle(userId);
    }, intervalMs);

    activeUserTimers.set(userId, timer);

    return { success: true, message: 'Monitoring started', session };
  }

  async pauseMonitoring(userId: string) {
    this.stopMonitoringTimer(userId);
    await db.update(automationSessions)
      .set({ status: 'PAUSED' })
      .where(eq(automationSessions.userId, userId));

    await db.insert(automationLogs).values({
      userId,
      level: 'INFO',
      message: 'Automated monitoring paused by user.',
    });

    return { success: true, message: 'Monitoring paused.' };
  }

  async resumeMonitoring(userId: string) {
    return this.startMonitoring(userId, 5);
  }

  async stopMonitoring(userId: string) {
    this.stopMonitoringTimer(userId);
    await db.update(automationSessions)
      .set({ status: 'STOPPED', completedAt: new Date() })
      .where(eq(automationSessions.userId, userId));

    await db.insert(automationLogs).values({
      userId,
      level: 'INFO',
      message: 'Automated monitoring stopped by user.',
    });

    return { success: true, message: 'Monitoring stopped.' };
  }

  async triggerManualCycle(userId: string) {
    await this.executeUserCycle(userId);
    return { success: true, message: 'Discovery cycle triggered.' };
  }

  async getLogs(userId: string, limit: number = 100) {
    return db.select().from(automationLogs)
      .where(eq(automationLogs.userId, userId))
      .orderBy(desc(automationLogs.createdAt))
      .limit(limit);
  }

  async initializeRunningSessions() {
    try {
      const activeSessions = await db.select().from(automationSessions)
        .where(eq(automationSessions.status, 'RUNNING'));

      for (const session of activeSessions) {
        if (!activeUserTimers.has(session.userId)) {
          console.log(`[Automation] Resuming continuous monitoring for user ${session.userId}...`);
          const intervalMs = (session.cycleIntervalMinutes || 5) * 60 * 1000;
          
          this.executeUserCycle(session.userId).catch((err) => {
            console.error(`[Automation] Initial cycle error for ${session.userId}:`, err);
          });

          const timer = setInterval(async () => {
            await this.executeUserCycle(session.userId);
          }, intervalMs);

          activeUserTimers.set(session.userId, timer);
        }
      }
    } catch (e) {
      console.error('[Automation] Error initializing running sessions:', e);
    }
  }

  private stopMonitoringTimer(userId: string) {
    const existing = activeUserTimers.get(userId);
    if (existing) {
      clearInterval(existing);
      activeUserTimers.delete(userId);
    }
  }

  /**
   * Executes a single monitoring cycle across all 3 platforms (LinkedIn, Naukri, Indeed)
   * Prevents overlapping search cycles if previous cycle has not finished.
   */
  public async executeUserCycle(userId: string) {
    if (userCycleRunning.get(userId)) {
      console.log(`[Automation] User ${userId} has a cycle already in progress. Skipping overlap.`);
      return;
    }

    userCycleRunning.set(userId, true);
    try {
      const [prefs] = await db.select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
      const titles = (prefs?.preferredTitles && prefs.preferredTitles.length > 0)
        ? prefs.preferredTitles
        : ['Software Engineer'];
      const location = (prefs?.preferredLocations && prefs.preferredLocations.length > 0)
        ? prefs.preferredLocations[0]
        : 'India';

      const platforms: Array<'linkedin' | 'naukri' | 'indeed'> = ['linkedin', 'naukri', 'indeed'];

      for (const platform of platforms) {
        for (const title of titles) {
          // Enqueue discovery job for each platform and title
          await queueProducer.addDiscoveryJob({
            userId,
            platform,
            keywords: title,
            location,
            maxResults: 15,
          });
        }
      }

      // Update session timestamps
      const nextRun = new Date(Date.now() + (prefs?.cycleIntervalMinutes || 5) * 60 * 1000);
      await db.update(automationSessions)
        .set({
          lastRunAt: new Date(),
          nextRunAt: nextRun,
        })
        .where(eq(automationSessions.userId, userId));

    } catch (err: any) {
      console.error(`[Automation] Cycle execution error for ${userId}:`, err);
    } finally {
      userCycleRunning.set(userId, false);
    }
  }
}

export const automationService = new AutomationService();
