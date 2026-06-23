import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Ticket inválido.' })

  const cashSession = await prisma.cashRegisterSession.findFirst({
    where: { status: 'OPEN' },
    select: { id: true }
  })
  if (!cashSession) throw createError({ statusCode: 409, message: 'No hay caja abierta.' })

  const deleted = await prisma.heldTicket.deleteMany({
    where: { id, cashSessionId: cashSession.id }
  })

  if (deleted.count !== 1) throw createError({ statusCode: 404, message: 'No encontramos el ticket guardado.' })

  return { ok: true }
})
