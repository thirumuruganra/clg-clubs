import json
import unittest
from unittest.mock import AsyncMock, patch

from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request

from app.main import rewrite_access_denied_detail


def _build_request(path: str = "/test") -> Request:
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode("utf-8"),
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
        }
    )


class NoServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_access_denied_uses_no_service_reason(self) -> None:
        with patch(
            "app.main.no_service.fetch_no_service_reason",
            new=AsyncMock(return_value="This feels like something Future Me would yell at Present Me for agreeing to."),
        ) as fetch_mock:
            response = await rewrite_access_denied_detail(
                _build_request(),
                StarletteHTTPException(status_code=403, detail="Only CLUB_ADMIN users can list students"),
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            json.loads(response.body),
            {"detail": "This feels like something Future Me would yell at Present Me for agreeing to."},
        )
        fetch_mock.assert_awaited_once_with(fallback_detail="Only CLUB_ADMIN users can list students")

    async def test_non_access_forbidden_detail_stays_unchanged(self) -> None:
        with patch(
            "app.main.no_service.fetch_no_service_reason",
            new=AsyncMock(return_value="This should not be used."),
        ) as fetch_mock:
            response = await rewrite_access_denied_detail(
                _build_request(),
                StarletteHTTPException(status_code=403, detail="Attendance QR is closed for this event"),
            )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(json.loads(response.body), {"detail": "Attendance QR is closed for this event"})
        fetch_mock.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()