import os
import json
import asyncio
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()
PROFILE_DIR = BASE_DIR / "profile" / "linkedin"
PROFILE_DIR.mkdir(parents=True, exist_ok=True)

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
if not os.path.exists(CHROME_PATH):
    CHROME_PATH = r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    if not os.path.exists(CHROME_PATH):
        CHROME_PATH = None

async def login_linkedin():
    from playwright.async_api import async_playwright

    print("\n" + "=" * 65)
    print("  PERMANENT LINKEDIN LOGIN SYNC")
    print("=" * 65)
    print("  1. A Google Chrome window will open on your screen.")
    print("  2. Please enter your email, password & OTP in the browser.")
    print("  3. Once you reach your LinkedIn feed, the browser will save your")
    print("     entire profile permanently so you NEVER get logged out!")
    print("=" * 65 + "\n")

    async with async_playwright() as p:
        launch_kwargs = {
            "user_data_dir": str(PROFILE_DIR),
            "headless": False,
            "viewport": {"width": 1280, "height": 850},
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "args": [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        }
        if CHROME_PATH and os.path.exists(CHROME_PATH):
            launch_kwargs["executable_path"] = CHROME_PATH

        context = await p.chromium.launch_persistent_context(**launch_kwargs)
        page = context.pages[0] if context.pages else await context.new_page()

        print("[LinkedIn] Opening login page...")
        await page.goto("https://www.linkedin.com/login")

        print("[LinkedIn] Waiting for you to finish logging in...")
        logged_in = False
        for _ in range(120):  # Wait up to 6 minutes
            await asyncio.sleep(2)
            try:
                curr_url = page.url
                if any(k in curr_url for k in ["feed", "mynetwork", "jobs"]):
                    logged_in = True
                    break
                cnt = await page.locator(".global-nav__me, .feed-identity-module, [data-control-name='nav.settings_signout']").count()
                if cnt > 0:
                    logged_in = True
                    break
            except Exception:
                pass

        if not logged_in:
            print("\n[TIMEOUT] Login was not detected within timeout.")
            await context.close()
            return

        print("\n✅ [SUCCESS] LinkedIn login confirmed!")
        await asyncio.sleep(3)

        cookies = await context.cookies()
        out_cookie_file = BASE_DIR / "profile" / "cookies_linkedin.json"
        with open(out_cookie_file, "w", encoding="utf-8") as f:
            json.dump(cookies, f, indent=2)

        print(f"📁 Session cookies saved to: {out_cookie_file} ({len(cookies)} cookies)")
        print(f"📁 Permanent profile stored at: {PROFILE_DIR}")

        # Sync cookies to Docker PostgreSQL
        try:
            cookies_json_str = json.dumps(cookies).replace("'", "''")
            cmd = [
                "docker", "exec", "-i", "job_saas_postgres",
                "psql", "-U", "postgres", "-d", "job_apply_saas",
                "-c", f"UPDATE platform_connections SET connection_status = 'connected', session_cookies = '{cookies_json_str}', updated_at = NOW() WHERE platform = 'linkedin';"
            ]
            subprocess.run(cmd, capture_output=True, text=True)
            print("🎉 LinkedIn session synced to Docker database!")
        except Exception as e:
            print(f"[Warning] DB sync: {e}")

        # Also copy profile to Docker automation service
        try:
            subprocess.run(["docker", "cp", str(out_cookie_file), "job_saas_automation:/app/profile/cookies_linkedin.json"], capture_output=True)
            print("🎉 LinkedIn cookies synced to automation container!")
        except Exception:
            pass

        await context.close()
        print("\n✨ LinkedIn is now 100% READY & PERMANENTLY AUTHENTICATED!")

if __name__ == "__main__":
    asyncio.run(login_linkedin())
