import { Prisma } from '@prisma/client'
import { requireRole, operationalRoles } from '../../utils'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
 await requireRole(event, operationalRoles)
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Producto inválido.' })

 const body = await readBody(event)
 const sku = String(body.sku || '').trim().toUpperCase()
 const name = String(body.name || '').trim()
 const description = String(body.description || '').trim() || null
 const costPrice = Number(body.costPrice)
 const profitMargin = Number(body.profitMargin)
 const price = Number(body.price)
 const stock = Number(body.stock)
 const unit = body.unit === 'KILOGRAM' ? 'KILOGRAM' : body.unit === 'PIECE' ? 'PIECE' : null
 const active = typeof body.active === 'boolean' ? body.active : undefined

 if (sku.length < 2 || name.length < 2 || !unit || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(profitMargin) || profitMargin < 0 || profitMargin >= 100 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0 || (unit === 'PIECE' && !Number.isInteger(stock))) {
 throw createError({ statusCode: 400, message: 'Revisa los precios, el porcentaje de ganancia menor a 100% y las existencias.' })
 }

 try {
 const product = await prisma.product.update({
 where: { id },
 data: { sku, name, description, costPrice: new Prisma.Decimal(costPrice.toFixed(2)), profitMargin: new Prisma.Decimal(profitMargin.toFixed(2)), price: new Prisma.Decimal(price.toFixed(2)), unit, stock: new Prisma.Decimal(stock.toFixed(3)), ...(active === undefined ? {} : { active }) },
 select: { id: true, sku: true, name: true, description: true, costPrice: true, profitMargin: true, price: true, unit: true, stock: true, active: true }
 })
 return { ...product, costPrice: product.costPrice.toNumber(), profitMargin: product.profitMargin.toNumber(), price: product.price.toNumber(), stock: product.stock.toNumber() }
 } catch (error: unknown) {
 if (error instanceof Prisma.PrismaClientKnownRequestError) {
 if (error.code === 'P2002') throw createError({ statusCode: 409, message: 'Ya existe otro producto con ese SKU.' })
 if (error.code === 'P2025') throw createError({ statusCode: 404, message: 'El producto ya no existe.' })
 }
 throw error
 }
})
