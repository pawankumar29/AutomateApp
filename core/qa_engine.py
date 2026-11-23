import re
import logging

logger = logging.getLogger(__name__)


class QAEngine:
    """Screening question answerer with affirmative default strategy."""

    def __init__(self, config: dict):
        self.personal = config.get("personal", {})
        self.saved = config.get("answers", {})

    def answer(self, question: str) -> str:
        q = question.lower().strip()

        # Try saved answers first (keyword match)
        for keyword, ans in self.saved.items():
            if keyword.lower() in q:
                return str(ans)

        # 1. Negative-Default Guardrails (strictly answered with No)
        if any(w in q for w in ["sponsor", "sponsorship", "require visa", "visa support"]):
            return "No"
        if any(w in q for w in ["felony", "crime", "criminal", "convicted", "lawsuit"]):
            return "No"
        if any(w in q for w in ["disability", "veteran", "handicap"]):
            return "Prefer not to say" if "gender" in q or "disability" in q else "No"
        if any(w in q for w in ["non-compete", "conflict of interest", "legal dispute"]):
            return "No"

        # 2. Personal & Quantitative Details
        if any(w in q for w in ["total experience", "years of experience", "overall experience", "how many years"]):
            return str(self.personal.get("years_of_experience", "3.5"))
        if any(w in q for w in ["expected salary", "expected ctc", "salary expectation", "compensation"]):
            return str(self.personal.get("expected_salary", "13 LPA"))
        if any(w in q for w in ["current salary", "current ctc"]):
            return str(self.personal.get("current_salary", "10 LPA"))
        if any(w in q for w in ["notice", "joining", "available to start", "start date"]):
            return str(self.personal.get("notice_period", "10 days"))
        if any(w in q for w in ["phone", "mobile", "contact number"]):
            return str(self.personal.get("phone", "+917740073757"))
        if any(w in q for w in ["current city", "current location", "residing"]):
            return str(self.personal.get("location", "Gurugram, India"))
        if any(w in q for w in ["current company", "current employer"]):
            return str(self.personal.get("current_company", "Software Developer"))
        if any(w in q for w in ["designation", "job title", "current role"]):
            return str(self.personal.get("current_role", "Software Engineer"))
        if any(w in q for w in ["linkedin"]):
            return str(self.personal.get("linkedin_url", "https://www.linkedin.com/in/pawan-kumar"))
        if any(w in q for w in ["website", "portfolio", "github"]):
            return str(self.personal.get("portfolio_url", "https://github.com/"))
        if any(w in q for w in ["education", "degree", "qualification"]):
            return "Bachelor of Technology (B.Tech)"

        # 3. User Rule: "zyadatar yes hi bharta hu mein" (Affirmative Screening)
        # Any qualification, authorization, relocation, skill familiarity, or willingness question defaults to "Yes"
        affirmative_triggers = [
            "authorized", "legally authorized", "work permit", "citizen", "eligible to work",
            "comfortable", "willing", "relocate", "relocation", "hybrid", "remote", "onsite", "office",
            "experience with", "hands-on", "knowledge of", "proficient", "familiar with", "worked on",
            "skills", "react", "node", "javascript", "typescript", "api", "database", "sql", "full stack",
            "background check", "drug test", "reference check", "agree", "consent", "terms", "policy",
            "degree", "graduation", "fluent", "english", "immediate", "full-time", "shift",
            "do you", "are you", "have you", "can you", "will you", "would you"
        ]
        if any(trig in q for trig in affirmative_triggers):
            return "Yes"

        # Fallback for numerical questions
        if any(w in q for w in ["years", "scale", "rating", "rate yourself"]):
            return "4"

        # General open-ended question fallback
        if len(q) > 15:
            return "Yes, I have 3.5+ years of software development experience with hands-on expertise in React, Node.js, TypeScript, and modern web architectures."

        return "Yes"

    def answer_numeric(self, question: str) -> str:
        ans = self.answer(question)
        numbers = re.findall(r"\d+(?:\.\d+)?", ans)
        return numbers[0] if numbers else "3.5"
