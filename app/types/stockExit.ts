import type { Product } from './product'

export type StockExitReason = 'EXPIRED' | 'DAMAGED'

export type StockExit = {
 id: string
 productId: string | null
 sku: string
 name: string
 description: string | null
 unit: Product['unit']
 quantity: number
 reason: StockExitReason
 note: string | null
 createdAt: string
 user: {
 id: string
 fullName: string
 email: string
 }
}

export type StockExitPaginatedResponse = {
 items: StockExit[]
 total: number
 page: number
 limit: number
 pageCount: number
}
