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

export async function graphqlRequest<T>(
 event: H3Event,
 query: string,
 variables?: Record<string, unknown>
) {
 const config = useRuntimeConfig()
 const response = await $fetch.raw<GraphqlResponse<T>>(config.graphqlEndpoint, {
 method: 'POST',
 headers: {
  'content-type': 'application/json',
  ...(getRequestHeader(event, 'cookie') ? { cookie: getRequestHeader(event, 'cookie') as string } : {})
 },
 body: { query, variables }
 })

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
