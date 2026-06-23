import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''

  if (!search) return []

  const products = await prisma.product.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    },
    select: { id: true, sku: true, name: true, description: true, price: true, unit: true, stock: true },
    orderBy: { name: 'asc' },
    take: 12
  })

  return products.map(product => ({ ...product, price: product.price.toNumber(), stock: product.stock.toNumber() }))
})
