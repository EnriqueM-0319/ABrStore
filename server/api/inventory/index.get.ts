import { Prisma } from '@prisma/client'
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

type ProductRow = {
  id: string
  sku: string
  name: string
  description: string | null
  costPrice: Prisma.Decimal
  profitMargin: Prisma.Decimal
  price: Prisma.Decimal
  unit: 'PIECE' | 'KILOGRAM'
  stock: Prisma.Decimal
  active: boolean
}

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)

  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
  const lowStockOnly = query.lowStock === 'true'
  const page = getPositiveInteger(query.page, 1)
  const requestedLimit = getPositiveInteger(query.limit, DEFAULT_LIMIT)
  const limit = Math.min(requestedLimit, MAX_LIMIT)
  const skip = (page - 1) * limit

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {}),
    ...(lowStockOnly ? { active: true, stock: { lte: new Prisma.Decimal(5) } } : {})
  }
  const productWhere = Object.keys(where).length ? where : undefined
  const sqlConditions = [
    ...(search ? [Prisma.sql`("name" ILIKE ${`%${search}%`} OR "sku" ILIKE ${`%${search}%`} OR "description" ILIKE ${`%${search}%`})`] : []),
    ...(lowStockOnly ? [Prisma.sql`active = true AND stock <= 5`] : [])
  ]
  const sqlWhere = sqlConditions.length
    ? Prisma.sql`WHERE ${Prisma.join(sqlConditions, ' AND ')}`
    : Prisma.empty

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where: productWhere }),
    prisma.$queryRaw<ProductRow[]>`
      SELECT id, sku, name, description, "costPrice", "profitMargin", price, unit, stock, active
      FROM "Product"
      ${sqlWhere}
      ORDER BY
        CASE
          WHEN sku ~ '^[0-9]' THEN 0
          WHEN sku ~ '^[A-Za-z]' THEN 1
          ELSE 2
        END,
        CASE
          WHEN sku ~ '^[0-9]' THEN substring(sku from '^[0-9]+')::numeric
          ELSE NULL
        END,
        lower(sku),
        id
      LIMIT ${limit}
      OFFSET ${skip}
    `
  ])

  return {
    items: products.map(product => ({ ...product, costPrice: product.costPrice.toNumber(), profitMargin: product.profitMargin.toNumber(), price: product.price.toNumber(), stock: product.stock.toNumber() })),
    total,
    page,
    limit,
    pageCount: Math.max(Math.ceil(total / limit), 1)
  }
})
