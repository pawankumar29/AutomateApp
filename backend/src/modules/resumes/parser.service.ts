import fs from 'fs';
import pdfParse from 'pdf-parse';
import axios from 'axios';
import { ENV } from '../../config/env.js';

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experienceYears: number;
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  experienceHistory: Array<{ company?: string; title?: string; duration?: string }>;
  certifications?: string[];
  summary?: string;
}

const COMMON_TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'golang', 'ruby', 'php', 'swift', 'kotlin', 'rust',
  'react', 'react native', 'next.js', 'vue', 'vue.js', 'angular', 'svelte',
  'node.js', 'nodejs', 'express', 'express.js', 'nestjs', 'fastapi', 'flask', 'django', 'spring boot', 'laravel',
  'postgresql', 'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb',
  'docker', 'kubernetes', 'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'terraform', 'jenkins', 'git', 'github', 'gitlab', 'ci/cd',
  'rest', 'restful api', 'graphql', 'microservices', 'grpc', 'websocket', 'kafka', 'rabbitmq',
  'html', 'html5', 'css', 'css3', 'tailwind', 'tailwind css', 'bootstrap', 'sass', 'redux', 'mobx', 'zustand',
  'linux', 'bash', 'powershell', 'playwright', 'puppeteer', 'selenium', 'jest', 'cypress', 'mocha'
];

export class ResumeParserService {
  async extractText(filePath: string, mimeType: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Resume file not found at ${filePath}`);
    }

    if (mimeType.includes('pdf') || filePath.toLowerCase().endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text || '';
    } else {
      // For txt or fallback
      return fs.readFileSync(filePath, 'utf8');
    }
  }

  async parseResume(rawText: string): Promise<ParsedResumeData> {
    // 1. If Gemini API Key is available, use Gemini for high-accuracy extraction
    if (ENV.GEMINI_API_KEY) {
      try {
        const aiParsed = await this.parseWithGemini(rawText);
        if (aiParsed && aiParsed.skills && aiParsed.skills.length > 0) {
          return aiParsed;
        }
      } catch (err) {
        console.warn('[ResumeParser] Gemini AI parsing failed, falling back to local extractor:', err);
      }
    }

    // 2. Intelligent Rule-based NLP Extractor (Offline / Reliable)
    return this.parseLocally(rawText);
  }

  private async parseWithGemini(rawText: string): Promise<ParsedResumeData> {
    const prompt = `
Extract structured professional details from this resume text into JSON format only.
Do not fabricate information. Only extract what is explicitly present or directly implied.

Resume Text:
"""
${rawText.slice(0, 10000)}
"""

JSON Schema:
{
  "name": "Full Name",
  "email": "email address",
  "phone": "phone number",
  "skills": ["Skill 1", "Skill 2"],
  "experienceYears": number (e.g. 3.5),
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "experienceHistory": [{"company": "...", "title": "...", "duration": "..."}],
  "certifications": ["..."]
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { timeout: 15000 }
    );

    const jsonText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (jsonText) {
      return JSON.parse(jsonText);
    }
    throw new Error('Empty Gemini response');
  }

  public parseLocally(text: string): ParsedResumeData {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const fullLower = text.toLowerCase();

    // 1. Email extraction
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : undefined;

    // 2. Phone extraction
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : undefined;

    // 3. Name extraction (heuristic: first non-empty line without special characters)
    let name: string | undefined = undefined;
    for (const line of lines.slice(0, 5)) {
      if (!line.includes('@') && !line.match(/\d/) && line.length > 2 && line.length < 40) {
        name = line;
        break;
      }
    }

    // 4. Skills extraction against comprehensive tech keywords
    const detectedSkills = new Set<string>();
    for (const skill of COMMON_TECH_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(fullLower)) {
        // Format nicely
        const titleCase = skill.charAt(0).toUpperCase() + skill.slice(1);
        detectedSkills.add(titleCase);
      }
    }

    // 5. Experience Years extraction
    let experienceYears = 0;
    const expRegex = /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)/i;
    const expMatch = text.match(expRegex);
    if (expMatch && expMatch[1]) {
      experienceYears = parseFloat(expMatch[1]);
    } else {
      // Look for year ranges like 2020 - 2024
      const yearRanges = text.match(/\b(20\d{2})\s*[-–to]+\s*(20\d{2}|present|current)\b/gi);
      if (yearRanges && yearRanges.length > 0) {
        let totalMonths = 0;
        const currentYear = new Date().getFullYear();
        for (const range of yearRanges) {
          const parts = range.split(/[-–to]+/i).map(p => p.trim().toLowerCase());
          const start = parseInt(parts[0], 10);
          const end = parts[1] === 'present' || parts[1] === 'current' ? currentYear : parseInt(parts[1], 10);
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            totalMonths += (end - start) * 12;
          }
        }
        experienceYears = Math.min(25, Math.max(1, parseFloat((totalMonths / 12).toFixed(1))));
      }
    }

    // 6. Education extraction
    const education: Array<{ degree?: string; institution?: string; year?: string }> = [];
    const eduMatches = text.match(/(Bachelor|Master|B\.Tech|B\.E\.|BCA|MCA|B\.S\.|M\.S\.|Ph\.D\.|Diploma)[^\n,.]+/gi);
    if (eduMatches) {
      for (const match of eduMatches.slice(0, 3)) {
        education.push({ degree: match.trim() });
      }
    }

    return {
      name,
      email,
      phone,
      skills: Array.from(detectedSkills),
      experienceYears: experienceYears || 2,
      education,
      experienceHistory: [],
    };
  }
}

export const resumeParserService = new ResumeParserService();
