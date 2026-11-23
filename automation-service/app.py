import os
import sys
import logging
import asyncio
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Add project root to sys.path so we can import bots and core
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from core.base_bot import BaseBot
from core.qa_engine import QAEngine

app = FastAPI(title="Job Application Automation Service", version="2.0.0")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("automation-service")

# ── Data Models ────────────────────────────────────────────────
class DiscoverRequest(BaseModel):
    platform: str # 'linkedin' | 'naukri' | 'indeed'
    keywords: str
    location: str
    max_results: Optional[int] = 25
    user_id: Optional[str] = "default"
    cookies: Optional[List[Dict[str, Any]]] = None

class ApplyRequest(BaseModel):
    platform: str
    job_url: str
    job_title: str
    company_name: str
    resume_path: Optional[str] = None
    user_id: str
    candidate_profile: Optional[Dict[str, Any]] = None
    answers: Optional[Dict[str, str]] = None
    cookies: Optional[List[Dict[str, Any]]] = None

class DiscoveredJobItem(BaseModel):
    platform: str
    platform_job_id: str
    title: str
    company_name: str
    location: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = []
    posting_date_raw: Optional[str] = None
    job_url: str
    is_easy_apply: bool = True

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "automation-service",
        "timestamp": datetime.utcnow().isoformat(),
    }

async def inject_session_cookies(bot, platform: str, cookies: Optional[List[Dict[str, Any]]] = None):
    raw_cookies = cookies
    if not raw_cookies or len(raw_cookies) == 0:
        cookie_file = f"/app/profile/cookies_{platform.lower()}.json"
        if os.path.exists(cookie_file):
            try:
                with open(cookie_file, "r", encoding="utf-8") as f:
                    raw_cookies = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load cookies from {cookie_file}: {e}")

    if raw_cookies and isinstance(raw_cookies, list) and len(raw_cookies) > 0:
        await bot.context.add_cookies(raw_cookies)
        logger.info(f"[{platform}] Injected {len(raw_cookies)} session cookies.")

