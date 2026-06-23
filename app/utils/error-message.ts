type ApiErrorPayload = {
  message?: unknown
}

type FetchErrorLike = {
  data?: ApiErrorPayload
  message?: unknown
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback

  const fetchError = error as FetchErrorLike
  if (typeof fetchError.data?.message === 'string') return fetchError.data.message
  if (typeof fetchError.message === 'string') return fetchError.message

  return fallback
}
