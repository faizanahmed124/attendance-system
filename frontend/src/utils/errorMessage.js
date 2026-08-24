/**
 * FastAPI/Pydantic validation errors (422) return `detail` as an ARRAY of
 * objects like {type, loc, msg, input, ctx} - not a plain string. Custom
 * app errors (NotFoundError, BadRequestError, etc.) return `detail` as a
 * plain string. If a form does `setError(err.response?.data?.detail)` and
 * that turns out to be the array form, React crashes trying to render
 * those raw objects directly ("Objects are not valid as a React child").
 *
 * This normalizes either shape into one readable string, safe to render.
 */
export function extractErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail

  if (!detail) return fallback
  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map((e) => {
        if (typeof e === 'string') return e
        const field = Array.isArray(e.loc) ? e.loc.filter((p) => p !== 'body').join('.') : ''
        return field ? `${field}: ${e.msg}` : e.msg
      })
      .join(' | ')
  }

  return fallback
}
