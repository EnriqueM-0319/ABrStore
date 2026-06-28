import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { serializeSale } from '../../utils/sales'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)
  const query = getQuery(event)
  const page = Math.max(Number(query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(query.limit) || 10, 5), 50)
  const status = query.status === 'paid' ? 'paid' : query.status === 'all' ? 'all' : 'pending'

  const where = {
    paymentMethod: 'CREDIT' as const,
    canceledAt: null,
    ...(status === 'pending' ? { creditPaidAt: null } : {}),
    ...(status === 'paid' ? { creditPaidAt: { not: null } } : {})
  }

  const [total, currentCashSession, items] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.cashRegisterSession.findFirst({ where: { status: 'OPEN' }, select: { id: true } }),
    prisma.sale.findMany({
      where,
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        canceledBy: { select: { id: true, fullName: true, email: true } },
        creditPaidBy: { select: { id: true, fullName: true, email: true } },
        cashSession: { select: { id: true, openedAt: true, status: true } },
        items: true
      },
      orderBy: status === 'paid' ? { creditPaidAt: 'desc' } : { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })
  ])

  return {
    items: items.map(sale => serializeSale(sale, currentCashSession?.id)),
    total,
    page,
    limit,
    pageCount: Math.max(Math.ceil(total / limit), 1)
  }
})
