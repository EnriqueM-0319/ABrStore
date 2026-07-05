import type { PaymentMethod } from './sale'

export type HeldTicketItem = {
 id: string
 productId: string | null
 sku: string
 name: string
 description: string | null
 unit: 'PIECE' | 'KILOGRAM'
 quantity: number
 unitPrice: number
 lineTotal: number
 product: {
 id: string
 sku: string
 name: string
 description: string | null
 unit: 'PIECE' | 'KILOGRAM'
 price: number
 stock: number
 active: boolean
 } | null
}

export type HeldTicket = {
 id: string
 note: string | null
 itemCount: number
 total: number
 paymentMethod: PaymentMethod
 createdAt: string
 updatedAt: string
 createdBy: {
 id: string
 fullName: string
 email: string
 }
 items: HeldTicketItem[]
}