# ── 1. Discover Jobs ──────────────────────────────────────────
@app.post("/discover")
async def discover_jobs(req: DiscoverRequest):
    """
    Discovers latest jobs from the requested platform.
    Extracts title, company, location, date posted, and job URLs.
    """
    logger.info(f"Discovering jobs on {req.platform} for '{req.keywords}' in '{req.location}'")
    discovered_jobs: List[Dict[str, Any]] = []

    try:
        if req.platform.lower() == "linkedin":
            from bots.linkedin_bot import LinkedInBot
            config = {
                "search": {"keywords": req.keywords, "location": req.location, "max_applications": req.max_results},
                "personal": {"resume_path": ""},
                "answers": {}
            }
            bot = LinkedInBot(config)
            await bot.start()
            await inject_session_cookies(bot, "linkedin", req.cookies)
            
            keywords_enc = req.keywords.replace(" ", "%20")
            location_enc = req.location.replace(" ", "%20")
            url = f"https://www.linkedin.com/jobs/search/?keywords={keywords_enc}&location={location_enc}&sortBy=DD&f_AL=true"
            
            await bot.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            cards = await bot.page.locator("div.job-card-container, li.scaffold-layout__list-item, .base-card, .job-search-card, a[href*='/jobs/view/']").all()
            for i, card in enumerate(cards[:req.max_results]):
                try:
                    title_el = card.locator(".base-search-card__title, a.job-card-list__title, h3, .job-card-container__link, a[href*='/jobs/view/']").first
                    title = (await title_el.inner_text(timeout=2000)).strip() if await title_el.count() else "Software Engineer"
                    
                    company_el = card.locator(".base-search-card__subtitle, h4, .job-card-container__company-name").first
                    company = (await company_el.inner_text(timeout=2000)).strip() if await company_el.count() else "Company"

                    loc_el = card.locator(".job-search-card__location, .job-card-container__metadata-item").first
                    location = (await loc_el.inner_text(timeout=2000)).strip() if await loc_el.count() else req.location

                    # Extract relative posting date
                    time_el = card.locator("time, .job-search-card__listdate, .job-card-container__footer-item").first
                    date_raw = (await time_el.inner_text(timeout=2000)).strip() if await time_el.count() else "Just posted"

                    href_el = card.locator("a.base-card__full-link, a.job-card-list__title, a").first
                    href = await href_el.get_attribute("href") if await href_el.count() else None
                    if not href or not href.startswith("http") or company == "Company":
                        continue
                    job_url = href
                    job_id = f"li-{i+1}-{abs(hash(title + company)) % 100000}"

                    discovered_jobs.append({
                        "platform": "linkedin",
                        "platform_job_id": job_id,
                        "title": title,
                        "company_name": company,
                        "location": location,
                        "posting_date_raw": date_raw,
                        "job_url": job_url,
                        "is_easy_apply": True
                    })
                except Exception as ex:
                    logger.debug(f"Error parsing LinkedIn card: {ex}")

            await bot.stop()

        elif req.platform.lower() == "naukri":
            from bots.naukri_bot import NaukriBot
            config = {
                "search": {"keywords": req.keywords, "location": req.location, "max_applications": req.max_results},
                "personal": {"resume_path": ""},
                "answers": {}
            }
            bot = NaukriBot(config)
            await bot.start()
            await inject_session_cookies(bot, "naukri", req.cookies)
            
            slug = req.keywords.lower().replace(" ", "-")
            url = f"https://www.naukri.com/{slug}-jobs?jobAge=7&sort=date"
            await bot.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            cards = await bot.page.locator("article.jobTuple, .cust-job-tuple, .srp-jobtuple-wrapper").all()
            for i, card in enumerate(cards[:req.max_results]):
                try:
                    title_el = card.locator("a.title, a.row1, .jobTitle a").first
                    title = (await title_el.inner_text(timeout=2000)).strip() if await title_el.count() else "Software Engineer"
                    
                    company_el = card.locator("a.subTitle, .companyInfo a").first
                    company = (await company_el.inner_text(timeout=2000)).strip() if await company_el.count() else "Company"

                    loc_el = card.locator(".location, li.location span").first
                    location = (await loc_el.inner_text(timeout=2000)).strip() if await loc_el.count() else req.location

                    # Naukri post age
                    date_el = card.locator(".date, .job-post-day").first
                    date_raw = (await date_el.inner_text(timeout=2000)).strip() if await date_el.count() else "Just posted"

                    href = await title_el.get_attribute("href") if await title_el.count() else None
                    job_url = href if href else f"https://www.naukri.com/job-listings-{i+1}"
                    job_id = f"nk-{i+1}-{abs(hash(title + company)) % 100000}"

                    discovered_jobs.append({
                        "platform": "naukri",
                        "platform_job_id": job_id,
                        "title": title,
                        "company_name": company,
                        "location": location,
                        "posting_date_raw": date_raw,
                        "job_url": job_url,
                        "is_easy_apply": True
                    })
                except Exception as ex:
                    logger.debug(f"Error parsing Naukri card: {ex}")

            await bot.stop()

        elif req.platform.lower() == "indeed":
            from bots.indeed_bot import IndeedBot
            config = {
                "indeed": {},
                "search": {"keywords": req.keywords, "location": req.location, "max_applications": req.max_results},
                "personal": {"resume_path": ""},
                "answers": {}
            }
            bot = IndeedBot(config)
            await bot.start()
            await inject_session_cookies(bot, "indeed", req.cookies)
            
            q_enc = req.keywords.replace(" ", "+")
            l_enc = req.location.replace(" ", "+")
            base_domain = "https://in.indeed.com" if "india" in req.location.lower() else "https://www.indeed.com"
            url = f"{base_domain}/jobs?q={q_enc}&l={l_enc}&sort=date"
            await bot.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)

            cards = await bot.page.locator("div.job_seen_beacon, .resultContent, div.cardOutline, td.resultContent").all()
            for i, card in enumerate(cards[:req.max_results]):
                try:
                    title_el = card.locator("h2.jobTitle a, h2 a, a[data-jk]").first
                    title = (await title_el.inner_text(timeout=2000)).strip() if await title_el.count() else "Software Engineer"

                    company_el = card.locator("[data-testid='company-name'], span.companyName").first
                    company = (await company_el.inner_text(timeout=2000)).strip() if await company_el.count() else "Company"

                    loc_el = card.locator("[data-testid='text-location'], .companyLocation").first
                    location = (await loc_el.inner_text(timeout=2000)).strip() if await loc_el.count() else req.location

                    date_el = card.locator("[data-testid='myJobsStateDate'], .date, span.date").first
                    date_raw = (await date_el.inner_text(timeout=2000)).strip() if await date_el.count() else "Just posted"

                    href = await title_el.get_attribute("href") if await title_el.count() else None
                    job_url = f"{base_domain}{href}" if href and href.startswith("/") else (href or f"{base_domain}/viewjob?jk={i+1}")
                    job_id = f"in-{i+1}-{abs(hash(title + company)) % 100000}"

                    card_text = (await card.inner_text()).lower()
                    is_easy = "easily apply" in card_text or "easy apply" in card_text

                    discovered_jobs.append({
                        "platform": "indeed",
                        "platform_job_id": job_id,
                        "title": title,
                        "company_name": company,
                        "location": location,
                        "posting_date_raw": date_raw,
                        "job_url": job_url,
                        "is_easy_apply": is_easy
                    })
                except Exception as ex:
                    logger.debug(f"Error parsing Indeed card: {ex}")

            await bot.stop()

    except Exception as e:
        logger.error(f"Discovery error on {req.platform}: {e}", exc_info=True)
        # Return whatever jobs were discovered before the error
    
    return {
        "success": True,
        "platform": req.platform,
        "count": len(discovered_jobs),
        "jobs": discovered_jobs
    }

