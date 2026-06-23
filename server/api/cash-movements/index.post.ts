import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { serializeCashMovement } from '../../utils/cash-movements'
import prisma from '../../../lib/prisma'

const movementTypes = ['SUPPLIER_PAYMENT', 'WITHDRAWAL', 'EXPENSE', 'CASH_IN', 'ADJUSTMENT'] as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, operationalRoles)
  const body = await readBody(event)
  const type = movementTypes.includes(body.type) ? body.type : null
  const amount = Number(body.amount)
  const description = String(body.description || '').trim()

  if (!type || !Number.isFinite(amount) || amount <= 0 || description.length < 3) {
    throw createError({ statusCode: 400, message: 'Ingresa tipo, monto y descripción válida.' })
  }

  const movement = await prisma.$transaction(async (tx) => {
    const cashSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    })
    if (!cashSession) throw createError({ statusCode: 409, message: 'Debes abrir caja antes de registrar movimientos.' })

    return tx.cashMovement.create({
      data: {
        cashSessionId: cashSession.id,
        createdById: user.id,
        type,
        amount: new Prisma.Decimal(amount.toFixed(2)),
        description
      },
      include: { createdBy: { select: { id: true, fullName: true, email: true } } }
    })
  })

  return serializeCashMovement(movement)
})
