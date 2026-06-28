import type { Product } from './product'

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT'
export type CashRegisterStatus = 'OPEN' | 'CLOSED'

export type SaleTicketItem = {
  id: string
  productId: string | null
  sku: string
  name: string
  description: string | null
  unit: Product['unit']
  quantity: number
  unitPrice: number
  lineTotal: number
  canceledAt: string | null
  cancelReason: string | null
}

export type SaleTicket = {
  id: string
  folio: number
  total: number
  paymentTotal: number
  itemCount: number
  paymentMethod: PaymentMethod
  cashReceived: number | null
  changeDue: number | null
  canceledAt: string | null
  cancelReason: string | null
  canceledBy: {
    id: string
    fullName: string
    email: string
  } | null
  creditPaidAt: string | null
  creditPaidBy: {
    id: string
    fullName: string
    email: string
  } | null
  creditPaymentMethod: PaymentMethod | null
  creditCustomerName: string | null
  creditNote: string | null
  canCancel: boolean
  createdAt: string
  seller: {
    id: string
    fullName: string
    email: string
  }
  cashSession: {
    id: string
    openedAt: string
    status: CashRegisterStatus
  } | null
  items: SaleTicketItem[]
}

export type SalesHistoryResponse = {
  items: SaleTicket[]
  total: number
  page: number
  limit: number
  pageCount: number
}
