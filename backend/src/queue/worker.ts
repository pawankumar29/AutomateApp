import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { eq, and } from 'drizzle-orm';
import { redisConnection, DISCOVERY_QUEUE_NAME, APPLICATION_QUEUE_NAME } from './queue.config.js';
import { ENV } from '../config/env.js';
import { db } from '../config/database.js';
import { applications, automationLogs, users, userProfiles, jobPreferences, resumes, applicationAnswers, platformConnections } from '../db/schema.js';
import { jobsService } from '../modules/jobs/jobs.service.js';
import { jobMatcherService } from '../modules/matching/matcher.service.js';
import { companyGuardService } from '../modules/applications/company-guard.service.js';
import { applicationsService } from '../modules/applications/applications.service.js';
import { aiService } from '../modules/ai/gemini.service.js';
import { queueProducer, DiscoveryJobData, ApplicationJobData } from './queue.producer.js';
import { decrypt } from '../utils/crypto.js';

console.log('[Worker] Starting background Queue Workers for BullMQ...');

// ── 1. Discovery Worker ──────────────────────────────────────────────
export const discoveryWorker = new Worker(
  DISCOVERY_QUEUE_NAME,
  async (job: Job<DiscoveryJobData>) => {
    const { userId, platform, keywords, location, maxResults } = job.data;
    console.log(`[Worker:Discovery] Processing discovery for User: ${userId}, Platform: ${platform}`);

    // Log progress
    await db.insert(automationLogs).values({
      userId,
      platform,
      level: 'INFO',
      message: `Fetching latest ${platform} jobs for '${keywords}' in '${location}'...`,
    });

    try {
      // Fetch platform connection & decrypt session cookies if stored
      const [conn] = await db.select().from(platformConnections)
        .where(and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)))
        .limit(1);

      let parsedCookies = null;
      if (conn?.sessionCookies) {
        try {
          const rawStr = conn.sessionCookies.trim();
          if (rawStr.startsWith('[') || rawStr.startsWith('{')) {
            parsedCookies = JSON.parse(rawStr);
          } else {
            const decrypted = decrypt(rawStr);
            parsedCookies = JSON.parse(decrypted);
          }
        } catch (e) {
          console.warn(`[Worker] Could not decrypt/parse session cookies for ${platform}:`, e);
        }
      }

      // Call automation-service with cookies
      const response = await axios.post(
        `${ENV.AUTOMATION_SERVICE_URL}/discover`,
        { platform, keywords, location, max_results: maxResults || 20, user_id: userId, cookies: parsedCookies },
        { timeout: 90000 }
      );

      const discovered = response.data?.jobs || [];
      console.log(`[Worker:Discovery] Discovered ${discovered.length} jobs on ${platform}.`);

      // Fetch user profile and preferences
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      const [prefs] = await db.select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
      const [primaryResume] = await db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.isPrimary, true))).limit(1);

      const candidateSkills = (primaryResume?.parsedData?.skills && primaryResume.parsedData.skills.length > 0)
        ? primaryResume.parsedData.skills
        : (prefs?.preferredSkills || ['JavaScript', 'TypeScript', 'Node.js', 'Python', 'React']);

      const candidateExp = profile?.totalExperienceYears || primaryResume?.parsedData?.experienceYears || 3;
      const minMatchScore = prefs?.minMatchScore ?? 70;

      // Normalize and sort jobs
      const normalizedJobs = [];
      for (const rawJob of discovered) {
        const savedJob = await jobsService.upsertDiscoveredJob(rawJob);
        normalizedJobs.push(savedJob);
      }

      // Sort discovered jobs strictly newest first (Date Descending)
      normalizedJobs.sort((a, b) => {
        const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
        const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
        return dateB - dateA;
      });

      // Track companies seen in this cycle to apply only ONE job per company
      const companyHandledInCycle = new Set<string>();

      for (const item of normalizedJobs) {
        if (!item.companyId) continue;

        // Strict 1-Hour Age Cutoff: ONLY jobs posted within the last 60 minutes
        const rawDateLower = (item.postingDateRaw || '').toLowerCase();
        if (
          !rawDateLower ||
          rawDateLower.includes('few hours') ||
          rawDateLower.includes('today') ||
          rawDateLower.includes('day') ||
          rawDateLower.includes('yesterday') ||
          rawDateLower.includes('week') ||
          rawDateLower.includes('month') ||
          rawDateLower.includes('year')
        ) {
          console.log(`[Worker:Discovery] Skipping '${item.title}' - not explicitly verified within 1 hour ('${item.postingDateRaw}').`);
          continue;
        }
        if (item.postedAt) {
          const ageMinutes = (Date.now() - new Date(item.postedAt).getTime()) / (60 * 1000);
          if (ageMinutes > 60) {
            console.log(`[Worker:Discovery] Skipping '${item.title}' - posted ${Math.round(ageMinutes)} mins ago (> 1 hour limit).`);
            continue;
          }
        }

        // Rule B: Only ONE application per company across all platforms!
        if (companyHandledInCycle.has(item.companyId)) {
          console.log(`[Worker:Discovery] Skipping job '${item.title}' - company already processed in current cycle.`);
          continue;
        }

        const companyCheck = await companyGuardService.canApplyToCompany(userId, item.companyId);
        if (!companyCheck.canApply) {
          console.log(`[Worker:Discovery] Skipping '${item.title}' at ${item.companyNameRaw}: ${companyCheck.reason}`);
          continue;
        }

        // Check if application already exists
        const [existingApp] = await db.select().from(applications)
          .where(and(eq(applications.userId, userId), eq(applications.jobId, item.id)))
          .limit(1);

        if (existingApp && ['SUBMITTED', 'IN_PROGRESS', 'QUEUED'].includes(existingApp.status)) {
          continue;
        }

        // Evaluate skill match & experience filter
        const matchResult = jobMatcherService.evaluateMatch(
          {
            title: item.title,
            description: item.description,
            requiredSkills: item.requiredSkills as string[] || [],
            minExperience: item.minExperience,
            maxExperience: item.maxExperience,
          },
          {
            skills: candidateSkills,
            totalExperienceYears: candidateExp,
          },
          minMatchScore
        );

        // Check if below 70% threshold
        if (!matchResult.passedSkillThreshold) {
          await db.insert(applications).values({
            userId,
            jobId: item.id,
            companyId: item.companyId,
            resumeId: primaryResume?.id,
            platform,
            status: 'SKIPPED',
            matchScore: matchResult.score,
            experienceMatch: matchResult.isExperienceEligible,
            notes: `Skipped: Match score (${matchResult.score}%) below threshold (${minMatchScore}%).`,
          }).onConflictDoNothing();
          continue;
        }

        // Check experience filter
        if (!matchResult.isExperienceEligible) {
          await db.insert(applications).values({
            userId,
            jobId: item.id,
            companyId: item.companyId,
            resumeId: primaryResume?.id,
            platform,
            status: 'SKIPPED',
            matchScore: matchResult.score,
            experienceMatch: false,
            notes: `Skipped: ${matchResult.experienceReason}`,
          }).onConflictDoNothing();
          continue;
        }

        // Create or update application record as QUEUED
        const [appRecord] = await db.insert(applications).values({
          userId,
          jobId: item.id,
          companyId: item.companyId,
          resumeId: primaryResume?.id,
          platform,
          status: 'QUEUED',
          matchScore: matchResult.score,
          experienceMatch: true,
          notes: `Eligible: Score ${matchResult.score}% with matched skills: ${matchResult.matchedSkills.join(', ')}`,
        }).onConflictDoUpdate({
          target: [applications.userId, applications.jobId],
          set: {
            status: 'QUEUED',
            matchScore: matchResult.score,
            updatedAt: new Date(),
          }
        }).returning();

        companyHandledInCycle.add(item.companyId);

        // Enqueue application submission job
        await queueProducer.addApplicationJob({
          userId,
          jobId: item.id,
          platform,
          jobUrl: item.jobUrl,
          jobTitle: item.title,
          companyName: item.companyNameRaw,
          companyId: item.companyId,
          resumeId: primaryResume?.id,
          resumePath: primaryResume?.filePath,
          matchScore: matchResult.score,
        });

        console.log(`[Worker:Discovery] Queued eligible job '${item.title}' at ${item.companyNameRaw} (Score: ${matchResult.score}%)`);
      }

      await db.insert(automationLogs).values({
        userId,
        platform,
        level: 'INFO',
        message: `Completed discovery on ${platform}. Evaluated ${discovered.length} jobs.`,
      });

    } catch (err: any) {
      console.error(`[Worker:Discovery] Error on ${platform}:`, err.message);
      await db.insert(automationLogs).values({
        userId,
        platform,
        level: 'ERROR',
        message: `Job discovery failed on ${platform}: ${err.message}`,
      });
    }
  },
  { connection: redisConnection, concurrency: 1 }
);

