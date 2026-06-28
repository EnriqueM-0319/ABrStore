import { Prisma } from '@prisma/client'
import { requireRole } from '../../../../../utils/auth'
import { operationalRoles } from '../../../../../utils/users'
import { roundPayableTotal, shouldRoundPaymentMethod } from '../../../../../utils/cash-rounding'
import { serializeSale } from '../../../../../utils/sales'
import prisma from '../../../../../../lib/prisma'

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)
  const id = getRouterParam(event, 'id')
  const itemId = getRouterParam(event, 'itemId')
  const body = await readBody(event)
  const reason = String(body.reason || '').trim()

  if (!id || !itemId) throw createError({ statusCode: 400, message: 'Partida inválida.' })
  if (reason.length < 3) throw createError({ statusCode: 400, message: 'Agrega un motivo de cancelación.' })

  const sale = await prisma.$transaction(async (tx) => {
    const currentCashSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    })

    if (!currentCashSession) throw createError({ statusCode: 409, message: 'Solo puedes cancelar partidas con una caja abierta.' })

    const saleToUpdate = await tx.sale.findUnique({
      where: { id },
      include: {
        cashSession: { select: { id: true, status: true } },
        items: { orderBy: { id: 'asc' } }
      }
    })

    if (!saleToUpdate) throw createError({ statusCode: 404, message: 'No encontramos el ticket.' })
    if (saleToUpdate.canceledAt) throw createError({ statusCode: 409, message: 'Este ticket ya fue cancelado.' })
    if (!saleToUpdate.cashSession || saleToUpdate.cashSession.id !== currentCashSession.id || saleToUpdate.cashSession.status !== 'OPEN') {
      throw createError({ statusCode: 409, message: 'Solo puedes cancelar partidas de tickets de la caja abierta actual.' })
    }

    const itemToCancel = saleToUpdate.items.find(item => item.id === itemId)
    if (!itemToCancel) throw createError({ statusCode: 404, message: 'No encontramos la partida.' })
    if (itemToCancel.canceledAt) throw createError({ statusCode: 409, message: 'Esta partida ya fue cancelada.' })

    const activeItemsAfterCancel = saleToUpdate.items.filter(item => item.id !== itemId && !item.canceledAt)
    if (!activeItemsAfterCancel.length) {
      throw createError({ statusCode: 409, message: 'No puedes cancelar la última partida de forma parcial. Cancela el ticket completo.' })
    }

    if (itemToCancel.productId) {
      await tx.product.update({
        where: { id: itemToCancel.productId },
        data: { stock: { increment: itemToCancel.quantity } }
      })
    }

    await tx.saleItem.update({
      where: { id: itemToCancel.id },
      data: {
        canceledAt: new Date(),
        cancelReason: reason
      }
    })

    const total = activeItemsAfterCancel.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const itemCount = activeItemsAfterCancel.reduce((sum, item) => sum.add(item.quantity), new Prisma.Decimal(0)).toDecimalPlaces(3)
    const paymentTotal = shouldRoundPaymentMethod(saleToUpdate.paymentMethod) ? roundPayableTotal(total) : total
    const changeDue = saleToUpdate.cashReceived ? saleToUpdate.cashReceived.sub(paymentTotal).toDecimalPlaces(2) : null

    return tx.sale.update({
      where: { id: saleToUpdate.id },
      data: {
        total,
        itemCount,
        paymentTotal,
        changeDue
      },
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        canceledBy: { select: { id: true, fullName: true, email: true } },
        cashSession: { select: { id: true, openedAt: true, status: true } },
        items: { orderBy: { id: 'asc' } }
      }
    })
  })

  return serializeSale(sale, null)
})
