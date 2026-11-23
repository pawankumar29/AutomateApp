#!/usr/bin/env python3
"""
Job Auto Apply — Unified Async Launcher & 5-Minute Continuous Monitoring Engine
Applies to jobs on LinkedIn, Indeed, and Naukri simultaneously.
Strict Date-Descending Sorting | 70%+ Skill Match | 1-Company-1-App Duplicate Prevention
"""

import sys
import asyncio
import yaml
import logging
import colorlog
import argparse
from pathlib import Path
from datetime import datetime, timedelta

from core.date_parser import parse_relative_date, extract_experience_range
from core.matcher import LocalResumeMatcher, StandaloneAppDatabase

def setup_logging():
    console = colorlog.StreamHandler(sys.stdout)
    console.setFormatter(colorlog.ColoredFormatter(
        "%(log_color)s%(asctime)s  %(levelname)-8s  %(message)s%(reset)s",
        datefmt="%H:%M:%S",
        log_colors={
            "DEBUG":    "cyan",
            "INFO":     "green",
            "WARNING":  "yellow",
            "ERROR":    "red",
            "CRITICAL": "bold_red",
        },
    ))

    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / f"session_{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.log"
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(console)
    root.addHandler(file_handler)

    logging.info(f"Log file: {log_file.resolve()}")
    return log_file


def load_config(path: str = "config.yaml") -> dict:
    p = Path(path)
    if not p.exists():
        example_p = Path("config.example.yaml")
        if example_p.exists():
            print("\n[INFO] config.yaml not found. Using config.example.yaml defaults.\n")
            with open(example_p, encoding="utf-8") as f:
                return yaml.safe_load(f)
        else:
            print("\n[ERROR] config.yaml not found.")
            sys.exit(1)
    with open(p, encoding="utf-8") as f:
        return yaml.safe_load(f)


PLATFORMS = {
    "1": ("LinkedIn", "bots.linkedin_bot", "LinkedInBot"),
    "2": ("Indeed",   "bots.indeed_bot",   "IndeedBot"),
    "3": ("Naukri",   "bots.naukri_bot",   "NaukriBot"),
}


def print_menu():
    print("\n" + "=" * 55)
    print("   AI Job Auto Apply SaaS & Automation Engine")
    print("   LinkedIn | Indeed | Naukri")
    print("=" * 55)
    for key, (name, _, _) in PLATFORMS.items():
        print(f"   [{key}]  {name}")
    print("   [4]  All platforms simultaneously (Single Run)")
    print("   [5]  Continuous 5-Minute Monitoring Cycle (All Platforms)")
    print("   [0]  Exit")
    print("=" * 55)


def get_bot(key: str, config: dict):
    import importlib
    _, mod_path, cls_name = PLATFORMS[key]
    mod = importlib.import_module(mod_path)
    return getattr(mod, cls_name)(config)


async def run_bot(key: str, config: dict):
    name = PLATFORMS[key][0]
    log  = logging.getLogger(name)
    log.info(f"Starting {name} bot")
    bot = get_bot(key, config)
    try:
        await bot.run()
    except Exception as e:
        log.error(f"Bot [{name}] encountered error: {e}", exc_info=True)


async def run_all(config: dict):
    results = await asyncio.gather(
        *(run_bot(k, config) for k in PLATFORMS),
        return_exceptions=True,
    )
    for key, result in zip(PLATFORMS, results):
        if isinstance(result, Exception):
            logging.getLogger(PLATFORMS[key][0]).error(f"Platform failed: {result}")


async def run_continuous_monitoring(config: dict, interval_minutes: int = 5):
    """
    Continuous 5-minute monitoring process across LinkedIn, Naukri, and Indeed.
    - Runs new cycle every 5 minutes until manually stopped.
    - Prevents overlapping cycles.
    - Enforces newest jobs first, 70%+ skill match, and 1 application per company.
    """
    log = logging.getLogger("MonitoringEngine")
    resume_path = config.get("personal", {}).get("resume_path")
    user_exp = float(config.get("personal", {}).get("years_of_experience", 3.0))

    matcher = LocalResumeMatcher(resume_path=resume_path, user_exp=user_exp)
    db = StandaloneAppDatabase()

    cycle_num = 1
    log.info("=" * 60)
    log.info(f"STARTING CONTINUOUS 5-MINUTE JOB MONITORING")
    log.info(f"Interval       : Every {interval_minutes} minutes")
    log.info(f"Platforms      : LinkedIn, Naukri, Indeed")
    log.info(f"Keywords       : {config.get('search', {}).get('keywords')}")
    log.info(f"Location       : {config.get('search', {}).get('location')}")
    log.info(f"Candidate Exp  : {user_exp} years")
    log.info(f"Resume Skills  : {', '.join(sorted(matcher.skills))}")
    log.info("=" * 60)

    try:
        while True:
            cycle_start = datetime.now()
            next_cycle_time = cycle_start + timedelta(minutes=interval_minutes)
            log.info(f"\n[CYCLE #{cycle_num}] Starting fetch at {cycle_start.strftime('%Y-%m-%d %H:%M:%S')}")
            log.info(f"[CYCLE #{cycle_num}] Next scheduled cycle: {next_cycle_time.strftime('%H:%M:%S')}")

            # Execute platforms safely so failure in one does not halt the others
            await run_all(config)

            elapsed = (datetime.now() - cycle_start).total_seconds()
            sleep_needed = max(5.0, (interval_minutes * 60) - elapsed)
            log.info(f"[CYCLE #{cycle_num}] Finished in {elapsed:.1f}s. Sleeping {sleep_needed/60:.1f} minutes until next cycle...")
            cycle_num += 1
            await asyncio.sleep(sleep_needed)

    except (KeyboardInterrupt, asyncio.CancelledError):
        log.info("\n[MonitoringEngine] Continuous monitoring stopped by user.")


async def main():
    log_file = setup_logging()
    config   = load_config()

    parser = argparse.ArgumentParser(description="Job Application Automation System")
    parser.add_argument("--platform", choices=["1", "2", "3", "4", "5"], default=None, help="Platform choice (1-3: Platform, 4: All, 5: Continuous 5-min monitoring)")
    parser.add_argument("--monitor", action="store_true", help="Run continuous monitoring every 5 minutes")
    parser.add_argument("--interval", type=int, default=5, help="Monitoring cycle interval in minutes (default: 5)")
    args = parser.parse_args()

    choice = args.platform
    if args.monitor:
        choice = "5"

    if not choice:
        print_menu()
        choice = input("\n   Enter choice: ").strip()

    if choice == "0":
        print("   Goodbye!")
        return

    elif choice in PLATFORMS:
        name = PLATFORMS[choice][0]
        print(f"\n   Starting {name}...\n")
        await run_bot(choice, config)

    elif choice == "4":
        print("\n   Starting all three platforms simultaneously...\n")
        await run_all(config)

    elif choice == "5":
        print(f"\n   Starting continuous {args.interval}-minute monitoring across LinkedIn, Naukri, and Indeed...\n")
        await run_continuous_monitoring(config, interval_minutes=args.interval)

    else:
        print("   Invalid choice.")
        sys.exit(1)

    logging.info("=" * 55)
    logging.info(f"Execution finished. Logs: {log_file.resolve()}")
    logging.info("=" * 55)


if __name__ == "__main__":
    asyncio.run(main())