// ── 2. Application Submission Worker ─────────────────────────────────
export const applicationWorker = new Worker(
  APPLICATION_QUEUE_NAME,
  async (job: Job<ApplicationJobData>) => {
    const data = job.data;
    console.log(`[Worker:Apply] Processing application for '${data.jobTitle}' at '${data.companyName}' (${data.platform})`);

    // Find application record
    const [appRecord] = await db.select().from(applications)
      .where(and(eq(applications.userId, data.userId), eq(applications.jobId, data.jobId)))
      .limit(1);

    if (!appRecord) return;

    // Lock check: Rule B verification (ignore current application record)
    const canApplyCheck = await companyGuardService.canApplyToCompany(data.userId, data.companyId, appRecord.id);
    if (!canApplyCheck.canApply) {
      console.warn(`[Worker:Apply] Aborting submission: ${canApplyCheck.reason}`);
      await applicationsService.updateApplicationStatus(appRecord.id, 'SKIPPED', { notes: canApplyCheck.reason });
      return;
    }

    // Set status to IN_PROGRESS
    await applicationsService.updateApplicationStatus(appRecord.id, 'IN_PROGRESS');

    const [userRecord] = await db.select().from(users).where(eq(users.id, data.userId)).limit(1);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, data.userId)).limit(1);
    const [prefs] = await db.select().from(jobPreferences).where(eq(jobPreferences.userId, data.userId)).limit(1);

    try {
      // Prepare questionnaire answers using AI Engine
      const answeredQuestions = [
        { q: 'How many years of experience do you have?', ans: await aiService.answerQuestion('years of experience', { profile, preferences: prefs }) },
        { q: 'What is your notice period?', ans: await aiService.answerQuestion('notice period', { profile, preferences: prefs }) },
        { q: 'What is your expected salary?', ans: await aiService.answerQuestion('expected salary', { profile, preferences: prefs }) },
        { q: 'Are you legally authorized to work?', ans: await aiService.answerQuestion('work authorization', { profile, preferences: prefs }) },
      ];

      // Fetch platform connection & decrypt session cookies if stored
      const [appConn] = await db.select().from(platformConnections)
        .where(and(eq(platformConnections.userId, data.userId), eq(platformConnections.platform, data.platform)))
        .limit(1);

      let appCookies = null;
      if (appConn?.sessionCookies) {
        try {
          const rawAppStr = appConn.sessionCookies.trim();
          if (rawAppStr.startsWith('[') || rawAppStr.startsWith('{')) {
            appCookies = JSON.parse(rawAppStr);
          } else {
            const decrypted = decrypt(rawAppStr);
            appCookies = JSON.parse(decrypted);
          }
        } catch (e) {
          console.warn(`[Worker] Could not decrypt/parse session cookies for apply ${data.platform}:`, e);
        }
      }

      // Call automation-service to execute browser form submission
      const response = await axios.post(
        `${ENV.AUTOMATION_SERVICE_URL}/apply`,
        {
          platform: data.platform,
          job_url: data.jobUrl,
          job_title: data.jobTitle,
          company_name: data.companyName,
          resume_path: data.resumePath,
          user_id: data.userId,
          candidate_profile: {
            ...profile,
            fullName: userRecord?.fullName || 'Pawan Kumar',
            email: userRecord?.email || 'pk2027317@gmail.com',
            phone: userRecord?.phone || '7740073757',
            location: profile?.currentLocation || 'Gurugram, India',
            totalExperienceYears: profile?.totalExperienceYears || 3.5,
            expectedSalary: profile?.expectedSalary || '13 LPA',
            noticePeriod: profile?.noticePeriod || '10 days',
            currentDesignation: profile?.currentDesignation || 'Software Engineer',
          },
          cookies: appCookies,
          answers: {
            "years of experience": String(profile?.totalExperienceYears || 3.5),
            "notice period": profile?.noticePeriod || "10 days",
            "expected salary": profile?.expectedSalary || "13 LPA",
            "current salary": profile?.currentSalary || "10 LPA",
            "work authorization": "Yes",
            "relocation": "Yes",
            "comfortable": "Yes",
            "willing to work": "Yes",
            "background check": "Yes",
            "available immediately": "Yes",
          }
        },
        { timeout: 120000 }
      );

      const result = response.data;
      const finalStatus = result.status as any || 'SUBMITTED';

      // Update application record
      await applicationsService.updateApplicationStatus(appRecord.id, finalStatus, {
        evidence: result.evidence,
        errorReason: result.error_reason,
        notes: finalStatus === 'SUBMITTED' ? 'Application successfully submitted.' : result.error_reason,
      });

      // Store answers in database
      for (const item of answeredQuestions) {
        await db.insert(applicationAnswers).values({
          applicationId: appRecord.id,
          questionText: item.q,
          answerText: item.ans.answer,
          source: item.ans.source,
          aiExplanation: item.ans.explanation,
        });
      }

      await db.insert(automationLogs).values({
        userId: data.userId,
        platform: data.platform,
        level: finalStatus === 'SUBMITTED' ? 'INFO' : 'WARNING',
        message: finalStatus === 'SUBMITTED'
          ? `Successfully applied to '${data.jobTitle}' at '${data.companyName}'`
          : `Application status for '${data.jobTitle}': ${finalStatus} (${result.error_reason || 'Requires manual action'})`,
      });

      // Human cool-down delay between applications to protect against Cloudflare/Akamai rate limiting
      await new Promise((resolve) => setTimeout(resolve, 15000));

    } catch (err: any) {
      console.error(`[Worker:Apply] Failed applying to ${data.jobTitle}:`, err.message);
      await applicationsService.updateApplicationStatus(appRecord.id, 'FAILED', {
        errorReason: err.message,
      });
      await db.insert(automationLogs).values({
        userId: data.userId,
        platform: data.platform,
        level: 'ERROR',
        message: `Failed applying to '${data.jobTitle}' at '${data.companyName}': ${err.message}`,
      });
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
