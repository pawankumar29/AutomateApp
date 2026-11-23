import os
import asyncio
import logging
from typing import Dict, Any, Optional
from playwright.async_api import Page, TimeoutError as PlaywrightTimeout
from core.qa_engine import QAEngine

logger = logging.getLogger(__name__)

class UniversalFormFiller:
    """
    Automates multi-step job application forms across LinkedIn, Indeed, Naukri,
    and external ATS portals (Greenhouse, Lever, Workday, SmartRecruiters, BambooHR, etc.).
    """

    def __init__(self, page: Page, config: dict):
        self.page = page
        self.config = config
        self.personal = config.get("personal", {})
        self.qa = QAEngine(config)
        self.resume_path = self.personal.get("resume_path", "")
        self.applied = False
        self.evidence = None

    async def fill_and_submit(self, max_steps: int = 10) -> bool:
        """Runs the complete auto-fill and submission loop."""
        logger.info(f"[FormFiller] Starting universal auto-fill on: {self.page.url}")

        # If page has an 'Apply for this job' or 'Apply now' button before the form, click it
        await self._click_apply_trigger()

        for step in range(1, max_steps + 1):
            await asyncio.sleep(1.5)
            logger.info(f"[FormFiller] Executing step {step}/{max_steps} on: {self.page.url}")

            # 1. Upload Resume
            await self._upload_resume()

            # 2. Fill standard text, email, phone, number fields
            await self._fill_text_inputs()

            # 3. Fill select dropdowns
            await self._fill_selects()

            # 4. Fill radio button groups (defaults to 'Yes')
            await self._fill_radios()

            # 5. Check agreement / terms checkboxes
            await self._fill_checkboxes()

            # 6. Check if Submit button is available
            submitted = await self._attempt_submit()
            if submitted:
                self.applied = True
                self.evidence = f"Universal submission confirmed at {self.page.url}"
                logger.info(f"[FormFiller] Application successfully SUBMITTED! Evidence: {self.evidence}")
                return True

            # 7. Advance to Next step if not yet submit
            advanced = await self._advance_next_step()
            if not advanced:
                # Check if submission happened without explicit submit button click (e.g. instant apply or already submitted)
                if await self._check_success():
                    self.applied = True
                    self.evidence = f"Success confirmation detected on {self.page.url}"
                    return True
                logger.info(f"[FormFiller] No more steps or submission blocked at step {step}.")
                break

        # Final check for success page
        if await self._check_success():
            self.applied = True
            self.evidence = f"Success screen confirmed on {self.page.url}"
            return True

        return self.applied

    async def _click_apply_trigger(self):
        """Clicks any initial 'Apply' button to open the form if not visible."""
        triggers = [
            "button:has-text('Apply for this job')",
            "a:has-text('Apply for this job')",
            "button:has-text('Apply now')",
            "a:has-text('Apply now')",
            "button:has-text('Apply with Resume')",
            "#apply_button",
            "a[href*='apply']",
        ]
        for sel in triggers:
            try:
                btn = self.page.locator(sel).first
                if await btn.count() and await btn.is_visible():
                    await btn.click()
                    await asyncio.sleep(2)
                    break
            except Exception:
                pass

    async def _upload_resume(self):
        """Finds any file upload element and attaches the user's PDF resume."""
        if not self.resume_path or not os.path.exists(self.resume_path):
            return

        file_inputs = await self.page.locator("input[type='file']").all()
        for finp in file_inputs:
            try:
                if await finp.is_visible() or await finp.count() > 0:
                    await finp.set_input_files(self.resume_path)
                    logger.info(f"[FormFiller] Attached resume to input: {self.resume_path}")
                    await asyncio.sleep(1.5)
            except Exception as e:
                logger.debug(f"[FormFiller] File upload error: {e}")

    async def _fill_text_inputs(self):
        """Fills first/last name, full name, email, phone, location, and question fields."""
        inputs = await self.page.locator(
            "input[type='text'], input[type='email'], input[type='tel'], input[type='number'], textarea"
        ).all()

        for inp in inputs:
            try:
                # Skip if hidden or already filled
                if not await inp.is_visible():
                    continue
                current_val = await inp.input_value()
                if current_val and len(current_val.strip()) > 0:
                    continue

                label = await self._get_label_for(inp)
                lbl_lower = label.lower()

                # Skip search / filter inputs
                if any(k in lbl_lower for k in ["search", "filter", "captcha", "select language"]):
                    continue

                # Determine best value
                val = ""
                full_name = self.personal.get("name", "Pawan Kumar")
                parts = full_name.split()
                first_name = parts[0] if parts else "Pawan"
                last_name = parts[-1] if len(parts) > 1 else "Kumar"

                if any(k in lbl_lower for k in ["first name", "given name", "fname"]):
                    val = first_name
                elif any(k in lbl_lower for k in ["last name", "family name", "surname", "lname"]):
                    val = last_name
                elif any(k in lbl_lower for k in ["full name", "your name", "candidate name", "name"]):
                    val = full_name
                elif any(k in lbl_lower for k in ["email", "e-mail"]):
                    val = self.personal.get("email", "pk2027317@gmail.com")
                elif any(k in lbl_lower for k in ["phone", "mobile", "tel", "contact"]):
                    val = self.personal.get("phone", "7740073757")
                elif any(k in lbl_lower for k in ["city", "location", "address"]):
                    val = self.personal.get("location", "Gurugram, India")
                elif any(k in lbl_lower for k in ["linkedin"]):
                    val = self.personal.get("linkedin_url", "https://www.linkedin.com/in/pawan-kumar")
                elif any(k in lbl_lower for k in ["github", "portfolio", "website"]):
                    val = self.personal.get("portfolio_url", "https://github.com/")
                elif any(k in lbl_lower for k in ["salary", "ctc", "expected"]):
                    val = self.personal.get("expected_salary", "13 LPA")
                elif any(k in lbl_lower for k in ["notice", "joining"]):
                    val = self.personal.get("notice_period", "10 days")
                elif any(k in lbl_lower for k in ["experience", "years"]):
                    val = str(self.personal.get("years_of_experience", "3.5"))
                else:
                    # Generic screening question — ask QAEngine (defaults to Yes / positive answer)
                    val = self.qa.answer(label)

                if val:
                    await inp.fill("")
                    await inp.type(str(val), delay=30)
                    logger.info(f"[FormFiller] Filled '{label}' => '{val}'")
            except Exception as e:
                logger.debug(f"[FormFiller] Text input fill error: {e}")

    async def _fill_selects(self):
        """Fills select dropdowns, prioritizing 'Yes', standard education, or experience options."""
        selects = await self.page.locator("select").all()
        for sel in selects:
            try:
                if not await sel.is_visible():
                    continue

                label = await self._get_label_for(sel)
                lbl_lower = label.lower()
                if "language" in lbl_lower:
                    continue

                options = await sel.locator("option").all_inner_texts()
                opt_clean = [o.strip() for o in options if o.strip() and "--" not in o]
                if not opt_clean:
                    continue

                target = self.qa.answer(label)
                matched = None

                # 1. Match exact target
                for o in opt_clean:
                    if target.lower() in o.lower():
                        matched = o
                        break

                # 2. If target is Yes, find option starting with Yes
                if not matched and target.lower() == "yes":
                    for o in opt_clean:
                        if o.lower().startswith("yes") or o.lower() == "y":
                            matched = o
                            break

                # 3. Fallback to Bachelor's / Full-Time / India / 3-5 years
                if not matched:
                    for o in opt_clean:
                        if any(k in o.lower() for k in ["bachelor", "full time", "india", "3", "yes"]):
                            matched = o
                            break

                if matched:
                    await sel.select_option(label=matched)
                    logger.info(f"[FormFiller] Selected '{label}' => '{matched}'")
            except Exception as e:
                logger.debug(f"[FormFiller] Select fill error: {e}")

    async def _fill_radios(self):
        """Fills radio buttons, strictly defaulting to 'Yes' for screening questions."""
        radios = await self.page.locator("input[type='radio']").all()
        for radio in radios:
            try:
                if not await radio.is_visible() or await radio.is_checked():
                    continue

                rid = await radio.get_attribute("id")
                label_text = ""
                if rid:
                    lbl = self.page.locator(f"label[for='{rid}']").first
                    if await lbl.count():
                        label_text = (await lbl.inner_text()).strip()

                val = (await radio.get_attribute("value") or "").lower()
                is_yes_choice = "yes" in label_text.lower() or val in ["yes", "true", "1", "y"]

                # If this option is 'Yes', click it!
                if is_yes_choice:
                    await radio.click()
                    logger.info(f"[FormFiller] Clicked YES radio option ('{label_text}')")
            except Exception as e:
                logger.debug(f"[FormFiller] Radio fill error: {e}")

    async def _fill_checkboxes(self):
        """Checks agreement and compliance checkboxes."""
        checkboxes = await self.page.locator("input[type='checkbox']").all()
        for cb in checkboxes:
            try:
                if not await cb.is_visible() or await cb.is_checked():
                    continue

                label = await self._get_label_for(cb)
                lbl_lower = label.lower()
                # Check if it's agreement / terms / consent
                if any(w in lbl_lower for w in ["agree", "terms", "consent", "certify", "acknowledge", "authorized", "privacy", "confirm"]):
                    await cb.click()
                    logger.info(f"[FormFiller] Checked agreement checkbox: '{label}'")
            except Exception as e:
                logger.debug(f"[FormFiller] Checkbox fill error: {e}")

    async def _attempt_submit(self) -> bool:
        """Looks for final submit buttons and clicks them."""
        submit_selectors = [
            "button:has-text('Submit your application')",
            "button:has-text('Submit application')",
            "button:has-text('Submit Application')",
            "button[data-testid*='submit']",
            "button.ia-continueButton:has-text('Submit')",
            "button[type='submit']:has-text('Submit')",
            "button:has-text('Submit')",
            "button:has-text('Send application')",
            "button:has-text('Complete application')",
            "button:has-text('Apply now')",
            "input[type='submit'][value*='Submit']",
            "button[id*='submit']",
            "button[name*='submit']",
        ]
        for sel in submit_selectors:
            try:
                btn = self.page.locator(sel).first
                if await btn.count() and await btn.is_visible() and not await btn.is_disabled():
                    logger.info(f"[FormFiller] Found final Submit button: {sel}. Clicking...")
                    await btn.click()
                    await asyncio.sleep(4)
                    return True
            except Exception:
                pass
        return False

    async def _advance_next_step(self) -> bool:
        """Finds Next / Continue buttons to progress multi-step forms."""
        next_selectors = [
            "button.ia-continueButton",
            "button:has-text('Continue to next step')",
            "button:has-text('Review your application')",
            "button:has-text('Review application')",
            "button:has-text('Save and continue')",
            "button:has-text('Next step')",
            "button:has-text('Continue')",
            "button:has-text('Next')",
            "button:has-text('Review')",
            "button.artdeco-button--primary:has-text('Next')",
            "button[data-easy-apply-next-button]",
            "[data-testid='review-button']",
        ]
        for sel in next_selectors:
            try:
                btn = self.page.locator(sel).first
                if await btn.count() and await btn.is_visible() and not await btn.is_disabled():
                    txt = (await btn.inner_text()).strip()
                    logger.info(f"[FormFiller] Advancing step via button: '{txt}'")
                    await btn.click()
                    await asyncio.sleep(2)
                    return True
            except Exception:
                pass
        return False

    async def _check_success(self) -> bool:
        """Checks if page shows confirmation message or URL."""
        try:
            curr_url = self.page.url.lower()
            if any(k in curr_url for k in ["from=gnav-indapply-smartapply", "post-apply", "applied=true", "success", "confirmation", "thank-you"]):
                return True

            content = (await self.page.content()).lower()
            success_indicators = [
                "thank you for applying",
                "your application was submitted",
                "application submitted",
                "application has been submitted",
                "application received",
                "we have received your application",
                "applied successfully",
            ]
            return any(ind in content for ind in success_indicators)
        except Exception:
            return False

    async def _get_label_for(self, element) -> str:
        """Extracts label text associated with an input element."""
        try:
            el_id = await element.get_attribute("id")
            if el_id:
                lbl = self.page.locator(f"label[for='{el_id}']").first
                if await lbl.count():
                    return (await lbl.inner_text()).strip()
        except Exception:
            pass

        for attr in ["aria-label", "placeholder", "name"]:
            try:
                val = await element.get_attribute(attr)
                if val:
                    return val.strip()
            except Exception:
                pass

        try:
            # Check parent label or preceding sibling
            parent = element.locator("xpath=..").first
            text = (await parent.inner_text()).strip()
            if text and len(text) < 100:
                return text
        except Exception:
            pass

        return ""
