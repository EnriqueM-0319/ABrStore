import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { cashRegisterInclude, serializeCashRegisterSession } from '../../utils/cash-register'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, operationalRoles)
  const body = await readBody(event)
  const openingAmount = Number(body.openingAmount)
  const notes = String(body.notes || '').trim() || null

  if (!Number.isFinite(openingAmount) || openingAmount < 0) {
    throw createError({ statusCode: 400, message: 'Ingresa una caja inicial válida.' })
  }

  const session = await prisma.$transaction(async (tx) => {
    const openSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    })

    if (openSession) throw createError({ statusCode: 409, message: 'Ya existe una caja abierta.' })

    return tx.cashRegisterSession.create({
      data: {
        openingAmount: new Prisma.Decimal(openingAmount.toFixed(2)),
        openedById: user.id,
        notes
      },
      include: cashRegisterInclude
    })
  })

  return serializeCashRegisterSession(session)
})
