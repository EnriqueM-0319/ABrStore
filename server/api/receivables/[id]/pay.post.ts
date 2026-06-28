import { Prisma } from '@prisma/client'
import { requireRole } from '../../../utils/auth'
import { operationalRoles } from '../../../utils/users'
import { serializeSale } from '../../../utils/sales'
import { roundPayableTotal, shouldRoundPaymentMethod } from '../../../utils/cash-rounding'
import prisma from '../../../../lib/prisma'

const paymentMethods = ['CASH', 'CARD', 'TRANSFER'] as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, operationalRoles)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const requestedPaymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : ''
  const paymentMethod = paymentMethods.includes(requestedPaymentMethod as typeof paymentMethods[number])
    ? requestedPaymentMethod as typeof paymentMethods[number]
    : 'CASH'
  const cashReceived = Number(body.cashReceived)

  if (!id) throw createError({ statusCode: 400, message: 'Cuenta por cobrar inválida.' })

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id, paymentMethod: 'CREDIT', canceledAt: null },
      select: { id: true, folio: true, total: true, paymentTotal: true, creditPaidAt: true }
    })

    if (!sale) throw createError({ statusCode: 404, message: 'No encontramos esta cuenta por cobrar.' })
    if (sale.creditPaidAt) throw createError({ statusCode: 409, message: 'Esta cuenta ya fue marcada como pagada.' })

    const openSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    })

    const paymentTotal = shouldRoundPaymentMethod(paymentMethod) ? roundPayableTotal(sale.total) : sale.total

    if (paymentMethod === 'CASH') {
      if (!openSession) throw createError({ statusCode: 409, message: 'Abre caja antes de registrar un pago en efectivo.' })
      const receivedAmount = new Prisma.Decimal(Number.isFinite(cashReceived) ? cashReceived.toFixed(2) : '0')
      if (receivedAmount.lessThan(paymentTotal)) {
        throw createError({ statusCode: 400, message: 'El efectivo recibido debe cubrir el total redondeado de la cuenta.' })
      }

      await tx.cashMovement.create({
        data: {
          cashSessionId: openSession.id,
          createdById: user.id,
          type: 'CASH_IN',
          amount: paymentTotal,
          description: `Pago de cuenta por cobrar · Ticket #${sale.folio}`
        }
      })
    }

    return tx.sale.update({
      where: { id: sale.id },
      data: {
        creditPaidAt: new Date(),
        creditPaidById: user.id,
        creditPaymentMethod: paymentMethod,
        paymentTotal
      },
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        canceledBy: { select: { id: true, fullName: true, email: true } },
        creditPaidBy: { select: { id: true, fullName: true, email: true } },
        cashSession: { select: { id: true, openedAt: true, status: true } },
        items: true
      }
    })
  })

  return serializeSale(result)
})
