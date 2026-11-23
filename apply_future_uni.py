import asyncio, json, logging
from pathlib import Path
from playwright.async_api import async_playwright
import sys
sys.path.append('.')

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("LinkedInApply")
from core.form_filler import UniversalFormFiller

async def apply():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            headless=False,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 850},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        )
        with open('profile/cookies_linkedin.json') as f:
            cookies = json.load(f)
        await context.add_cookies(cookies)
        
        page = await context.new_page()
        url = 'https://www.linkedin.com/jobs/view/4477983854/'
        logger.info(f"Navigating to {url}...")
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(4)
        
        apply_btn = page.locator("button:has(svg#inbug-fill-medium), button:has-text('Easy Apply'), button:has-text('التقديم السريع')").first
        if await apply_btn.count() and await apply_btn.is_visible():
            logger.info("Found Easy Apply button. Clicking...")
            await apply_btn.click()
            await asyncio.sleep(3)
            
            resume_file = list(Path('.').glob('uploads/resume-*.pdf'))
            resume_path = str(resume_file[0].resolve()) if resume_file else ''
            config = {
                'personal': {
                    'name': 'Pawan Kumar',
                    'email': 'pk2027317@gmail.com',
                    'phone': '7740073757',
                    'location': 'Gurugram, India',
                    'resume_path': resume_path,
                    'years_of_experience': '3.5',
                },
                'answers': {
                    'notice period': '10',
                    'expected': '1300000',
                    'current': '1000000',
                }
            }
            filler = UniversalFormFiller(page, config)
            res = await filler.fill_and_submit(max_steps=12)
            logger.info(f"Fill and submit result: {res}, applied: {filler.applied}")
            
            # Wait for modal or submission confirmation
            await asyncio.sleep(5)
            
            # Now verify on the job page!
            logger.info("Verifying application status on job page...")
            await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            await asyncio.sleep(4)
            
            # Check for applied badge/text
            applied_indicators = [
                "button:has-text('Applied')",
                "button:has-text('تم التقديم')",
                "span:has-text('Applied')",
                "span:has-text('تم التقديم')",
                "span:has-text('تم تقديم الطلب')",
                ".jobs-s-apply__applied-update"
            ]
            verified = False
            for ind in applied_indicators:
                loc = page.locator(ind).first
                if await loc.count() and await loc.is_visible():
                    txt = (await loc.inner_text()).strip()
                    logger.info(f"VERIFIED! Found indicator: '{ind}' with text: '{txt}'")
                    verified = True
                    break
                    
            if not verified:
                # Print current action buttons
                btns = await page.locator(".jobs-apply-button--top-card, .jobs-s-apply button").all_inner_texts()
                logger.info(f"Current button texts: {btns}")
        else:
            logger.info("Easy Apply button not visible or already applied.")
            # Check if already applied
            applied_elem = page.locator("button:has-text('Applied'), span:has-text('Applied'), span:has-text('تم التقديم')").first
            if await applied_elem.count() and await applied_elem.is_visible():
                logger.info("Job already marked as APPLIED!")
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(apply())
