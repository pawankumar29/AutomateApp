import asyncio
import logging
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from core.base_bot import BaseBot
from core.qa_engine import QAEngine
from core.form_filler import UniversalFormFiller

logger = logging.getLogger(__name__)

HOME_URL  = "https://www.naukri.com/"
LOGIN_URL = "https://www.naukri.com/nlogin/login"
JOBS_URL  = "https://www.naukri.com/{keywords}-jobs?jobAge=7"

# Selectors that indicate an external company portal apply button — skip these
EXTERNAL_APPLY_SELECTORS = [
    "button:has-text('Apply on Company')",
    "a:has-text('Apply on Company')",
    "button:has-text('Apply on company')",
    "button:has-text('Company Site')",
    "a[href*='apply']:not([href*='naukri'])",
]

# What a successful Naukri Easy Apply looks like
EASY_APPLY_SELECTOR = (
    "button.apply-button:has-text('Apply'), "
    "button[class*='apply']:not([class*='company']):has-text('Apply'), "
    "button:has-text('Easy Apply')"
)


class NaukriBot(BaseBot):
    def __init__(self, config: dict):
        super().__init__(config, "naukri")
        self.search = config["search"]
        self.qa     = QAEngine(config)
        self.skipped_external = 0

    # ── Auth ──────────────────────────────────────────────────

    async def login(self):
        await self.wait_for_manual_login(
            login_url=LOGIN_URL,
            indicator_selector=".nI-gNb-drawer__icon, .nI-gNb-menuItem, .nI-gNb-log",
            platform="Naukri",
        )

    async def _bump_profile(self):
        """Bumps profile to top of recruiter searches."""
        try:
            await self.page.goto(
                "https://www.naukri.com/mnjuser/profile",
                wait_until="domcontentloaded",
            )
            await self.sleep(2, 3)
            save = self.page.locator("button:has-text('Save')").first
            if await save.count():
                await save.click()
                await self.sleep(1, 2)
                logger.info("[Naukri] Profile bumped to top.")
        except Exception as e:
            logger.warning(f"[Naukri] Profile bump failed: {e}")

    # ── Main run loop ─────────────────────────────────────────

    async def run(self):
        await self.start()
        await self.login()
        await self._bump_profile()

        keywords = self.search.get("keywords", "software-developer")
        slug = keywords.lower().replace(" ", "-")
        url  = JOBS_URL.format(keywords=slug)

        await self.page.goto(url, wait_until="domcontentloaded")
        await self.sleep(3, 5)

        while self.applied_count < self.max_applications:
            links = await self._collect_easy_apply_links()
            if not links:
                logger.info("[Naukri] No Easy Apply jobs found on this page.")
                if not await self._next_page():
                    break
                continue

            logger.info(f"[Naukri] Found {len(links)} Easy Apply jobs on this page.")

            for link in links:
                if self.applied_count >= self.max_applications:
                    break
                try:
                    await self.page.goto(link, wait_until="domcontentloaded")
                    await self.sleep(2, 4)
                    await self._apply()
                except Exception as e:
                    logger.warning(f"[Naukri] Skipping job: {e}")

            if not await self._next_page():
                break

        logger.info(
            f"[Naukri] Done. Applied: {self.applied_count} | "
            f"Skipped (external portal): {self.skipped_external}"
        )
        await self.stop()

    # ── Collect only Easy Apply job links from listing page ───

    async def _collect_easy_apply_links(self) -> list:
        """Return links only for jobs that show Easy Apply on the listing page."""
        cards = await self.page.locator(
            "article.jobTuple, .cust-job-tuple, .srp-jobtuple-wrapper"
        ).all()

        links = []
        for card in cards:
            try:
                # Skip if card explicitly shows "Apply on Company Site"
                external = await card.locator(
                    ":has-text('Apply on Company'), :has-text('Company Site')"
                ).count()
                if external:
                    self.skipped_external += 1
                    continue

                # Only collect if card has an apply button that stays on Naukri
                a = card.locator("a.title, a.row1, .jobTitle a").first
                href = await a.get_attribute("href")
                if href:
                    links.append(href)
            except Exception:
                pass

        return links

    # ── Apply flow ────────────────────────────────────────────

    async def _apply(self):
        await self.sleep(1, 2)

        # Guard 1 — already applied
        already = self.page.locator("button:has-text('Applied'), .applied-btn")
        if await already.count():
            logger.info("[Naukri] Already applied to this job — skipping.")
            return

        # Find any apply button (including Company Site apply)
        apply_selectors = [
            "button:has-text('Apply')",
            "button:has-text('Easy Apply')",
            "button.apply-button",
            "button:has-text('Apply on Company')",
            "a:has-text('Apply on Company')",
            "button:has-text('Company Site')",
            "button[class*='apply']",
            "a[href*='apply']",
        ]

        apply_btn = None
        for sel in apply_selectors:
            try:
                candidate = self.page.locator(sel).first
                if await candidate.count() and await candidate.is_visible():
                    apply_btn = candidate
                    break
            except Exception:
                continue

        if not apply_btn:
            logger.info("[Naukri] No apply button found — skipping.")
            return

        target_page = self.page
        try:
            async with self.context.expect_page(timeout=7000) as new_page_info:
                await apply_btn.click()
            target_page = await new_page_info.value
            await target_page.wait_for_load_state("domcontentloaded", timeout=15000)
            logger.info(f"[Naukri] Switched to application page: {target_page.url}")
        except Exception:
            await self.sleep(2, 3)

        # Run Universal Form Filler with resume and affirmative questionnaire logic
        filler = UniversalFormFiller(target_page, self.config)
        success = await filler.fill_and_submit(max_steps=10)
        if success or filler.applied:
            self.applied_count += 1
            logger.info(f"[Naukri] Application successfully completed! Total: {self.applied_count}")
        tabs_after = set(self.context.pages)
        new_tabs = tabs_after - tabs_before
        if new_tabs:
            for tab in new_tabs:
                url = tab.url
                if "naukri.com" not in url:
                    self.skipped_external += 1
                    logger.info(f"[Naukri] External portal opened ({url[:60]}...) — closing and skipping.")
                    await tab.close()
                    return

        # Proceed with Easy Apply modal
        await self._fill_and_submit()

    async def _fill_and_submit(self):
        for _ in range(8):
            await self.sleep(1, 2)
            await self._fill_modal()

            # Success check
            success = self.page.locator(
                "text=Successfully Applied, text=applied successfully, "
                "text=Application Submitted"
            )
            if await success.count():
                self.applied_count += 1
                logger.info(f"[Naukri] Applied! Total: {self.applied_count}")
                await self._close_modal()
                return

            # Submit button
            submit = self.page.locator(
                "button:has-text('Submit'), button:has-text('Apply')"
            ).last
            if await submit.count():
                await submit.click()
                await self.sleep(1, 2)
                if await self.page.locator(
                    "text=Successfully Applied, text=applied successfully, "
                    "text=Application Submitted"
                ).count():
                    self.applied_count += 1
                    logger.info(f"[Naukri] Applied! Total: {self.applied_count}")
                    await self._close_modal()
                    return

            # Next / Continue
            progressed = False
            for label in ["Next", "Continue", "Proceed"]:
                btn = self.page.locator(f"button:has-text('{label}')").first
                if await btn.count():
                    await btn.click()
                    await self.sleep(1, 2)
                    progressed = True
                    break
            if not progressed:
                break

        await self._close_modal()

    async def _fill_modal(self):
        resume = self.config["personal"].get("resume_path", "")

        if resume:
            upload = self.page.locator("input[type='file']").first
            if await upload.count():
                try:
                    await upload.set_input_files(resume)
                    await self.sleep(1, 2)
                except Exception:
                    pass

        scope = (
            "div.chatbot_DrawerContentWrapper input[type='text'], "
            "div.chatbot_DrawerContentWrapper input[type='number'], "
            "div.chatbot_DrawerContentWrapper textarea, "
            "div.apply-question input, "
            "div.apply-question textarea"
        )
        for inp in await self.page.locator(scope).all():
            try:
                if await inp.input_value():
                    continue
                label = await self.get_label_for(inp)
                answer = self.qa.answer(label)
                if answer:
                    await self.human_type_el(inp, answer)
            except Exception:
                pass

        for sel in await self.page.locator("select").all():
            try:
                label  = await self.get_label_for(sel)
                answer = self.qa.answer(label)
                opts   = await sel.locator("option").all_inner_texts()
                match  = next((o for o in opts if answer.lower() in o.lower()), None)
                if match:
                    await sel.select_option(label=match)
            except Exception:
                pass

        for radio in await self.page.locator("input[type='radio']").all():
            try:
                if await radio.is_checked():
                    continue
                rid = await radio.get_attribute("id")
                label_el = self.page.locator(f"label[for='{rid}']")
                label_text = await label_el.inner_text()
                fieldset = radio.locator("xpath=ancestor::fieldset").first
                q_text = await fieldset.locator("legend").inner_text()
                answer = self.qa.answer(q_text)
                if answer.lower() in label_text.lower():
                    await radio.click()
            except Exception:
                pass

    async def _close_modal(self):
        for sel in [
            "button.close-btn",
            "span.close-icon",
            "button[class*='close']",
        ]:
            if await self.click(sel, timeout=3000):
                await self.sleep(1, 2)
                return

    async def _next_page(self) -> bool:
        btn = self.page.locator(
            "a.pagination-btn.rightBtn, a[title='Next']"
        ).first
        if await btn.count():
            await btn.click()
            await self.sleep(3, 5)
            return True
        return False
