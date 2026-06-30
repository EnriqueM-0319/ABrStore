import { Prisma } from '@prisma/client'
import { requireRole, operationalRoles, serializeStockExit } from '../../utils'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
 const user = await requireRole(event, operationalRoles)
 const body = await readBody(event)
 const productId = String(body.productId || '')
 const quantityValue = Number(body.quantity)
 const reason = body.reason === 'EXPIRED' ? 'EXPIRED' : body.reason === 'DAMAGED' ? 'DAMAGED' : null
 const note = String(body.note || '').trim() || null

 if (!productId || !reason || !Number.isFinite(quantityValue) || quantityValue <= 0) {
 throw createError({ statusCode: 400, message: 'Selecciona producto, motivo y cantidad válida.' })
 }

 const stockExit = await prisma.$transaction(async (tx) => {
 const product = await tx.product.findUnique({
 where: { id: productId },
 select: { id: true, sku: true, name: true, description: true, unit: true, stock: true, active: true }
 })

 if (!product || !product.active) throw createError({ statusCode: 404, message: 'El producto ya no está disponible.' })
 if (product.unit === 'PIECE' && !Number.isInteger(quantityValue)) throw createError({ statusCode: 400, message: `${product.name} solo puede darse de baja por piezas completas.` })

 const quantity = new Prisma.Decimal(product.unit === 'KILOGRAM' ? quantityValue.toFixed(3) : quantityValue.toFixed(0))
 if (product.stock.lessThan(quantity)) throw createError({ statusCode: 409, message: `${product.name} no tiene existencias suficientes.` })

 const updated = await tx.product.updateMany({
 where: { id: product.id, active: true, stock: { gte: quantity } },
 data: { stock: { decrement: quantity } }
 })
 if (updated.count !== 1) throw createError({ statusCode: 409, message: `${product.name} ya no tiene stock suficiente.` })

 return tx.stockExit.create({
 data: {
 productId: product.id,
 userId: user.id,
 reason,
 sku: product.sku,
 name: product.name,
 description: product.description,
 unit: product.unit,
 quantity,
 note
 },
 include: { user: { select: { id: true, fullName: true, email: true } } }
 })
 })

 return serializeStockExit(stockExit)
})
