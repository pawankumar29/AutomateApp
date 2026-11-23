import { pool } from '../config/database.js';

export async function runMigrations() {
  console.log('[Migration] Checking and applying database schema...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- 1. Users
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 2. User Profiles
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        current_location TEXT,
        preferred_locations JSONB DEFAULT '[]'::jsonb,
        linkedin_url TEXT,
        portfolio_url TEXT,
        github_url TEXT,
        current_designation TEXT,
        current_company TEXT,
        total_experience_years REAL DEFAULT 0,
        expected_salary TEXT,
        current_salary TEXT,
        notice_period TEXT,
        gender TEXT,
        work_authorization BOOLEAN DEFAULT true,
        sponsorship_required BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 3. User Experiences
      CREATE TABLE IF NOT EXISTS user_experiences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name TEXT NOT NULL,
        designation TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        is_current BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 4. User Education
      CREATE TABLE IF NOT EXISTS user_education (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        degree TEXT NOT NULL,
        institution TEXT NOT NULL,
        field_of_study TEXT,
        graduation_year TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 5. User Skills
      CREATE TABLE IF NOT EXISTS user_skills (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_name TEXT NOT NULL,
        proficiency_level TEXT DEFAULT 'intermediate',
        years_experience REAL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 6. Resumes
      CREATE TABLE IF NOT EXISTS resumes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        parsed_text TEXT,
        parsed_data JSONB,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 7. Job Preferences
      CREATE TABLE IF NOT EXISTS job_preferences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        preferred_titles JSONB DEFAULT '[]'::jsonb,
        preferred_skills JSONB DEFAULT '[]'::jsonb,
        min_experience REAL DEFAULT 0,
        max_experience REAL DEFAULT 10,
        min_salary TEXT,
        expected_salary TEXT,
        preferred_locations JSONB DEFAULT '[]'::jsonb,
        remote_preference BOOLEAN DEFAULT false,
        hybrid_preference BOOLEAN DEFAULT true,
        onsite_preference BOOLEAN DEFAULT true,
        employment_types JSONB DEFAULT '["Full-time"]'::jsonb,
        min_match_score REAL NOT NULL DEFAULT 70,
        max_job_age_days INTEGER NOT NULL DEFAULT 7,
        daily_application_limit INTEGER NOT NULL DEFAULT 25,
        cycle_interval_minutes INTEGER NOT NULL DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 8. Platform Connections
      CREATE TABLE IF NOT EXISTS platform_connections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        connection_status TEXT NOT NULL DEFAULT 'disconnected',
        account_identifier TEXT,
        encrypted_credentials TEXT,
        session_cookies TEXT,
        last_synced_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_user_platform UNIQUE(user_id, platform)
      );

      -- 9. Companies
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL UNIQUE,
        domain TEXT,
        industry TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 10. Jobs
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        platform TEXT NOT NULL,
        platform_job_id TEXT NOT NULL,
        title TEXT NOT NULL,
        company_id UUID REFERENCES companies(id),
        company_name_raw TEXT NOT NULL,
        location TEXT,
        description TEXT,
        required_skills JSONB DEFAULT '[]'::jsonb,
        min_experience REAL,
        max_experience REAL,
        salary_text TEXT,
        posted_at TIMESTAMPTZ,
        posting_date_raw TEXT,
        job_url TEXT NOT NULL,
        application_url TEXT,
        is_easy_apply BOOLEAN DEFAULT true,
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_platform_job UNIQUE(platform, platform_job_id)
      );

      CREATE INDEX IF NOT EXISTS jobs_posted_at_idx ON jobs(posted_at DESC NULLS LAST);

      -- 11. Applications
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id),
        resume_id UUID REFERENCES resumes(id),
        platform TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DISCOVERED',
        match_score REAL DEFAULT 0,
        experience_match BOOLEAN DEFAULT true,
        applied_at TIMESTAMPTZ,
        submission_evidence TEXT,
        error_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_user_job UNIQUE(user_id, job_id)
      );

      CREATE INDEX IF NOT EXISTS app_user_company_idx ON applications(user_id, company_id);
      CREATE INDEX IF NOT EXISTS app_status_idx ON applications(status);
      CREATE INDEX IF NOT EXISTS app_applied_at_idx ON applications(applied_at);

      -- 12. Application Answers
      CREATE TABLE IF NOT EXISTS application_answers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        source TEXT DEFAULT 'profile',
        ai_explanation TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 13. Automation Sessions
      CREATE TABLE IF NOT EXISTS automation_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'STOPPED',
        current_platform TEXT,
        cycle_interval_minutes INTEGER NOT NULL DEFAULT 5,
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        jobs_discovered INTEGER NOT NULL DEFAULT 0,
        jobs_matched INTEGER NOT NULL DEFAULT 0,
        jobs_applied INTEGER NOT NULL DEFAULT 0,
        jobs_skipped_experience INTEGER NOT NULL DEFAULT 0,
        jobs_skipped_score INTEGER NOT NULL DEFAULT 0,
        jobs_skipped_company INTEGER NOT NULL DEFAULT 0,
        jobs_failed INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      );

      -- 14. Automation Logs
      CREATE TABLE IF NOT EXISTS automation_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID,
        platform TEXT,
        level TEXT NOT NULL DEFAULT 'INFO',
        message TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS automation_logs_user_idx ON automation_logs(user_id, created_at DESC);

      -- 15. Daily Application Statistics
      CREATE TABLE IF NOT EXISTS daily_application_statistics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stat_date DATE NOT NULL,
        indeed_count INTEGER NOT NULL DEFAULT 0,
        naukri_count INTEGER NOT NULL DEFAULT 0,
        linkedin_count INTEGER NOT NULL DEFAULT 0,
        total_count INTEGER NOT NULL DEFAULT 0,
        successful_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT unique_user_stat_date UNIQUE(user_id, stat_date)
      );
    `);
    console.log('[Migration] Database schema migrated successfully.');
  } catch (error) {
    console.error('[Migration] Failed to run database migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
