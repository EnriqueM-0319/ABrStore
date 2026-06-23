import type { Prisma } from '@prisma/client'

type StockExitWithUser = Prisma.StockExitGetPayload<{
  include: { user: { select: { id: true; fullName: true; email: true } } }
}>

export function serializeStockExit(stockExit: StockExitWithUser) {
  return {
    id: stockExit.id,
    productId: stockExit.productId,
    sku: stockExit.sku,
    name: stockExit.name,
    description: stockExit.description,
    unit: stockExit.unit,
    quantity: stockExit.quantity.toNumber(),
    reason: stockExit.reason,
    note: stockExit.note,
    createdAt: stockExit.createdAt.toISOString(),
    user: stockExit.user
  }
}
