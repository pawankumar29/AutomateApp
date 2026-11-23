import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { jobs, companies } from '../../db/schema.js';
import { jobNormalizerService } from './normalizer.service.js';
import { companyGuardService } from '../applications/company-guard.service.js';

export interface RawJobInput {
  platform: 'linkedin' | 'naukri' | 'indeed';
  platformJobId: string;
  title: string;
  companyName: string;
  location?: string;
  description?: string;
  requiredSkills?: string[];
  experienceText?: string;
  minExperience?: number;
  maxExperience?: number;
  salaryText?: string;
  postingDateRaw?: string;
  jobUrl: string;
  applicationUrl?: string;
  isEasyApply?: boolean;
}

export class JobsService {
  /**
   * Normalizes and upserts a discovered job.
   */
  async upsertDiscoveredJob(raw: any) {
    const companyName = raw.companyName || raw.company_name || 'Unknown Company';
    const platformJobId = raw.platformJobId || raw.platform_job_id || `job-${Date.now()}`;
    const jobUrl = raw.jobUrl || raw.job_url || '';
    const postingDateRaw = raw.postingDateRaw || raw.posting_date_raw || 'Just posted';
    const isEasyApply = raw.isEasyApply ?? raw.is_easy_apply ?? true;
    const requiredSkills = raw.requiredSkills || raw.required_skills || [];

    const company = await companyGuardService.getOrCreateCompany(companyName);
    const postedAt = jobNormalizerService.parsePostingDate(postingDateRaw);

    let minExp = raw.minExperience || raw.min_experience;
    let maxExp = raw.maxExperience || raw.max_experience;
    if (minExp === undefined && (raw.experienceText || raw.experience_text)) {
      const extracted = jobNormalizerService.extractExperience(raw.experienceText || raw.experience_text);
      minExp = extracted.minExperience;
      maxExp = extracted.maxExperience;
    }

    const [existing] = await db.select().from(jobs)
      .where(and(eq(jobs.platform, raw.platform), eq(jobs.platformJobId, platformJobId)))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(jobs)
        .set({
          title: raw.title,
          companyId: company.id,
          companyNameRaw: companyName,
          location: raw.location || existing.location,
          description: raw.description || existing.description,
          requiredSkills: requiredSkills.length > 0 ? requiredSkills : existing.requiredSkills,
          minExperience: minExp !== undefined ? minExp : existing.minExperience,
          maxExperience: maxExp !== undefined ? maxExp : existing.maxExperience,
          salaryText: raw.salaryText || raw.salary_text || existing.salaryText,
          postedAt: postedAt || existing.postedAt,
          postingDateRaw: postingDateRaw || existing.postingDateRaw,
          jobUrl: jobUrl,
          applicationUrl: raw.applicationUrl || raw.application_url || existing.applicationUrl,
        })
        .where(eq(jobs.id, existing.id))
        .returning();
      return updated;
    }

    const [newJob] = await db.insert(jobs).values({
      platform: raw.platform,
      platformJobId: platformJobId,
      title: raw.title,
      companyId: company.id,
      companyNameRaw: companyName,
      location: raw.location,
      description: raw.description,
      requiredSkills: requiredSkills,
      minExperience: minExp,
      maxExperience: maxExp,
      salaryText: raw.salaryText || raw.salary_text,
      postedAt,
      postingDateRaw: postingDateRaw,
      jobUrl: jobUrl,
      applicationUrl: raw.applicationUrl || raw.application_url,
      isEasyApply: isEasyApply,
    }).returning();

    return newJob;
  }

  /**
   * Fetches latest jobs sorted by posting date in strict descending order.
   */
  async getLatestJobs(filters: {
    platform?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let query = db.select({
      id: jobs.id,
      platform: jobs.platform,
      platformJobId: jobs.platformJobId,
      title: jobs.title,
      companyName: jobs.companyNameRaw,
      companyId: jobs.companyId,
      location: jobs.location,
      description: jobs.description,
      requiredSkills: jobs.requiredSkills,
      minExperience: jobs.minExperience,
      maxExperience: jobs.maxExperience,
      salaryText: jobs.salaryText,
      postedAt: jobs.postedAt,
      postingDateRaw: jobs.postingDateRaw,
      jobUrl: jobs.jobUrl,
      applicationUrl: jobs.applicationUrl,
      isEasyApply: jobs.isEasyApply,
      discoveredAt: jobs.discoveredAt,
    }).from(jobs);

    // Order strictly by postedAt descending!
    return query
      .orderBy(desc(jobs.postedAt), desc(jobs.discoveredAt))
      .limit(limit)
      .offset(offset);
  }
}

export const jobsService = new JobsService();
