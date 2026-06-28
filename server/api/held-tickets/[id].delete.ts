import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Ticket inválido.' })

  await prisma.$transaction(async (tx) => {
    const cashSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    })
    if (!cashSession) throw createError({ statusCode: 409, message: 'No hay caja abierta.' })

    const ticket = await tx.heldTicket.findFirst({
      where: { id, cashSessionId: cashSession.id },
      include: { items: { select: { productId: true, quantity: true } } }
    })

    if (!ticket) throw createError({ statusCode: 404, message: 'No encontramos el ticket guardado.' })

    for (const item of ticket.items) {
      if (!item.productId) continue
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      })
    }

    await tx.heldTicket.delete({ where: { id: ticket.id } })
  })

  return { ok: true }
})
