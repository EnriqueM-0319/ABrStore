import type { Role } from '@prisma/client'
import { requireRole, hashPassword, canManageRole, userManagementRoles } from '../../utils'
import prisma from '../../../lib/prisma'

const assignableRoles: Role[] = ['SUPERADMIN', 'ADMIN', 'WORKER']

export default defineEventHandler(async (event) => {
 const manager = await requireRole(event, userManagementRoles)
 const id = getRouterParam(event, 'id')
 if (!id) throw createError({ statusCode: 400, message: 'Usuario inválido.' })

 const currentUser = await prisma.user.findUnique({
 where: { id },
 select: { id: true, role: true }
 })
 if (!currentUser) throw createError({ statusCode: 404, message: 'Usuario no encontrado.' })
 if (!canManageRole(manager.role, currentUser.role)) {
 throw createError({ statusCode: 403, message: 'No tienes permiso para editar este usuario.' })
 }

 const body = await readBody(event)
 const fullName = String(body.fullName || '').trim()
 const email = String(body.email || '').trim().toLowerCase()
 const phone = String(body.phone || '').trim()
 const password = String(body.password || '')
 const requestedRole = String(body.role || currentUser.role).toUpperCase() as Role
 const role = assignableRoles.includes(requestedRole) ? requestedRole : currentUser.role
 const active = typeof body.active === 'boolean' ? body.active : undefined
 if (id === manager.id && active === false) {
 throw createError({ statusCode: 400, message: 'No puedes desactivar tu propio usuario.' })
 }

 if (!canManageRole(manager.role, role)) {
 throw createError({ statusCode: 403, message: 'No puedes asignar ese rol.' })
 }
 if (fullName.length < 3 || !/^\S+@\S+\.\S+$/.test(email) || phone.length < 7) {
 throw createError({ statusCode: 400, message: 'Revisa nombre, correo y teléfono.' })
 }
 if (password && password.length < 8) {
 throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres.' })
 }

 try {
 return await prisma.user.update({
 where: { id },
 data: {
 fullName,
 email,
 phone,
 role,
 ...(typeof active === 'boolean' ? { active } : {}),
 ...(password ? { passwordHash: hashPassword(password) } : {})
 },
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
 } catch {
 throw createError({ statusCode: 409, message: 'Ya existe otro usuario con ese correo.' })
 }
})
