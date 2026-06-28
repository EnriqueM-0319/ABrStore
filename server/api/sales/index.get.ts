import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { serializeSale } from '../../utils/sales'
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
  const startDate = typeof query.startDate === 'string' && query.startDate ? new Date(`${query.startDate}T00:00:00.000`) : null
  const endDate = typeof query.endDate === 'string' && query.endDate ? new Date(`${query.endDate}T23:59:59.999`) : null
  const folio = Number(query.folio)
  const createdAt = {
    ...(startDate && !Number.isNaN(startDate.getTime()) ? { gte: startDate } : {}),
    ...(endDate && !Number.isNaN(endDate.getTime()) ? { lte: endDate } : {})
  }
  const where = {
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(Number.isInteger(folio) && folio > 0 ? { folio } : {})
  }
  const saleWhere = Object.keys(where).length ? where : undefined

  const [currentCashSession, total, sales] = await prisma.$transaction([
    prisma.cashRegisterSession.findFirst({
      where: { status: 'OPEN' },
      select: { id: true }
    }),
    prisma.sale.count({ where: saleWhere }),
    prisma.sale.findMany({
      where: saleWhere,
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        canceledBy: { select: { id: true, fullName: true, email: true } },
        creditPaidBy: { select: { id: true, fullName: true, email: true } },
        cashSession: { select: { id: true, openedAt: true, status: true } },
        items: { orderBy: { id: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  ])

  return {
    items: sales.map(sale => serializeSale(sale, currentCashSession?.id ?? null)),
    total,
    page,
    limit,
    pageCount: Math.max(Math.ceil(total / limit), 1)
  }
})
