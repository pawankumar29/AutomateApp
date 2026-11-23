import { pgTable, text, timestamp, boolean, integer, real, jsonb, uuid, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── 1. Users ──────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  role: text('role').default('user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 2. User Profiles ──────────────────────────────────────────────────
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  currentLocation: text('current_location'),
  preferredLocations: jsonb('preferred_locations').$type<string[]>().default([]),
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  githubUrl: text('github_url'),
  currentDesignation: text('current_designation'),
  currentCompany: text('current_company'),
  totalExperienceYears: real('total_experience_years').default(0),
  expectedSalary: text('expected_salary'),
  currentSalary: text('current_salary'),
  noticePeriod: text('notice_period'),
  gender: text('gender'),
  workAuthorization: boolean('work_authorization').default(true),
  sponsorshipRequired: boolean('sponsorship_required').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 3. User Experiences ───────────────────────────────────────────────
export const userExperiences = pgTable('user_experiences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  companyName: text('company_name').notNull(),
  designation: text('designation').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isCurrent: boolean('is_current').default(false),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 4. User Education ─────────────────────────────────────────────────
export const userEducation = pgTable('user_education', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  degree: text('degree').notNull(),
  institution: text('institution').notNull(),
  fieldOfStudy: text('field_of_study'),
  graduationYear: text('graduation_year'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 5. User Skills ────────────────────────────────────────────────────
export const userSkills = pgTable('user_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  skillName: text('skill_name').notNull(),
  proficiencyLevel: text('proficiency_level').default('intermediate'),
  yearsExperience: real('years_experience').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 6. Resumes ────────────────────────────────────────────────────────
export const resumes = pgTable('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  parsedText: text('parsed_text'),
  parsedData: jsonb('parsed_data').$type<{
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    experienceYears?: number;
    education?: Array<{ degree?: string; institution?: string; year?: string }>;
    experienceHistory?: Array<{ company?: string; title?: string; duration?: string }>;
  }>(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 7. Job Preferences ────────────────────────────────────────────────
export const jobPreferences = pgTable('job_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  preferredTitles: jsonb('preferred_titles').$type<string[]>().default([]),
  preferredSkills: jsonb('preferred_skills').$type<string[]>().default([]),
  minExperience: real('min_experience').default(0),
  maxExperience: real('max_experience').default(10),
  minSalary: text('min_salary'),
  expectedSalary: text('expected_salary'),
  preferredLocations: jsonb('preferred_locations').$type<string[]>().default([]),
  remotePreference: boolean('remote_preference').default(false),
  hybridPreference: boolean('hybrid_preference').default(true),
  onsitePreference: boolean('onsite_preference').default(true),
  employmentTypes: jsonb('employment_types').$type<string[]>().default(['Full-time']),
  minMatchScore: real('min_match_score').default(70).notNull(), // Default 70% threshold
  maxJobAgeDays: integer('max_job_age_days').default(7).notNull(),
  dailyApplicationLimit: integer('daily_application_limit').default(25).notNull(),
  cycleIntervalMinutes: integer('cycle_interval_minutes').default(5).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 8. Platform Connections ───────────────────────────────────────────
export const platformConnections = pgTable('platform_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  platform: text('platform').notNull(), // 'linkedin' | 'naukri' | 'indeed'
  connectionStatus: text('connection_status').default('disconnected').notNull(), // 'connected' | 'disconnected' | 'session_active' | 'error'
  accountIdentifier: text('account_identifier'),
  encryptedCredentials: text('encrypted_credentials'),
  sessionCookies: text('session_cookies'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPlatformIdx: uniqueIndex('user_platform_idx').on(table.userId, table.platform),
}));

// ── 9. Companies ──────────────────────────────────────────────────────
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(), // Key for 1-company-1-app rule
  domain: text('domain'),
  industry: text('industry'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 10. Jobs ──────────────────────────────────────────────────────────
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: text('platform').notNull(), // 'linkedin' | 'naukri' | 'indeed'
  platformJobId: text('platform_job_id').notNull(),
  title: text('title').notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  companyNameRaw: text('company_name_raw').notNull(),
  location: text('location'),
  description: text('description'),
  requiredSkills: jsonb('required_skills').$type<string[]>().default([]),
  minExperience: real('min_experience'),
  maxExperience: real('max_experience'),
  salaryText: text('salary_text'),
  postedAt: timestamp('posted_at', { withTimezone: true }), // STRICT DATE-DESCENDING ORDER
  postingDateRaw: text('posting_date_raw'),
  jobUrl: text('job_url').notNull(),
  applicationUrl: text('application_url'),
  isEasyApply: boolean('is_easy_apply').default(true),
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  platformJobIdIdx: uniqueIndex('platform_job_id_idx').on(table.platform, table.platformJobId),
  postedAtIdx: index('jobs_posted_at_idx').on(table.postedAt),
}));

// ── 11. Applications ──────────────────────────────────────────────────
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  resumeId: uuid('resume_id').references(() => resumes.id),
  platform: text('platform').notNull(),
  status: text('status').default('DISCOVERED').notNull(), // DISCOVERED | MATCHED | QUEUED | IN_PROGRESS | SUBMITTED | FAILED | NEEDS_ATTENTION | SKIPPED | EXPIRED
  matchScore: real('match_score').default(0),
  experienceMatch: boolean('experience_match').default(true),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  submissionEvidence: text('submission_evidence'),
  errorReason: text('error_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userJobIdx: uniqueIndex('user_job_idx').on(table.userId, table.jobId),
  userCompanyIdx: index('user_company_idx').on(table.userId, table.companyId),
  statusIdx: index('app_status_idx').on(table.status),
  appliedAtIdx: index('app_applied_at_idx').on(table.appliedAt),
}));

// ── 12. Application Answers ───────────────────────────────────────────
export const applicationAnswers = pgTable('application_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  questionText: text('question_text').notNull(),
  answerText: text('answer_text').notNull(),
  source: text('source').default('profile'), // 'profile' | 'resume' | 'ai' | 'default'
  aiExplanation: text('ai_explanation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── 13. Automation Sessions ───────────────────────────────────────────
export const automationSessions = pgTable('automation_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('STOPPED').notNull(), // 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
  currentPlatform: text('current_platform'),
  cycleIntervalMinutes: integer('cycle_interval_minutes').default(5).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  jobsDiscovered: integer('jobs_discovered').default(0).notNull(),
  jobsMatched: integer('jobs_matched').default(0).notNull(),
  jobsApplied: integer('jobs_applied').default(0).notNull(),
  jobsSkippedExperience: integer('jobs_skipped_experience').default(0).notNull(),
  jobsSkippedScore: integer('jobs_skipped_score').default(0).notNull(),
  jobsSkippedCompany: integer('jobs_skipped_company').default(0).notNull(),
  jobsFailed: integer('jobs_failed').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ── 14. Automation Logs ───────────────────────────────────────────────
export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id'),
  platform: text('platform'),
  level: text('level').default('INFO').notNull(), // 'INFO' | 'WARNING' | 'ERROR'
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index('automation_logs_user_created_idx').on(table.userId, table.createdAt),
}));

// ── 15. Daily Application Statistics ──────────────────────────────────
export const dailyApplicationStatistics = pgTable('daily_application_statistics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  statDate: date('stat_date').notNull(),
  indeedCount: integer('indeed_count').default(0).notNull(),
  naukriCount: integer('naukri_count').default(0).notNull(),
  linkedinCount: integer('linkedin_count').default(0).notNull(),
  totalCount: integer('total_count').default(0).notNull(),
  successfulCount: integer('successful_count').default(0).notNull(),
  failedCount: integer('failed_count').default(0).notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex('user_stat_date_idx').on(table.userId, table.statDate),
}));

// ── Relations ─────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  preferences: one(jobPreferences, { fields: [users.id], references: [jobPreferences.userId] }),
  experiences: many(userExperiences),
  education: many(userEducation),
  skills: many(userSkills),
  resumes: many(resumes),
  connections: many(platformConnections),
  applications: many(applications),
  automationSessions: many(automationSessions),
  logs: many(automationLogs),
  dailyStats: many(dailyApplicationStatistics),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  company: one(companies, { fields: [applications.companyId], references: [companies.id] }),
  resume: one(resumes, { fields: [applications.resumeId], references: [resumes.id] }),
  answers: many(applicationAnswers),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  company: one(companies, { fields: [jobs.companyId], references: [companies.id] }),
  applications: many(applications),
}));
