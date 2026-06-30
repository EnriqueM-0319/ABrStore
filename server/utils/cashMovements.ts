import type { Prisma } from '@prisma/client'

type CashMovementWithUser = Prisma.CashMovementGetPayload<{
 include: { createdBy: { select: { id: true; fullName: true; email: true } } }
}>

export function serializeCashMovement(movement: CashMovementWithUser) {
 return {
 id: movement.id,
 cashSessionId: movement.cashSessionId,
 type: movement.type,
 amount: movement.amount.toNumber(),
 description: movement.description,
 createdAt: movement.createdAt.toISOString(),
 createdBy: movement.createdBy
 }
}
