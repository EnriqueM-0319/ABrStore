import type { PrismaClient, Role } from '@prisma/client'

export const operationalRoles: Role[] = ['SUPERADMIN', 'ADMIN', 'WORKER']
export const userManagementRoles: Role[] = ['SUPERADMIN', 'ADMIN']
export const roleLabels: Record<Role, string> = {
 SUPERADMIN: 'Superadmin',
 ADMIN: 'Administrador',
 WORKER: 'Colaborador'
}

const roleRank: Record<Role, number> = {
 SUPERADMIN: 3,
 ADMIN: 2,
 WORKER: 1
}

export function getVisibleRoles(role: Role): Role[] {
 if (role === 'SUPERADMIN') return ['SUPERADMIN', 'ADMIN', 'WORKER']
 if (role === 'ADMIN') return ['WORKER']
 return []
}

export function canManageRole(managerRole: Role, targetRole: Role) {
 if (managerRole === 'SUPERADMIN') return roleRank[targetRole] <= roleRank.SUPERADMIN
 if (managerRole === 'ADMIN') return targetRole === 'WORKER'
 return false
}

export function normalizeUsername(value: string) {
 return value
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .toLowerCase()
 .replace(/[^a-z0-9]+/g, '.')
 .replace(/^\.+|\.+$/g, '')
 .slice(0, 24)
}

export function getBaseUsername(fullName: string) {
 const parts = normalizeUsername(fullName).split('.').filter(Boolean)
 const firstName = parts[0] || 'usuario'
 const lastName = parts[1] || ''
 return [firstName, lastName].filter(Boolean).join('.').slice(0, 24)
}

export async function generateUniqueUsername(prisma: PrismaClient, fullName: string) {
 const baseUsername = getBaseUsername(fullName)
 let username = baseUsername
 let suffix = 1

 while (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
 suffix += 1
 username = `${baseUsername}${suffix}`.slice(0, 28)
 }

 return username
}
