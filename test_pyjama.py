import asyncio, json
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=False)
        context = await browser.new_context(viewport={'width': 1280, 'height': 850})
        with open('profile/cookies_linkedin.json') as f:
            cookies = json.load(f)
        await context.add_cookies(cookies)
        page = await context.new_page()
        url = 'https://www.linkedin.com/jobs/view/4477983854/?applicantTrackingSystemName=PyjamaHR'
        await page.goto(url, wait_until='domcontentloaded')
        await asyncio.sleep(4)
        print('URL:', page.url)
        btn = page.locator("button:has-text('التقديم السريع'), button:has-text('Easy Apply')").first
        if await btn.count():
            print('Clicking Easy Apply button...')
            target = page
            try:
                async with context.expect_page(timeout=5000) as p_info:
                    await btn.click()
                target = await p_info.value
            except:
                pass
            await asyncio.sleep(4)
            print('Target URL:', target.url)
            print('Target Title:', await target.title())
            html = await target.content()
            with open('pyjama_after_click.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print('Saved pyjama_after_click.html len:', len(html))
        await browser.close()

asyncio.run(test())
