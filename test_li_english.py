import asyncio, json
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            headless=False,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 850}
        )
        with open('profile/cookies_linkedin.json') as f:
            cookies = json.load(f)
        await context.add_cookies(cookies)
        page = await context.new_page()
        await context.add_cookies([{'name': 'lang', 'value': 'v=2&lang=en-us', 'domain': '.linkedin.com', 'path': '/'}])
        await page.goto('https://www.linkedin.com/feed/', wait_until='domcontentloaded')
        await asyncio.sleep(4)
        print('URL:', page.url)
        print('English Title:', await page.title())
        profile_links = await page.locator("a[href*='/in/']").all()
        print('Profile links count:', len(profile_links))
        for pl in profile_links[:3]:
            t = (await pl.inner_text()).strip()
            h = await pl.get_attribute('href')
            if t or h:
                print(f'User Profile Element: text="{t}" | href="{h}"')
        await browser.close()

asyncio.run(test())
