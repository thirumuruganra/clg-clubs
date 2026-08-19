from datetime import datetime
import re

from app.utils.common import normalize_compact

ACADEMIC_YEAR_ROLLOVER_MONTH = 5
PASSOUT_YEAR_MAX_AHEAD = 6

REGISTER_NUMBER_PATTERN = re.compile(r"^3122\d{9}$")

ROMAN_YEAR_LABELS = ["", "I", "II", "III", "IV", "V"]
YEAR_RANK = {"V": 5, "IV": 4, "III": 3, "II": 2, "I": 1, "Alumni": 0, "-": -1}


def get_effective_academic_year(now: datetime | None = None) -> int:
    current_date = now or datetime.now()
    return current_date.year + 1 if current_date.month >= ACADEMIC_YEAR_ROLLOVER_MONTH else current_date.year


def get_degree_duration(degree_str) -> int | None:
    normalized = normalize_compact(degree_str)
    if not normalized:
        return None

    if "mtech" in normalized and "integrated" in normalized:
        return 5
    if normalized == "be" or "btech" in normalized:
        return 4
    if normalized == "me" or "mtech" in normalized:
        return 2
    return None


def get_admission_year_from_register_number(register_number) -> int | None:
    digits_only = "".join(ch for ch in str(register_number or "") if ch.isdigit())
    # Admission year can only be derived from canonical SSN register numbers.
    if not REGISTER_NUMBER_PATTERN.fullmatch(digits_only):
        return None

    try:
        code = int(digits_only[4:6])
    except ValueError:
        return None

    admission_year = 2000 + code
    current_year = datetime.now().year
    if admission_year > current_year:
        return None

    return admission_year


def calculate_year_from_admission(admission_year: int | None, duration: int | None, academic_year: int) -> str | None:
    if not admission_year or not duration:
        return None

    year_number = academic_year - admission_year
    if year_number <= 0:
        year_number = 1

    if year_number > duration:
        return "Alumni"

    return ROMAN_YEAR_LABELS[year_number] if year_number < len(ROMAN_YEAR_LABELS) else "-"


def calculate_year_label(batch, degree, register_number) -> str:
    duration = get_degree_duration(degree)
    if not duration:
        return "-"

    academic_year = get_effective_academic_year()
    admission_year = get_admission_year_from_register_number(register_number)
    year_from_register = calculate_year_from_admission(admission_year, duration, academic_year)
    if year_from_register:
        return year_from_register

    try:
        passout_year = int(str(batch or "").strip())
    except ValueError:
        return "-"

    diff = passout_year - academic_year
    if diff < 0:
        return "Alumni"

    year_number = duration - diff
    if year_number < 1 or year_number > duration:
        return "-"

    return ROMAN_YEAR_LABELS[year_number] if year_number < len(ROMAN_YEAR_LABELS) else "-"


def calculate_year_rank(year_label: str) -> int:
    return YEAR_RANK.get(year_label or "-", -1)
