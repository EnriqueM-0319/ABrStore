import { Prisma } from '@prisma/client'
import { requireRole, operationalRoles, heldTicketInclude, serializeHeldTicket } from '../../utils'
import prisma from '../../../lib/prisma'

type HeldTicketRequestItem = {
 productId?: unknown
 quantity?: unknown
 manual?: unknown
 name?: unknown
 price?: unknown
 unit?: unknown
}

const paymentMethods = ['CASH', 'CARD', 'TRANSFER'] as const

export default defineEventHandler(async (event) => {
 const user = await requireRole(event, operationalRoles)
 const body = await readBody(event)
 const items = Array.isArray(body.items) ? body.items as HeldTicketRequestItem[] : []
 const note = String(body.note || '').trim().slice(0, 120) || null
 const requestedPaymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : ''
 const paymentMethod = paymentMethods.includes(requestedPaymentMethod as typeof paymentMethods[number])
 ? requestedPaymentMethod as typeof paymentMethods[number]
 : 'CASH'

 if (!items.length) throw createError({ statusCode: 400, message: 'Agrega productos antes de guardar el ticket.' })

 const requestedItems = items.map(item => ({
 productId: String(item.productId || ''),
 quantity: Number(item.quantity),
 manual: item.manual === true,
 name: String(item.name || '').trim().slice(0, 80),
 price: Number(item.price),
 unit: item.unit === 'KILOGRAM' ? 'KILOGRAM' as const : 'PIECE' as const
 }))

 if (requestedItems.some(item => item.manual
 ? item.name.length < 2 || !Number.isFinite(item.price) || item.price <= 0
 : !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
 throw createError({ statusCode: 400, message: 'Revisa las cantidades del ticket.' })
 }

 const productIds = [...new Set(requestedItems.filter(item => !item.manual).map(item => item.productId))]

 const ticket = await prisma.$transaction(async (tx) => {
 const cashSession = await tx.cashRegisterSession.findFirst({
 where: { status: 'OPEN' },
 select: { id: true }
 })
 if (!cashSession) throw createError({ statusCode: 409, message: 'Debes iniciar caja antes de guardar tickets.' })

 const products = await tx.product.findMany({
 where: { id: { in: productIds }, active: true },
 select: { id: true, sku: true, name: true, description: true, unit: true, price: true, stock: true }
 })
 const productMap = new Map(products.map(product => [product.id, product]))

 const ticketItems = requestedItems.map(item => {
 if (item.manual) {
 const quantity = new Prisma.Decimal(1)
 const lineTotal = new Prisma.Decimal(item.price.toFixed(2))
 return {
 product: null,
 quantity,
 lineTotal,
 manual: {
 sku: 'SIN-CODIGO',
 name: item.name,
 description: 'Venta sin código',
 unit: item.unit,
 unitPrice: lineTotal
 }
 }
 }

 const product = productMap.get(item.productId)
 if (!product) throw createError({ statusCode: 404, message: 'Uno de los productos ya no está disponible.' })
 if (product.unit === 'PIECE' && !Number.isInteger(item.quantity)) throw createError({ statusCode: 400, message: `${product.name} solo se puede vender por pieza.` })

 const quantity = new Prisma.Decimal(product.unit === 'KILOGRAM' ? item.quantity.toFixed(3) : item.quantity.toFixed(0))
 if (product.stock.lessThan(quantity)) throw createError({ statusCode: 409, message: `${product.name} no tiene existencias suficientes para apartar.` })

 const lineTotal = product.price.mul(quantity).toDecimalPlaces(2)
 return { product, quantity, lineTotal, manual: null }
 })

 for (const item of ticketItems) {
 if (!item.product) continue
 const updated = await tx.product.updateMany({
 where: { id: item.product.id, active: true, stock: { gte: item.quantity } },
 data: { stock: { decrement: item.quantity } }
 })
 if (updated.count !== 1) throw createError({ statusCode: 409, message: `${item.product.name} ya no tiene stock suficiente para apartar.` })
 }

 const total = ticketItems.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2)
 const itemCount = ticketItems.reduce((sum, item) => sum.add(item.quantity), new Prisma.Decimal(0)).toDecimalPlaces(3)

 return tx.heldTicket.create({
 data: {
 note,
 paymentMethod,
 total,
 itemCount,
 cashSessionId: cashSession.id,
 createdById: user.id,
 items: {
 create: ticketItems.map(item => ({
 productId: item.product?.id ?? null,
 sku: item.product?.sku ?? item.manual?.sku ?? 'SIN-CODIGO',
 name: item.product?.name ?? item.manual?.name ?? 'Venta sin código',
 description: item.product?.description ?? item.manual?.description ?? null,
 unit: item.product?.unit ?? item.manual?.unit ?? 'PIECE',
 quantity: item.quantity,
 unitPrice: item.product?.price ?? item.manual?.unitPrice ?? item.lineTotal,
 lineTotal: item.lineTotal
 }))
 }
 },
 include: heldTicketInclude
 })
 })

 return serializeHeldTicket(ticket)
})
