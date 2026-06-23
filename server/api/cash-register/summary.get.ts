import { requireRole } from '../../utils/auth'
import { operationalRoles } from '../../utils/users'
import { getCashRegisterSummary } from '../../utils/cash-register-summary'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  await requireRole(event, operationalRoles)

  const session = await prisma.cashRegisterSession.findFirst({
    where: { status: 'OPEN' },
    select: { id: true, openingAmount: true },
    orderBy: { openedAt: 'desc' }
  })

  if (!session) return null

  return getCashRegisterSummary(prisma, session.id, session.openingAmount)
})
