import { requireRole, operationalRoles, cashRegisterInclude, serializeCashRegisterSession } from '../../utils'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
 await requireRole(event, operationalRoles)

 const session = await prisma.cashRegisterSession.findFirst({
 where: { status: 'OPEN' },
 include: cashRegisterInclude,
 orderBy: { openedAt: 'desc' }
 })

 return session ? serializeCashRegisterSession(session) : null
})
