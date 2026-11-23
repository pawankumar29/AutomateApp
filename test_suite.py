#!/usr/bin/env python3
"""
Python Test Suite for Job Application Automation Engine
Verifies:
1. Relative date parsing into ISO timestamps
2. Strict date-descending sorting (Rule A: Newest First)
3. 70%+ skill matching score & experience filter (Rule D)
4. Cross-platform company duplicate prevention (Rule B)
"""

import unittest
from datetime import datetime, timedelta
from core.date_parser import parse_relative_date, extract_experience_range
from core.matcher import LocalResumeMatcher, StandaloneAppDatabase

class TestAutomationEngine(unittest.TestCase):

    def test_relative_date_parser(self):
        now = datetime.utcnow()

        # Just posted -> close to now
        d_just = parse_relative_date("Just posted")
        self.assertAlmostEqual(d_just.timestamp(), now.timestamp(), delta=10)

        # 2 hours ago
        d_2h = parse_relative_date("2 hours ago")
        expected_2h = now - timedelta(hours=2)
        self.assertAlmostEqual(d_2h.timestamp(), expected_2h.timestamp(), delta=10)

        # 1 day ago
        d_1d = parse_relative_date("1 day ago")
        expected_1d = now - timedelta(days=1)
        self.assertAlmostEqual(d_1d.timestamp(), expected_1d.timestamp(), delta=10)

        # 3 days ago
        d_3d = parse_relative_date("3 days ago")
        expected_3d = now - timedelta(days=3)
        self.assertAlmostEqual(d_3d.timestamp(), expected_3d.timestamp(), delta=10)

    def test_strict_date_descending_sorting(self):
        """Rule A: Newest jobs MUST appear first."""
        jobs = [
            {"id": "job_3d", "date_str": "3 days ago"},
            {"id": "job_just", "date_str": "Just posted"},
            {"id": "job_1d", "date_str": "1 day ago"},
            {"id": "job_2h", "date_str": "2 hours ago"},
        ]

        # Parse normalized dates
        for j in jobs:
            j["timestamp"] = parse_relative_date(j["date_str"])

        # Sort in strict descending order
        sorted_jobs = sorted(jobs, key=lambda x: x["timestamp"], reverse=True)

        # Priority must be: Just posted -> 2 hours ago -> 1 day ago -> 3 days ago
        self.assertEqual(sorted_jobs[0]["id"], "job_just")
        self.assertEqual(sorted_jobs[1]["id"], "job_2h")
        self.assertEqual(sorted_jobs[2]["id"], "job_1d")
        self.assertEqual(sorted_jobs[3]["id"], "job_3d")

    def test_experience_range_extraction(self):
        min_e, max_e = extract_experience_range("Requires 2 - 5 years of software engineering")
        self.assertEqual(min_e, 2.0)
        self.assertEqual(max_e, 5.0)

        min_e, max_e = extract_experience_range("3+ years experience in Python")
        self.assertEqual(min_e, 3.0)
        self.assertEqual(max_e, 6.0)

        min_e, max_e = extract_experience_range("Looking for a Fresher / Entry Level")
        self.assertEqual(min_e, 0.0)
        self.assertEqual(max_e, 1.0)

    def test_resume_skill_matcher_and_threshold(self):
        """Rule D: 70%+ skill matching score & experience filter."""
        matcher = LocalResumeMatcher(resume_path=None, user_exp=3.5)
        matcher.skills = {"python", "javascript", "react", "node.js", "postgresql", "docker"}

        # High match: 5 out of 5 skills match => 100%
        ok, score, reason = matcher.match_job(
            job_title="Full Stack Python Developer",
            job_desc="We need Python, React, PostgreSQL, Docker, Node.js",
            min_exp=2.0,
            max_exp=4.0,
            threshold=70.0
        )
        self.assertTrue(ok)
        self.assertGreaterEqual(score, 70.0)

        # Low match: requires java, c++, golang, kubernetes, kafka => 0% of candidate skills
        ok_low, score_low, reason_low = matcher.match_job(
            job_title="Java Go Engineer",
            job_desc="Requires Java, Golang, C++, Kubernetes",
            min_exp=2.0,
            max_exp=4.0,
            threshold=70.0
        )
        self.assertFalse(ok_low)
        self.assertLess(score_low, 70.0)

        # Experience mismatch: requires min 5 years, candidate has 3.5 => must skip
        ok_exp, score_exp, reason_exp = matcher.match_job(
            job_title="Staff Engineer",
            job_desc="Python, React, Node.js",
            min_exp=5.0,
            max_exp=8.0,
            threshold=70.0
        )
        self.assertFalse(ok_exp)
        self.assertIn("Experience mismatch", reason_exp)

    def test_company_duplicate_prevention(self):
        """Rule B: Only ONE application per company across platforms."""
        db = StandaloneAppDatabase(":memory:")
        
        # Apply to Google on LinkedIn
        db.record_application(
            job_id="li-1",
            title="Software Engineer",
            company="Google LLC",
            platform="linkedin",
            url="https://linkedin.com/jobs/view/101",
            post_date="Just posted",
            score=95.0,
            status="SUBMITTED"
        )

        # Check if already applied to Google (e.g. from Indeed with variation "Google Inc.")
        is_applied = db.is_already_applied("https://indeed.com/viewjob?jk=202", "Google Inc.")
        self.assertTrue(is_applied, "Should detect existing application to Google under variation 'Google Inc.'")

        # Another company should be allowed
        is_applied_meta = db.is_already_applied("https://indeed.com/viewjob?jk=303", "Meta Platforms")
        self.assertFalse(is_applied_meta)

if __name__ == "__main__":
    unittest.main()