# ── 2. Automated Apply ─────────────────────────────────────────
@app.post("/apply")
async def apply_to_job(req: ApplyRequest):
    """
    Submits an application to a specific job using the verified user profile,
    resume, and questionnaire answers.
    Returns status: 'SUBMITTED', 'NEEDS_ATTENTION', 'FAILED', or 'SKIPPED'.
    """
    logger.info(f"Applying to '{req.job_title}' at '{req.company_name}' ({req.platform}) for user {req.user_id}")
    
    prof = req.candidate_profile or {}
    config = {
        "personal": {
            "name": prof.get("fullName", "Pawan Kumar"),
            "email": prof.get("email", "pk2027317@gmail.com"),
            "phone": prof.get("phone", "7740073757"),
            "location": prof.get("location", "Gurugram, India"),
            "linkedin_url": prof.get("linkedinUrl", "https://www.linkedin.com/in/pawan-kumar"),
            "portfolio_url": prof.get("githubUrl", "https://github.com/"),
            "resume_path": req.resume_path or "",
            "years_of_experience": str(prof.get("totalExperienceYears", "3.5")),
            "current_role": prof.get("currentDesignation", "Software Engineer"),
            "current_company": prof.get("currentCompany", "Software Developer"),
            "expected_salary": prof.get("expectedSalary", "13 LPA"),
            "notice_period": prof.get("noticePeriod", "10 days"),
        },
        "search": {"max_applications": 1},
        "answers": req.answers or {},
        "indeed": {}
    }

    status = "SUBMITTED"
    evidence = None
    error_reason = None

    try:
        # Check if resume file exists
        if req.resume_path and not os.path.exists(req.resume_path):
            return {
                "status": "FAILED",
                "error_reason": f"Resume file not found at {req.resume_path}",
                "evidence": None
            }

        if req.platform == "linkedin":
            from bots.linkedin_bot import LinkedInBot
            bot = LinkedInBot(config)
            await bot.start()
            await inject_session_cookies(bot, "linkedin", req.cookies)
            await bot.page.goto(req.job_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)

            # Check for real visible security challenge or CAPTCHA
            captcha = bot.page.locator("#captcha-internal, .challenge-dialog, div[data-testid='challenge'], #checkpointCard").first
            if await captcha.count() and await captcha.is_visible():
                await bot.stop()
                return {
                    "status": "NEEDS_ATTENTION",
                    "error_reason": "Security challenge or CAPTCHA detected. Manual completion required.",
                    "evidence": None
                }

            # Attempt application flow (Easy Apply or External Company Portal)
            await bot._apply()
            filler = getattr(bot, "last_filler", None)
            if filler and filler.captcha_detected:
                status = "NEEDS_ATTENTION"
                error_reason = "Security challenge or reCAPTCHA detected. Manual completion required."
                evidence = filler.evidence
            elif bot.applied_count > 0:
                status = "SUBMITTED"
                evidence = f"LinkedIn application verified and submitted at {datetime.utcnow().isoformat()}"
            else:
                status = "NEEDS_ATTENTION"
                error_reason = "Form required manual verification or custom portal login."
            await bot.stop()

        elif req.platform == "naukri":
            from bots.naukri_bot import NaukriBot
            bot = NaukriBot(config)
            await bot.start()
            await inject_session_cookies(bot, "naukri", req.cookies)
            await bot.page.goto(req.job_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)

            await bot._apply()
            filler = getattr(bot, "last_filler", None)
            if filler and filler.captcha_detected:
                status = "NEEDS_ATTENTION"
                error_reason = "Security challenge or reCAPTCHA detected. Manual completion required."
                evidence = filler.evidence
            elif bot.applied_count > 0:
                status = "SUBMITTED"
                evidence = f"Naukri application verified and submitted at {datetime.utcnow().isoformat()}"
            else:
                status = "NEEDS_ATTENTION"
                error_reason = "Form required manual verification or custom portal login."
            await bot.stop()

        elif req.platform == "indeed":
            from bots.indeed_bot import IndeedBot
            bot = IndeedBot(config)
            await bot.start()
            await inject_session_cookies(bot, "indeed", req.cookies)
            await bot.page.goto(req.job_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)

            await bot._apply()
            filler = getattr(bot, "last_filler", None)
            if filler and filler.captcha_detected:
                status = "NEEDS_ATTENTION"
                error_reason = "Security challenge or reCAPTCHA detected. Manual completion required."
                evidence = filler.evidence
            elif bot.applied_count > 0:
                status = "SUBMITTED"
                evidence = f"Indeed application verified and submitted at {datetime.utcnow().isoformat()}"
            else:
                status = "NEEDS_ATTENTION"
                error_reason = "Form required manual verification or custom portal login."
            await bot.stop()

    except Exception as e:
        logger.error(f"Application failed: {e}", exc_info=True)
        status = "FAILED"
        error_reason = str(e)

    return {
        "status": status,
        "evidence": evidence,
        "error_reason": error_reason,
    }
