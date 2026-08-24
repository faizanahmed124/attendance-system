"""
Every datetime this app stores is UTC (always created via
datetime.now(timezone.utc)) - but SQLite strips the tzinfo on storage and
read-back, so by the time a value reaches an API response it's a "naive"
datetime that happens to represent UTC.

Pydantic v2's own serializer (which FastAPI uses directly for
response_model validation - NOT fastapi.encoders.jsonable_encoder, that
only applies when there's no response_model) calls .isoformat() on naive
datetimes, producing a string with NO timezone marker, e.g.
"2026-07-10T05:03:19.879825". Browsers parsing a string like that with
`new Date(...)` treat it as LOCAL time, not UTC - so a user in Pakistan
(UTC+5) sees the raw UTC hour displayed as their own local hour, 5 hours
behind reality.

Since this is Pydantic-core's own serialization (not something
patchable via FastAPI's ENCODERS_BY_TYPE dict), the fix is a small
response-body middleware: after the JSON body is built, append "Z" to any
timestamp-shaped string that doesn't already have a timezone marker.
This needs no changes to any individual schema across the app.
"""
import re

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Matches a JSON string value that looks like an ISO datetime WITHOUT a
# trailing timezone marker (no "Z", no "+HH:MM", no "-HH:MM" before the
# closing quote). Deliberately requires the "THH:MM:SS" time part so plain
# `date` fields (e.g. "2026-07-10") are never touched.
_NAIVE_DATETIME_RE = re.compile(
    rb'"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)"'
)


class UTCTimestampMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        content_type = response.headers.get("content-type", "")
        if not content_type.startswith("application/json"):
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        fixed_body = _NAIVE_DATETIME_RE.sub(rb'"\1Z"', body)

        headers = dict(response.headers)
        headers.pop("content-length", None)  # body length changed, let Starlette recompute it

        return Response(
            content=fixed_body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
        )