export interface NormalizedExperience {
  minExperience?: number;
  maxExperience?: number;
}

export class JobNormalizerService {
  /**
   * Normalizes company name for cross-platform deduplication.
   * e.g., "Google Inc.", "Google LLC", "Google, Inc.", "Google Technologies Private Limited" => "google"
   */
  normalizeCompanyName(rawName?: string | null): string {
    if (!rawName || typeof rawName !== 'string') return 'unknown-company';
    let clean = rawName.toLowerCase().trim();
    // Remove common business suffixes and special characters
    clean = clean.replace(/[,.]/g, ' ');
    clean = clean.replace(/\b(inc|incorporated|llc|ltd|limited|pvt|private|corp|corporation|technologies|technology|tech|solutions|services|group|co)\b/gi, '');
    clean = clean.replace(/[^a-z0-9]/gi, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean || rawName.toLowerCase().trim();
  }

  /**
   * Parses relative or absolute date strings into a normalized Date object.
   * Supports: "Just posted", "10 minutes ago", "2 hours ago", "1 day ago", "3 days ago", "Posted 2d ago", etc.
   */
  parsePostingDate(dateStr?: string | null): Date {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const str = dateStr.toLowerCase().trim();
    const now = new Date();

    if (str.includes('just') || str.includes('moments') || str.includes('few seconds')) {
      return now;
    }

    if (str.includes('today')) {
      return now;
    }

    if (str.includes('yesterday')) {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d;
    }

    // Minutes ago: e.g. "30 minutes ago", "45m ago"
    const minMatch = str.match(/(\d+)\s*(?:minutes?|mins?|m)\s*(?:ago)?/);
    if (minMatch && minMatch[1]) {
      const mins = parseInt(minMatch[1], 10);
      return new Date(now.getTime() - mins * 60 * 1000);
    }

    // Hours ago: e.g. "3 hours ago", "5h ago", "1 hr ago"
    const hrMatch = str.match(/(\d+)\s*(?:hours?|hrs?|h)\s*(?:ago)?/);
    if (hrMatch && hrMatch[1]) {
      const hrs = parseInt(hrMatch[1], 10);
      return new Date(now.getTime() - hrs * 3600 * 1000);
    }

    // Days ago: e.g. "2 days ago", "1d ago", "Posted 3 days ago"
    const dayMatch = str.match(/(\d+)\s*(?:days?|d)\s*(?:ago)?/);
    if (dayMatch && dayMatch[1]) {
      const days = parseInt(dayMatch[1], 10);
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d;
    }

    // Weeks ago: e.g. "1 week ago", "2w ago"
    const weekMatch = str.match(/(\d+)\s*(?:weeks?|w)\s*(?:ago)?/);
    if (weekMatch && weekMatch[1]) {
      const weeks = parseInt(weekMatch[1], 10);
      const d = new Date(now);
      d.setDate(d.getDate() - weeks * 7);
      return d;
    }

    // Months ago: e.g. "1 month ago"
    const monthMatch = str.match(/(\d+)\s*(?:months?|mo)\s*(?:ago)?/);
    if (monthMatch && monthMatch[1]) {
      const months = parseInt(monthMatch[1], 10);
      const d = new Date(now);
      d.setMonth(d.getMonth() - months);
      return d;
    }

    // Try parsing standard date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return now;
  }

  /**
   * Extracts min and max experience from text (e.g., "2 - 5 years", "3+ Yrs", "Fresher", "0-1 years")
   */
  extractExperience(text: string | null | undefined): NormalizedExperience {
    if (!text) return {};
    const lower = text.toLowerCase();

    if (lower.includes('fresher') || lower.includes('entry level') || lower.includes('0-1 year')) {
      return { minExperience: 0, maxExperience: 1 };
    }

    // Match range e.g. "2 - 5 years", "2 to 4 yrs"
    const rangeMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
      return {
        minExperience: parseFloat(rangeMatch[1]),
        maxExperience: parseFloat(rangeMatch[2]),
      };
    }

    // Match single plus e.g. "3+ years", "5+ yrs"
    const plusMatch = lower.match(/(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/);
    if (plusMatch && plusMatch[1]) {
      const min = parseFloat(plusMatch[1]);
      return { minExperience: min, maxExperience: min + 3 };
    }

    return {};
  }
}

export const jobNormalizerService = new JobNormalizerService();
