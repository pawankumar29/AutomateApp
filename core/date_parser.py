import re
from datetime import datetime, timedelta
from typing import Optional, Tuple

def parse_relative_date(date_str: Optional[str]) -> datetime:
    """
    Parses relative date strings like:
    - 'Just posted', 'Few seconds ago'
    - '10 minutes ago', '45m ago'
    - '2 hours ago', '5h ago'
    - '1 day ago', '2 days ago', '3d ago'
    - '1 week ago'
    into an exact normalized UTC datetime object for strict date descending sorting.
    """
    now = datetime.utcnow()
    if not date_str:
        return now

    s = date_str.lower().strip()
    if any(w in s for w in ["just", "moment", "second", "today"]):
        return now

    if "yesterday" in s:
        return now - timedelta(days=1)

    min_match = re.search(r"(\d+)\s*(?:minute|min|m)", s)
    if min_match:
        return now - timedelta(minutes=int(min_match.group(1)))

    hr_match = re.search(r"(\d+)\s*(?:hour|hr|h)", s)
    if hr_match:
        return now - timedelta(hours=int(hr_match.group(1)))

    day_match = re.search(r"(\d+)\s*(?:day|d)", s)
    if day_match:
        return now - timedelta(days=int(day_match.group(1)))

    week_match = re.search(r"(\d+)\s*(?:week|w)", s)
    if week_match:
        return now - timedelta(weeks=int(week_match.group(1)))

    month_match = re.search(r"(\d+)\s*(?:month|mo)", s)
    if month_match:
        return now - timedelta(days=int(month_match.group(1)) * 30)

    try:
        from dateutil import parser
        return parser.parse(date_str, fuzzy=True)
    except Exception:
        return now

def extract_experience_range(text: Optional[str]) -> Tuple[Optional[float], Optional[float]]:
    """Extracts (min_years, max_years) from job text."""
    if not text:
        return (None, None)
    s = text.lower()
    if any(w in s for w in ["fresher", "entry level", "0-1 year"]):
        return (0.0, 1.0)
    
    range_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)", s)
    if range_match:
        return (float(range_match.group(1)), float(range_match.group(2)))

    plus_match = re.search(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)", s)
    if plus_match:
        val = float(plus_match.group(1))
        return (val, val + 3.0)

    return (None, None)
