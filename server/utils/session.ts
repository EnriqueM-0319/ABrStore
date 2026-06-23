import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const sessionMaxAge = 60 * 60 * 24 * 30
const sessionMaxAgeMs = sessionMaxAge * 1000
const secret = () => {
  const sessionSecret = useRuntimeConfig().sessionSecret
  if (process.env.NODE_ENV === 'production' && sessionSecret === 'cambia-esta-clave-en-produccion') {
    throw createError({ statusCode: 500, message: 'Configura NUXT_SESSION_SECRET antes de iniciar sesión.' })
  }

  return sessionSecret
}
const sign = (value: string) => createHmac('sha256', secret()).update(value).digest('base64url')

export function createSession(event: H3Event, userId: string) {
  const expiresAt = Date.now() + sessionMaxAgeMs
  const payload = `${userId}.${expiresAt}`
  const value = `${payload}.${sign(payload)}`
  setCookie(event, 'abr_session', value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionMaxAge
  })
}

export function getSessionUserId(event: H3Event) {
  const value = getCookie(event, 'abr_session')
  if (!value) return null
  const separator = value.lastIndexOf('.')
  const payload = value.slice(0, separator)
  const signature = value.slice(separator + 1)
  const expected = sign(payload)
  if (!payload || signature.length !== expected.length) return null
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null

  const payloadSeparator = payload.lastIndexOf('.')
  const userId = payload.slice(0, payloadSeparator)
  const expiresAt = Number(payload.slice(payloadSeparator + 1))
  if (!userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null

  return userId
}
