import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

function getPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(Math.trunc(parsed), 1)
}

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)

  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
  const page = getPositiveInteger(query.page, 1)
  const requestedLimit = getPositiveInteger(query.limit, DEFAULT_LIMIT)
  const limit = Math.min(requestedLimit, MAX_LIMIT)
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } }
        ]
      }
    : undefined

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: { id: true, sku: true, name: true, description: true, costPrice: true, profitMargin: true, price: true, unit: true, stock: true, active: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip,
      take: limit
    })
  ])

  return {
    items: products.map(product => ({ ...product, costPrice: product.costPrice.toNumber(), profitMargin: product.profitMargin.toNumber(), price: product.price.toNumber(), stock: product.stock.toNumber() })),
    total,
    page,
    limit,
    pageCount: Math.max(Math.ceil(total / limit), 1)
  }
})
