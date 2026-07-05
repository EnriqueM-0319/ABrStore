import type { H3Event } from 'h3'

export function getTrimmedQueryValue(
  value: string | string[] | undefined,
  maxLength = 120,
) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed || undefined
}

export function getPositiveNumberQueryValue(value: string | string[] | undefined) {
  if (typeof value !== 'string') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

export function assertSameOriginRequest(event: H3Event) {
  const method = event.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return

  const origin = getRequestHeader(event, 'origin')
  const host = getRequestHeader(event, 'host')
  if (!origin || !host) return

  try {
    if (new URL(origin).host === host) return
  } catch {
    throw createError({ statusCode: 403, message: 'Origen inválido.' })
  }

  throw createError({ statusCode: 403, message: 'Origen no permitido.' })
}
