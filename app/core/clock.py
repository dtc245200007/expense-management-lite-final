"""Business dates are always Vietnamese dates, independent of the host timezone."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

BUSINESS_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")


def business_today() -> date:
    return datetime.now(BUSINESS_TIMEZONE).date()
