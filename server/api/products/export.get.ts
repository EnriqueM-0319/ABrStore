import { Prisma } from '@prisma/client'
import { requireRole, operationalRoles } from '../../utils'
import prisma from '../../../lib/prisma'

const exportScopes = ['all', 'low-stock', 'selected'] as const

function csvCell(value: unknown) {
 const text = String(value ?? '')
 return `"${text.replaceAll('"', '""')}"`
}

function normalizeIds(value: unknown) {
 if (Array.isArray(value)) return value.flatMap(normalizeIds)
 if (typeof value !== 'string') return []
 return value.split(',').map(id => id.trim()).filter(Boolean)
}

export default defineEventHandler(async (event) => {
 await requireRole(event, operationalRoles)

 const query = getQuery(event)
 const requestedScope = typeof query.scope === 'string' ? query.scope : 'all'
 const scope = exportScopes.includes(requestedScope as typeof exportScopes[number])
 ? requestedScope as typeof exportScopes[number]
 : 'all'
 const ids = [...new Set(normalizeIds(query.ids))]

 if (scope === 'selected' && !ids.length) {
 throw createError({ statusCode: 400, message: 'Selecciona al menos un producto para exportar.' })
 }

 const where: Prisma.ProductWhereInput = {
 ...(scope === 'low-stock' ? { active: true, stock: { lte: new Prisma.Decimal(5) } } : {}),
 ...(scope === 'selected' ? { id: { in: ids } } : {})
 }

 const products = await prisma.product.findMany({
 where,
 select: {
 sku: true,
 name: true,
 description: true,
 unit: true,
 stock: true,
 costPrice: true,
 price: true,
 },
 orderBy: [
 { sku: 'asc' },
 { name: 'asc' }
 ]
 })

 const headers = ['SKU', 'Producto', 'Descripción', 'Unidad', 'Existencia', 'Costo unitario', 'Precio público']
 const rows = products.map(product => [
 `="${product.sku.replaceAll('"', '""')}"`,
 product.name,
 product.description ?? '',
 product.unit === 'KILOGRAM' ? 'Kilo' : 'Pieza',
 product.stock.toNumber(),
 product.costPrice.toNumber(),
 product.price.toNumber()
 ])

 const csv = [
 headers.map(csvCell).join(','),
 ...rows.map(row => row.map(csvCell).join(','))
 ].join('\n')

 const fileName = `productos-${scope}-${new Date().toISOString().slice(0, 10)}.csv`
 setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
 setHeader(event, 'Content-Disposition', `attachment; filename="${fileName}"`)

 return `\uFEFF${csv}`
})
