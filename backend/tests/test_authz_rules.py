import unittest
from uuid import uuid4

from fastapi import HTTPException

from app.services.authz_rules import (
    PERSONALIZATION_DETAIL,
    SELF_ACCESS_DETAIL,
    require_self_access,
    resolve_personalization_user_id,
)


class AuthzRuleTests(unittest.TestCase):
    def test_require_self_access_allows_same_user(self) -> None:
        user_id = uuid4()
        require_self_access(user_id, user_id)

    def test_require_self_access_blocks_cross_user(self) -> None:
        with self.assertRaises(HTTPException) as context:
            require_self_access(uuid4(), uuid4())

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail, SELF_ACCESS_DETAIL)

    def test_resolve_personalization_allows_authenticated_self(self) -> None:
        user_id = uuid4()
        resolved = resolve_personalization_user_id(user_id, user_id)
        self.assertEqual(resolved, user_id)

    def test_resolve_personalization_uses_actor_when_query_missing(self) -> None:
        actor_id = uuid4()
        resolved = resolve_personalization_user_id(None, actor_id)
        self.assertEqual(resolved, actor_id)

    def test_resolve_personalization_blocks_unauthenticated_query(self) -> None:
        with self.assertRaises(HTTPException) as context:
            resolve_personalization_user_id(uuid4(), None)

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail, PERSONALIZATION_DETAIL)

    def test_resolve_personalization_blocks_cross_user_query(self) -> None:
        with self.assertRaises(HTTPException) as context:
            resolve_personalization_user_id(uuid4(), uuid4())

        self.assertEqual(context.exception.status_code, 403)
        self.assertEqual(context.exception.detail, PERSONALIZATION_DETAIL)


if __name__ == "__main__":
    unittest.main()
