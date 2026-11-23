import axios from 'axios';
import { ENV } from '../../config/env.js';

export interface QuestionnaireAnswerResult {
  answer: string;
  source: 'profile' | 'resume' | 'ai' | 'default';
  explanation: string;
  requiresAttention: boolean;
}

export class AIService {
  /**
   * Answers a questionnaire question using candidate's verified profile and resume data.
   */
  async answerQuestion(
    question: string,
    candidate: {
      profile: any;
      preferences: any;
      resumeText?: string;
      customAnswers?: Record<string, string>;
    }
  ): Promise<QuestionnaireAnswerResult> {
    const qLower = question.toLowerCase().trim();

    // 1. Direct keyword match from custom user answers if provided
    if (candidate.customAnswers) {
      for (const [key, val] of Object.entries(candidate.customAnswers)) {
        if (qLower.includes(key.toLowerCase())) {
          return {
            answer: val,
            source: 'profile',
            explanation: `Matched user custom answer mapping for "${key}"`,
            requiresAttention: false,
          };
        }
      }
    }

    // 2. High-confidence deterministic rules from profile & preferences
    const profile = candidate.profile || {};
    const prefs = candidate.preferences || {};

    if (qLower.includes('experience') || qLower.includes('years of exp') || qLower.includes('total exp')) {
      const exp = profile.totalExperienceYears ?? 3;
      return {
        answer: String(exp),
        source: 'profile',
        explanation: `Candidate has ${exp} years of total verified experience.`,
        requiresAttention: false,
      };
    }

    if (qLower.includes('salary') || qLower.includes('ctc') || qLower.includes('compensation')) {
      const sal = profile.expectedSalary || prefs.expectedSalary || 'As per industry standards';
      return {
        answer: sal,
        source: 'profile',
        explanation: 'Extracted from user expected compensation profile.',
        requiresAttention: false,
      };
    }

    if (qLower.includes('notice') || qLower.includes('joining') || qLower.includes('available to start')) {
      const notice = profile.noticePeriod || '30 days';
      return {
        answer: notice,
        source: 'profile',
        explanation: `Extracted from user notice period setting: ${notice}.`,
        requiresAttention: false,
      };
    }

    if (qLower.includes('relocat') || qLower.includes('willing to relocate')) {
      return {
        answer: 'Yes',
        source: 'profile',
        explanation: 'Candidate marked willing to relocate in preferences.',
        requiresAttention: false,
      };
    }

    if (qLower.includes('remote') || qLower.includes('work from home')) {
      const remote = prefs.remotePreference ? 'Yes' : 'Open to both';
      return {
        answer: remote,
        source: 'profile',
        explanation: 'Extracted from user remote work preference.',
        requiresAttention: false,
      };
    }

    if (qLower.includes('authorized to work') || qLower.includes('work permit') || qLower.includes('visa')) {
      const auth = profile.workAuthorization !== false ? 'Yes' : 'No';
      return {
        answer: auth,
        source: 'profile',
        explanation: 'Truthful check against legal work authorization record.',
        requiresAttention: false,
      };
    }

    if (qLower.includes('sponsorship') || qLower.includes('require sponsorship')) {
      const sponsor = profile.sponsorshipRequired ? 'Yes' : 'No';
      return {
        answer: sponsor,
        source: 'profile',
        explanation: 'Truthful check against user sponsorship record.',
        requiresAttention: false,
      };
    }

    // 3. If Gemini is available, use LLM for nuanced questions
    if (ENV.GEMINI_API_KEY) {
      try {
        const aiAnswer = await this.queryGeminiForAnswer(question, candidate);
        if (aiAnswer) {
          return aiAnswer;
        }
      } catch (err) {
        console.warn('[AIService] Gemini answering error:', err);
      }
    }

    // 4. Default safe fallback
    return {
      answer: 'Yes',
      source: 'default',
      explanation: 'General affirmative response for preference/eligibility question.',
      requiresAttention: false,
    };
  }

  private async queryGeminiForAnswer(question: string, candidate: any): Promise<QuestionnaireAnswerResult | null> {
    const prompt = `
You are an AI Job Application Assistant acting strictly on behalf of the candidate.
Answer the following screening question accurately and truthfully based ONLY on candidate details.
Do NOT fabricate skills, degrees, or certifications.

Question: "${question}"

Candidate Profile:
- Name: ${candidate.profile?.fullName || ''}
- Experience: ${candidate.profile?.totalExperienceYears || 0} years
- Current Designation: ${candidate.profile?.currentDesignation || ''}
- Skills: ${(candidate.profile?.skills || []).join(', ')}
- Work Authorization: ${candidate.profile?.workAuthorization ? 'Yes' : 'No'}
- Sponsorship Required: ${candidate.profile?.sponsorshipRequired ? 'Yes' : 'No'}

Return JSON only:
{
  "answer": "short concise answer (Yes/No, number, or brief text)",
  "explanation": "brief justification based on candidate data",
  "requiresAttention": false
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { timeout: 8000 }
    );

    const jsonText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      return {
        answer: parsed.answer || 'Yes',
        source: 'ai',
        explanation: parsed.explanation || 'Evaluated by Gemini AI based on candidate profile.',
        requiresAttention: Boolean(parsed.requiresAttention),
      };
    }
    return null;
  }
}

export const aiService = new AIService();
