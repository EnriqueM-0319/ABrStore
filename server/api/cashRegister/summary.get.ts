import { requireRole, operationalRoles, getCashRegisterSummary } from '../../utils'
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
