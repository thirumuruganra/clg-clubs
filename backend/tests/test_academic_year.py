import unittest
from datetime import datetime
from unittest.mock import patch

from app.routers import auth, users
from app.routers.rsvp import _attendance_year_rank


class AcademicYearTests(unittest.TestCase):
    def test_effective_academic_year_rolls_over_in_may(self) -> None:
        self.assertEqual(users._get_effective_academic_year(datetime(2026, 4, 30)), 2026)
        self.assertEqual(users._get_effective_academic_year(datetime(2026, 5, 1)), 2027)

    def test_2027_passout_is_third_year_before_may(self) -> None:
        with patch("app.utils.academic_year.get_effective_academic_year", return_value=2026):
            year = users._calculate_year_label("2027", "B.E.", None)

        self.assertEqual(year, "III")

    def test_2027_passout_is_fourth_year_from_may(self) -> None:
        with patch("app.utils.academic_year.get_effective_academic_year", return_value=2027):
            year = users._calculate_year_label("2027", "B.E.", None)

        self.assertEqual(year, "IV")

    def test_passout_validation_uses_academic_year(self) -> None:
        with patch("app.routers.auth._get_effective_academic_year", return_value=2027):
            self.assertFalse(auth._is_valid_passout_year("2026"))
            self.assertTrue(auth._is_valid_passout_year("2027"))

    def test_attendance_year_rank_uses_passout_year_after_may(self) -> None:
        user = {"batch": "2027", "degree": "B.E.", "register_number": ""}
        with patch("app.utils.academic_year.get_effective_academic_year", return_value=2027):
            self.assertEqual(_attendance_year_rank(user), 4)


if __name__ == "__main__":
    unittest.main()
