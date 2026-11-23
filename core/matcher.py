import os
import re
import sqlite3
from typing import List, Set, Tuple, Optional, Dict, Any

COMMON_TECH_SKILLS = [
    "python", "javascript", "typescript", "java", "c++", "c#", "golang", "ruby", "rust",
    "react", "angular", "vue", "next.js", "node.js", "nodejs", "express", "nestjs", "fastapi", "django", "flask",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite", "docker", "kubernetes", "aws", "git",
    "rest", "graphql", "microservices", "html", "css", "tailwind", "linux"
]

class LocalResumeMatcher:
    def __init__(self, resume_path: Optional[str] = None, user_exp: float = 3.0):
        self.resume_path = resume_path
        self.user_exp = user_exp
        self.skills: Set[str] = set()
        self.resume_text = ""
        self._load_resume()

    def _load_resume(self):
        if not self.resume_path or not os.path.exists(self.resume_path):
            # Fallback default skills
            self.skills = {"python", "javascript", "react", "node.js", "sql", "git", "rest", "docker"}
            return

        try:
            # Try reading pdf or text
            if self.resume_path.lower().endswith(".pdf"):
                try:
                    import pypdf
                    reader = pypdf.PdfReader(self.resume_path)
                    for page in reader.pages:
                        self.resume_text += (page.extract_text() or "") + "\n"
                except Exception:
                    with open(self.resume_path, "rb") as f:
                        content = f.read().decode("latin1", errors="ignore")
                        self.resume_text = content
            else:
                with open(self.resume_path, "r", encoding="utf-8", errors="ignore") as f:
                    self.resume_text = f.read()

            lower = self.resume_text.lower()
            for s in COMMON_TECH_SKILLS:
                if re.search(r"\b" + re.escape(s) + r"\b", lower):
                    self.skills.add(s)

            # Extract experience if mentioned
            exp_match = re.search(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)", lower)
            if exp_match:
                self.user_exp = float(exp_match.group(1))

        except Exception as e:
            print(f"[Matcher] Warning loading resume: {e}")
            self.skills = {"python", "javascript", "react", "node.js", "sql"}

    def match_job(self, job_title: str, job_desc: str, min_exp: Optional[float] = None, max_exp: Optional[float] = None, threshold: float = 70.0) -> Tuple[bool, float, str]:
        """
        Calculates skill match percentage (0-100%) and evaluates experience requirements.
        Returns: (is_eligible, match_score, reason)
        """
        combined = f"{job_title} {job_desc}".lower()
        
        # Check experience eligibility
        if min_exp is not None and self.user_exp < min_exp:
            return (False, 0.0, f"Experience mismatch: Requires min {min_exp} yrs, candidate has {self.user_exp} yrs.")
        if max_exp is not None and self.user_exp > max_exp + 2.0:
            return (False, 0.0, f"Experience mismatch: Requires max {max_exp} yrs, candidate has {self.user_exp} yrs.")

        # Detect required skills from job
        job_skills = set()
        for s in COMMON_TECH_SKILLS:
            if re.search(r"\b" + re.escape(s) + r"\b", combined):
                job_skills.add(s)

        if not job_skills:
            # If no technical skills specifically detected, check candidate skills in text
            matches = [s for s in self.skills if s in combined]
            score = round((len(matches) / max(len(self.skills), 1)) * 100, 1)
            score = max(70.0, score) # Default acceptable if job title matches
            return (score >= threshold, score, f"Skill match score: {score}%")

        matched = job_skills.intersection(self.skills)
        score = round((len(matched) / len(job_skills)) * 100, 1)

        if score < threshold:
            missing = job_skills - self.skills
            return (False, score, f"Skill score {score}% is below {threshold}% threshold. Missing: {', '.join(list(missing)[:4])}")

        return (True, score, f"Skill score {score}% meets {threshold}% threshold.")


def normalize_company_name(name: str) -> str:
    if not name:
        return ""
    clean = name.lower().strip()
    clean = re.sub(r"[,.]", " ", clean)
    clean = re.sub(r"\b(inc|incorporated|llc|ltd|limited|pvt|private|corp|corporation|technologies|technology|tech|solutions|services|group|co)\b", "", clean)
    clean = re.sub(r"[^a-z0-9]", "", clean)
    return clean or name.lower().strip()

class StandaloneAppDatabase:
    """Local SQLite database for duplicate prevention during standalone CLI runs."""
    def __init__(self, db_path: str = "applications.db"):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._init_db()

    def _init_db(self):
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS applied_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT,
                    job_title TEXT,
                    company TEXT,
                    normalized_company TEXT,
                    platform TEXT,
                    job_url TEXT UNIQUE,
                    posting_date TEXT,
                    matching_score REAL,
                    status TEXT,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

    def is_already_applied(self, job_url: str, company: str) -> bool:
        norm_company = normalize_company_name(company)
        cur = self.conn.cursor()
        cur.execute("SELECT id FROM applied_jobs WHERE job_url = ? OR (normalized_company = ? AND status = 'SUBMITTED')", (job_url, norm_company))
        return cur.fetchone() is not None

    def record_application(self, job_id: str, title: str, company: str, platform: str, url: str, post_date: str, score: float, status: str):
        norm_company = normalize_company_name(company)
        with self.conn:
            self.conn.execute("""
                INSERT OR REPLACE INTO applied_jobs 
                (job_id, job_title, company, normalized_company, platform, job_url, posting_date, matching_score, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, title, company, norm_company, platform, url, post_date, score, status))
