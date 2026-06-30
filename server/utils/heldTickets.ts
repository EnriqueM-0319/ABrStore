import type { Prisma } from '@prisma/client'

export const heldTicketInclude = {
 createdBy: { select: { id: true, fullName: true, email: true } },
 items: {
 orderBy: { id: 'asc' },
 include: {
 product: { select: { id: true, sku: true, name: true, description: true, unit: true, price: true, stock: true, active: true } }
 }
 }
} satisfies Prisma.HeldTicketInclude

type HeldTicketWithItems = Prisma.HeldTicketGetPayload<{
 include: typeof heldTicketInclude
}>

export function serializeHeldTicket(ticket: HeldTicketWithItems) {
 return {
 id: ticket.id,
 note: ticket.note,
 itemCount: ticket.itemCount.toNumber(),
 total: ticket.total.toNumber(),
 paymentMethod: ticket.paymentMethod,
 createdAt: ticket.createdAt.toISOString(),
 updatedAt: ticket.updatedAt.toISOString(),
 createdBy: ticket.createdBy,
 items: ticket.items.map(item => ({
 id: item.id,
 productId: item.productId,
 sku: item.sku,
 name: item.name,
 description: item.description,
 unit: item.unit,
 quantity: item.quantity.toNumber(),
 unitPrice: item.unitPrice.toNumber(),
 lineTotal: item.lineTotal.toNumber(),
 product: item.product
 ? {
 ...item.product,
 price: item.product.price.toNumber(),
 stock: item.product.stock.toNumber()
 }
 : null
 }))
 }
}
