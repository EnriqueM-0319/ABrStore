import { requireRole, operationalRoles, serializeSale } from '../../../utils'
import prisma from '../../../../lib/prisma'

export default defineEventHandler(async (event) => {
 const user = await requireRole(event, operationalRoles)
 const id = getRouterParam(event, 'id')
 const body = await readBody(event)
 const reason = String(body.reason || '').trim()

 if (!id) throw createError({ statusCode: 400, message: 'Ticket inválido.' })
 if (reason.length < 3) throw createError({ statusCode: 400, message: 'Agrega un motivo de cancelación.' })

 const sale = await prisma.$transaction(async (tx) => {
 const currentCashSession = await tx.cashRegisterSession.findFirst({
 where: { status: 'OPEN' },
 select: { id: true }
 })

 if (!currentCashSession) throw createError({ statusCode: 409, message: 'Solo puedes cancelar tickets con una caja abierta.' })

 const saleToCancel = await tx.sale.findUnique({
 where: { id },
 include: {
 cashSession: { select: { id: true, status: true } },
 items: true
 }
 })

 if (!saleToCancel) throw createError({ statusCode: 404, message: 'No encontramos el ticket.' })
 if (saleToCancel.canceledAt) throw createError({ statusCode: 409, message: 'Este ticket ya fue cancelado.' })
 if (!saleToCancel.cashSession || saleToCancel.cashSession.id !== currentCashSession.id || saleToCancel.cashSession.status !== 'OPEN') {
 throw createError({ statusCode: 409, message: 'Solo puedes cancelar tickets de la caja abierta actual.' })
 }

 for (const item of saleToCancel.items) {
 if (item.canceledAt) continue
 if (!item.productId) continue
 await tx.product.update({
 where: { id: item.productId },
 data: { stock: { increment: item.quantity } }
 })
 }

 return tx.sale.update({
 where: { id },
 data: {
 canceledAt: new Date(),
 canceledById: user.id,
 cancelReason: reason
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
