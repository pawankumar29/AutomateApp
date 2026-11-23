import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            headless=False,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(viewport={'width': 1280, 'height': 850})
        with open('profile/cookies_linkedin.json') as f:
            cookies = json.load(f)
        await context.add_cookies(cookies)
        page = await context.new_page()
        url = 'https://www.linkedin.com/jobs/search-results/?currentJobId=4477983854&keywords=React&f_AL=true'
        await page.goto(url, wait_until='domcontentloaded')
        await asyncio.sleep(4)
        
        apply_btn = page.locator("button:has(svg#inbug-fill-medium), button:has-text('التقديم السريع'), button:has-text('Easy Apply')").first
        print('Apply button found:', await apply_btn.count())
        if await apply_btn.count():
            print('Clicking Easy Apply button...')
            await apply_btn.click()
            await asyncio.sleep(4)
            print('Pages count in context:', len(context.pages))
            print('Current URL:', page.url)
            
            # Look for any modal / dialog / form
            dialogs = await page.locator("div[role='dialog'], .artdeco-modal, [data-test-modal], form").all()
            print('Dialogs/forms found:', len(dialogs))
            for d in dialogs:
                t = (await d.inner_text()).strip()
                cls = await d.get_attribute("class")
                role = await d.get_attribute("role")
                if t:
                    print(f"Dialog: role={role} | class={cls} | text={t[:150].replace(chr(10), ' ')}")
        await browser.close()

asyncio.run(test())
