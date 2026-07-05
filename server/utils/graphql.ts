import type { H3Event } from 'h3'

interface GraphqlError {
 message: string
 extensions?: {
 code?: string
 originalError?: {
 statusCode?: number
 message?: string
 }
 }
}

interface GraphqlResponse<T> {
 data?: T
 errors?: GraphqlError[]
}

type RequestErrorLike = {
 statusCode?: number
 status?: number
}

function getRequestStatus(error: unknown) {
 if (!error || typeof error !== 'object') return null
 const requestError = error as RequestErrorLike
 return requestError.statusCode || requestError.status || null
}

function getGraphqlStatus(error: GraphqlError) {
 const statusCode = error.extensions?.originalError?.statusCode
 if (Number.isInteger(statusCode)) return statusCode
 if (error.extensions?.code === 'UNAUTHENTICATED') return 401
 if (error.extensions?.code === 'FORBIDDEN') return 403
 if (error.message === 'Debes iniciar sesión.' || error.message === 'La sesión ya no es válida.') return 401
 if (error.message === 'No tienes permiso para realizar esta acción.' || error.message === 'Tu usuario está desactivado.') return 403
 return 500
}

function appendBackendCookies(event: H3Event, response: Response) {
 const setCookie = response.headers.get('set-cookie')
 if (!setCookie) return
 appendResponseHeader(event, 'set-cookie', setCookie)
}

function getBackendCookieHeader(event: H3Event) {
 const session = getCookie(event, 'abr_session')
 return session ? { cookie: `abr_session=${encodeURIComponent(session)}` } : {}
}

function getGraphqlEndpoint() {
 const endpoint = useRuntimeConfig().graphqlEndpoint
 try {
  const url = new URL(endpoint)
  if (url.protocol === 'http:' || url.protocol === 'https:') return endpoint
 } catch {
  // Handled below with a generic server error.
 }

 throw createError({ statusCode: 500, message: 'No pudimos preparar la conexión con el servidor.' })
}

function getBackendConnectionError() {
 return createError({
  statusCode: 503,
  message: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
 })
}

export async function graphqlRequest<T>(
 event: H3Event,
 query: string,
 variables?: Record<string, unknown>
) {
 let response

 try {
 response = await $fetch.raw<GraphqlResponse<T>>(getGraphqlEndpoint(), {
 method: 'POST',
 headers: {
  'content-type': 'application/json',
  ...getBackendCookieHeader(event)
 },
 body: { query, variables }
 })
 } catch (error: unknown) {
 const statusCode = getRequestStatus(error)
 if (statusCode && statusCode >= 400 && statusCode < 500) throw error

 throw getBackendConnectionError()
 }

 appendBackendCookies(event, response)

 if (response._data?.errors?.length) {
  const error = response._data.errors[0]
  throw createError({
   statusCode: getGraphqlStatus(error),
   message: error.extensions?.originalError?.message || error.message
  })
 }

 if (!response._data?.data) {
  throw createError({ statusCode: 502, message: 'El backend GraphQL no regresó datos.' })
 }

 return response._data.data
}
