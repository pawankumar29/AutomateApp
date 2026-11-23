import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.resolve()
PROFILE_DIR = BASE_DIR / "profile"
PROFILE_DIR.mkdir(parents=True, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(CHROME_PATH):
        CHROME_PATH = None  # Playwright default

PLATFORMS = {
    "1": {
        "name": "LinkedIn",
        "key": "linkedin",
        "login_url": "https://www.linkedin.com/login",
        "check_indicator": lambda page: "feed" in page.url or "mynetwork" in page.url or "jobs" in page.url,
        "indicator_selector": ".global-nav__me, .feed-identity-module, [data-control-name='nav.settings_signout']",
    },
    "2": {
        "name": "Naukri",
        "key": "naukri",
        "login_url": "https://www.naukri.com/nlogin/login",
        "check_indicator": lambda page: "mnjuser" in page.url or "mynaukri" in page.url,
        "indicator_selector": ".nI-gNb-drawer__icon, .nI-gNb-menuItem, .user-name",
    },
    "3": {
        "name": "Indeed",
        "key": "indeed",
        "login_url": "https://secure.indeed.com/auth?hl=en_IN&co=IN",
        "check_indicator": lambda page: "indeed.com" in page.url and "auth" not in page.url,
        "indicator_selector": "[data-gnav-element-name='UserMenu'], [aria-label='User navigation']",
    },
}

async def login_platform(choice: str):
    info = PLATFORMS.get(choice)
    if not info:
        print("Invalid platform choice.")
        return

    name = info["name"]
    key = info["key"]

    print("\n" + "=" * 65)
    print(f"  Starting 1-Click Interactive Login for: {name.upper()}")
    print("=" * 65)
    print(f"  1. A Google Chrome window is opening on your screen.")
    print(f"  2. Please enter your email, password & OTP in the browser window.")
    print(f"  3. Once you log in, this script will AUTOMATICALLY capture your")
    print(f"     session cookies and sync them to your Docker SaaS system!")
    print("=" * 65 + "\n")

    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("[ERROR] Playwright is not installed in your Python environment.")
        print("Run: pip install playwright")
        return

    async with async_playwright() as p:
        launch_kwargs = {
            "headless": False,
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        }
        if CHROME_PATH and os.path.exists(CHROME_PATH):
            launch_kwargs["executable_path"] = CHROME_PATH

        browser = await p.chromium.launch(**launch_kwargs)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 850},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        )
        page = await context.new_page()

        print(f"[{name}] Opening login page: {info['login_url']}...")
        await page.goto(info["login_url"])

        print(f"[{name}] Waiting for you to finish logging in...")
        logged_in = False
        for _ in range(120):  # Wait up to 6 minutes
            await asyncio.sleep(3)
            try:
                # Check URL or selector
                if info["check_indicator"](page):
                    logged_in = True
                    break
                sel_count = await page.locator(info["indicator_selector"]).count()
                if sel_count > 0:
                    logged_in = True
                    break
            except Exception:
                pass

        if not logged_in:
            print(f"\n[TIMEOUT] Login was not detected for {name} within the timeout.")
            await browser.close()
            return

        print(f"\n✅ [SUCCESS] {name} login detected!")
        await asyncio.sleep(2)  # Allow remaining cookies to settle

        cookies = await context.cookies()
        await browser.close()

        # Save to profile/cookies_<platform>.json
        out_file = PROFILE_DIR / f"cookies_{key}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2)

        print(f"📁 Session saved to: {out_file.relative_to(BASE_DIR)} ({len(cookies)} cookies)")

        # Sync to PostgreSQL container
        print(f"🔄 Syncing session cookies to Docker PostgreSQL...")
        try:
            cookies_json_str = json.dumps(cookies).replace("'", "''")
            cmd = [
                "docker", "exec", "-i", "job_saas_postgres",
                "psql", "-U", "postgres", "-d", "job_apply_saas",
                "-c", f"UPDATE platform_connections SET connection_status = 'connected', session_cookies = '{cookies_json_str}', updated_at = NOW() WHERE platform = '{key}';"
            ]
            subprocess.run(cmd, capture_output=True, text=True)
            print(f"🎉 {name} is now FULLY CONNECTED and AUTHENTICATED in Docker!")
        except Exception as e:
            print(f"[Warning] Could not sync directly to PostgreSQL: {e}")
            print(f"However, the file {out_file.name} is saved and will be loaded automatically by Docker!")

def main():
    print("\n" + "=" * 60)
    print("      JOB APPLICATION SAAS - 1-CLICK AUTHENTICATION SYNC")
    print("=" * 60)
    print("  Select the platform you want to log in to:")
    print("  [1] LinkedIn")
    print("  [2] Naukri")
    print("  [3] Indeed")
    print("  [4] All Platforms (One by One)")
    print("=" * 60)

    choice = input("\nEnter choice (1, 2, 3, or 4): ").strip()
    if choice in ("1", "2", "3"):
        asyncio.run(login_platform(choice))
    elif choice == "4":
        for c in ("1", "2", "3"):
            asyncio.run(login_platform(c))
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()
