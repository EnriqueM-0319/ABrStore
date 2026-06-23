import type { Prisma } from '@prisma/client'

export const cashRegisterInclude = {
  openedBy: { select: { id: true, fullName: true, email: true } },
  closedBy: { select: { id: true, fullName: true, email: true } }
} satisfies Prisma.CashRegisterSessionInclude

type CashRegisterWithUsers = Prisma.CashRegisterSessionGetPayload<{
  include: typeof cashRegisterInclude
}>

export function serializeCashRegisterSession(session: CashRegisterWithUsers) {
  return {
    id: session.id,
    status: session.status,
    openingAmount: session.openingAmount.toNumber(),
    closingAmount: session.closingAmount?.toNumber() ?? null,
    expectedAmount: session.expectedAmount?.toNumber() ?? null,
    difference: session.difference?.toNumber() ?? null,
    notes: session.notes,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    openedBy: session.openedBy,
    closedBy: session.closedBy
  }
}
