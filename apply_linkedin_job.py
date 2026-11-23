import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
import sys
sys.path.append('.')
from core.form_filler import UniversalFormFiller

async def apply_first_easy_apply():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            headless=False,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 850},
            locale='en-US'
        )
        with open('profile/cookies_linkedin.json') as f:
            cookies = json.load(f)
        await context.add_cookies(cookies)
        await context.add_cookies([{'name': 'lang', 'value': 'v=2&lang=en-us', 'domain': '.linkedin.com', 'path': '/'}])
        
        page = await context.new_page()
        # Search Easy Apply jobs
        search_url = "https://www.linkedin.com/jobs/search/?keywords=Node.js&location=India&f_AL=true"
        print(f"[LinkedIn] Searching: {search_url}")
        await page.goto(search_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)
        
        job_links = await page.locator("a[href*='/jobs/view/']").all()
        print(f"Found {len(job_links)} job links")
        
        target_url = None
        for jl in job_links:
            href = await jl.get_attribute("href")
            if href and "/jobs/view/" in href:
                target_url = href.split("?")[0]
                break
                
        if not target_url:
            print("No job URL found!")
            await browser.close()
            return
            
        print(f"[LinkedIn] Target Job: {target_url}")
        job_page = await context.new_page()
        await job_page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)
        
        job_title = await job_page.title()
        print(f"[LinkedIn] Opened Job Title: {job_title}")
        
        # Check Easy Apply button
        apply_btn = job_page.locator("button.jobs-apply-button, button:has-text('Easy Apply'), button:has-text('Apply')").first
        if await apply_btn.count() and await apply_btn.is_visible():
            btn_txt = (await apply_btn.inner_text()).strip()
            print(f"[LinkedIn] Found Apply Button: '{btn_txt}'. Clicking...")
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
                    'experience': '3.5',
                    'salary': '13 LPA'
                }
            }
            
            filler = UniversalFormFiller(job_page, config)
            success = await filler.fill_and_submit(max_steps=10)
            print(f"[LinkedIn] Result: success={success}, applied={filler.applied}")
            print(f"[LinkedIn] Evidence: {filler.evidence}")
            
            await asyncio.sleep(3)
            
            # Check on viewjob if it shows 'Applied'
            v_page = await context.new_page()
            await v_page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(4)
            
            is_applied = await v_page.locator("button:has-text('Applied'), span:has-text('Applied'), .jobs-apply-button:has-text('Applied')").count() > 0
            print(f"\n[CONFIRMATION] Job Link shows 'Applied': {is_applied}")
            print(f"Direct Job Link: {target_url}")
            await v_page.close()
        else:
            print("[LinkedIn] Apply button not visible or already applied!")
            
        await job_page.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(apply_first_easy_apply())
