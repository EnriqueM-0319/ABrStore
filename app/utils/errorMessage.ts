type ApiErrorPayload = {
 message?: unknown
}

type FetchErrorLike = {
 data?: ApiErrorPayload
 statusCode?: number
 status?: number
 message?: unknown
}

const connectionMessage = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
const technicalMessagePatterns = [
 /^(\$fetch|fetch) failed/i,
 /^request failed/i,
 /failed to fetch/i,
 /networkerror/i,
 /load failed/i,
 /<no response>/i,
 /https?:\/\//i,
 /\/api\//i,
 /\/graphql/i,
 /nuxt_graphql_endpoint/i,
 /backend graphql/i
]

function isTechnicalMessage(message: string) {
 const normalizedMessage = message.trim()
 return technicalMessagePatterns.some(pattern => pattern.test(normalizedMessage))
}

function sanitizeMessage(message: string, fallback: string) {
 const normalizedMessage = message.trim()
 if (!normalizedMessage) return fallback
 if (isTechnicalMessage(normalizedMessage)) return connectionMessage
 return normalizedMessage
}

export function getErrorMessage(error: unknown, fallback: string): string {
 if (!error || typeof error !== 'object') return fallback

 const fetchError = error as FetchErrorLike
 if (fetchError.statusCode === 503 || fetchError.status === 503) return connectionMessage
 if (typeof fetchError.data?.message === 'string') return sanitizeMessage(fetchError.data.message, fallback)
 if (typeof fetchError.message === 'string') return sanitizeMessage(fetchError.message, fallback)

 return fallback
}
