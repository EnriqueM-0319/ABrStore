import { requireRole } from '../../utils/auth'
import { canManageRole, userManagementRoles } from '../../utils/users'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const manager = await requireRole(event, userManagementRoles)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Usuario inválido.' })
  if (id === manager.id) throw createError({ statusCode: 400, message: 'No puedes desactivar tu propio usuario.' })

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true }
  })
  if (!currentUser) throw createError({ statusCode: 404, message: 'Usuario no encontrado.' })
  if (!canManageRole(manager.role, currentUser.role)) {
    throw createError({ statusCode: 403, message: 'No tienes permiso para desactivar este usuario.' })
  }

  return prisma.user.update({
    where: { id },
    data: { active: false },
    select: {
      id: true,
      fullName: true,
      email: true,
      username: true,
      phone: true,
      role: true,
      active: true
    }
  })
})
