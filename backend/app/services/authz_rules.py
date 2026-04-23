from uuid import UUID

from fastapi import HTTPException


SELF_ACCESS_DETAIL = "You can only access your own profile"
PERSONALIZATION_DETAIL = "Personalization is only available for the authenticated user"


def require_self_access(actor_user_id: UUID, target_user_id: UUID, detail: str = SELF_ACCESS_DETAIL) -> None:
    if actor_user_id != target_user_id:
        raise HTTPException(status_code=403, detail=detail)


def resolve_personalization_user_id(
    requested_user_id: UUID | None,
    actor_user_id: UUID | None,
) -> UUID | None:
    if requested_user_id is None:
        return actor_user_id

    if actor_user_id is None or actor_user_id != requested_user_id:
        raise HTTPException(status_code=403, detail=PERSONALIZATION_DETAIL)

    return requested_user_id
