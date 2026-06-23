import prisma from '../../../lib/prisma'
import { hashPassword } from '../../utils/password'
import { requireRole } from '../../utils/auth'
import { generateUniqueUsername, userManagementRoles } from '../../utils/users'

const assignableRoles = ['WORKER', 'ADMIN', 'SUPERADMIN'] as const

export default defineEventHandler(async (event) => {
  const creator = await requireRole(event, userManagementRoles)
  const body = await readBody(event)
  const fullName = String(body.fullName || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const phone = String(body.phone || '').trim()
  const requestedRole = String(body.role || 'WORKER').toUpperCase()
  const role = assignableRoles.includes(requestedRole as typeof assignableRoles[number])
    ? requestedRole as typeof assignableRoles[number]
    : 'WORKER'

  if (creator.role === 'ADMIN' && role !== 'WORKER') {
    throw createError({ statusCode: 403, message: 'Un administrador solo puede registrar colaboradores.' })
  }

  if (fullName.length < 3 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || phone.length < 7) {
    throw createError({ statusCode: 400, message: 'Revisa tus datos. La contraseña debe tener al menos 8 caracteres.' })
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw createError({ statusCode: 409, message: 'Ya existe una cuenta con este correo.' })
  const username = await generateUniqueUsername(prisma, fullName)
  const user = await prisma.user.create({
    data: { fullName, email, username, phone, role, passwordHash: hashPassword(password) },
    select: { id: true, fullName: true, email: true, username: true, phone: true, role: true, active: true }
  })

  return user
})
