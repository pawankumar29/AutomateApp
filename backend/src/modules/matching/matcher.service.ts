export interface MatchResult {
  score: number; // 0 to 100
  passedSkillThreshold: boolean;
  isExperienceEligible: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  experienceReason?: string;
}

export class JobMatcherService {
  /**
   * Matches candidate's resume/profile skills and experience against a job opening.
   */
  evaluateMatch(
    job: {
      title: string;
      description?: string | null;
      requiredSkills?: string[] | null;
      minExperience?: number | null;
      maxExperience?: number | null;
    },
    candidate: {
      skills: string[];
      totalExperienceYears: number;
    },
    threshold: number = 70
  ): MatchResult {
    // ── 1. Skill Matching ──────────────────────────────────────────
    const candidateSkillsLower = new Set(candidate.skills.map(s => s.toLowerCase().trim()));
    const jobDescriptionLower = (job.description || '').toLowerCase();
    const jobTitleLower = job.title.toLowerCase();

    // Determine target skills from job description & required skills
    let targetSkills: string[] = [];
    if (job.requiredSkills && job.requiredSkills.length > 0) {
      targetSkills = job.requiredSkills;
    } else {
      // Find skills mentioned in job description
      for (const skill of candidate.skills) {
        if (jobDescriptionLower.includes(skill.toLowerCase()) || jobTitleLower.includes(skill.toLowerCase())) {
          targetSkills.push(skill);
        }
      }
    }

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    if (targetSkills.length === 0) {
      // If no explicit skills found in job, check how many candidate skills are in description
      let matches = 0;
      for (const skill of candidate.skills) {
        if (jobDescriptionLower.includes(skill.toLowerCase()) || jobTitleLower.includes(skill.toLowerCase())) {
          matches++;
          matchedSkills.push(skill);
        }
      }
      // Heuristic score
      const rawScore = candidate.skills.length > 0 ? (matches / Math.min(candidate.skills.length, 6)) * 100 : 75;
      const score = Math.min(100, Math.max(50, Math.round(rawScore)));
      
      const isExpOk = this.checkExperience(job.minExperience, job.maxExperience, candidate.totalExperienceYears);
      return {
        score,
        passedSkillThreshold: score >= threshold,
        isExperienceEligible: isExpOk.eligible,
        matchedSkills,
        missingSkills,
        experienceReason: isExpOk.reason,
      };
    }

    for (const reqSkill of targetSkills) {
      const sLower = reqSkill.toLowerCase().trim();
      let hasMatch = false;
      for (const candSkill of candidateSkillsLower) {
        if (candSkill === sLower || candSkill.includes(sLower) || sLower.includes(candSkill)) {
          hasMatch = true;
          break;
        }
      }
      if (hasMatch) {
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }

    const score = Math.round((matchedSkills.length / targetSkills.length) * 100);
    const passedSkillThreshold = score >= threshold;

    // ── 2. Experience Filter ───────────────────────────────────────
    const expCheck = this.checkExperience(job.minExperience, job.maxExperience, candidate.totalExperienceYears);

    return {
      score,
      passedSkillThreshold,
      isExperienceEligible: expCheck.eligible,
      matchedSkills,
      missingSkills,
      experienceReason: expCheck.reason,
    };
  }

  private checkExperience(
    minExp: number | null | undefined,
    maxExp: number | null | undefined,
    userExp: number
  ): { eligible: boolean; reason: string } {
    // If job does not specify experience, do not reject; allow application
    if (minExp === null || minExp === undefined) {
      return { eligible: true, reason: 'No strict experience requirement specified.' };
    }

    // If job requires more than user has
    if (userExp < minExp) {
      return {
        eligible: false,
        reason: `Requires minimum ${minExp} years, candidate has ${userExp} years.`,
      };
    }

    // If user's experience exceeds job maximum by a large margin (e.g. overqualified)
    if (maxExp !== null && maxExp !== undefined && userExp > maxExp + 2) {
      return {
        eligible: false,
        reason: `Requires max ${maxExp} years, candidate has ${userExp} years.`,
      };
    }

    return { eligible: true, reason: 'Candidate experience matches requirements.' };
  }
}

export const jobMatcherService = new JobMatcherService();
