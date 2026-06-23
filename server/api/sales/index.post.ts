import { Prisma } from '@prisma/client'
import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { roundCashPaymentTotal } from '../../utils/cash-rounding'
import { serializeSale } from '../../utils/sales'
import prisma from '../../../lib/prisma'

type SaleRequestItem = {
  productId?: unknown
  quantity?: unknown
}

const paymentMethods = ['CASH', 'CARD', 'TRANSFER'] as const

export default defineEventHandler(async (event) => {
  const seller = await requireRole(event, operationalRoles)
  const body = await readBody(event)
  const items = Array.isArray(body.items) ? body.items as SaleRequestItem[] : []
  const requestedPaymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod : ''
  const paymentMethod = paymentMethods.includes(requestedPaymentMethod as typeof paymentMethods[number])
    ? requestedPaymentMethod as typeof paymentMethods[number]
    : 'CASH'
  const cashReceived = Number(body.cashReceived)

  if (!items.length) throw createError({ statusCode: 400, message: 'Agrega al menos un producto para cobrar la venta.' })

  const requestedItems = items.map(item => ({
    productId: String(item.productId || ''),
    quantity: Number(item.quantity)
  }))

  if (requestedItems.some(item => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
    throw createError({ statusCode: 400, message: 'Revisa las cantidades de la venta.' })
  }

  const productIds = [...new Set(requestedItems.map(item => item.productId))]

  const sale = await prisma.$transaction(async (tx) => {
    const cashSession = await tx.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    })
    if (!cashSession) throw createError({ statusCode: 409, message: 'Debes abrir caja antes de cobrar ventas.' })

    const products = await tx.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: { id: true, sku: true, name: true, description: true, unit: true, price: true, stock: true }
    })
    const productMap = new Map(products.map(product => [product.id, product]))

    const saleItems = requestedItems.map(item => {
      const product = productMap.get(item.productId)
      if (!product) throw createError({ statusCode: 404, message: 'Uno de los productos ya no está disponible.' })
      if (product.unit === 'PIECE' && !Number.isInteger(item.quantity)) throw createError({ statusCode: 400, message: `${product.name} solo se puede vender por pieza.` })

      const quantity = new Prisma.Decimal(product.unit === 'KILOGRAM' ? item.quantity.toFixed(3) : item.quantity.toFixed(0))
      if (product.stock.lessThan(quantity)) throw createError({ statusCode: 409, message: `${product.name} no tiene existencias suficientes.` })

      const lineTotal = product.price.mul(quantity).toDecimalPlaces(2)
      return { product, quantity, lineTotal }
    })

    for (const item of saleItems) {
      const updated = await tx.product.updateMany({
        where: { id: item.product.id, active: true, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } }
      })
      if (updated.count !== 1) throw createError({ statusCode: 409, message: `${item.product.name} ya no tiene stock suficiente.` })
    }

    const total = saleItems.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2)
    const itemCount = saleItems.reduce((sum, item) => sum.add(item.quantity), new Prisma.Decimal(0)).toDecimalPlaces(3)
    const paymentTotal = paymentMethod === 'CASH' ? roundCashPaymentTotal(total) : total
    const receivedAmount = paymentMethod === 'CASH' ? new Prisma.Decimal(Number.isFinite(cashReceived) ? cashReceived.toFixed(2) : '0') : null
    if (paymentMethod === 'CASH' && (!receivedAmount || receivedAmount.lessThan(paymentTotal))) {
      throw createError({ statusCode: 400, message: 'El efectivo recibido debe cubrir el total de la venta.' })
    }
    const changeDue = receivedAmount ? receivedAmount.sub(paymentTotal).toDecimalPlaces(2) : null

    return tx.sale.create({
      data: {
        sellerId: seller.id,
        cashSessionId: cashSession.id,
        paymentMethod,
        paymentTotal,
        cashReceived: receivedAmount,
        changeDue,
        total,
        itemCount,
        items: {
          create: saleItems.map(item => ({
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
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        canceledBy: { select: { id: true, fullName: true, email: true } },
        cashSession: { select: { id: true, openedAt: true, status: true } },
        items: true
      }
    })
  })

  return serializeSale(sale)
})
