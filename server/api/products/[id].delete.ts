import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const permanent = query.permanent === 'true'
  await requireRole(event, operationalRoles)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Producto inválido.' })

  try {
    if (permanent) await prisma.product.delete({ where: { id } })
    else await prisma.product.update({ where: { id }, data: { active: false } })
    return { ok: true }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw createError({ statusCode: 404, message: 'El producto ya no existe.' })
    }
    throw error
  }
})
