import type { H3Event } from 'h3'
import type { Role } from '@prisma/client'
import prisma from '../../lib/prisma'
import { getSessionUserId } from './session'

export async function requireUser(event: H3Event) {
  const id = getSessionUserId(event)
  if (!id) throw createError({ statusCode: 401, message: 'Debes iniciar sesión.' })

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, email: true, username: true, phone: true, role: true, active: true }
  })

  if (!user) throw createError({ statusCode: 401, message: 'La sesión ya no es válida.' })
  if (!user.active) throw createError({ statusCode: 403, message: 'Tu usuario está desactivado.' })
  return user
}

export async function requireRole(event: H3Event, allowedRoles: Role[]) {
  const user = await requireUser(event)
  if (!allowedRoles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'No tienes permiso para realizar esta acción.' })
  }
  return user
}
