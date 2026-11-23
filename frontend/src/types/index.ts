export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  currentLocation?: string;
  preferredLocations?: string[];
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  currentDesignation?: string;
  currentCompany?: string;
  totalExperienceYears: number;
  expectedSalary?: string;
  currentSalary?: string;
  noticePeriod?: string;
  gender?: string;
  workAuthorization: boolean;
  sponsorshipRequired: boolean;
}

export interface JobPreferences {
  id: string;
  userId: string;
  preferredTitles: string[];
  preferredSkills: string[];
  minExperience: number;
  maxExperience: number;
  minSalary?: string;
  expectedSalary?: string;
  preferredLocations: string[];
  remotePreference: boolean;
  hybridPreference: boolean;
  onsitePreference: boolean;
  employmentTypes: string[];
  minMatchScore: number;
  maxJobAgeDays: number;
  dailyApplicationLimit: number;
  cycleIntervalMinutes: number;
}

export interface Resume {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  parsedData?: {
    name?: string;
    email?: string;
    phone?: string;
    skills?: string[];
    experienceYears?: number;
    education?: Array<{ degree?: string; institution?: string; year?: string }>;
    experienceHistory?: Array<{ company?: string; title?: string; duration?: string }>;
  };
  createdAt: string;
}

export interface Application {
  id: string;
  platform: 'linkedin' | 'naukri' | 'indeed';
  status: 'DISCOVERED' | 'MATCHED' | 'QUEUED' | 'IN_PROGRESS' | 'SUBMITTED' | 'FAILED' | 'NEEDS_ATTENTION' | 'SKIPPED' | 'EXPIRED';
  matchScore: number;
  experienceMatch: boolean;
  appliedAt?: string;
  createdAt: string;
  submissionEvidence?: string;
  errorReason?: string;
  notes?: string;
  jobId: string;
  jobTitle: string;
  jobLocation?: string;
  jobDescription?: string;
  jobPostedAt?: string;
  postingDateRaw?: string;
  jobUrl: string;
  applicationUrl?: string;
  companyId: string;
  companyName: string;
  resumeId?: string;
  resumeName?: string;
}

export interface PlatformConnection {
  platform: 'linkedin' | 'naukri' | 'indeed';
  connectionStatus: 'connected' | 'disconnected' | 'session_active' | 'error';
  accountIdentifier?: string;
  lastSyncedAt?: string;
  lastError?: string;
  hasCredentials: boolean;
  hasSessionCookies: boolean;
}

export interface DashboardSummary {
  overview: {
    total: number;
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    successful: number;
    failed: number;
    pending: number;
    needsAttention: number;
    discovered: number;
    matched: number;
    skipped: number;
  };
  platforms: {
    linkedin: number;
    naukri: number;
    indeed: number;
  };
  dailyStats: Array<{
    date: string;
    indeed: number;
    naukri: number;
    linkedin: number;
    total: number;
    success: number;
    failed: number;
  }>;
}

export interface AutomationStatus {
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  lastRunAt?: string;
  nextRunAt?: string;
  cycleIntervalMinutes: number;
  jobsDiscovered: number;
  jobsMatched: number;
  jobsApplied: number;
  jobsSkippedExperience: number;
  jobsSkippedScore: number;
  jobsFailed: number;
}

export interface AutomationLog {
  id: string;
  platform?: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  createdAt: string;
}
