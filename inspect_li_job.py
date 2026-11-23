import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

PROFILE_DIR = Path("profile/linkedin").resolve()

async def inspect():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True,
            viewport={"width": 1280, "height": 850},
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else await context.new_page()
        url = "https://www.linkedin.com/jobs/view/4485197843/"
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await asyncio.sleep(4)
        print("URL:", page.url)
        print("Title:", await page.title())
        
        # Check all apply elements
        elements = await page.locator(".jobs-apply-button, [aria-label*='Easy Apply'], [aria-label*='Apply'], button:has-text('Easy Apply'), button:has-text('Apply'), a:has-text('Apply')").all()
        print(f"Apply elements count: {len(elements)}")
        for el in elements:
            t = (await el.inner_text()).strip()
            vis = await el.is_visible()
            cls = await el.get_attribute("class")
            aria = await el.get_attribute("aria-label")
            print(f"El: text='{t}' | visible={vis} | aria='{aria}' | class='{cls}'")
            
        await context.close()

if __name__ == "__main__":
    asyncio.run(inspect())
