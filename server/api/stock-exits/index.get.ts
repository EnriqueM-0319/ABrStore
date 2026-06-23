import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { serializeStockExit } from '../../utils/stock-exits'
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
  const page = getPositiveInteger(query.page, 1)
  const requestedLimit = getPositiveInteger(query.limit, DEFAULT_LIMIT)
  const limit = Math.min(requestedLimit, MAX_LIMIT)
  const skip = (page - 1) * limit

  const [total, exits] = await prisma.$transaction([
    prisma.stockExit.count(),
    prisma.stockExit.findMany({
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  ])

  return {
    items: exits.map(serializeStockExit),
    total,
    page,
    limit,
    pageCount: Math.max(Math.ceil(total / limit), 1)
  }
})
