export type CashRegisterStatus = 'OPEN' | 'CLOSED'

export type CashRegisterSession = {
  id: string
  status: CashRegisterStatus
  openingAmount: number
  closingAmount: number | null
  expectedAmount: number | null
  difference: number | null
  notes: string | null
  openedAt: string
  closedAt: string | null
  openedBy: {
    id: string
    fullName: string
    email: string
  }
  closedBy: {
    id: string
    fullName: string
    email: string
  } | null
}

export type CashRegisterSummary = {
  openingAmount: number
  cashSalesTotal: number
  cashSalesCount: number
  cardSalesTotal: number
  transferSalesTotal: number
  creditSalesTotal: number
  nonCashSalesTotal: number
  cashInTotal: number
  adjustmentTotal: number
  supplierPaymentTotal: number
  withdrawalTotal: number
  expenseTotal: number
  cashOutTotal: number
  expectedAmount: number
}

export type CashRegisterCloseResult = {
  session: CashRegisterSession
  summary: CashRegisterSummary
}

export type CashMovementType = 'SUPPLIER_PAYMENT' | 'WITHDRAWAL' | 'EXPENSE' | 'CASH_IN' | 'ADJUSTMENT'

export type CashMovement = {
  id: string
  cashSessionId: string
  type: CashMovementType
  amount: number
  description: string
  createdAt: string
  createdBy: {
    id: string
    fullName: string
    email: string
  }
}

export type CashMovementPaginatedResponse = {
  items: CashMovement[]
  total: number
  page: number
  limit: number
  pageCount: number
}
