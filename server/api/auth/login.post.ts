import { Prisma } from '@prisma/client'
import prisma from '../../../lib/prisma'
import { verifyPassword, createSession, generateUniqueUsername } from '../../utils'

export default defineEventHandler(async (event) => {
 const body = await readBody(event)
 const username = String(body.username || body.email || '').trim().toLowerCase()
 const password = String(body.password || '')
 let user

 try {
 user = await prisma.user.findFirst({
 where: {
 OR: [
 { username },
 { email: username }
 ]
 }
 })
 } catch (error: unknown) {
 if (error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P1002', 'P2024'].includes(error.code)) {
 throw createError({ statusCode: 503, message: 'No hay conexión disponible con la base de datos. Intenta iniciar sesión nuevamente en unos segundos.' })
 }

 throw error
 }
 if (!user || !verifyPassword(password, user.passwordHash)) {
 throw createError({ statusCode: 401, message: 'Usuario o contraseña incorrectos.' })
 }
 if (!user.active) {
 throw createError({ statusCode: 403, message: 'Tu usuario está desactivado. Contacta al administrador.' })
 }
 const authenticatedUser = user.username
 ? user
 : await prisma.user.update({
 where: { id: user.id },
 data: { username: await generateUniqueUsername(prisma, user.fullName) }
 })
 createSession(event, user.id)
 return {
 id: authenticatedUser.id,
 fullName: authenticatedUser.fullName,
 email: authenticatedUser.email,
 username: authenticatedUser.username,
 phone: authenticatedUser.phone,
 role: authenticatedUser.role,
 active: authenticatedUser.active
 }
})
