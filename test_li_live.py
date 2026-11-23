import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
import sys
sys.path.append('.')
from core.form_filler import UniversalFormFiller

PROFILE_DIR = Path("profile/linkedin").resolve()

async def run_apply():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True,
            viewport={"width": 1280, "height": 850},
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else await context.new_page()
        
        # 1. Search for genuine Easy Apply jobs on LinkedIn
        search_url = "https://www.linkedin.com/jobs/search/?keywords=Node.js&location=India&f_AL=true"
        print(f"Navigating to search: {search_url}")
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)
        print("Page Title:", await page.title())
        print("Search URL:", page.url)
        
        # Check job links in search results
        cards = await page.locator("li.scaffold-layout__list-item, div.job-card-container, [data-occludable-job-id], ul.jobs-search__results-list li").all()
        print(f"Found {len(cards)} job cards")
        
        target_job_url = None
        target_job_title = None
        
        for card in cards[:10]:
            try:
                a_link = card.locator("a[href*='/jobs/view/']").first
                if await a_link.count():
                    href = await a_link.get_attribute("href")
                    if href:
                        target_job_url = href.split("?")[0]
                        target_job_title = (await card.inner_text()).split("\n")[0]
                        print(f"Target selected: {target_job_title} -> {target_job_url}")
                        break
            except Exception as e:
                pass
                
        if not target_job_url:
            print("No job URL found in cards! Trying direct link search...")
            links = await page.locator("a[href*='/jobs/view/']").all()
            for l in links[:5]:
                h = await l.get_attribute("href")
                if h and "/jobs/view/" in h:
                    target_job_url = h.split("?")[0]
                    break

        if not target_job_url:
            print("Could not find any job URL!")
            await context.close()
            return
            
        print(f"\nVisiting target job: {target_job_url}")
        job_page = await context.new_page()
        await job_page.goto(target_job_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)
        print("Job Title:", await job_page.title())
        
        # Check for Easy Apply button
        apply_btn = job_page.locator("button.jobs-apply-button, button:has-text('Easy Apply'), [data-job-id] button:has-text('Apply')").first
        if not (await apply_btn.count() and await apply_btn.is_visible()):
            apply_btn = job_page.locator("button:has-text('Easy Apply')").first
            
        if await apply_btn.count() and await apply_btn.is_visible():
            btn_text = (await apply_btn.inner_text()).strip()
            print(f"Found Apply Button: '{btn_text}'! Clicking...")
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
                    'work authorization': 'Yes',
                    'relocation': 'Yes',
                    'notice period': '10 days',
                    'experience': '3.5'
                }
            }
            
            filler = UniversalFormFiller(job_page, config)
            success = await filler.fill_and_submit(max_steps=10)
            print(f"Submission status: success={success}, applied={filler.applied}")
            print(f"Evidence: {filler.evidence}")
            
            await asyncio.sleep(3)
            
            # Re-visit the job URL to verify it now says 'Applied'!
            print("\nVerifying on job link for 'Applied' status...")
            verify_page = await context.new_page()
            await verify_page.goto(target_job_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)
            
            # Check for applied badge
            applied_badge = verify_page.locator("span:has-text('Applied'), button:has-text('Applied'), .jobs-apply-button:has-text('Applied'), [class*='applied']").first
            has_applied = await applied_badge.count() > 0 and await applied_badge.is_visible()
            print(f"FINAL VERIFICATION ON LINK: Shows 'Applied' = {has_applied}")
            print(f"Link: {target_job_url}")
            await verify_page.close()
        else:
            print("Easy Apply button not visible on this page! Checking buttons:")
            btns = await job_page.locator("button").all()
            for b in btns:
                try:
                    t = (await b.inner_text()).strip()
                    if 'apply' in t.lower() or 'easy' in t.lower():
                        print(f"Button: '{t}' | class: {await b.get_attribute('class')}")
                except:
                    pass
                    
        await job_page.close()
        await context.close()

if __name__ == "__main__":
    asyncio.run(run_apply())
