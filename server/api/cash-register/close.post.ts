import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { cashRegisterInclude, serializeCashRegisterSession } from '../../utils/cash-register'
import { getCashRegisterSummary } from '../../utils/cash-register-summary'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, operationalRoles)
  const body = await readBody(event)
  const closingAmount = Number(body.closingAmount)
  const notes = String(body.notes || '').trim() || null

  if (!Number.isFinite(closingAmount) || closingAmount < 0) {
    throw createError({ statusCode: 400, message: 'Ingresa un monto contado válido.' })
  }

  const result = await prisma.$transaction(async (tx) => {
    const openSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true, openingAmount: true },
      orderBy: { openedAt: 'desc' }
    })

    if (!openSession) throw createError({ statusCode: 409, message: 'No hay una caja abierta para cerrar.' })

    const pendingHeldTickets = await tx.heldTicket.count({
      where: { cashSessionId: openSession.id }
    })
    if (pendingHeldTickets > 0) {
      throw createError({
        statusCode: 409,
        message: 'Hay tickets guardados con producto apartado. Cóbrelos o elimínelos antes de cerrar caja.'
      })
    }

    const summary = await getCashRegisterSummary(tx, openSession.id, openSession.openingAmount)
    const expectedAmount = new Prisma.Decimal(summary.expectedAmount.toFixed(2))
    const countedAmount = new Prisma.Decimal(closingAmount.toFixed(2))
    const difference = countedAmount.sub(expectedAmount).toDecimalPlaces(2)

    const session = await tx.cashRegisterSession.update({
      where: { id: openSession.id },
      data: {
        status: 'CLOSED',
        closingAmount: countedAmount,
        expectedAmount,
        difference,
        closedById: user.id,
        closedAt: new Date(),
        notes
      },
      include: cashRegisterInclude
    })

    return { session, summary }
  })

  return {
    session: serializeCashRegisterSession(result.session),
    summary: result.summary
  }
})
