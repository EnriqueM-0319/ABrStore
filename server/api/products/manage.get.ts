import { requireRole, operationalRoles } from '../../utils'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
 await requireRole(event, operationalRoles)
 const products = await prisma.product.findMany({
 where: { active: true },
 select: { id: true, sku: true, name: true, description: true, costPrice: true, profitMargin: true, price: true, unit: true, stock: true },
 orderBy: { createdAt: 'desc' },
 take: 100
 })
 return products.map(product => ({ ...product, costPrice: product.costPrice.toNumber(), profitMargin: product.profitMargin.toNumber(), price: product.price.toNumber(), stock: product.stock.toNumber() }))
})
