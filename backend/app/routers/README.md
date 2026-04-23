# Router Notes

Design rule: routers should only parse request inputs, call authz checks, call model/service actions, and shape response payloads.

Ownership rules:
- User profile endpoints: self-access only.
- Club member and follower endpoints: owning club admin only for sensitive reads.
- RSVP attendee listing: owning club admin only.
- Event feeds: public event data allowed; personalization only for authenticated self.

Shared helpers:
- Use `app.utils.common.safe_json_list` for JSON list columns.
- Use `app.utils.common.normalize_text` and `normalize_compact` for filters/search.
- Use `app.services.payloads` for user-facing user payloads.
