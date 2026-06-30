import { requireRole, getVisibleRoles, userManagementRoles } from '../../utils'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
 const user = await requireRole(event, userManagementRoles)
 const query = getQuery(event)
 const search = typeof query.search === 'string' ? query.search.trim().slice(0, 80) : ''
 const visibleRoles = getVisibleRoles(user.role)

 return prisma.user.findMany({
 where: {
 role: { in: visibleRoles },
 ...(search
 ? {
 OR: [
 { fullName: { contains: search, mode: 'insensitive' } },
 { email: { contains: search, mode: 'insensitive' } },
 { username: { contains: search, mode: 'insensitive' } },
 { phone: { contains: search, mode: 'insensitive' } }
 ]
 }
 : {})
 },
 select: {
 id: true,
 fullName: true,
 email: true,
 username: true,
 phone: true,
 role: true,
 active: true
 },
 orderBy: [
 { active: 'desc' },
 { fullName: 'asc' }
 ],
 take: 100
 })
})
