export const userFields = `
 id
 fullName
 email
 username
 phone
 role
 active
`

export const basicUserFields = `
 id
 fullName
 email
`

export const productFields = `
 id
 sku
 name
 description
 costPrice
 profitMargin
 price
 unit
 stock
 active
`

export const cashRegisterSessionFields = `
 id
 status
 openingAmount
 closingAmount
 expectedAmount
 difference
 notes
 openedAt
 closedAt
 openedBy { ${basicUserFields} }
 closedBy { ${basicUserFields} }
`

export const cashRegisterSummaryFields = `
 openingAmount
 cashSalesTotal
 cashSalesCount
 cardSalesTotal
 transferSalesTotal
 creditSalesTotal
 nonCashSalesTotal
 cashInTotal
 adjustmentTotal
 supplierPaymentTotal
 withdrawalTotal
 expenseTotal
 cashOutTotal
 expectedAmount
`

export const cashMovementFields = `
 id
 cashSessionId
 type
 amount
 description
 createdAt
 createdBy { ${basicUserFields} }
`

export const saleFields = `
 id
 folio
 total
 paymentTotal
 itemCount
 paymentMethod
 cashReceived
 changeDue
 canceledAt
 cancelReason
 canceledBy { ${basicUserFields} }
 creditPaidAt
 creditPaidBy { ${basicUserFields} }
 creditPaymentMethod
 creditCustomerName
 creditNote
 canCancel
 createdAt
 seller { ${basicUserFields} }
 cashSession {
  id
  openedAt
  status
 }
 items {
  id
  productId
  sku
  name
  description
  unit
  quantity
  unitPrice
  lineTotal
  canceledAt
  cancelReason
 }
`

export const heldTicketFields = `
 id
 note
 itemCount
 total
 paymentMethod
 createdAt
 updatedAt
 createdBy { ${basicUserFields} }
 items {
  id
  productId
  sku
  name
  description
  unit
  quantity
  unitPrice
  lineTotal
  product { ${productFields} }
 }
`

export const stockExitFields = `
 id
 productId
 sku
 name
 description
 unit
 quantity
 reason
 note
 createdAt
 user { ${basicUserFields} }
`

export const salesReportFields = `
 groupBy
 startDate
 endDate
 summary {
  period
  salesCount
  canceledCount
  grossTotal
  cashTotal
  cardTotal
  transferTotal
  creditTotal
  creditPendingTotal
  creditPaidTotal
  creditCollectedCashTotal
  creditCollectedCardTotal
  creditCollectedTransferTotal
  creditCollectedTotal
  averageTicket
 }
 items {
  period
  salesCount
  canceledCount
  grossTotal
  cashTotal
  cardTotal
  transferTotal
  creditTotal
  creditPendingTotal
  creditPaidTotal
  creditCollectedCashTotal
  creditCollectedCardTotal
  creditCollectedTransferTotal
  creditCollectedTotal
  averageTicket
 }
`
