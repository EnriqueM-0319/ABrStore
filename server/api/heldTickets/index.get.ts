import { requireRole, operationalRoles, heldTicketInclude, serializeHeldTicket } from '../../utils'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
 await requireRole(event, operationalRoles)

 const cashSession = await prisma.cashRegisterSession.findFirst({
 where: { status: 'OPEN' },
 select: { id: true }
 })

 if (!cashSession) return []

 const tickets = await prisma.heldTicket.findMany({
 where: { cashSessionId: cashSession.id },
 include: heldTicketInclude,
 orderBy: { updatedAt: 'desc' },
 take: 20
 })

 return tickets.map(serializeHeldTicket)
})
