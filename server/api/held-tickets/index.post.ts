import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { heldTicketInclude, serializeHeldTicket } from '../../utils/held-tickets'
import prisma from '../../../lib/prisma'

type HeldTicketRequestItem = {
  productId?: unknown
  quantity?: unknown
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
    quantity: Number(item.quantity)
  }))

  if (requestedItems.some(item => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
    throw createError({ statusCode: 400, message: 'Revisa las cantidades del ticket.' })
  }

  const productIds = [...new Set(requestedItems.map(item => item.productId))]

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
      const product = productMap.get(item.productId)
      if (!product) throw createError({ statusCode: 404, message: 'Uno de los productos ya no está disponible.' })
      if (product.unit === 'PIECE' && !Number.isInteger(item.quantity)) throw createError({ statusCode: 400, message: `${product.name} solo se puede vender por pieza.` })

      const quantity = new Prisma.Decimal(product.unit === 'KILOGRAM' ? item.quantity.toFixed(3) : item.quantity.toFixed(0))
      const lineTotal = product.price.mul(quantity).toDecimalPlaces(2)
      return { product, quantity, lineTotal }
    })

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
            productId: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            description: item.product.description,
            unit: item.product.unit,
            quantity: item.quantity,
            unitPrice: item.product.price,
            lineTotal: item.lineTotal
          }))
        }
      },
      include: heldTicketInclude
    })
  })

  return serializeHeldTicket(ticket)
})
