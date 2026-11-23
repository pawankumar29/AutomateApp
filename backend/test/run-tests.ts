import assert from 'assert';
import jwt from 'jsonwebtoken';
import { jobNormalizerService } from '../src/modules/jobs/normalizer.service.js';
import { jobMatcherService } from '../src/modules/matching/matcher.service.js';
import { encrypt, decrypt } from '../src/utils/crypto.js';
import { ENV } from '../src/config/env.js';

console.log('───────────────────────────────────────────────────────');
console.log('   Running Backend & SaaS Engine Test Suite');
console.log('───────────────────────────────────────────────────────');

let passed = 0;
let failed = 0;

function it(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── 1. Company Name Normalization (Rule B) ──────────────────────────
it('Company Normalization: strips suffixes (LLC, Inc, Pvt Ltd) into canonical identity', () => {
  const c1 = jobNormalizerService.normalizeCompanyName('Google LLC');
  const c2 = jobNormalizerService.normalizeCompanyName('Google, Inc.');
  const c3 = jobNormalizerService.normalizeCompanyName('Google Technologies Private Limited');
  assert.strictEqual(c1, 'google');
  assert.strictEqual(c2, 'google');
  assert.strictEqual(c3, 'google');
});

// ── 2. Relative Date Parsing (Rule A: Latest Jobs First) ────────────
it('Date Parser: accurately normalizes relative dates into UTC Timestamps', () => {
  const now = new Date();
  const dJust = jobNormalizerService.parsePostingDate('Just posted');
  assert(Math.abs(dJust.getTime() - now.getTime()) < 5000);

  const d2Hours = jobNormalizerService.parsePostingDate('2 hours ago');
  const expected2Hours = new Date(now.getTime() - 2 * 3600 * 1000);
  assert(Math.abs(d2Hours.getTime() - expected2Hours.getTime()) < 5000);

  const d1Day = jobNormalizerService.parsePostingDate('1 day ago');
  const expected1Day = new Date(now.getTime() - 24 * 3600 * 1000);
  assert(Math.abs(d1Day.getTime() - expected1Day.getTime()) < 5000);
});

// ── 3. Strict Date Descending Order Sorting ─────────────────────────
it('Strict Sorting: Newest jobs appear before older jobs', () => {
  const jobs = [
    { id: 'job_3d', dateStr: '3 days ago' },
    { id: 'job_just', dateStr: 'Just posted' },
    { id: 'job_1d', dateStr: '1 day ago' },
    { id: 'job_2h', dateStr: '2 hours ago' },
  ];

  const withTimestamps = jobs.map(j => ({
    ...j,
    timestamp: jobNormalizerService.parsePostingDate(j.dateStr).getTime()
  }));

  // Sort strict descending
  withTimestamps.sort((a, b) => b.timestamp - a.timestamp);

  assert.strictEqual(withTimestamps[0].id, 'job_just');
  assert.strictEqual(withTimestamps[1].id, 'job_2h');
  assert.strictEqual(withTimestamps[2].id, 'job_1d');
  assert.strictEqual(withTimestamps[3].id, 'job_3d');
});

// ── 4. Experience Range Extraction ──────────────────────────────────
it('Experience Extraction: extracts min and max experience boundaries', () => {
  const expRange = jobNormalizerService.extractExperience('Looking for 2 - 5 years experience');
  assert.strictEqual(expRange.minExperience, 2);
  assert.strictEqual(expRange.maxExperience, 5);

  const expPlus = jobNormalizerService.extractExperience('3+ years of Node.js and TypeScript');
  assert.strictEqual(expPlus.minExperience, 3);
  assert.strictEqual(expPlus.maxExperience, 6);

  const expFresher = jobNormalizerService.extractExperience('Fresher / Entry level welcome');
  assert.strictEqual(expFresher.minExperience, 0);
  assert.strictEqual(expFresher.maxExperience, 1);
});

// ── 5. Skill Matching Score (Rule D: 70%+ Threshold) ────────────────
it('Skill Matcher: scores 70%+ for matching candidate and rejects low scores', () => {
  const candidate = {
    skills: ['Python', 'TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker'],
    totalExperienceYears: 3.5,
  };

  // 100% Match
  const highMatch = jobMatcherService.evaluateMatch(
    {
      title: 'Full Stack Developer',
      description: 'Looking for Python, TypeScript, React, PostgreSQL',
      requiredSkills: ['Python', 'TypeScript', 'React', 'PostgreSQL'],
      minExperience: 2,
      maxExperience: 4,
    },
    candidate,
    70
  );
  assert(highMatch.passedSkillThreshold);
  assert(highMatch.score >= 70);
  assert(highMatch.isExperienceEligible);

  // Low Match (Below 70%)
  const lowMatch = jobMatcherService.evaluateMatch(
    {
      title: 'Java Cloud Engineer',
      description: 'We require Java, Spring Boot, AWS, Kubernetes, Kafka',
      requiredSkills: ['Java', 'Spring Boot', 'AWS', 'Kubernetes', 'Kafka'],
      minExperience: 2,
      maxExperience: 4,
    },
    candidate,
    70
  );
  assert.strictEqual(lowMatch.passedSkillThreshold, false);
  assert(lowMatch.score < 70);

  // Experience Mismatch: requires min 5 yrs, candidate has 3.5 => ineligible
  const expMismatch = jobMatcherService.evaluateMatch(
    {
      title: 'Senior Staff Engineer',
      description: 'Python, TypeScript, React',
      requiredSkills: ['Python', 'TypeScript'],
      minExperience: 5,
      maxExperience: 8,
    },
    candidate,
    70
  );
  assert.strictEqual(expMismatch.isExperienceEligible, false);
  assert(expMismatch.experienceReason?.includes('Requires minimum 5 years'));
});

// ── 6. Encryption & Decryption (AES-256 Security) ───────────────────
it('Security: Encrypts sensitive credentials at rest and decrypts accurately', () => {
  const secretCreds = JSON.stringify({ email: 'user@linkedin.com', password: 'SuperSecretPassword123!' });
  const cipher = encrypt(secretCreds);
  assert(cipher.includes(':'), 'Encrypted string must contain IV separator');
  assert.notStrictEqual(cipher, secretCreds);

  const plain = decrypt(cipher);
  assert.strictEqual(plain, secretCreds);
});

// ── 7. JWT Authentication Tokens ────────────────────────────────────
it('Auth: Generates and verifies signed tenant JWT tokens with user payload', () => {
  const payload = { id: 'usr-12345', email: 'test@saas.com', role: 'user' };
  const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '1h' });
  const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
  assert.strictEqual(decoded.id, 'usr-12345');
  assert.strictEqual(decoded.email, 'test@saas.com');
});

console.log('───────────────────────────────────────────────────────');
console.log(`Test Execution Summary: ${passed} Passed, ${failed} Failed`);
console.log('───────────────────────────────────────────────────────');

if (failed > 0) {
  process.exit(1);
}
