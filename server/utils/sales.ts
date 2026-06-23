import type { Prisma } from '@prisma/client'

type SaleWithItems = Prisma.SaleGetPayload<{
  include: {
    seller: { select: { id: true; fullName: true; email: true } }
    canceledBy?: { select: { id: true; fullName: true; email: true } }
    cashSession?: { select: { id: true; openedAt: true; status: true } }
    items: true
  }
}>

export function serializeSale(sale: SaleWithItems, currentCashSessionId?: string | null) {
  const canCancel = !sale.canceledAt && Boolean(sale.cashSessionId && currentCashSessionId && sale.cashSessionId === currentCashSessionId && sale.cashSession?.status === 'OPEN')

  return {
    id: sale.id,
    folio: sale.folio,
    total: sale.total.toNumber(),
    paymentTotal: sale.paymentTotal?.toNumber() ?? sale.total.toNumber(),
    itemCount: sale.itemCount.toNumber(),
    paymentMethod: sale.paymentMethod,
    cashReceived: sale.cashReceived?.toNumber() ?? null,
    changeDue: sale.changeDue?.toNumber() ?? null,
    canceledAt: sale.canceledAt?.toISOString() ?? null,
    cancelReason: sale.cancelReason,
    canceledBy: sale.canceledBy ?? null,
    canCancel,
    createdAt: sale.createdAt.toISOString(),
    seller: sale.seller,
    cashSession: sale.cashSession ? { id: sale.cashSession.id, openedAt: sale.cashSession.openedAt.toISOString(), status: sale.cashSession.status } : null,
    items: sale.items.map(item => ({
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity.toNumber(),
      unitPrice: item.unitPrice.toNumber(),
      lineTotal: item.lineTotal.toNumber()
    }))
  }
}
